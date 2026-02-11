from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import Client, KYC, KYCDocument
from .serializers import (
    ClientSerializer, KYCSerializer, KYCDocumentSerializer,
    InitiateKYCSerializer, ApproveKYCSerializer, RejectKYCSerializer
)
from .permissions import IsCashierOrBranchManagerReadOnly
from accounts.models import AuditLog
from accounts.utils import create_audit_log, get_client_ip


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    queryset = Client.objects.all()
    permission_classes = (IsCashierOrBranchManagerReadOnly,)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        params = self.request.query_params

        # Branch managers see only clients in their branch
        if user.role == 'BRANCH_MANAGER' and user.branch:
            qs = qs.filter(branch=user.branch)

        # Filters: branch, status, name
        branch = params.get('branch')
        status_param = params.get('status')
        name = params.get('name')

        if branch:
            qs = qs.filter(branch__id=branch)
        if status_param:
            qs = qs.filter(status__iexact=status_param)
        if name:
            qs = qs.filter(full_name__icontains=name)

        return qs

    def perform_create(self, serializer):
        client = serializer.save()
        # Audit log
        try:
            AuditLog.objects.create(
                actor=self.request.user,
                action='CLIENT_CREATED',
                target_type='Client',
                target_id=str(client.client_number),
                summary=f'Client {client.full_name} created by {self.request.user}',
            )
        except Exception:
            pass

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        client = serializer.save()

        if old_status != client.status:
            try:
                AuditLog.objects.create(
                    actor=self.request.user,
                    action='CLIENT_STATUS_CHANGED',
                    target_type='Client',
                    target_id=str(client.client_number),
                    summary=(
                        f'Client {client.full_name} status changed '
                        f'from {old_status} to {client.status} by {self.request.user}'
                    ),
                )
            except Exception:
                pass

    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        """
        Soft deactivate a client.
        Only allowed for Cashier and Branch Manager after KYC is approved.
        No hard deletes are allowed in this system.
        """
        client = get_object_or_404(Client, pk=pk)
        
        # Check if user has permission (Cashier or Branch Manager)
        if request.user.role not in ['CASHIER', 'BRANCH_MANAGER']:
            return Response(
                {'detail': 'You do not have permission to deactivate clients.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Branch Manager can only deactivate clients in their branch
        if request.user.role == 'BRANCH_MANAGER' and client.branch != request.user.branch:
            return Response(
                {'detail': 'You can only deactivate clients in your branch.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if KYC is approved (only allow deactivation after approval)
        try:
            kyc = client.kyc
            if kyc.status != 'APPROVED':
                return Response(
                    {'detail': 'Client can only be deactivated after KYC is approved.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except KYC.DoesNotExist:
            return Response(
                {'detail': 'Client KYC must be approved before deactivation.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = client.status
        client.status = 'INACTIVE'
        client.save()

        create_audit_log(
            actor=request.user,
            action='CLIENT_DEACTIVATED',
            target_type='Client',
            target_id=str(client.client_number),
            summary=f'Client {client.full_name} deactivated by {request.user}',
            ip_address=get_client_ip(request)
        )

        return Response(
            {'detail': 'Client deactivated.'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='initiate-kyc')
    def initiate_kyc(self, request, pk=None):
        """Initiate KYC for a client (Cashier only)"""
        client = get_object_or_404(Client, pk=pk)
        
        if request.user.role != 'CASHIER':
            return Response(
                {'detail': 'Only cashiers can initiate KYC.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if KYC already exists
        if hasattr(client, 'kyc'):
            return Response(
                {'detail': 'KYC already exists for this client.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create KYC
        kyc = KYC.objects.create(
            client=client,
            status='PENDING',
            initiated_by=request.user
        )
        
        create_audit_log(
            actor=request.user,
            action='KYC_INITIATED',
            target_type='KYC',
            target_id=str(kyc.id),
            summary=f'KYC initiated for client {client.full_name} by {request.user}',
            ip_address=get_client_ip(request)
        )
        
        serializer = KYCSerializer(kyc)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='kyc')
    def get_kyc(self, request, pk=None):
        """Get KYC details for a client"""
        client = get_object_or_404(Client, pk=pk)
        
        # Check permissions
        if request.user.role not in ['CASHIER', 'BRANCH_MANAGER']:
            return Response(
                {'detail': 'You do not have permission to view KYC.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Branch Manager can only view KYC for clients in their branch
        if request.user.role == 'BRANCH_MANAGER' and client.branch != request.user.branch:
            return Response(
                {'detail': 'You can only view KYC for clients in your branch.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            kyc = client.kyc
            serializer = KYCSerializer(kyc)
            return Response(serializer.data)
        except KYC.DoesNotExist:
            return Response(
                {'detail': 'KYC not found for this client.'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], url_path='kyc/upload-documents', parser_classes=[MultiPartParser, FormParser])
    def upload_kyc_documents(self, request, pk=None):
        """Upload multiple documents for KYC (Cashier only)"""
        client = get_object_or_404(Client, pk=pk)
        
        if request.user.role != 'CASHIER':
            return Response(
                {'detail': 'Only cashiers can upload KYC documents.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            kyc = client.kyc
        except KYC.DoesNotExist:
            return Response(
                {'detail': 'KYC not initiated. Please initiate KYC first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update KYC status to SUBMITTED if it was PENDING or REJECTED
        if kyc.status in ['PENDING', 'REJECTED']:
            kyc.status = 'SUBMITTED'
            kyc.rejection_reason = None  # Clear rejection reason when resubmitting
            kyc.save()
        
        # Expected format: files with keys like 'national_id', 'proof_of_address', 'photo', 'other'
        document_type_mapping = {
            'national_id': 'NATIONAL_ID',
            'proof_of_address': 'PROOF_OF_ADDRESS',
            'photo': 'PHOTO',
            'other': 'OTHER',
        }
        
        uploaded_documents = []
        errors = []
        
        for field_name, document_type in document_type_mapping.items():
            # We accept one file per type; if multiple provided, take the last one.
            files = request.FILES.getlist(field_name)
            if not files:
                continue

            file = files[-1]

            # Validate using existing serializer (keeps your current validation approach)
            serializer = KYCDocumentSerializer(
                data={'document_type': document_type, 'file': file},
                context={'request': request}
            )
            if not serializer.is_valid():
                errors.append({field_name: serializer.errors})
                continue

            # UPSERT: one document per (kyc, document_type)
            document, created = KYCDocument.objects.get_or_create(
                kyc=kyc,
                document_type=document_type,
                defaults={
                    'uploaded_by': request.user,
                    'file': file,
                }
            )

            if not created:
                # Replace existing file; model.save() deletes old file
                document.uploaded_by = request.user
                document.file = file
                document.save()

            uploaded_documents.append(document)

            create_audit_log(
                actor=request.user,
                action='KYC_DOCUMENT_UPLOADED' if created else 'KYC_DOCUMENT_REPLACED',
                target_type='KYCDocument',
                target_id=str(document.id),
                summary=(
                    f'KYC document ({document.get_document_type_display()}) '
                    f'{"uploaded" if created else "replaced"} for client {client.full_name} by {request.user}'
                ),
                ip_address=get_client_ip(request)
            )
        
        if uploaded_documents:
            return Response(
                {
                    'detail': f'Successfully uploaded {len(uploaded_documents)} document(s).',
                    'documents': KYCDocumentSerializer(uploaded_documents, many=True).data,
                    'errors': errors if errors else None,
                },
                status=status.HTTP_201_CREATED
            )
        else:
            return Response(
                {'detail': 'No valid files were uploaded.', 'errors': errors},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], url_path='kyc/approve')
    def approve_kyc(self, request, pk=None):
        """Approve KYC and activate client (Branch Manager only)"""
        client = get_object_or_404(Client, pk=pk)
        
        if request.user.role != 'BRANCH_MANAGER':
            return Response(
                {'detail': 'Only branch managers can approve KYC.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Branch Manager can only approve KYC for clients in their branch
        if client.branch != request.user.branch:
            return Response(
                {'detail': 'You can only approve KYC for clients in your branch.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            kyc = client.kyc
        except KYC.DoesNotExist:
            return Response(
                {'detail': 'KYC not found for this client.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if kyc.status == 'APPROVED':
            return Response(
                {'detail': 'KYC is already approved.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if kyc.status != 'SUBMITTED':
            return Response(
                {'detail': 'KYC must be submitted before approval.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if documents exist
        if not kyc.documents.exists():
            return Response(
                {'detail': 'Cannot approve KYC without documents.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            kyc.status = 'APPROVED'
            kyc.reviewed_by = request.user
            kyc.rejection_reason = None
            kyc.save()
            
            # Activate client
            client.status = 'ACTIVE'
            client.save()
        
        create_audit_log(
            actor=request.user,
            action='KYC_APPROVED',
            target_type='KYC',
            target_id=str(kyc.id),
            summary=f'KYC approved and client {client.full_name} activated by {request.user}',
            ip_address=get_client_ip(request)
        )
        
        serializer = KYCSerializer(kyc)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='kyc/reject')
    def reject_kyc(self, request, pk=None):
        """Reject KYC and return to cashier (Branch Manager only)"""
        client = get_object_or_404(Client, pk=pk)
        
        if request.user.role != 'BRANCH_MANAGER':
            return Response(
                {'detail': 'Only branch managers can reject KYC.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Branch Manager can only reject KYC for clients in their branch
        if client.branch != request.user.branch:
            return Response(
                {'detail': 'You can only reject KYC for clients in your branch.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            kyc = client.kyc
        except KYC.DoesNotExist:
            return Response(
                {'detail': 'KYC not found for this client.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = RejectKYCSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        rejection_reason = serializer.validated_data['rejection_reason']
        
        kyc.status = 'REJECTED'
        kyc.reviewed_by = request.user
        kyc.rejection_reason = rejection_reason
        kyc.save()
        
        create_audit_log(
            actor=request.user,
            action='KYC_REJECTED',
            target_type='KYC',
            target_id=str(kyc.id),
            summary=f'KYC rejected for client {client.full_name} by {request.user}. Reason: {rejection_reason}',
            ip_address=get_client_ip(request)
        )
        
        serializer_response = KYCSerializer(kyc)
        return Response(serializer_response.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        """
        Explicitly block hard deletes.
        """
        return Response(
            {
                'detail': 'Hard delete is not allowed. Use deactivate instead.'
            },
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
