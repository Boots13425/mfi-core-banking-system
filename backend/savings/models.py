from __future__ import annotations

from decimal import Decimal
from django.conf import settings
from django.db import models


class SavingsProduct(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255)
    min_opening_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    min_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    interest_rate = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True, help_text="Annual interest rate in %"
    )
    withdrawal_requires_approval_above = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Withdrawals strictly above this amount require Branch Manager approval.",
    )
    withdrawal_fee = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Flat fee applied on withdrawals if configured.",
    )
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class SavingsAccount(models.Model):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("FROZEN", "Frozen"),
        ("CLOSED", "Closed"),
    ]

    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.PROTECT,
        related_name="savings_accounts",
    )
    product = models.ForeignKey(
        SavingsProduct,
        on_delete=models.PROTECT,
        related_name="accounts",
    )
    branch = models.ForeignKey(
        "accounts.Branch",
        on_delete=models.PROTECT,
        related_name="savings_accounts",
    )
    account_number = models.CharField(max_length=32, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="ACTIVE")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="savings_accounts_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["branch", "status"]),
            models.Index(fields=["client", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.account_number} ({self.client.full_name})"

    @property
    def balance(self) -> Decimal:
        return get_account_balance(self)


class SavingsTransaction(models.Model):
    TX_TYPES = [
        ("DEPOSIT", "Deposit"),
        ("WITHDRAWAL", "Withdrawal"),
        ("TRANSFER_IN", "Transfer In"),
        ("TRANSFER_OUT", "Transfer Out"),
        ("INTEREST", "Interest"),
        ("FEE", "Fee"),
        ("ADJUSTMENT", "Adjustment"),
    ]

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("POSTED", "Posted"),
        ("REJECTED", "Rejected"),
        ("REVERSED", "Reversed"),
    ]

    account = models.ForeignKey(
        SavingsAccount,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    tx_type = models.CharField(max_length=20, choices=TX_TYPES)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="PENDING")

    # For ADJUSTMENT, this flag determines whether it is credit (+) or debit (-)
    is_credit_adjustment = models.BooleanField(
        default=True,
        help_text="For ADJUSTMENT tx_type only: True for credit, False for debit.",
    )

    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="savings_transactions_posted",
        null=True,
        blank=True,
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="savings_transactions_approved",
        null=True,
        blank=True,
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    reference = models.CharField(max_length=64, null=True, blank=True)
    PAYMENT_METHODS = (
        ("CASH", "Cash"),
        ("BANK_TRANSFER", "Bank Transfer"),
        ("MOBILE_MONEY", "Mobile Money"),
        ("CHECK", "Check"),
    )
    payment_method = models.CharField(max_length=32, choices=PAYMENT_METHODS, null=True, blank=True)
    narration = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["account", "status"]),
            models.Index(fields=["account", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.tx_type} {self.amount} on {self.account_id}"


CREDIT_TYPES = {"DEPOSIT", "TRANSFER_IN", "INTEREST"}
DEBIT_TYPES = {"WITHDRAWAL", "TRANSFER_OUT", "FEE"}


def get_account_balance(account: SavingsAccount) -> Decimal:
    """
    Compute balance from POSTED transactions only.
    CREDIT: DEPOSIT, TRANSFER_IN, INTEREST
    DEBIT:  WITHDRAWAL, TRANSFER_OUT, FEE
    ADJUSTMENT: sign controlled by is_credit_adjustment.
    """
    qs = account.transactions.filter(status="POSTED").values("tx_type", "amount", "is_credit_adjustment")
    balance = Decimal("0.00")
    for row in qs:
        amount = row["amount"]
        tx_type = row["tx_type"]
        if tx_type in CREDIT_TYPES:
            balance += amount
        elif tx_type in DEBIT_TYPES:
            balance -= amount
        elif tx_type == "ADJUSTMENT":
            balance = balance + amount if row["is_credit_adjustment"] else balance - amount
    return balance.quantize(Decimal("0.01"))

