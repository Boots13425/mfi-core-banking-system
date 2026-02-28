from decimal import Decimal
from django.conf import settings
from django.db import models, transaction
from django.core.exceptions import ValidationError

# IMPORTANT:
# - We assume you have accounts.Branch model.
# - If your Branch model path differs, adjust the import below accordingly.
from accounts.models import Branch


User = settings.AUTH_USER_MODEL


class TellerSessionStatus(models.TextChoices):
    ALLOCATED = "ALLOCATED", "Allocated"
    ACTIVE = "ACTIVE", "Active"
    CLOSED = "CLOSED", "Closed"


class CashDirection(models.TextChoices):
    INFLOW = "INFLOW", "Inflow"
    OUTFLOW = "OUTFLOW", "Outflow"


class CashEventType(models.TextChoices):
    VAULT_TO_DRAWER = "VAULT_TO_DRAWER", "Vault to Drawer (Allocation)"
    DRAWER_TO_VAULT = "DRAWER_TO_VAULT", "Drawer to Vault (Return)"

    SAVINGS_DEPOSIT_CASH = "SAVINGS_DEPOSIT_CASH", "Savings Deposit (Cash)"
    SAVINGS_WITHDRAWAL_CASH = "SAVINGS_WITHDRAWAL_CASH", "Savings Withdrawal (Cash)"

    LOAN_DISBURSEMENT_CASH = "LOAN_DISBURSEMENT_CASH", "Loan Disbursement (Cash)"
    LOAN_REPAYMENT_CASH = "LOAN_REPAYMENT_CASH", "Loan Repayment (Cash)"

    REVERSAL = "REVERSAL", "Reversal"


class BranchVault(models.Model):
    """
    One row per branch for reporting.
    Balance is derived from ledger entries (recommended).
    """
    branch = models.OneToOneField(Branch, on_delete=models.CASCADE, related_name="vault")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Vault - {self.branch.name}"


class TellerSession(models.Model):
    """
    Represents a cashier drawer/session.
    Spec:
      - manager allocates (ALLOCATED)
      - cashier confirms by counting (ACTIVE)
      - cashier closes (CLOSED)
      - CLOSED sessions are immutable
    """
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="teller_sessions")
    cashier = models.ForeignKey(User, on_delete=models.CASCADE, related_name="teller_sessions")

    status = models.CharField(max_length=20, choices=TellerSessionStatus.choices, default=TellerSessionStatus.ALLOCATED)

    # Allocation/opening
    opening_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    allocated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="allocated_sessions")
    allocated_at = models.DateTimeField(auto_now_add=True)

    # Cashier confirmation (counts physical cash)
    confirmed_opening_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    confirmed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="confirmed_sessions")

    # Close/reconciliation
    counted_closing_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    expected_closing_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    variance_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    variance_note = models.TextField(null=True, blank=True)

    opened_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="closed_sessions")

    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_sessions")
    review_note = models.TextField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["branch", "cashier", "status"]),
            models.Index(fields=["branch", "status"]),
        ]

    def __str__(self):
        return f"Session#{self.id} {self.branch.name} - {self.cashier} [{self.status}]"

    def clean(self):
        if self.status == TellerSessionStatus.CLOSED:
            # ensure close fields exist
            if self.counted_closing_amount is None:
                raise ValidationError("counted_closing_amount is required to close session.")
            if self.expected_closing_amount is None:
                raise ValidationError("expected_closing_amount is required to close session.")

    @property
    def is_immutable(self) -> bool:
        return self.status == TellerSessionStatus.CLOSED


class CashLedgerEntry(models.Model):
    """
    Append-only cash ledger. Never delete/update entries.
    Corrections happen via reversal entries (REVERSAL) referencing reverses_entry.
    """
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="cash_ledger_entries")
    session = models.ForeignKey(TellerSession, on_delete=models.SET_NULL, null=True, blank=True, related_name="ledger_entries")

    event_type = models.CharField(max_length=50, choices=CashEventType.choices)
    direction = models.CharField(max_length=10, choices=CashDirection.choices)

    amount = models.DecimalField(max_digits=14, decimal_places=2)
    narration = models.CharField(max_length=255, blank=True, default="")

    # generic link to business transaction (savings tx, repayment tx, loan, etc.)
    reference_type = models.CharField(max_length=64, blank=True, default="")
    reference_id = models.CharField(max_length=64, blank=True, default="")

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="cash_entries_created")
    created_at = models.DateTimeField(auto_now_add=True)

    # reversal chain
    reverses_entry = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="reversed_by_entries")

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["branch", "created_at"]),
            models.Index(fields=["session", "created_at"]),
            models.Index(fields=["reference_type", "reference_id"]),
        ]

    def __str__(self):
        return f"{self.event_type} {self.direction} {self.amount} (session={self.session_id})"

    def save(self, *args, **kwargs):
        # Hard guard against accidental updates
        if self.pk is not None:
            raise ValidationError("CashLedgerEntry is append-only. Updates are not allowed.")
        super().save(*args, **kwargs)