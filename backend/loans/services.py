from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import Loan, LoanInstallment, Repayment


@dataclass(frozen=True)
class LoanRisk:
    label: str  # "OK" | "AT_RISK" | "DELINQUENT"
    max_days_overdue: int


def add_months(d: date, months: int) -> date:
    """
    Add months to a date without extra dependencies.
    If the resulting month has fewer days, clamp to the last day of month.
    """
    year = d.year + ((d.month - 1 + months) // 12)
    month = ((d.month - 1 + months) % 12) + 1
    day = d.day
    # clamp day
    # days per month (non-leap / leap for feb)
    if month in (1, 3, 5, 7, 8, 10, 12):
        max_day = 31
    elif month in (4, 6, 9, 11):
        max_day = 30
    else:
        is_leap = (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)
        max_day = 29 if is_leap else 28
    if day > max_day:
        day = max_day
    return date(year, month, day)


def compute_risk_label(max_days_overdue: int) -> str:
    if max_days_overdue >= 15:
        return "DELINQUENT"
    if 1 <= max_days_overdue <= 14:
        return "AT_RISK"
    return "OK"


def refresh_overdue_flags_for_loan(loan: Loan, today: date | None = None) -> LoanRisk:
    """
    Overdue computation hook.
    - Marks installments OVERDUE if due_date < today and not fully paid.
    - Marks installments PAID if fully paid.
    - Returns computed risk label based on max days overdue.
    """
    if today is None:
        today = timezone.localdate()

    max_days = 0
    # Keep it deterministic: operate in installment_number order.
    installments = list(loan.installments.all().order_by("installment_number"))
    changed = False

    for inst in installments:
        fully_paid = inst.amount_paid >= inst.amount_due
        if fully_paid and inst.status != LoanInstallment.Status.PAID:
            inst.status = LoanInstallment.Status.PAID
            changed = True
        elif not fully_paid:
            if inst.due_date < today:
                if inst.status != LoanInstallment.Status.OVERDUE:
                    inst.status = LoanInstallment.Status.OVERDUE
                    changed = True
                days = (today - inst.due_date).days
                if days > max_days:
                    max_days = days
            else:
                if inst.status != LoanInstallment.Status.PENDING:
                    inst.status = LoanInstallment.Status.PENDING
                    changed = True

    if changed:
        LoanInstallment.objects.bulk_update(installments, ["status"])

    return LoanRisk(label=compute_risk_label(max_days), max_days_overdue=max_days)


def generate_installment_schedule(
    *,
    loan: Loan,
    first_due_date: date,
    number_of_installments: int,
    repayment_frequency: str,
) -> list[LoanInstallment]:
    total_due = loan.total_amount_due
    per = (total_due / Decimal(number_of_installments)).quantize(Decimal("0.01"))

    # Adjust last installment for rounding drift.
    amounts = [per] * number_of_installments
    drift = (per * number_of_installments) - total_due
    if drift != Decimal("0.00"):
        amounts[-1] = (amounts[-1] - drift).quantize(Decimal("0.01"))

    due = first_due_date
    items: list[LoanInstallment] = []
    for i in range(1, number_of_installments + 1):
        items.append(
            LoanInstallment(
                loan=loan,
                installment_number=i,
                due_date=due,
                amount_due=amounts[i - 1],
            )
        )
        if repayment_frequency == Loan.RepaymentFrequency.WEEKLY:
            due = due + timedelta(days=7)
        else:
            due = add_months(due, 1)

    return items


@transaction.atomic
def allocate_repayment_to_schedule(
    *,
    loan: Loan,
    amount: Decimal,
    payment_date: date,
    recorded_by,
    note: str | None = None,
    installment_id: int | None = None,
) -> Repayment:
    """
    Preferred behavior: allocate extra to next installments (no overpayment bugs).
    Allocation order: oldest unpaid installment_number ascending.
    If installment_id is provided, allocate starting from that installment (still cascades forward).
    """
    if amount <= 0:
        raise ValueError("Amount must be greater than 0")

    installments_qs = loan.installments.select_for_update().order_by("installment_number")
    installments = list(installments_qs)
    if installment_id is not None:
        # start allocation at selected installment
        start_idx = next((i for i, x in enumerate(installments) if x.id == installment_id), None)
        if start_idx is None:
            raise ValueError("Installment does not belong to this loan")
        installments = installments[start_idx:]

    remaining = amount
    for inst in installments:
        if remaining <= 0:
            break
        outstanding = inst.outstanding_amount
        if outstanding <= 0:
            continue
        pay = remaining if remaining <= outstanding else outstanding
        inst.amount_paid = (inst.amount_paid + pay).quantize(Decimal("0.01"))
        remaining = (remaining - pay).quantize(Decimal("0.01"))

    # If remaining > 0 here, it means schedule is fully paid already.
    # Reject to avoid "floating overpayment" that can't be applied.
    if remaining > 0:
        raise ValueError("Payment exceeds outstanding balance of the loan")

    LoanInstallment.objects.bulk_update(installments_qs, ["amount_paid"])

    # Refresh statuses and close loan if fully paid
    refresh_overdue_flags_for_loan(loan)
    all_paid = not loan.installments.exclude(status=LoanInstallment.Status.PAID).exists()
    if all_paid and loan.status != Loan.Status.CLOSED:
        loan.status = Loan.Status.CLOSED
        loan.save(update_fields=["status"])

    repayment = Repayment.objects.create(
        loan=loan,
        installment_id=installment_id,
        amount_paid=amount,
        payment_date=payment_date,
        recorded_by=recorded_by,
        note=note,
    )
    return repayment

