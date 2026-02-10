from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User, Branch
from clients.models import Client
from loans.models import Loan, LoanInstallment


class LoanOfficerPermissionsTests(TestCase):
    def setUp(self):
        self.branch = Branch.objects.create(
            name="Main", code="MAIN", region="X", phone="000", address="Addr"
        )
        self.loan_officer = User.objects.create_user(
            username="lo",
            email="lo@example.com",
            password="pass12345",
            role="LOAN_OFFICER",
            branch=self.branch,
            is_active=True,
        )
        self.cashier = User.objects.create_user(
            username="cash",
            email="cash@example.com",
            password="pass12345",
            role="CASHIER",
            branch=self.branch,
            is_active=True,
        )
        self.active_client = Client.objects.create(
            full_name="Active Client",
            national_id="N1",
            phone="P1",
            status="ACTIVE",
            branch=self.branch,
            created_by=self.cashier,
        )
        self.inactive_client = Client.objects.create(
            full_name="Inactive Client",
            national_id="N2",
            phone="P2",
            status="INACTIVE",
            branch=self.branch,
            created_by=self.cashier,
        )

        self.api = APIClient()

    def auth(self, user):
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(user)
        self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

    def test_loan_officer_clients_only_active(self):
        self.auth(self.loan_officer)
        res = self.api.get("/api/loan-officer/clients?status=ACTIVE")
        self.assertEqual(res.status_code, 200)
        ids = [x["id"] for x in res.json()]
        self.assertIn(self.active_client.id, ids)
        self.assertNotIn(self.inactive_client.id, ids)

    def test_loan_officer_cannot_access_inactive_client_context(self):
        self.auth(self.loan_officer)
        res = self.api.get(f"/api/loan-officer/clients/{self.inactive_client.id}/loan-context")
        self.assertEqual(res.status_code, 404)


class LoanCreationAndRepaymentTests(TestCase):
    def setUp(self):
        self.branch = Branch.objects.create(
            name="Main", code="MAIN", region="X", phone="000", address="Addr"
        )
        self.loan_officer = User.objects.create_user(
            username="lo",
            email="lo@example.com",
            password="pass12345",
            role="LOAN_OFFICER",
            branch=self.branch,
            is_active=True,
        )
        self.cashier = User.objects.create_user(
            username="cash",
            email="cash@example.com",
            password="pass12345",
            role="CASHIER",
            branch=self.branch,
            is_active=True,
        )
        self.client_obj = Client.objects.create(
            full_name="Active Client",
            national_id="N1",
            phone="P1",
            status="ACTIVE",
            branch=self.branch,
            created_by=self.cashier,
        )
        self.api = APIClient()
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(self.loan_officer)
        self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

    def test_create_loan_generates_schedule(self):
        today = date.today()
        payload = {
            "client_id": self.client_obj.id,
            "principal_amount": "1000.00",
            "interest_rate": "10.00",
            "number_of_installments": 4,
            "repayment_frequency": "WEEKLY",
            "disbursement_date": str(today),
            "first_due_date": str(today + timedelta(days=7)),
        }
        res = self.api.post("/api/loans/", payload, format="json")
        self.assertEqual(res.status_code, 201)
        loan_id = res.json()["id"]
        self.assertTrue(LoanInstallment.objects.filter(loan_id=loan_id).count() == 4)

    def test_repayment_allocates_and_closes(self):
        today = date.today()
        # create loan
        res = self.api.post(
            "/api/loans/",
            {
                "client_id": self.client_obj.id,
                "principal_amount": "100.00",
                "interest_rate": "0.00",
                "number_of_installments": 2,
                "repayment_frequency": "WEEKLY",
                "disbursement_date": str(today),
                "first_due_date": str(today + timedelta(days=7)),
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        loan_id = res.json()["id"]

        # pay full in one go (allocates across installments)
        res2 = self.api.post(
            f"/api/loans/{loan_id}/repayments/",
            {"amount": "100.00", "payment_date": str(today)},
            format="json",
        )
        self.assertEqual(res2.status_code, 201)
        loan = Loan.objects.get(id=loan_id)
        self.assertEqual(loan.status, Loan.Status.CLOSED)

    def test_overpayment_rejected_if_loan_fully_paid(self):
        today = date.today()
        res = self.api.post(
            "/api/loans/",
            {
                "client_id": self.client_obj.id,
                "principal_amount": "100.00",
                "interest_rate": "0.00",
                "number_of_installments": 1,
                "repayment_frequency": "WEEKLY",
                "disbursement_date": str(today),
                "first_due_date": str(today + timedelta(days=7)),
            },
            format="json",
        )
        loan_id = res.json()["id"]
        self.api.post(
            f"/api/loans/{loan_id}/repayments/",
            {"amount": "100.00", "payment_date": str(today)},
            format="json",
        )
        res2 = self.api.post(
            f"/api/loans/{loan_id}/repayments/",
            {"amount": "1.00", "payment_date": str(today)},
            format="json",
        )
        self.assertEqual(res2.status_code, 400)

