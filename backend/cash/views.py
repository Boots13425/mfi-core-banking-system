from decimal import Decimal
from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from accounts.models import Branch
from .models import BranchVault, TellerSession, CashLedgerEntry, TellerSessionStatus
from .serializers import (
    BranchVaultSerializer,
    TellerSessionSerializer,
    TellerSessionAllocateSerializer,
    TellerSessionConfirmSerializer,
    TellerSessionCloseSerializer,
    TellerSessionReviewSerializer,
    CashLedgerEntrySerializer,
)
from .permissions import IsBranchManager, IsCashier, IsCashierOrBranchManager
from .services import (
    get_active_session_for_cashier,
    confirm_session_opening,
    close_session,
    compute_expected_drawer_balance,
    reverse_cash_entry,
)

# audit utility from accounts
from accounts.utils import create_audit_log

User = get_user_model()


class BranchVaultViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsCashierOrBranchManager]
    serializer_class = BranchVaultSerializer
    queryset = BranchVault.objects.select_related("branch").all()


class TellerSessionViewSet(viewsets.ModelViewSet):
    """
    Endpoints:
      - list sessions (branch manager sees all; cashier sees own)
      - allocate (branch manager)
      - my_active (cashier)
      - confirm_opening (cashier)
      - close (cashier)
      - review (branch manager)
    """
    permission_classes = [IsAuthenticated, IsCashierOrBranchManager]
    serializer_class = TellerSessionSerializer
    queryset = TellerSession.objects.select_related("branch", "cashier").all()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, "role", "")
        branch_id = getattr(user, "branch_id", None)
        if branch_id:
            qs = qs.filter(branch_id=branch_id)

        if role in ["CASHIER", "TELLER"]:
            qs = qs.filter(cashier=user)
        return qs.order_by("-id")

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated, IsBranchManager])
    def allocate(self, request):
        """
        Manager allocates an opening amount to a cashier.
        Creates an ALLOCATED session.
        """
        serializer = TellerSessionAllocateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cashier_id = serializer.validated_data["cashier_id"]
        opening_amount = serializer.validated_data["opening_amount"]

        branch_id = getattr(request.user, "branch_id", None)
        if not branch_id:
            return Response({"detail": "Manager must belong to a branch."}, status=400)

        cashier = User.objects.filter(id=cashier_id, branch_id=branch_id).first()
        if not cashier:
            return Response({"detail": "Cashier not found in your branch."}, status=404)

        session = TellerSession.objects.create(
            branch_id=branch_id,
            cashier=cashier,
            status=TellerSessionStatus.ALLOCATED,
            opening_amount=opening_amount,
            allocated_by=request.user,
        )

        # Ensure vault exists for branch (optional)
        BranchVault.objects.get_or_create(branch_id=branch_id)

        # audit: record allocation
        create_audit_log(
            actor=request.user,
            action='CASH_ALLOCATED',
            target_type='TellerSession',
            target_id=session.id,
            summary=(
                f"Allocated {opening_amount} to cashier {cashier.username} "
                f"(session #{session.id})"
            ),
            ip_address=get_client_ip(request)
        )

        return Response(TellerSessionSerializer(session).data, status=201)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsCashier])
    def my_active(self, request):
        branch_id = getattr(request.user, "branch_id", None)
        if not branch_id:
            return Response({"detail": "User must belong to a branch."}, status=400)

        session = get_active_session_for_cashier(branch=Branch.objects.get(id=branch_id), cashier=request.user)
        if not session:
            return Response({"detail": "No active session."}, status=404)

        data = TellerSessionSerializer(session).data
        return Response(data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsCashier])
    def confirm_opening(self, request, pk=None):
        session = self.get_object()
        serializer = TellerSessionConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        counted = serializer.validated_data["counted_opening_amount"]
        confirm_session_opening(session=session, cashier=request.user, counted_amount=counted)

        session.refresh_from_db()
        return Response(TellerSessionSerializer(session).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsCashier])
    def close(self, request, pk=None):
        session = self.get_object()
        serializer = TellerSessionCloseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        counted = serializer.validated_data["counted_closing_amount"]
        note = serializer.validated_data.get("variance_note", "")

        close_session(session=session, cashier=request.user, counted_closing_amount=counted, variance_note=note)
        session.refresh_from_db()

        # audit: record closure
        create_audit_log(
            actor=request.user,
            action='SESSION_CLOSED',
            target_type='TellerSession',
            target_id=session.id,
            summary=(
                f"Closed session #{session.id}: expected {session.expected_closing_amount} "
                f"counted {session.counted_closing_amount} variance {session.variance_amount}"
            ),
            ip_address=get_client_ip(request)
        )

        return Response(TellerSessionSerializer(session).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsBranchManager])
    def review(self, request, pk=None):
        session = self.get_object()
        serializer = TellerSessionReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session.reviewed_at = timezone.now()
        session.reviewed_by = request.user
        session.review_note = serializer.validated_data.get("review_note", "")
        session.save()

        return Response(TellerSessionSerializer(session).data)


class CashLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsCashierOrBranchManager]
    serializer_class = CashLedgerEntrySerializer
    queryset = CashLedgerEntry.objects.select_related("branch", "session").all()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        branch_id = getattr(user, "branch_id", None)
        role = getattr(user, "role", "")

        if branch_id:
            qs = qs.filter(branch_id=branch_id)

        if role in ["CASHIER", "TELLER"]:
            # cashier sees only their sessions entries
            qs = qs.filter(session__cashier=user)

        # optional filtering
        session_id = self.request.query_params.get("session_id")
        if session_id:
            qs = qs.filter(session_id=session_id)

        ref_type = self.request.query_params.get("reference_type")
        ref_id = self.request.query_params.get("reference_id")
        if ref_type and ref_id:
            qs = qs.filter(reference_type=ref_type, reference_id=ref_id)

        return qs.order_by("-created_at")

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsBranchManager])
    def reverse(self, request, pk=None):
        entry = self.get_object()
        reason = request.data.get("reason", "")
        reverse_cash_entry(entry=entry, created_by=request.user, reason=reason)
        return Response({"detail": "Reversal posted."}, status=200)