from decimal import Decimal

from django.test import TestCase
from django.core.exceptions import ValidationError

from accounts.models import Branch, User
from .models import TellerSession, TellerSessionStatus, CashLedgerEntry, CashDirection, CashEventType
from .services import (
    confirm_session_opening,
    compute_expected_drawer_balance,
    post_cash_entry,
)


class TellerSessionServiceTests(TestCase):
    def setUp(self):
        # create a branch, manager and cashier
        self.branch = Branch.objects.create(
            name="Main", code="MAIN", region="East", phone="123", address="Addr"
        )
        self.manager = User.objects.create_user(
            username="mgr", email="mgr@example.com", password="x", role="BRANCH_MANAGER", branch=self.branch
        )
        self.cashier = User.objects.create_user(
            username="cash", email="cash@example.com", password="x", role="CASHIER", branch=self.branch
        )

    def test_confirm_opening_mismatch_raises(self):
        # manager allocates 200
        session = TellerSession.objects.create(
            branch=self.branch,
            cashier=self.cashier,
            status=TellerSessionStatus.ALLOCATED,
            opening_amount=Decimal("200.00"),
            allocated_by=self.manager,
        )

        with self.assertRaises(ValidationError) as cm:
            confirm_session_opening(session=session, cashier=self.cashier, counted_amount=Decimal("150.00"))
        self.assertIn("does not match allocated", str(cm.exception))
        session.refresh_from_db()
        self.assertEqual(session.status, TellerSessionStatus.ALLOCATED)
        self.assertIsNone(session.confirmed_opening_amount)

    def test_expected_balance_initial_equals_opening(self):
        # allocate and confirm correctly
        session = TellerSession.objects.create(
            branch=self.branch,
            cashier=self.cashier,
            status=TellerSessionStatus.ALLOCATED,
            opening_amount=Decimal("200.00"),
            allocated_by=self.manager,
        )
        confirm_session_opening(session=session, cashier=self.cashier, counted_amount=Decimal("200.00"))
        session.refresh_from_db()

        # after confirmation no further entries should affect expected balance
        bal = compute_expected_drawer_balance(session)
        self.assertEqual(bal, Decimal("200.00"))

        # check that vault->drawer entry exists but is excluded
        entries = CashLedgerEntry.objects.filter(session=session)
        self.assertEqual(entries.count(), 1)
        self.assertEqual(entries.first().event_type, CashEventType.VAULT_TO_DRAWER)

    def test_expected_balance_changes_on_transactions(self):
        # open session normally
        session = TellerSession.objects.create(
            branch=self.branch,
            cashier=self.cashier,
            status=TellerSessionStatus.ALLOCATED,
            opening_amount=Decimal("100.00"),
            allocated_by=self.manager,
        )
        confirm_session_opening(session=session, cashier=self.cashier, counted_amount=Decimal("100.00"))
        session.refresh_from_db()

        # post an inflow (deposit)
        post_cash_entry(
            branch=self.branch,
            session=session,
            event_type=CashEventType.SAVINGS_DEPOSIT_CASH,
            direction=CashDirection.INFLOW,
            amount=Decimal("50.00"),
            created_by=self.cashier,
        )
        # post an outflow (withdrawal)
        post_cash_entry(
            branch=self.branch,
            session=session,
            event_type=CashEventType.SAVINGS_WITHDRAWAL_CASH,
            direction=CashDirection.OUTFLOW,
            amount=Decimal("20.00"),
            created_by=self.cashier,
        )

        bal = compute_expected_drawer_balance(session)
        # opening 100 + 50 inflow - 20 outflow = 130
        self.assertEqual(bal, Decimal("130.00"))

    def test_close_uses_expected_drawer(self):
        # make sure compute_expected_drawer_balance output is used by close logic
        session = TellerSession.objects.create(
            branch=self.branch,
            cashier=self.cashier,
            status=TellerSessionStatus.ALLOCATED,
            opening_amount=Decimal("500.00"),
            allocated_by=self.manager,
        )
        confirm_session_opening(session=session, cashier=self.cashier, counted_amount=Decimal("500.00"))
        session.refresh_from_db()

        post_cash_entry(
            branch=self.branch,
            session=session,
            event_type=CashEventType.SAVINGS_DEPOSIT_CASH,
            direction=CashDirection.INFLOW,
            amount=Decimal("100.00"),
            created_by=self.cashier,
        )
        # closing with counted amount that matches expected
        from .services import close_session
        close_session(session=session, cashier=self.cashier, counted_closing_amount=Decimal("600.00"))
        session.refresh_from_db()
        self.assertEqual(session.expected_closing_amount, Decimal("600.00"))
