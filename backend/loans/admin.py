from django.contrib import admin
from .models import (
    LoanProduct, LoanDocumentType, LoanProductRequiredDocument,
    Loan, LoanDocument, RepaymentSchedule, RepaymentTransaction, PenaltyWaiver
)


@admin.register(LoanProduct)
class LoanProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'product_type', 'min_amount', 'max_amount', 'interest_rate', 'term_months', 'active')
    list_filter = ('product_type', 'active')
    search_fields = ('name',)


@admin.register(LoanDocumentType)
class LoanDocumentTypeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')
    search_fields = ('code', 'name')


@admin.register(LoanProductRequiredDocument)
class LoanProductRequiredDocumentAdmin(admin.ModelAdmin):
    list_display = ('product', 'document_type', 'is_mandatory')
    list_filter = ('product', 'is_mandatory')


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ('id', 'client', 'product', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at', 'branch')
    search_fields = ('client__full_name', 'id')
    readonly_fields = ('created_at', 'submitted_at', 'approved_at', 'disbursed_at', 'closed_at')
    fieldsets = (
        ('Loan Information', {
            'fields': ('client', 'product', 'branch', 'amount', 'interest_rate', 'term_months', 'status')
        }),
        ('Dates', {
            'fields': ('created_at', 'submitted_at', 'approved_at', 'disbursed_at', 'closed_at')
        }),
        ('Disbursement', {
            'fields': ('disbursement_method', 'disbursement_reference')
        }),
        ('Review', {
            'fields': ('loan_officer', 'branch_manager', 'bm_remarks')
        }),
    )


@admin.register(LoanDocument)
class LoanDocumentAdmin(admin.ModelAdmin):
    list_display = ('id', 'loan', 'document_type', 'uploaded_by', 'uploaded_at')
    list_filter = ('uploaded_at', 'document_type')
    search_fields = ('loan__id', 'label')


@admin.register(RepaymentSchedule)
class RepaymentScheduleAdmin(admin.ModelAdmin):
    list_display = ('loan', 'month_number', 'due_date', 'principal_due', 'is_paid')
    list_filter = ('is_paid', 'due_date')
    search_fields = ('loan__id',)


@admin.register(RepaymentTransaction)
class RepaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ('loan', 'amount', 'payment_method', 'paid_at', 'recorded_by')
    list_filter = ('payment_method', 'paid_at')
    search_fields = ('loan__id', 'payment_reference')


@admin.register(PenaltyWaiver)
class PenaltyWaiverAdmin(admin.ModelAdmin):
    list_display = ('loan', 'waived_amount', 'waived_by', 'waived_at')
    list_filter = ('waived_at',)
    search_fields = ('loan__id', 'reason')
