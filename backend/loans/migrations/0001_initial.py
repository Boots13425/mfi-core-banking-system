from decimal import Decimal
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("clients", "0004_merge_20260210_0849"),
    ]

    operations = [
        migrations.CreateModel(
            name="Loan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("principal_amount", models.DecimalField(decimal_places=2, max_digits=14)),
                (
                    "interest_rate",
                    models.DecimalField(
                        decimal_places=2,
                        help_text="Interest rate percentage, e.g. 10.00 means 10%",
                        max_digits=6,
                    ),
                ),
                ("number_of_installments", models.PositiveIntegerField()),
                (
                    "repayment_frequency",
                    models.CharField(
                        choices=[("WEEKLY", "Weekly"), ("MONTHLY", "Monthly")],
                        max_length=10,
                    ),
                ),
                ("disbursement_date", models.DateField()),
                ("first_due_date", models.DateField()),
                (
                    "status",
                    models.CharField(
                        choices=[("ACTIVE", "Active"), ("CLOSED", "Closed"), ("DEFAULTED", "Defaulted")],
                        default="ACTIVE",
                        max_length=12,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "client",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="loans",
                        to="clients.client",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="loans_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="LoanInstallment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("installment_number", models.PositiveIntegerField()),
                ("due_date", models.DateField()),
                ("amount_due", models.DecimalField(decimal_places=2, max_digits=14)),
                ("amount_paid", models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=14)),
                (
                    "status",
                    models.CharField(
                        choices=[("PENDING", "Pending"), ("PAID", "Paid"), ("OVERDUE", "Overdue")],
                        default="PENDING",
                        max_length=10,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "loan",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="installments",
                        to="loans.loan",
                    ),
                ),
            ],
            options={
                "ordering": ["installment_number"],
                "unique_together": {("loan", "installment_number")},
            },
        ),
        migrations.CreateModel(
            name="Repayment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount_paid", models.DecimalField(decimal_places=2, max_digits=14)),
                ("payment_date", models.DateField()),
                ("note", models.CharField(blank=True, max_length=255, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "installment",
                    models.ForeignKey(
                        blank=True,
                        help_text="Optional; if not supplied, payment is allocated to installments in order.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="repayments",
                        to="loans.loaninstallment",
                    ),
                ),
                (
                    "loan",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="repayments",
                        to="loans.loan",
                    ),
                ),
                (
                    "recorded_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="repayments_recorded",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-payment_date", "-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="loan",
            index=models.Index(fields=["client", "status"], name="loans_loan_client__a4c8ee_idx"),
        ),
        migrations.AddIndex(
            model_name="loaninstallment",
            index=models.Index(fields=["loan", "due_date"], name="loans_loanin_loan_id_2c1dc1_idx"),
        ),
        migrations.AddIndex(
            model_name="loaninstallment",
            index=models.Index(fields=["loan", "status"], name="loans_loanin_loan_id_686451_idx"),
        ),
        migrations.AddIndex(
            model_name="repayment",
            index=models.Index(fields=["loan", "payment_date"], name="loans_repay_loan_id_9c3f2f_idx"),
        ),
    ]

