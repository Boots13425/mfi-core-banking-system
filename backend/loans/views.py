from __future__ import annotations

from decimal import Decimal

from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.utils import create_audit_log, get_client_ip
from clients.models import Client, KYC

from .models import Loan, LoanInstallment
from .permissions import IsLoanOfficer
from .serializers import (
    LoanOfficerClientListSerializer,
    CreateLoanSerializer,
    LoanDetailSerializer,
    RecordRepaymentSerializer,
    LoanInstallmentSerializer,
)
from .services import (
    generate_installment_schedule,
    refresh_overdue_flags_for_loan,
    allocate_repayment_to_schedule,
)


def _loan_officer_client_queryset(request):
    """
    Loan Officer sees ACTIVE clients only.
    Prefer branch scoping if user has a branch.
    """
    qs = Client.objects.filter(status="ACTIVE")
    user = request.user
    if getattr(user, "branch_id", None):
        qs = qs.filter(branch_id=user.branch_id)
    return qs.order_by("-created_at")


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsLoanOfficer])
def loan_officer_clients(request):
    status_param = request.query_params.get("status")
    qs = _loan_officer_client_queryset(request)
    if status_param:
        qs = qs.filter(status__iexact=status_param)
    serializer = LoanOfficerClientListSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsLoanOfficer])
def loan_officer_client_loan_context(request, clientId: int):
    client = get_object_or_404(_loan_officer_client_queryset(request), pk=clientId)

    # Read-only KYC summary (non-editable)
    kyc_summary = None
    try:
        kyc = client.kyc
        kyc_summary = {
            "status": kyc.status,
            "reviewed_by": getattr(kyc.reviewed_by, "username", None),
            "rejection_reason": kyc.rejection_reason,
            "updated_at": kyc.updated_at,
        }
    except KYC.DoesNotExist:
        kyc_summary = {"status": None}

    # Loan history
    loans = (
        Loan.objects.filter(client=client)
        .select_related("created_by")
        .prefetch_related("installments")
        .order_by("-created_at")
    )
    active_loan = loans.filter(status=Loan.Status.ACTIVE).first()

    computed_state = "No Loan"
    risk = {"label": "OK", "max_days_overdue": 0}
    active_loan_summary = None

    if active_loan:
        r = refresh_overdue_flags_for_loan(active_loan)
        risk = {"label": r.label, "max_days_overdue": r.max_days_overdue}
        computed_state = "Overdue" if r.label in ("AT_RISK", "DELINQUENT") else "Active Loan"
        active_loan_summary = {
            "id": active_loan.id,
            "principal_amount": str(active_loan.principal_amount),
            "interest_rate": str(active_loan.interest_rate),
            "number_of_installments": active_loan.number_of_installments,
            "repayment_frequency": active_loan.repayment_frequency,
            "disbursement_date": active_loan.disbursement_date,
            "first_due_date": active_loan.first_due_date,
            "status": active_loan.status,
            "total_amount_due": str(active_loan.total_amount_due),
            "total_paid": str(active_loan.total_paid),
            "outstanding_amount": str(active_loan.outstanding_amount),
        }

    history_payload = []
    for l in loans:
        # lightweight history row
        rr = refresh_overdue_flags_for_loan(l) if l.status == Loan.Status.ACTIVE else None
        history_payload.append(
            {
                "id": l.id,
                "status": l.status,
                "principal_amount": str(l.principal_amount),
                "interest_rate": str(l.interest_rate),
                "number_of_installments": l.number_of_installments,
                "repayment_frequency": l.repayment_frequency,
                "total_amount_due": str(l.total_amount_due),
                "total_paid": str(l.total_paid),
                "outstanding_amount": str(l.outstanding_amount),
                "created_at": l.created_at,
                "created_by": getattr(l.created_by, "username", None),
                "risk_label": rr.label if rr else "OK",
                "max_days_overdue": rr.max_days_overdue if rr else 0,
            }
        )

    payload = {
        "client": {
            "id": client.id,
            "full_name": client.full_name,
            "client_number": str(client.client_number),
            "national_id": client.national_id,
            "phone": client.phone,
            "status": client.status,
            "kyc_summary": kyc_summary,
        },
        "computed_state": computed_state,
        "risk": risk,
        "active_loan": active_loan_summary,
        "loan_history": history_payload,
        "recovery_notes_placeholder": {
            "enabled": False,
            "note": "Placeholder for future Recovery Notes feature.",
        },
    }
    return Response(payload)


class LoanViewSet(viewsets.GenericViewSet):
    """
    /api/loans endpoints.
    Role-guarded: Loan Officer only for this phase.
    """

    permission_classes = [IsAuthenticated, IsLoanOfficer]
    queryset = Loan.objects.all().select_related("client", "created_by")

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Branch scoping where applicable (client.branch can be null)
        if getattr(user, "branch_id", None):
            qs = qs.filter(client__branch_id=user.branch_id)
        return qs

    def retrieve(self, request, pk=None):
        loan = get_object_or_404(self.get_queryset(), pk=pk)
        # Overdue hook
        refresh_overdue_flags_for_loan(loan)
        return Response(LoanDetailSerializer(loan).data)

    def create(self, request):
        serializer = CreateLoanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        client = get_object_or_404(_loan_officer_client_queryset(request), pk=data["client_id"])

        # Eligibility: only one ACTIVE loan at a time
        if Loan.objects.filter(client=client, status=Loan.Status.ACTIVE).exists():
            return Response(
                {"detail": "Client already has an active loan."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        loan = Loan.objects.create(
            client=client,
            principal_amount=data["principal_amount"],
            interest_rate=data["interest_rate"],
            number_of_installments=data["number_of_installments"],
            repayment_frequency=data["repayment_frequency"],
            disbursement_date=data["disbursement_date"],
            first_due_date=data["first_due_date"],
            status=Loan.Status.ACTIVE,
            created_by=request.user,
        )

        schedule = generate_installment_schedule(
            loan=loan,
            first_due_date=data["first_due_date"],
            number_of_installments=data["number_of_installments"],
            repayment_frequency=data["repayment_frequency"],
        )
        LoanInstallment.objects.bulk_create(schedule)

        create_audit_log(
            actor=request.user,
            action="LOAN_CREATED",
            target_type="Loan",
            target_id=str(loan.id),
            summary=f"Loan created for client {client.full_name} (client_id={client.id})",
            ip_address=get_client_ip(request),
        )

        return Response(LoanDetailSerializer(loan).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="schedule")
    def schedule(self, request, pk=None):
        loan = get_object_or_404(self.get_queryset(), pk=pk)
        risk = refresh_overdue_flags_for_loan(loan)
        installments = loan.installments.all().order_by("installment_number")
        return Response(
            {
                "loan_id": loan.id,
                "total_amount_due": str(loan.total_amount_due),
                "total_paid": str(loan.total_paid),
                "outstanding_amount": str(loan.outstanding_amount),
                "risk": {"label": risk.label, "max_days_overdue": risk.max_days_overdue},
                "installments": LoanInstallmentSerializer(installments, many=True).data,
            }
        )

    @action(detail=True, methods=["post"], url_path="repayments")
    def record_repayment(self, request, pk=None):
        loan = get_object_or_404(self.get_queryset(), pk=pk)
        if loan.status != Loan.Status.ACTIVE:
            return Response({"detail": "Repayments can only be recorded for active loans."}, status=400)

        serializer = RecordRepaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            repayment = allocate_repayment_to_schedule(
                loan=loan,
                amount=Decimal(data["amount"]),
                payment_date=data["payment_date"],
                recorded_by=request.user,
                note=data.get("note"),
                installment_id=data.get("installment_id"),
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        create_audit_log(
            actor=request.user,
            action="REPAYMENT_RECORDED",
            target_type="Repayment",
            target_id=str(repayment.id),
            summary=f"Repayment recorded for loan {loan.id} amount={repayment.amount_paid}",
            ip_address=get_client_ip(request),
        )

        # If loan closed, audit it too
        loan.refresh_from_db()
        if loan.status == Loan.Status.CLOSED:
            create_audit_log(
                actor=request.user,
                action="LOAN_CLOSED",
                target_type="Loan",
                target_id=str(loan.id),
                summary=f"Loan {loan.id} closed (all installments paid).",
                ip_address=get_client_ip(request),
            )

        return Response({"detail": "Repayment recorded.", "repayment_id": repayment.id}, status=201)

