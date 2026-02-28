from decimal import Decimal
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("accounts", "0004_alter_auditlog_action"),
        ("clients", "0004_merge_20260210_0849"),
    ]

    operations = [
        migrations.CreateModel(
            name="SavingsProduct",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=20, unique=True)),
                ("name", models.CharField(max_length=255)),
                ("min_opening_balance", models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=14)),
                ("min_balance", models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=14)),
                (
                    "interest_rate",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        help_text="Annual interest rate in %",
                        max_digits=6,
                        null=True,
                    ),
                ),
                (
                    "withdrawal_requires_approval_above",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("0.00"),
                        help_text="Withdrawals strictly above this amount require Branch Manager approval.",
                        max_digits=14,
                    ),
                ),
                (
                    "withdrawal_fee",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("0.00"),
                        help_text="Flat fee applied on withdrawals if configured.",
                        max_digits=14,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="SavingsAccount",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("account_number", models.CharField(max_length=32, unique=True)),
                (
                    "status",
                    models.CharField(
                        choices=[("ACTIVE", "Active"), ("FROZEN", "Frozen"), ("CLOSED", "Closed")],
                        default="ACTIVE",
                        max_length=10,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "branch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="savings_accounts",
                        to="accounts.branch",
                    ),
                ),
                (
                    "client",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="savings_accounts",
                        to="clients.client",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="savings_accounts_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="accounts",
                        to="savings.savingsproduct",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="SavingsTransaction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "tx_type",
                    models.CharField(
                        choices=[
                            ("DEPOSIT", "Deposit"),
                            ("WITHDRAWAL", "Withdrawal"),
                            ("TRANSFER_IN", "Transfer In"),
                            ("TRANSFER_OUT", "Transfer Out"),
                            ("INTEREST", "Interest"),
                            ("FEE", "Fee"),
                            ("ADJUSTMENT", "Adjustment"),
                        ],
                        max_length=20,
                    ),
                ),
                ("amount", models.DecimalField(decimal_places=2, max_digits=14)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "Pending"),
                            ("POSTED", "Posted"),
                            ("REJECTED", "Rejected"),
                            ("REVERSED", "Reversed"),
                        ],
                        default="PENDING",
                        max_length=10,
                    ),
                ),
                (
                    "is_credit_adjustment",
                    models.BooleanField(
                        default=True,
                        help_text="For ADJUSTMENT tx_type only: True for credit, False for debit.",
                    ),
                ),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("reference", models.CharField(blank=True, max_length=64, null=True)),
                ("narration", models.CharField(blank=True, max_length=255, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "account",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="transactions",
                        to="savings.savingsaccount",
                    ),
                ),
                (
                    "approved_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="savings_transactions_approved",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "posted_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="savings_transactions_posted",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="savingsaccount",
            index=models.Index(fields=["branch", "status"], name="savings_sav_branch__aa9d5f_idx"),
        ),
        migrations.AddIndex(
            model_name="savingsaccount",
            index=models.Index(fields=["client", "status"], name="savings_sav_client__9bf1cf_idx"),
        ),
        migrations.AddIndex(
            model_name="savingstransaction",
            index=models.Index(fields=["account", "status"], name="savings_sav_account__90db84_idx"),
        ),
        migrations.AddIndex(
            model_name="savingstransaction",
            index=models.Index(fields=["account", "created_at"], name="savings_sav_account__aa711b_idx"),
        ),
    ]

