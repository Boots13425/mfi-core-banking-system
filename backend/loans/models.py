from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from clients.models import Client
from accounts.models import Branch, AuditLog
from django.utils import timezone
from decimal import Decimal
import os


def loan_doc_upload_path(instance, filename):
    """Generate file path for loan documents."""
    return os.path.join('loan_documents', str(instance.loan.id), filename)


class LoanProduct(models.Model):
    """Loan product definitions (Salary, Business, Emergency, Agriculture)."""
    PRODUCT_TYPES = (
        ('SALARY', 'Salary Loan'),
        ('BUSINESS', 'Business Loan'),
        ('EMERGENCY', 'Emergency Loan'),
        ('AGRICULTURE', 'Agriculture Loan'),
    )
    
    name = models.CharField(max_length=100, unique=True)
    product_type = models.CharField(max_length=20, choices=PRODUCT_TYPES)
    description = models.TextField(blank=True)
    min_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    max_amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, help_text="Annual interest rate (%)", validators=[MinValueValidator(Decimal('0.00'))])
    term_months = models.IntegerField(help_text="Loan term in months", validators=[MinValueValidator(1)])
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name


class LoanDocumentType(models.Model):
    """Required loan document types per product."""
    DOCUMENT_TYPES = (
        ('PAYSLIP', 'Payslip / Salary Statement'),
        ('EMPLOYER_ATTESTATION', 'Employer Attestation'),
        ('BANK_STATEMENT', 'Bank Statement'),
        ('SALARY_DOMICILIATION', 'Salary Domiciliation Letter'),
        ('BUSINESS_PROOF', 'Proof of Business Activity'),
        ('TRADE_REGISTER', 'Trade Register / RCCM'),
        ('MOBILE_MONEY', 'Mobile Money Statement'),
        ('CASHFLOW_SUMMARY', 'Cashflow Summary'),
        ('GUARANTOR_FORM', 'Guarantor Form'),
        ('EMERGENCY_JUSTIFICATION', 'Emergency Justification'),
        ('INCOME_PROOF', 'Income Proof'),
        ('FARM_PROOF', 'Proof of Farm Activity'),
        ('PROFORMA_INVOICE', 'Proforma Invoice'),
        ('SEASONAL_PLAN', 'Seasonal Plan'),
        ('OTHER_LOAN_DOCUMENT', 'Other Document'),
    )
    
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=150, choices=DOCUMENT_TYPES)
    description = models.TextField(blank=True)
    
    class Meta:
        ordering = ['code']
    
    def __str__(self):
        return self.name


class LoanProductRequiredDocument(models.Model):
    """Mapping of required documents for each loan product."""
    product = models.ForeignKey(LoanProduct, on_delete=models.CASCADE, related_name='required_documents')
    document_type = models.ForeignKey(LoanDocumentType, on_delete=models.CASCADE)
    is_mandatory = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('product', 'document_type')
    
    def __str__(self):
        return f"{self.product.name} - {self.document_type.name}"


class Loan(models.Model):
    """Main loan record."""
    LOAN_STATUS = (
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted for Approval'),
        ('CHANGES_REQUESTED', 'Changes Requested'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('DISBURSED', 'Disbursed'),
        ('ACTIVE', 'Active'),
        ('CLOSED', 'Closed'),
    )
    
    DISBURSEMENT_METHODS = (
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('SAVINGS_CREDIT', 'Savings Credit'),
    )
    
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='loans')
    product = models.ForeignKey(LoanProduct, on_delete=models.PROTECT)
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, null=True, blank=True)
    
    # Loan details
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    term_months = models.IntegerField(validators=[MinValueValidator(1)])
    purpose = models.TextField(blank=True, null=True, help_text="Purpose of the loan")
    status = models.CharField(max_length=20, choices=LOAN_STATUS, default='DRAFT')
    
    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    disbursed_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    
    # Disbursement
    disbursement_method = models.CharField(max_length=20, choices=DISBURSEMENT_METHODS, null=True, blank=True)
    disbursement_reference = models.CharField(max_length=200, blank=True, default="", help_text="Disbursement reference number")

    
    # Tracking
    loan_officer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='loans_created')
    branch_manager = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='loans_reviewed')
    
    # Branch manager remarks
    bm_remarks = models.TextField(blank=True, default="", help_text="Branch manager remarks for changes requested")
    rejection_reason = models.TextField(blank=True, default="", help_text="Reason for loan rejection")
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Loan {self.id} - {self.client.full_name} - {self.status}"
    
    def is_active_for_client(self):
        """Check if loan is currently active for the client."""
        return self.status in ['DISBURSED', 'ACTIVE']


class LoanDocument(models.Model):
    """Documents uploaded for a specific loan."""
    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name='documents')
    document_type = models.ForeignKey(LoanDocumentType, on_delete=models.PROTECT, null=True, blank=True)
    document_file = models.FileField(upload_to=loan_doc_upload_path)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    # For optional/extra documents
    label = models.CharField(max_length=200, blank=True, help_text="Label for other documents")
    description = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.loan} - {self.document_type}"


class RepaymentSchedule(models.Model):
    """Loan repayment schedule (auto-generated on disbursement)."""
    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name='schedule')
    month_number = models.IntegerField()  # 1 to N
    due_date = models.DateField()
    principal_due = models.DecimalField(max_digits=12, decimal_places=2)
    interest_due = models.DecimalField(max_digits=12, decimal_places=2)
    penalty = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    principal_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    interest_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    penalty_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    
    is_paid = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ('loan', 'month_number')
        ordering = ['month_number']
    
    def __str__(self):
        return f"{self.loan} - Month {self.month_number}"
    
    def balance_due(self):
        """Calculate remaining balance."""
        return (self.principal_due - self.principal_paid) + (self.interest_due - self.interest_paid) + (self.penalty - self.penalty_paid)


class RepaymentTransaction(models.Model):
    """Individual repayment transactions."""
    PAYMENT_METHODS = (
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('MOBILE_MONEY', 'Mobile Money'),
        ('CHECK', 'Check'),
    )
    
    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name='repayments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    payment_reference = models.CharField(max_length=200, blank=True)
    paid_at = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-paid_at']
    
    def __str__(self):
        return f"{self.loan} - {self.amount} on {self.paid_at}"


class PenaltyWaiver(models.Model):
    """Track penalty waivers."""
    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name='penalty_waivers')
    schedule_entry = models.ForeignKey(RepaymentSchedule, on_delete=models.CASCADE, null=True, blank=True)
    waived_amount = models.DecimalField(max_digits=12, decimal_places=2)
    waived_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    waived_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(help_text="Reason for waiver")
    
    class Meta:
        ordering = ['-waived_at']
    
    def __str__(self):
        return f"{self.loan} - Waived {self.waived_amount}"
