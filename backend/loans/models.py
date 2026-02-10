from __future__ import annotations

from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils import timezone


class Loan(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        CLOSED = "CLOSED", "Closed"
        DEFAULTED = "DEFAULTED", "Defaulted"  # not used for now (computed risk label is primary)

    class RepaymentFrequency(models.TextChoices):
        WEEKLY = "WEEKLY", "Weekly"
        MONTHLY = "MONTHLY", "Monthly"

    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.PROTECT,
        related_name="loans",
    )

    principal_amount = models.DecimalField(max_digits=14, decimal_places=2)
    interest_rate = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        help_text="Interest rate percentage, e.g. 10.00 means 10%",
    )
    number_of_installments = models.PositiveIntegerField()
    repayment_frequency = models.CharField(
        max_length=10,
        choices=RepaymentFrequency.choices,
    )

    disbursement_date = models.DateField()
    first_due_date = models.DateField()

    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="loans_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["client", "status"]),
        ]

    def __str__(self) -> str:
        return f"Loan {self.id} for client {self.client_id} ({self.status})"

    @property
    def total_interest_amount(self) -> Decimal:
        return (self.principal_amount * self.interest_rate / Decimal("100.00")).quantize(
            Decimal("0.01")
        )

    @property
    def total_amount_due(self) -> Decimal:
        return (self.principal_amount + self.total_interest_amount).quantize(Decimal("0.01"))

    @property
    def total_paid(self) -> Decimal:
        agg = sum((inst.amount_paid for inst in self.installments.all()), Decimal("0.00"))
        return agg.quantize(Decimal("0.01"))

    @property
    def outstanding_amount(self) -> Decimal:
        out = (self.total_amount_due - self.total_paid).quantize(Decimal("0.01"))
        return out if out > 0 else Decimal("0.00")


class LoanInstallment(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        OVERDUE = "OVERDUE", "Overdue"

    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name="installments")
    installment_number = models.PositiveIntegerField()
    due_date = models.DateField()

    amount_due = models.DecimalField(max_digits=14, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["installment_number"]
        unique_together = [("loan", "installment_number")]
        indexes = [
            models.Index(fields=["loan", "due_date"]),
            models.Index(fields=["loan", "status"]),
        ]

    def __str__(self) -> str:
        return f"Installment {self.installment_number} for loan {self.loan_id}"

    @property
    def outstanding_amount(self) -> Decimal:
        out = (self.amount_due - self.amount_paid).quantize(Decimal("0.01"))
        return out if out > 0 else Decimal("0.00")

    def compute_days_overdue(self, today=None) -> int:
        if today is None:
            today = timezone.localdate()
        if self.status != self.Status.OVERDUE:
            return 0
        delta = today - self.due_date
        return max(delta.days, 0)


class Repayment(models.Model):
    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name="repayments")
    installment = models.ForeignKey(
        LoanInstallment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="repayments",
        help_text="Optional; if not supplied, payment is allocated to installments in order.",
    )
    amount_paid = models.DecimalField(max_digits=14, decimal_places=2)
    payment_date = models.DateField()
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="repayments_recorded",
    )
    note = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-payment_date", "-created_at"]
        indexes = [
            models.Index(fields=["loan", "payment_date"]),
        ]

    def __str__(self) -> str:
        return f"Repayment {self.id} for loan {self.loan_id}"

