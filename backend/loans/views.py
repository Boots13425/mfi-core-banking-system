from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from .models import (
    LoanProduct, LoanDocumentType, LoanProductRequiredDocument,
    Loan, LoanDocument, RepaymentSchedule, RepaymentTransaction, PenaltyWaiver
)
from .serializers import (
    LoanProductSerializer, LoanProductDetailSerializer, LoanDocumentTypeSerializer,
    LoanDetailSerializer, LoanListSerializer, LoanCreateUpdateSerializer,
    LoanDocumentUploadSerializer, LoanDocumentSerializer, LoanDisburseSerializer, RepaymentPostSerializer,
    PenaltyWaiverRequestSerializer
)
from .permissions import IsLoanOfficer, IsBranchManager, IsCashier
from clients.models import Client, KYC, KYCDocument
from accounts.models import AuditLog
from django.core.exceptions import ValidationError
from cash.hooks import (
    record_cash_loan_disbursement,
    record_cash_loan_repayment,
)

logger = logging.getLogger(__name__)


class LoanProductViewSet(viewsets.ReadOnlyModelViewSet):
    """Loan product list (available for all authenticated users)."""
    queryset = LoanProduct.objects.filter(active=True)
    serializer_class = LoanProductSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LoanProductDetailSerializer
        return LoanProductSerializer


class LoanOfficerClientListView(viewsets.ViewSet):
    """Loan Officer sees only ACTIVE clients with APPROVED KYC."""
    permission_classes = [IsAuthenticated, IsLoanOfficer]
    
    @action(detail=False, methods=['get'])
    def get_active_clients(self, request):
        """GET /api/loan-officer/clients/"""
        user_branch = getattr(request.user, 'branch', None)
        
        # Debug: Check if we're actually being called
        debug = request.query_params.get('debug', False)
        
        clients = Client.objects.filter(
            status='ACTIVE',
            branch=user_branch
        )
        
        # Filter for approved KYC
        clients_with_approved_kyc = []
        for client in clients:
            try:
                kyc = KYC.objects.get(client=client)
                if kyc.status == 'APPROVED':
                    # compute photo url if available
                    photo_url = None
                    try:
                        photo_doc = client.kyc.documents.filter(document_type='PHOTO').only('file').first()
                        if photo_doc and photo_doc.file:
                            photo_url = request.build_absolute_uri(photo_doc.file.url) if request else photo_doc.file.url
                    except Exception:
                        photo_url = None

                    clients_with_approved_kyc.append({
                        'id': client.id,
                        'full_name': client.full_name,
                        'national_id': client.national_id,
                        'phone': client.phone,
                        'email': client.email,
                        'status': client.status,
                        'kyc_status': kyc.status,
                        'photo_url': photo_url,
                    })
            except KYC.DoesNotExist:
                pass
        
        if debug:
            return Response({
                'debug': {
                    'user': request.user.username,
                    'user_branch': str(user_branch),
                    'total_active_clients_in_branch': clients.count(),
                    'clients_with_approved_kyc': len(clients_with_approved_kyc),
                },
                'clients': clients_with_approved_kyc
            })
        
        return Response(clients_with_approved_kyc)


class LoanContextView(viewsets.ViewSet):
    """Loan Officer context: client info, KYC docs, loan history."""
    permission_classes = [IsAuthenticated, IsLoanOfficer]
    
    @action(detail=False, methods=['get'], url_path='loan-officer/clients/(?P<client_id>[^/.]+)/loan-context')
    def get_loan_context(self, request, client_id=None):
        """GET /api/loan-officer/clients/<client_id>/loan-context/"""
        if not client_id:
            return Response({'error': 'Client ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            client = Client.objects.get(id=client_id, branch=getattr(request.user, 'branch', None))
        except Client.DoesNotExist:
            return Response({'error': 'Client not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get KYC info
        kyc_data = None
        try:
            kyc = KYC.objects.get(client=client)
            kyc_data = {
                'id': kyc.id,
                'status': kyc.status,
                'created_at': kyc.created_at,
                'updated_at': kyc.updated_at,
            }
        except KYC.DoesNotExist:
            pass
        
        # Get KYC documents
        kyc_documents = []
        if kyc_data:
            kyc_docs = KYCDocument.objects.filter(kyc__client=client)
            for doc in kyc_docs:
                kyc_documents.append({
                    'id': doc.id,
                    'document_type': doc.document_type,
                    'file_url': request.build_absolute_uri(doc.file.url) if doc.file else None,
                    'uploaded_at': doc.created_at if hasattr(doc, 'created_at') else None,
                })
        
        # Get loan history
        loans = Loan.objects.filter(client=client).order_by('-created_at')
        loans_data = LoanListSerializer(loans, many=True).data
        
        # Check for active loan (for repayments/disbursement)
        active_loan = None
        active_loan_obj = Loan.objects.filter(client=client, status__in=['ACTIVE']).first()
        if active_loan_obj:
            active_loan = LoanDetailSerializer(active_loan_obj, context={'request': request}).data
        
        # Check for application loan (latest draft or changes_requested for upload/submit)
        application_loan = None
        application_loan_obj = Loan.objects.filter(client=client, status__in=['DRAFT', 'CHANGES_REQUESTED']).order_by('-created_at').first()
        
        application_loan_data = None
        required_documents = []
        uploaded_documents = []
        missing_documents = []
        
        if application_loan_obj:
            application_loan_data = LoanDetailSerializer(application_loan_obj, context={'request': request}).data
            
            # Get required documents for this loan's product
            required_docs = LoanProductRequiredDocument.objects.filter(
                product=application_loan_obj.product,
                is_mandatory=True
            ).select_related('document_type')
            
            # Get uploaded documents for this loan
            uploaded_docs = LoanDocument.objects.filter(
                loan=application_loan_obj
            ).select_related('document_type')
            
            # Build required documents list with upload status
            uploaded_doc_types = set(uploaded_docs.values_list('document_type_id', flat=True))
            for rd in required_docs:
                required_documents.append({
                    'id': rd.document_type.id,
                    'name': rd.document_type.name,
                    'code': rd.document_type.code,
                    'uploaded': rd.document_type.id in uploaded_doc_types,
                })
            
            # Build uploaded documents list with URLs
            for doc in uploaded_docs:
                uploaded_documents.append({
                    'id': doc.id,
                    'document_type_id': doc.document_type.id if doc.document_type else None,
                    'document_type_name': doc.document_type.name if doc.document_type else 'Unknown',
                    'file_url': request.build_absolute_uri(doc.document_file.url) if doc.document_file else None,
                    'uploaded_at': doc.uploaded_at,
                })
            
            # Compute missing mandatory documents
            missing_documents = [d for d in required_documents if not d['uploaded']]
        
        # include client photo if available
        photo_url = None
        try:
            photo_doc = client.kyc.documents.filter(document_type='PHOTO').only('file').first()
            if photo_doc and photo_doc.file:
                photo_url = request.build_absolute_uri(photo_doc.file.url) if request else photo_doc.file.url
        except Exception:
            photo_url = None

        return Response({
            'client': {
                'id': client.id,
                'full_name': client.full_name,
                'national_id': client.national_id,
                'phone': client.phone,
                'email': client.email,
                'status': client.status,
                'photo_url': photo_url,
            },
            'kyc': kyc_data,
            'kyc_documents': kyc_documents,
            'loans': loans_data,
            'active_loan': active_loan,
            'application_loan': application_loan_data,
            'required_documents': required_documents,
            'uploaded_documents': uploaded_documents,
            'missing_documents': missing_documents,
        })


class LoanViewSet(viewsets.ModelViewSet):
    """Main Loan CRUD operations."""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = getattr(self, 'request', None) and getattr(self.request, 'user', None)
        if not user:
            return Loan.objects.none()

        role = getattr(user, 'role', None)
        branch = getattr(user, 'branch', None)

        if role == 'LOAN_OFFICER':
            return Loan.objects.filter(branch=branch)
        elif role == 'BRANCH_MANAGER':
            return Loan.objects.filter(branch=branch)
        elif role == 'CASHIER':
            # Cashier sees approved and active loans, limited to their branch
            return Loan.objects.filter(branch=branch, status__in=['APPROVED', 'ACTIVE'])

        # Fallback: check for profile object (backwards compatibility)
        if hasattr(user, 'profile'):
            prow = getattr(user.profile, 'role', None)
            pbranch = getattr(user.profile, 'branch', None)
            if prow == 'LOAN_OFFICER' or prow == 'BRANCH_MANAGER':
                return Loan.objects.filter(branch=pbranch)
            if prow == 'CASHIER':
                return Loan.objects.filter(branch=pbranch, status__in=['APPROVED', 'DISBURSED', 'ACTIVE'])

        return Loan.objects.none()
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return LoanCreateUpdateSerializer
        if self.action == 'retrieve':
            return LoanDetailSerializer
        return LoanListSerializer
    
    def create(self, request, *args, **kwargs):
        """POST /api/loans/ - Create loan in DRAFT."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get product to set default values
        product = serializer.validated_data['product']
        
        user_branch = getattr(request.user, 'branch', None)
        # enforce that client belongs to the same branch as the operator
        client = serializer.validated_data.get('client')
        if client and user_branch and client.branch_id != user_branch.id:
            return Response(
                {'error': 'Client does not belong to your branch.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Prepare additional fields
        save_kwargs = {
            'loan_officer': request.user,
            'branch': user_branch,
            'status': 'DRAFT',
        }
        
        # Set interest_rate from product if available, otherwise default to 0.00
        save_kwargs['interest_rate'] = product.interest_rate if product.interest_rate is not None else Decimal('0.00')
        
        # Set term_months from product if not provided
        if not serializer.validated_data.get('term_months'):
            save_kwargs['term_months'] = product.term_months
        
        # Save with all required fields
        # enforce that client belongs to the same branch as the operator
        client = serializer.validated_data.get('client')
        if client and branch and client.branch_id != branch.id:
            return Response(
                {'error': 'Client does not belong to your branch.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        loan = serializer.save(**save_kwargs)
        
        # Log audit using accounts.AuditLog fields (actor/action/target_type/target_id/summary)
        try:
            ip = None
            if request is not None:
                ip = request.META.get('REMOTE_ADDR') or request.META.get('HTTP_X_FORWARDED_FOR')

            from accounts.models import AuditLog as AccountsAuditLog

            AccountsAuditLog.objects.create(
                actor=request.user,
                action='LOAN_CREATED',
                target_type='LOAN',
                target_id=str(loan.id),
                summary=f"Loan {loan.id} created for client {loan.client.full_name}",
                ip_address=ip,
            )
        except Exception:
            # Audit logging should not block loan creation — swallow errors and continue
            pass
        
        return Response(
            LoanDetailSerializer(loan, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        # ensure branch ownership
        loan = self.get_object()
        user_branch = getattr(request.user, 'branch', None)
        if user_branch and loan.branch_id != user_branch.id:
            return Response({'error': 'Loan not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(loan, data=request.data)
        serializer.is_valid(raise_exception=True)
        client = serializer.validated_data.get('client')
        if client and user_branch and client.branch_id != user_branch.id:
            return Response({'error': 'Client does not belong to your branch.'}, status=status.HTTP_400_BAD_REQUEST)

        self.perform_update(serializer)
        return Response(LoanDetailSerializer(loan, context={'request': request}).data)

    def partial_update(self, request, *args, **kwargs):
        loan = self.get_object()
        user_branch = getattr(request.user, 'branch', None)
        if user_branch and loan.branch_id != user_branch.id:
            return Response({'error': 'Loan not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(loan, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        client = serializer.validated_data.get('client')
        if client and user_branch and client.branch_id != user_branch.id:
            return Response({'error': 'Client does not belong to your branch.'}, status=status.HTTP_400_BAD_REQUEST)

        self.perform_update(serializer)
        return Response(LoanDetailSerializer(loan, context={'request': request}).data)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """POST /api/loans/<id>/submit/ - Submit for approval."""
        loan = self.get_object()
        # Ensure the loan belongs to user's branch
        if getattr(request.user, 'branch', None) and loan.branch_id != request.user.branch_id:
            return Response({'error': 'Loan not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Enforce: submit only from DRAFT or CHANGES_REQUESTED
        if loan.status not in ['DRAFT', 'CHANGES_REQUESTED']:
            return Response(
                {'error': f'Cannot submit loan in {loan.status} status. Only DRAFT or CHANGES_REQUESTED loans can be submitted.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check required documents
        required_docs = LoanProductRequiredDocument.objects.filter(
            product=loan.product,
            is_mandatory=True
        )
        
        uploaded_docs = LoanDocument.objects.filter(
            loan=loan,
            document_type__in=[rd.document_type for rd in required_docs]
        )
        
        uploaded_doc_types = set(uploaded_docs.values_list('document_type_id', flat=True))
        required_doc_types = set(required_docs.values_list('document_type_id', flat=True))
        
        if uploaded_doc_types != required_doc_types:
            missing_types = required_doc_types - uploaded_doc_types
            missing_docs = LoanDocumentType.objects.filter(id__in=missing_types)
            missing_names = [d.name for d in missing_docs]
            
            return Response(
                {'error': f'Missing required documents: {", ".join(missing_names)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        loan.status = 'SUBMITTED'
        loan.submitted_at = timezone.now()
        loan.save()
        
        try:
            AuditLog.objects.create(
                actor=request.user,
                action='LOAN_SUBMITTED',
                target_type='LOAN',
                target_id=str(loan.id),
                summary=f"Loan {loan.id} submitted for approval",
            )
        except Exception:
            pass
        
        return Response(LoanDetailSerializer(loan, context={'request': request}).data)
    
    @action(detail=True, methods=['post'])
    def upload_document(self, request, pk=None):
        """POST /api/loans/<id>/upload_document/ - Upload documents during application."""
        loan = self.get_object()
        
        # Enforce: upload documents only on DRAFT or CHANGES_REQUESTED
        if loan.status not in ['DRAFT', 'CHANGES_REQUESTED']:
            return Response(
                {'error': f'Cannot upload documents to loan in {loan.status} status. Only DRAFT or CHANGES_REQUESTED loans accept documents.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = LoanDocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            doc = serializer.save(
                loan=loan,
                uploaded_by=request.user
            )
            
            return Response(
                LoanDocumentSerializer(doc, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as exc:
            logger.error(f"Error uploading document for loan {loan.id}: {str(exc)}", exc_info=True)
            
            # Handle IntegrityError or other DB errors
            if 'document_type' in str(exc).lower() or 'not null' in str(exc).lower():
                return Response(
                    {'error': 'Document type is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response(
                {'error': 'Failed to upload document. Please try again.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def get_documents(self, request, pk=None):
        """GET /api/loans/<id>/get_documents/"""
        loan = self.get_object()
        documents = LoanDocument.objects.filter(loan=loan)
        serializer = LoanDocumentSerializer(documents, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def upload_documents_bulk(self, request, pk=None):
        """POST /api/loans/<id>/upload_documents_bulk/ - Bulk upload multiple documents in one request.
        
        Expects multipart/form-data with files named: file_<document_type_id>
        Example: file_1, file_2 where 1, 2 are LoanDocumentType IDs
        
        Uses atomic transaction: all-or-nothing. If any file fails, entire request rolls back.
        """
        from django.db import transaction
        
        loan = self.get_object()
        
        # Enforce: upload documents only on DRAFT or CHANGES_REQUESTED
        if loan.status not in ['DRAFT', 'CHANGES_REQUESTED']:
            return Response(
                {'error': f'Cannot upload documents to loan in {loan.status} status. Only DRAFT or CHANGES_REQUESTED loans accept documents.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        files = request.FILES
        if not files:
            return Response(
                {'error': 'No files provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # PRE-VALIDATE all file keys and document types BEFORE entering atomic transaction
        files_to_upload = []
        validation_errors = []
        
        for file_key in files:
            # Extract document_type_id from file key (e.g., "file_1" -> "1")
            if not file_key.startswith('file_'):
                continue
            
            try:
                doc_type_id = int(file_key.replace('file_', ''))
                file_obj = files[file_key]
                
                # Validate document type exists
                if not LoanDocumentType.objects.filter(id=doc_type_id).exists():
                    validation_errors.append(f"Document type {doc_type_id} does not exist.")
                    continue
                
                files_to_upload.append((doc_type_id, file_obj, file_key))
                
            except ValueError:
                validation_errors.append(f"Invalid file key {file_key}: not a valid document type ID.")
        
        # Return validation errors if any
        if validation_errors:
            return Response(
                {'error': 'Validation failed.', 'validation_errors': validation_errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not files_to_upload:
            return Response(
                {'error': 'No valid files to upload.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ATOMIC TRANSACTION: Create all LoanDocument records all-or-nothing
        uploaded_docs = []
        
        try:
            with transaction.atomic():
                for doc_type_id, file_obj, file_key in files_to_upload:
                    # Create LoanDocument with document_type_id directly (no FK query)
                    doc = LoanDocument.objects.create(
                        loan=loan,
                        document_type_id=doc_type_id,
                        document_file=file_obj,
                        uploaded_by=request.user
                    )
                    
                    uploaded_docs.append(
                        LoanDocumentSerializer(doc, context={'request': request}).data
                    )
        
        except Exception as exc:
            logger.error(f"Transaction error in bulk upload for loan {loan.id}: {str(exc)}", exc_info=True)
            return Response(
                {'error': 'Bulk upload failed. Please ensure all files are valid and try again.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate and return missing documents
        required_docs = LoanProductRequiredDocument.objects.filter(
            product=loan.product
        ).values_list('document_type_id', flat=True)
        
        uploaded_doc_types = LoanDocument.objects.filter(
            loan=loan
        ).values_list('document_type_id', flat=True)
        
        missing_type_ids = set(required_docs) - set(uploaded_doc_types)
        missing_docs = LoanDocumentType.objects.filter(id__in=missing_type_ids)
        
        response_data = {
            'uploaded_documents': uploaded_docs,
            'missing_documents': LoanDocumentTypeSerializer(
                missing_docs, many=True, context={'request': request}
            ).data,
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def get_schedule(self, request, pk=None):
        """GET /api/loans/<id>/get_schedule/"""
        loan = self.get_object()
        schedule = RepaymentSchedule.objects.filter(loan=loan)
        from .serializers import RepaymentScheduleSerializer
        serializer = RepaymentScheduleSerializer(schedule, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def post_repayment(self, request, pk=None):
        """POST /api/loans/<id>/post_repayment/ - Record repayment on active loan."""
        loan = self.get_object()
        
        # Enforce: post repayment only on ACTIVE loans
        if loan.status != 'ACTIVE':
            return Response(
                {'error': f'Cannot post repayment on loan in {loan.status} status. Only ACTIVE loans accept repayments.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = RepaymentPostSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        amount = serializer.validated_data['amount']
        
        # Create transaction
        transaction = RepaymentTransaction.objects.create(
            loan=loan,
            amount=amount,
            payment_method=serializer.validated_data['payment_method'],
            payment_reference=serializer.validated_data.get('payment_reference', ''),
            recorded_by=request.user,
            notes=serializer.validated_data.get('notes', '')
        )
        
        # Allocate payment to schedule (penalty -> interest -> principal)
        remaining = amount
        schedules = RepaymentSchedule.objects.filter(loan=loan, is_paid=False).order_by('month_number')
        
        for schedule in schedules:
            if remaining <= 0:
                break
            
            # Penalty first
            penalty_due = schedule.penalty - schedule.penalty_paid
            if penalty_due > 0:
                penalty_payment = min(penalty_due, remaining)
                schedule.penalty_paid += penalty_payment
                remaining -= penalty_payment
            
            # Then interest
            interest_due = schedule.interest_due - schedule.interest_paid
            if interest_due > 0:
                interest_payment = min(interest_due, remaining)
                schedule.interest_paid += interest_payment
                remaining -= interest_payment
            
            # Then principal
            principal_due = schedule.principal_due - schedule.principal_paid
            if principal_due > 0:
                principal_payment = min(principal_due, remaining)
                schedule.principal_paid += principal_payment
                remaining -= principal_payment
            
            # Check if fully paid
            if schedule.balance_due() <= 0:
                schedule.is_paid = True
            
            schedule.save()
        
        # Check if loan is fully paid
        all_paid = RepaymentSchedule.objects.filter(loan=loan).exclude(is_paid=True).count() == 0
        if all_paid:
            loan.status = 'CLOSED'
            loan.closed_at = timezone.now()
            loan.save()

            try:
                AuditLog.objects.create(
                    actor=request.user,
                    action='LOAN_CLOSED',
                    target_type='LOAN',
                    target_id=str(loan.id),
                    summary=f"Loan {loan.id} marked as closed after final repayment",
                )
            except Exception:
                pass
        
        try:
            AuditLog.objects.create(
                actor=request.user,
                action='REPAYMENT_POSTED',
                target_type='LOAN',
                target_id=str(loan.id),
                summary=f"Repayment of {amount} posted to loan {loan.id}",
            )
        except Exception:
            pass

        # If repayment was by cash, post cash inflow
        try:
            if (transaction.payment_method or '').upper() == 'CASH':
                record_cash_loan_repayment(request_user=request.user, amount=transaction.amount, repayment_tx_id=transaction.id)
        except ValidationError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            pass
        
        from .serializers import RepaymentTransactionSerializer
        return Response(
            RepaymentTransactionSerializer(transaction).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def waive_penalty(self, request, pk=None):
        """POST /api/loans/<id>/waive_penalty/"""
        loan = self.get_object()
        
        serializer = PenaltyWaiverRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        schedule_entry_id = serializer.validated_data.get('schedule_entry_id')
        waived_amount = serializer.validated_data['waived_amount']
        reason = serializer.validated_data['reason']
        
        schedule = None
        if schedule_entry_id:
            schedule = get_object_or_404(RepaymentSchedule, id=schedule_entry_id, loan=loan)
        
        waiver = PenaltyWaiver.objects.create(
            loan=loan,
            schedule_entry=schedule,
            waived_amount=waived_amount,
            waived_by=request.user,
            reason=reason
        )
        
        # Adjust schedule if applicable
        if schedule:
            schedule.penalty = max(Decimal('0.00'), schedule.penalty - waived_amount)
            schedule.save()
        
        try:
            AuditLog.objects.create(
                actor=request.user,
                action='PENALTY_WAIVED',
                target_type='LOAN',
                target_id=str(loan.id),
                summary=f"Penalty of {waived_amount} waived on loan {loan.id}. Reason: {reason}",
            )
        except Exception:
            pass
        
        from .serializers import PenaltyWaiverSerializer
        return Response(
            PenaltyWaiverSerializer(waiver).data,
            status=status.HTTP_201_CREATED
        )


class BranchManagerLoanViewSet(viewsets.ViewSet):
    """Branch Manager loan review and approval."""
    permission_classes = [IsAuthenticated, IsBranchManager]
    
    @action(detail=False, methods=['get'])
    def submitted(self, request):
        """GET /api/branch-manager/loans/submitted/"""
        loans = Loan.objects.filter(
            status='SUBMITTED',
            branch=getattr(request.user, 'branch', None)
        ).order_by('-submitted_at')
        
        serializer = LoanListSerializer(loans, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='(?P<loan_id>[^/.]+)')
    def retrieve(self, request, loan_id=None):
        """GET /api/branch-manager/loans/<id>/ - Retrieve specific loan details for branch manager."""
        if not loan_id:
            return Response({'error': 'Loan ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        loan = get_object_or_404(Loan, id=loan_id, branch=getattr(request.user, 'branch', None))
        serializer = LoanDetailSerializer(loan, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='(?P<loan_id>[^/.]+)/approve')
    def approve(self, request, loan_id=None):
        """POST /api/branch-manager/loans/<id>/approve/ - Approve submitted loan."""
        loan = get_object_or_404(Loan, id=loan_id, branch=getattr(request.user, 'branch', None))
        
        # Enforce: approve only SUBMITTED loans
        if loan.status != 'SUBMITTED':
            return Response(
                {'error': f'Cannot approve loan in {loan.status} status. Only SUBMITTED loans can be approved.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        loan.status = 'APPROVED'
        loan.approved_at = timezone.now()
        loan.branch_manager = request.user
        loan.bm_remarks = ''
        loan.save()
        
        try:
            AuditLog.objects.create(
                actor=request.user,
                action='LOAN_APPROVED',
                target_type='LOAN',
                target_id=str(loan.id),
                summary=f"Loan {loan.id} approved by branch manager",
            )
        except Exception:
            pass
        
        return Response(LoanDetailSerializer(loan, context={'request': request}).data)
    
    @action(detail=False, methods=['post'], url_path='(?P<loan_id>[^/.]+)/reject')
    def reject(self, request, loan_id=None):
        """POST /api/branch-manager/loans/<id>/reject/ - Reject submitted loan."""
        loan = get_object_or_404(Loan, id=loan_id, branch=getattr(request.user, 'branch', None))
        
        # Enforce: reject only SUBMITTED loans
        if loan.status != 'SUBMITTED':
            return Response(
                {'error': f'Cannot reject loan in {loan.status} status. Only SUBMITTED loans can be rejected.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        remarks = request.data.get('remarks', '')
        
        loan.status = 'REJECTED'
        loan.branch_manager = request.user
        loan.bm_remarks = remarks
        loan.save()
        
        try:
            AuditLog.objects.create(
                actor=request.user,
                action='LOAN_REJECTED',
                target_type='LOAN',
                target_id=str(loan.id),
                summary=f"Loan {loan.id} rejected. Remarks: {remarks}",
            )
        except Exception:
            pass
        
        return Response(LoanDetailSerializer(loan, context={'request': request}).data)
    
    @action(detail=False, methods=['post'], url_path='(?P<loan_id>[^/.]+)/request-changes')
    def request_changes(self, request, loan_id=None):
        """POST /api/branch-manager/loans/<id>/request-changes/ - Request changes on submitted loan."""
        loan = get_object_or_404(Loan, id=loan_id, branch=getattr(request.user, 'branch', None))
        
        # Enforce: request changes only on SUBMITTED loans
        if loan.status != 'SUBMITTED':
            return Response(
                {'error': f'Cannot request changes on loan in {loan.status} status. Only SUBMITTED loans can have changes requested.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        remarks = request.data.get('remarks', '')
        
        loan.status = 'CHANGES_REQUESTED'
        loan.branch_manager = request.user
        loan.bm_remarks = remarks
        loan.save()
        
        try:
            AuditLog.objects.create(
                actor=request.user,
                action='LOAN_CHANGES_REQUESTED',
                target_type='LOAN',
                target_id=str(loan.id),
                summary=f"Changes requested on loan {loan.id}. Remarks: {remarks}",
            )
        except Exception:
            pass
        
        return Response(LoanDetailSerializer(loan, context={'request': request}).data)


class CashierLoanViewSet(viewsets.ViewSet):
    """Cashier disbursement and repayment."""
    permission_classes = [IsAuthenticated, IsCashier]
    
    @action(detail=False, methods=['get'])
    def approved(self, request):
        """GET /api/cashier/loans/approved/"""
        loans = Loan.objects.filter(
            status='APPROVED',
            branch=getattr(request.user, 'branch', None)
        ).order_by('-approved_at')
        serializer = LoanListSerializer(loans, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='(?P<loan_id>[^/.]+)/disburse')
    def disburse(self, request, loan_id=None):
        """POST /api/cashier/loans/<id>/disburse/ - Disburse approved loan."""
        loan = get_object_or_404(
            Loan,
            id=loan_id,
            branch=getattr(request.user, 'branch', None)
        )
        
        # Enforce: disburse only APPROVED loans
        if loan.status != 'APPROVED':
            return Response(
                {'error': f'Cannot disburse loan in {loan.status} status. Only APPROVED loans can be disbursed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = LoanDisburseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update loan directly to ACTIVE (skip transient DISBURSED state)
        loan.status = 'ACTIVE'
        loan.disbursement_method = serializer.validated_data['disbursement_method']
        loan.disbursement_reference = serializer.validated_data.get('disbursement_reference', '')
        loan.disbursed_at = timezone.now()
        loan.save()
        
        # Generate repayment schedule
        principal_per_month = loan.amount / Decimal(loan.term_months)
        monthly_rate = loan.interest_rate / Decimal(100) / Decimal(12)
        
        start_date = timezone.now().date()
        
        for month in range(1, loan.term_months + 1):
            due_date = start_date + timedelta(days=30*month)
            
            # Simple interest calculation per month
            interest_due = loan.amount * monthly_rate
            
            RepaymentSchedule.objects.create(
                loan=loan,
                month_number=month,
                due_date=due_date,
                principal_due=principal_per_month,
                interest_due=interest_due,
                penalty=Decimal('0.00')
            )
        
        try:
            AuditLog.objects.create(
                actor=request.user,
                action='LOAN_DISBURSED',
                target_type='LOAN',
                target_id=str(loan.id),
                summary=f"Loan {loan.id} disbursed via {loan.disbursement_method}",
            )
        except Exception:
            pass

        # If disbursed in cash, record cash outflow
        try:
            if (loan.disbursement_method or '').upper() == 'CASH':
                record_cash_loan_disbursement(request_user=request.user, amount=loan.amount, loan_id=loan.id)
        except ValidationError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            pass
        
        return Response(LoanDetailSerializer(loan, context={'request': request}).data)