from rest_framework import serializers
from .models import (
    LoanProduct, LoanDocumentType, LoanProductRequiredDocument,
    Loan, LoanDocument, RepaymentSchedule, RepaymentTransaction, PenaltyWaiver
)
from clients.models import Client, KYC
from clients.models import KYCDocument
from django.utils import timezone
from django.db.utils import ProgrammingError
from decimal import Decimal


class LoanProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanProduct
        fields = ['id', 'name', 'product_type', 'description', 'min_amount', 'max_amount', 
                  'interest_rate', 'term_months', 'active']


class LoanDocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanDocumentType
        fields = ['id', 'code', 'name', 'description']


class LoanProductRequiredDocumentSerializer(serializers.ModelSerializer):
    document_type = LoanDocumentTypeSerializer()
    
    class Meta:
        model = LoanProductRequiredDocument
        fields = ['id', 'document_type', 'is_mandatory']


class LoanProductDetailSerializer(serializers.ModelSerializer):
    required_documents = LoanProductRequiredDocumentSerializer(many=True)
    
    class Meta:
        model = LoanProduct
        fields = ['id', 'name', 'product_type', 'description', 'min_amount', 'max_amount', 
                  'interest_rate', 'term_months', 'active', 'required_documents']


class LoanDocumentSerializer(serializers.ModelSerializer):
    document_type_name = serializers.CharField(source='document_type.name', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    document_file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = LoanDocument
        fields = ['id', 'document_type', 'document_type_name', 'document_file', 'document_file_url',
                  'label', 'description', 'uploaded_by_name', 'uploaded_at']
    
    def get_document_file_url(self, obj):
        if obj.document_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document_file.url)
            return obj.document_file.url
        return None


class RepaymentScheduleSerializer(serializers.ModelSerializer):
    balance_due = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = RepaymentSchedule
        fields = ['id', 'month_number', 'due_date', 'principal_due', 'interest_due', 'penalty',
                  'principal_paid', 'interest_paid', 'penalty_paid', 'is_paid', 'balance_due', 'is_overdue']
    
    def get_balance_due(self, obj):
        return float(obj.balance_due())
    
    def get_is_overdue(self, obj):
        return obj.due_date < timezone.now().date() and not obj.is_paid


class RepaymentTransactionSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.username', read_only=True)
    
    class Meta:
        model = RepaymentTransaction
        fields = ['id', 'amount', 'payment_method', 'payment_reference', 'paid_at', 
                  'recorded_by_name', 'notes']


class PenaltyWaiverSerializer(serializers.ModelSerializer):
    waived_by_name = serializers.CharField(source='waived_by.username', read_only=True)
    
    class Meta:
        model = PenaltyWaiver
        fields = ['id', 'waived_amount', 'waived_by_name', 'waived_at', 'reason']


class LoanListSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = Loan
        fields = ['id', 'client', 'client_name', 'product_name', 'amount', 'purpose', 'term_months', 'status', 
                  'created_at', 'submitted_at', 'approved_at', 'disbursed_at']


class LoanDetailSerializer(serializers.ModelSerializer):
    client = serializers.SerializerMethodField()
    product = LoanProductDetailSerializer()
    documents = LoanDocumentSerializer(many=True, read_only=True)
    schedule = RepaymentScheduleSerializer(many=True, read_only=True)
    repayments = RepaymentTransactionSerializer(many=True, read_only=True)
    loan_officer_name = serializers.CharField(source='loan_officer.get_full_name', read_only=True)
    branch_manager_name = serializers.CharField(source='branch_manager.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = Loan
        fields = ['id', 'client', 'product', 'amount', 'interest_rate', 'term_months', 'purpose', 'status',
                  'created_at', 'submitted_at', 'approved_at', 'disbursed_at', 'closed_at',
                  'disbursement_method', 'disbursement_reference',
                  'loan_officer_name', 'branch_manager_name', 'bm_remarks',
                  'documents', 'schedule', 'repayments']
    
    def get_client(self, obj):
        kyc_status = None
        try:
            kyc = KYC.objects.get(client=obj.client)
            kyc_status = kyc.status
        except KYC.DoesNotExist:
            pass
        
        return {
            'id': obj.client.id,
            'full_name': obj.client.full_name,
            'national_id': obj.client.national_id,
            'phone': obj.client.phone,
            'email': obj.client.email,
            'status': obj.client.status,
            'kyc_status': kyc_status,
        }

    def to_representation(self, instance):
        """Return safe representation even if related schedule table is missing.

        This prevents a 500 when the DB lacks the repayment schedule table
        by falling back to a partial representation (without schedule/repayments).
        """
        try:
            return super().to_representation(instance)
        except ProgrammingError as exc:
            # If the repayment schedule table is missing, return a safe minimal
            # representation so API clients don't see a 500 error.
            msg = str(exc)
            if 'repaymentschedule' in msg.lower() or 'loans_repaymentschedule' in msg.lower():
                data = {
                    'id': instance.id,
                    'client': self.get_client(instance),
                    'product': LoanProductDetailSerializer(instance.product).data,
                    'amount': instance.amount,
                    'interest_rate': instance.interest_rate,
                    'term_months': instance.term_months,
                    'purpose': instance.purpose,
                    'status': instance.status,
                    'created_at': instance.created_at,
                    'submitted_at': instance.submitted_at,
                    'approved_at': instance.approved_at,
                    'disbursed_at': instance.disbursed_at,
                    'closed_at': instance.closed_at,
                    'disbursement_method': instance.disbursement_method,
                    'disbursement_reference': instance.disbursement_reference,
                    'loan_officer_name': getattr(instance.loan_officer, 'get_full_name', None) if instance.loan_officer else None,
                    'branch_manager_name': getattr(instance.branch_manager, 'get_full_name', None) if instance.branch_manager else None,
                    'bm_remarks': instance.bm_remarks,
                    'documents': [],
                    'schedule': [],
                    'repayments': [],
                }
                return data
            raise


class LoanCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loan
        fields = ['client', 'product', 'amount', 'term_months', 'purpose']
        extra_kwargs = {
            'term_months': {'required': False},
        }
    
    def validate_amount(self, value):
        product = self.initial_data.get('product')
        if product:
            try:
                product_obj = LoanProduct.objects.get(id=product)
                if value < product_obj.min_amount or value > product_obj.max_amount:
                    raise serializers.ValidationError(
                        f"Amount must be between {product_obj.min_amount} and {product_obj.max_amount}"
                    )
            except LoanProduct.DoesNotExist:
                pass
        return value
    
    def validate(self, data):
        client = data.get('client')
        if client:
            # Check for active loans
            active_loans = Loan.objects.filter(
                client=client,
                status__in=['DISBURSED', 'ACTIVE']
            )
            if active_loans.exists():
                raise serializers.ValidationError("Client already has an active loan")
        return data


class LoanSubmitSerializer(serializers.Serializer):
    """Serializer for loan submission validation."""
    pass


class LoanDocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanDocument
        fields = ['document_type', 'document_file', 'label', 'description']


class LoanApprovalSerializer(serializers.Serializer):
    approve = serializers.BooleanField()
    remarks = serializers.CharField(required=False, allow_blank=True)


class LoanDisburseSerializer(serializers.Serializer):
    disbursement_method = serializers.ChoiceField(choices=['CASH', 'BANK_TRANSFER', 'SAVINGS_CREDIT'])
    disbursement_reference = serializers.CharField(max_length=200, required=False, allow_blank=True)
    
    def validate(self, data):
        method = data.get('disbursement_method')
        reference = data.get('disbursement_reference', '')
        
        if method in ['BANK_TRANSFER']:
            if not reference or not reference.strip():
                raise serializers.ValidationError("Transfer reference is required for bank transfers")
        
        return data


class RepaymentPostSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_method = serializers.ChoiceField(choices=['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHECK'])
    payment_reference = serializers.CharField(max_length=200, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class PenaltyWaiverRequestSerializer(serializers.Serializer):
    schedule_entry_id = serializers.IntegerField(required=False)
    waived_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    reason = serializers.CharField()
