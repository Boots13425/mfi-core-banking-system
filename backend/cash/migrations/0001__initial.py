from django.db import migrations, models
import django.db.models.deletion
from decimal import Decimal

class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("accounts", "0001_initial"),  # adjust if your accounts initial differs
        # ("auth", ... ) not needed if using AUTH_USER_MODEL
    ]

    operations = [
        migrations.CreateModel(
            name="BranchVault",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("branch", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="vault", to="accounts.branch")),
            ],
        ),
        migrations.CreateModel(
            name="TellerSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("ALLOCATED", "Allocated"), ("ACTIVE", "Active"), ("CLOSED", "Closed")], default="ALLOCATED", max_length=20)),
                ("opening_amount", models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=14)),
                ("allocated_at", models.DateTimeField(auto_now_add=True)),
                ("confirmed_opening_amount", models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ("confirmed_at", models.DateTimeField(blank=True, null=True)),
                ("counted_closing_amount", models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ("expected_closing_amount", models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ("variance_amount", models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ("variance_note", models.TextField(blank=True, null=True)),
                ("opened_at", models.DateTimeField(blank=True, null=True)),
                ("closed_at", models.DateTimeField(blank=True, null=True)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("review_note", models.TextField(blank=True, null=True)),
                ("allocated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="allocated_sessions", to="accounts.user")),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="teller_sessions", to="accounts.branch")),
                ("cashier", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="teller_sessions", to="accounts.user")),
                ("closed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="closed_sessions", to="accounts.user")),
                ("confirmed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="confirmed_sessions", to="accounts.user")),
                ("reviewed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reviewed_sessions", to="accounts.user")),
            ],
            options={
                "indexes": [
                    models.Index(fields=["branch", "cashier", "status"], name="cash_teller_branch_cashier_status_idx"),
                    models.Index(fields=["branch", "status"], name="cash_teller_branch_status_idx"),
                ],
            },
        ),
        migrations.CreateModel(
            name="CashLedgerEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_type", models.CharField(choices=[
                    ("VAULT_TO_DRAWER", "Vault to Drawer (Allocation)"),
                    ("DRAWER_TO_VAULT", "Drawer to Vault (Return)"),
                    ("SAVINGS_DEPOSIT_CASH", "Savings Deposit (Cash)"),
                    ("SAVINGS_WITHDRAWAL_CASH", "Savings Withdrawal (Cash)"),
                    ("LOAN_DISBURSEMENT_CASH", "Loan Disbursement (Cash)"),
                    ("LOAN_REPAYMENT_CASH", "Loan Repayment (Cash)"),
                    ("REVERSAL", "Reversal"),
                ], max_length=50)),
                ("direction", models.CharField(choices=[("INFLOW", "Inflow"), ("OUTFLOW", "Outflow")], max_length=10)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("narration", models.CharField(blank=True, default="", max_length=255)),
                ("reference_type", models.CharField(blank=True, default="", max_length=64)),
                ("reference_id", models.CharField(blank=True, default="", max_length=64)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cash_ledger_entries", to="accounts.branch")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="cash_entries_created", to="accounts.user")),
                ("reverses_entry", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reversed_by_entries", to="cash.cashledgerentry")),
                ("session", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="ledger_entries", to="cash.tellersession")),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["branch", "created_at"], name="cash_ledger_branch_created_at_idx"),
                    models.Index(fields=["session", "created_at"], name="cash_ledger_session_created_at_idx"),
                    models.Index(fields=["reference_type", "reference_id"], name="cash_ledger_reference_idx"),
                ],
            },
        ),
    ]