from decimal import Decimal
from django.core.exceptions import ValidationError
from accounts.models import Branch
from .services import get_active_session_for_cashier, post_cash_entry
from .models import CashEventType, CashDirection


def require_active_cash_session(*, request_user):
    branch_id = getattr(request_user, "branch_id", None)
    if not branch_id:
        raise ValidationError("User must belong to a branch.")

    branch = Branch.objects.get(id=branch_id)
    session = get_active_session_for_cashier(branch=branch, cashier=request_user)
    if not session:
        raise ValidationError("No ACTIVE teller session. Start session first.")
    return branch, session


def record_cash_savings_deposit(*, request_user, amount: Decimal, savings_tx_id):
    branch, session = require_active_cash_session(request_user=request_user)
    post_cash_entry(
        branch=branch,
        session=session,
        event_type=CashEventType.SAVINGS_DEPOSIT_CASH,
        direction=CashDirection.INFLOW,
        amount=amount,
        created_by=request_user,
        reference_type="savings_transaction",
        reference_id=str(savings_tx_id),
        narration="Savings deposit (cash).",
    )
    return session


def record_cash_savings_withdrawal(*, request_user, amount: Decimal, savings_tx_id):
    branch, session = require_active_cash_session(request_user=request_user)
    post_cash_entry(
        branch=branch,
        session=session,
        event_type=CashEventType.SAVINGS_WITHDRAWAL_CASH,
        direction=CashDirection.OUTFLOW,
        amount=amount,
        created_by=request_user,
        reference_type="savings_transaction",
        reference_id=str(savings_tx_id),
        narration="Savings withdrawal (cash).",
    )
    return session


def record_cash_loan_repayment(*, request_user, amount: Decimal, repayment_tx_id):
    branch, session = require_active_cash_session(request_user=request_user)
    post_cash_entry(
        branch=branch,
        session=session,
        event_type=CashEventType.LOAN_REPAYMENT_CASH,
        direction=CashDirection.INFLOW,
        amount=amount,
        created_by=request_user,
        reference_type="loan_repayment",
        reference_id=str(repayment_tx_id),
        narration="Loan repayment (cash).",
    )
    return session


def record_cash_loan_disbursement(*, request_user, amount: Decimal, loan_id):
    branch, session = require_active_cash_session(request_user=request_user)
    post_cash_entry(
        branch=branch,
        session=session,
        event_type=CashEventType.LOAN_DISBURSEMENT_CASH,
        direction=CashDirection.OUTFLOW,
        amount=amount,
        created_by=request_user,
        reference_type="loan",
        reference_id=str(loan_id),
        narration="Loan disbursement (cash).",
    )
    return session