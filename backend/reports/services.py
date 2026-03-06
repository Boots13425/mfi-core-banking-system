from dataclasses import dataclass
from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone

from cash.models import TellerSession, CashLedgerEntry, TellerSessionStatus, CashEventType, CashDirection


@dataclass
class DateWindow:
    start: timezone.datetime
    end: timezone.datetime


def _money(x) -> Decimal:
    return x if x is not None else Decimal("0.00")


def _day_window(day=None):
    if day is None:
        day = timezone.localdate()
    start = timezone.make_aware(timezone.datetime(day.year, day.month, day.day, 0, 0, 0))
    end = start + timezone.timedelta(days=1)
    return DateWindow(start=start, end=end)


def cashier_session_for_day(cashier_user, day=None):
    w = _day_window(day)

    # Since opening cash comes from allocation, use allocated_at as the "business day anchor"
    return (
        TellerSession.objects.select_related("branch", "cashier")
        .filter(
            cashier=cashier_user,
            allocated_at__gte=w.start,
            allocated_at__lt=w.end,
        )
        .order_by("-id")
        .first()
    )


def sessions_for_branch_day(branch_id: int, day=None):
    w = _day_window(day)

    return (
        TellerSession.objects.select_related("branch", "cashier")
        .filter(
            branch_id=branch_id,
            allocated_at__gte=w.start,
            allocated_at__lt=w.end,
        )
        .order_by("cashier_id", "-id")
    )


def ledger_for_session(session: TellerSession, day=None):
    w = _day_window(day)
    return (
        CashLedgerEntry.objects.select_related("created_by")
        .filter(session=session, created_at__gte=w.start, created_at__lt=w.end)
        .order_by("created_at", "id")
    )


def _sum_by(qs, **filters):
    return _money(qs.filter(**filters).aggregate(s=Sum("amount"))["s"])


def summarize_cashbook(session: TellerSession, day=None):
    qs = ledger_for_session(session, day=day)

    opening = session.opening_amount or Decimal("0.00")

    inflow_total = _sum_by(qs, direction=CashDirection.INFLOW)
    outflow_total = _sum_by(qs, direction=CashDirection.OUTFLOW)

    expected = inflow_total - outflow_total

    # Breakdown by event type (Cameroon daily pack style)
    inflow_savings = _sum_by(qs, direction=CashDirection.INFLOW, event_type=CashEventType.SAVINGS_DEPOSIT_CASH)
    inflow_repay = _sum_by(qs, direction=CashDirection.INFLOW, event_type=CashEventType.LOAN_REPAYMENT_CASH)

    outflow_withdraw = _sum_by(qs, direction=CashDirection.OUTFLOW, event_type=CashEventType.SAVINGS_WITHDRAWAL_CASH)
    outflow_disburse = _sum_by(qs, direction=CashDirection.OUTFLOW, event_type=CashEventType.LOAN_DISBURSEMENT_CASH)

    # Optional: show reversals separately (they affect cash reality)
    reversals_total = _sum_by(qs, event_type=CashEventType.REVERSAL)

    return {
        "session_id": session.id,
        "branch_id": session.branch_id,
        "branch_name": getattr(session.branch, "name", ""),
        "cashier_id": session.cashier_id,
        "cashier_username": getattr(session.cashier, "username", ""),
        "status": session.status,

        "opening_amount": str(opening),

        "total_inflow": str(inflow_total),
        "total_outflow": str(outflow_total),
        "expected_closing_amount": str(expected),

        "counted_closing_amount": str(session.counted_closing_amount or Decimal("0.00")),
        "variance_amount": str(session.variance_amount or Decimal("0.00")),
        "variance_note": session.variance_note or "",

        "breakdown": {
            "savings_deposits_cash": str(inflow_savings),
            "loan_repayments_cash": str(inflow_repay),
            "savings_withdrawals_cash": str(outflow_withdraw),
            "loan_disbursements_cash": str(outflow_disburse),
            "reversals_total": str(reversals_total),
        },

        "allocated_at": session.allocated_at,
        "opened_at": session.opened_at,
        "closed_at": session.closed_at,
        "reviewed_at": session.reviewed_at,
    }


def transaction_listing(session: TellerSession, day=None):
    qs = ledger_for_session(session, day=day)
    rows = []
    for e in qs:
        rows.append({
            "id": e.id,
            "created_at": e.created_at,
            "event_type": e.event_type,
            "direction": e.direction,
            "amount": str(e.amount),
            "narration": e.narration,
            "reference_type": e.reference_type,
            "reference_id": e.reference_id,
            "created_by": getattr(e.created_by, "username", None),
            "reverses_entry_id": e.reverses_entry_id,
        })
    return rows


def branch_liquidity(branch_id: int, day=None):
    sessions = sessions_for_branch_day(branch_id, day=day)

    rows = []
    total_expected = Decimal("0.00")
    total_counted = Decimal("0.00")
    total_variance = Decimal("0.00")

    for s in sessions:
        summary = summarize_cashbook(s, day=day)
        expected = Decimal(summary["expected_closing_amount"])
        counted = Decimal(summary["counted_closing_amount"])
        variance = Decimal(summary["variance_amount"])

        total_expected += expected
        total_counted += counted
        total_variance += variance

        rows.append({
            "session_id": s.id,
            "cashier_username": summary["cashier_username"],
            "status": summary["status"],
            "opening_amount": summary["opening_amount"],
            "expected_closing_amount": summary["expected_closing_amount"],
            "counted_closing_amount": summary["counted_closing_amount"],
            "variance_amount": summary["variance_amount"],
        })

    return {
        "branch_id": branch_id,
        "total_expected": str(total_expected),
        "total_counted": str(total_counted),
        "total_variance": str(total_variance),
        "rows": rows,
    }


def build_cashier_daily_pack(cashier_user, day=None):
    session = cashier_session_for_day(cashier_user, day=day)
    if not session:
        return {"session": None, "message": "No teller session found for this day."}

    return {
        "session": summarize_cashbook(session, day=day),
        "teller_listing": transaction_listing(session, day=day),
    }


def build_branch_daily_pack(branch_id: int, day=None):
    packs = []
    for s in sessions_for_branch_day(branch_id, day=day):
        packs.append({
            "session": summarize_cashbook(s, day=day),
            "teller_listing": transaction_listing(s, day=day),
        })

    return {
        "branch_liquidity": branch_liquidity(branch_id, day=day),
        "sessions": packs,
    }