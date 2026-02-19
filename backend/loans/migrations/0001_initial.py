# Generated migration for loans app

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
import loans.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0001_initial'),  # accounts provides Branch
        ('clients', '0001_initial'),  # clients provides Client and KYC
    ]

    operations = [
        migrations.CreateModel(
            name='LoanProduct',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('product_type', models.CharField(choices=[('SALARY', 'Salary Loan'), ('BUSINESS', 'Business Loan'), ('EMERGENCY', 'Emergency Loan'), ('AGRICULTURE', 'Agriculture Loan')], max_length=20)),
                ('description', models.TextField(blank=True)),
                ('min_amount', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(0.01)])),
                ('max_amount', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(0.01)])),
                ('interest_rate', models.DecimalField(decimal_places=2, help_text='Annual interest rate (%)', max_digits=5, validators=[django.core.validators.MinValueValidator(0.0)])),
                ('tenure_months', models.IntegerField(help_text='Loan tenure in months', validators=[django.core.validators.MinValueValidator(1)])),
                ('active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='LoanDocumentType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=50, unique=True)),
                ('name', models.CharField(choices=[('PAYSLIP', 'Payslip / Salary Statement'), ('EMPLOYER_ATTESTATION', 'Employer Attestation'), ('BANK_STATEMENT', 'Bank Statement'), ('SALARY_DOMICILIATION', 'Salary Domiciliation Letter'), ('BUSINESS_PROOF', 'Proof of Business Activity'), ('TRADE_REGISTER', 'Trade Register / RCCM'), ('MOBILE_MONEY', 'Mobile Money Statement'), ('CASHFLOW_SUMMARY', 'Cashflow Summary'), ('GUARANTOR_FORM', 'Guarantor Form'), ('EMERGENCY_JUSTIFICATION', 'Emergency Justification'), ('INCOME_PROOF', 'Income Proof'), ('FARM_PROOF', 'Proof of Farm Activity'), ('PROFORMA_INVOICE', 'Proforma Invoice'), ('SEASONAL_PLAN', 'Seasonal Plan'), ('OTHER_LOAN_DOCUMENT', 'Other Document')], max_length=150)),
                ('description', models.TextField(blank=True)),
            ],
            options={
                'ordering': ['code'],
            },
        ),
        migrations.CreateModel(
            name='RepaymentSchedule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('month_number', models.IntegerField()),
                ('due_date', models.DateField()),
                ('principal_due', models.DecimalField(decimal_places=2, max_digits=12)),
                ('interest_due', models.DecimalField(decimal_places=2, max_digits=12)),
                ('penalty', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('principal_paid', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('interest_paid', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('penalty_paid', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('is_paid', models.BooleanField(default=False)),
            ],
            options={
                'ordering': ['month_number'],
                'unique_together': {('loan', 'month_number')},
            },
        ),
        migrations.CreateModel(
            name='Loan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(0.01)])),
                ('interest_rate', models.DecimalField(decimal_places=2, default=0.0, max_digits=5)),
                ('tenure_months', models.IntegerField(validators=[django.core.validators.MinValueValidator(1)])),
                ('status', models.CharField(choices=[('DRAFT', 'Draft'), ('SUBMITTED', 'Submitted for Approval'), ('CHANGES_REQUESTED', 'Changes Requested'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected'), ('DISBURSED', 'Disbursed'), ('ACTIVE', 'Active'), ('CLOSED', 'Closed')], default='DRAFT', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('submitted_at', models.DateTimeField(blank=True, null=True)),
                ('approved_at', models.DateTimeField(blank=True, null=True)),
                ('disbursed_at', models.DateTimeField(blank=True, null=True)),
                ('closed_at', models.DateTimeField(blank=True, null=True)),
                ('disbursement_method', models.CharField(blank=True, choices=[('CASH', 'Cash'), ('BANK_TRANSFER', 'Bank Transfer'), ('SAVINGS_CREDIT', 'Savings Credit')], max_length=20, null=True)),
                ('disbursement_reference', models.CharField(blank=True, max_length=200)),
                ('bm_remarks', models.TextField(blank=True, help_text='Branch manager remarks for changes requested')),
                ('branch', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='accounts.branch')),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='loans', to='clients.client')),
                ('branch_manager', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='loans_reviewed', to=settings.AUTH_USER_MODEL)),
                ('loan_officer', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='loans_created', to=settings.AUTH_USER_MODEL)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='loans.loanproduct')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='RepaymentTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('payment_method', models.CharField(choices=[('CASH', 'Cash'), ('BANK_TRANSFER', 'Bank Transfer'), ('MOBILE_MONEY', 'Mobile Money'), ('CHECK', 'Check')], max_length=20)),
                ('payment_reference', models.CharField(blank=True, max_length=200)),
                ('paid_at', models.DateTimeField(auto_now_add=True)),
                ('notes', models.TextField(blank=True)),
                ('loan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='repayments', to='loans.loan')),
                ('recorded_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-paid_at'],
            },
        ),
        migrations.CreateModel(
            name='PenaltyWaiver',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('waived_amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('waived_at', models.DateTimeField(auto_now_add=True)),
                ('reason', models.TextField(help_text='Reason for waiver')),
                ('loan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='penalty_waivers', to='loans.loan')),
                ('schedule_entry', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='loans.repaymentschedule')),
                ('waived_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-waived_at'],
            },
        ),
        migrations.CreateModel(
            name='LoanProductRequiredDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_mandatory', models.BooleanField(default=True)),
                ('document_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='loans.loandocumenttype')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='required_documents', to='loans.loanproduct')),
            ],
            options={
                'unique_together': {('product', 'document_type')},
            },
        ),
        migrations.CreateModel(
            name='LoanDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('document_file', models.FileField(upload_to=loans.models.loan_doc_upload_path)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('label', models.CharField(blank=True, help_text='Label for other documents', max_length=200)),
                ('description', models.TextField(blank=True)),
                ('document_type', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='loans.loandocumenttype')),
                ('loan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to='loans.loan')),
                ('uploaded_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-uploaded_at'],
            },
        ),
        migrations.AddField(
            model_name='repaymentschedule',
            name='loan',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='schedule', to='loans.loan'),
        ),
    ]
