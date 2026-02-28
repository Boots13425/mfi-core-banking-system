from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from .models import (
    TellerSession,
    TellerSessionStatus,
    CashLedgerEntry,
    CashDirection,
    CashEventType,
)


def get_active_session_for_cashier(branch, cashier):
    return TellerSession.objects.filter(
        branch=branch,
        cashier=cashier,
        status=TellerSessionStatus.ACTIVE,
    ).order_by("-opened_at", "-id").first()


def compute_expected_drawer_balance(session: TellerSession) -> Decimal:
    """
    Expected = confirmed opening + inflows - outflows
    """
    if session.confirmed_opening_amount is None:
        opening = Decimal("0.00")
    else:
        opening = session.confirmed_opening_amount

    inflows = CashLedgerEntry.objects.filter(
        session=session,
        direction=CashDirection.INFLOW,
    ).exclude(event_type=CashEventType.REVERSAL).aggregate_total()

    outflows = CashLedgerEntry.objects.filter(
        session=session,
        direction=CashDirection.OUTFLOW,
    ).exclude(event_type=CashEventType.REVERSAL).aggregate_total()

    return opening + inflows - outflows


# ---- queryset helper ----
from django.db.models import Sum
from django.db.models.query import QuerySet


def _aggregate_total(qs: QuerySet) -> Decimal:
    v = qs.aggregate(s=Sum("amount"))["s"]
    return v if v is not None else Decimal("0.00")


QuerySet.aggregate_total = _aggregate_total  # simple helper


@transaction.atomic
def post_cash_entry(
    *,
    branch,
    session,
    event_type: str,
    direction: str,
    amount: Decimal,
    created_by,
    reference_type: str = "",
    reference_id: str = "",
    narration: str = "",
):
    if amount <= 0:
        raise ValidationError("Cash entry amount must be > 0.")

    if session is None:
        # allowed for vault-only operations, but most of your flows should include a session
        pass
    else:
        if session.status != TellerSessionStatus.ACTIVE:
            raise ValidationError("Teller session is not ACTIVE.")
        if session.branch_id != branch.id:
            raise ValidationError("Session and branch mismatch.")

        # Enforce drawer cannot go negative for OUTFLOW
        if direction == CashDirection.OUTFLOW:
            expected = compute_expected_drawer_balance(session)
            if expected - amount < 0:
                raise ValidationError("Insufficient drawer cash for this OUTFLOW transaction.")

    CashLedgerEntry.objects.create(
        branch=branch,
        session=session,
        event_type=event_type,
        direction=direction,
        amount=amount,
        created_by=created_by,
        reference_type=reference_type or "",
        reference_id=str(reference_id or ""),
        narration=narration or "",
    )


@transaction.atomic
def reverse_cash_entry(*, entry: CashLedgerEntry, created_by, reason: str = ""):
    """
    Creates a REVERSAL entry that offsets the original entry.
    """
    if entry.reverses_entry_id is not None:
        raise ValidationError("This entry is already a reversal entry.")

    if CashLedgerEntry.objects.filter(reverses_entry=entry).exists():
        raise ValidationError("This entry has already been reversed.")

    opposite = CashDirection.INFLOW if entry.direction == CashDirection.OUTFLOW else CashDirection.OUTFLOW

    CashLedgerEntry.objects.create(
        branch=entry.branch,
        session=entry.session,
        event_type=CashEventType.REVERSAL,
        direction=opposite,
        amount=entry.amount,
        created_by=created_by,
        reference_type=entry.reference_type,
        reference_id=entry.reference_id,
        narration=f"REVERSAL of #{entry.id}. {reason}".strip(),
        reverses_entry=entry,
    )


@transaction.atomic
def confirm_session_opening(*, session: TellerSession, cashier, counted_amount: Decimal):
    if session.status != TellerSessionStatus.ALLOCATED:
        raise ValidationError("Only ALLOCATED sessions can be confirmed.")

    if session.cashier_id != cashier.id:
        raise ValidationError("You are not the cashier for this session.")

    if counted_amount <= 0:
        raise ValidationError("Counted opening amount must be > 0.")

    session.confirmed_opening_amount = counted_amount
    session.confirmed_at = timezone.now()
    session.confirmed_by = cashier
    session.opened_at = timezone.now()
    session.status = TellerSessionStatus.ACTIVE
    session.save()

    # Record the physical movement vault -> drawer
    post_cash_entry(
        branch=session.branch,
        session=session,
        event_type=CashEventType.VAULT_TO_DRAWER,
        direction=CashDirection.INFLOW,
        amount=counted_amount,
        created_by=cashier,
        reference_type="teller_session",
        reference_id=str(session.id),
        narration="Opening cash confirmed (vault allocation).",
    )


@transaction.atomic
def close_session(*, session: TellerSession, cashier, counted_closing_amount: Decimal, variance_note: str = ""):
    if session.status != TellerSessionStatus.ACTIVE:
        raise ValidationError("Only ACTIVE sessions can be closed.")
    if session.cashier_id != cashier.id:
        raise ValidationError("You are not the cashier for this session.")
    if counted_closing_amount < 0:
        raise ValidationError("Counted closing amount cannot be negative.")

    expected = compute_expected_drawer_balance(session)
    variance = counted_closing_amount - expected

    session.counted_closing_amount = counted_closing_amount
    session.expected_closing_amount = expected
    session.variance_amount = variance
    session.variance_note = variance_note
    session.closed_at = timezone.now()
    session.closed_by = cashier
    session.status = TellerSessionStatus.CLOSED
    session.save()

    # Note: we do NOT automatically move drawer back to vault unless you want that.
    # If your business requires end-of-day return to vault, you can post DRAWER_TO_VAULT here.