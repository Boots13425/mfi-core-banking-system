from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.utils import create_audit_log, get_client_ip
from clients.models import Client, KYC
from .models import SavingsProduct, SavingsAccount, SavingsTransaction, get_account_balance
from .serializers import (
    SavingsProductSerializer,
    SavingsAccountSerializer,
    CreateSavingsAccountSerializer,
    SavingsTransactionSerializer,
    DepositSerializer,
    WithdrawSerializer,
)


def _user_is_super_admin(user) -> bool:
    return getattr(user, "role", None) == "SUPER_ADMIN"


def _user_is_branch_manager(user) -> bool:
    return getattr(user, "role", None) == "BRANCH_MANAGER"


def _user_is_loan_officer(user) -> bool:
    return getattr(user, "role", None) == "LOAN_OFFICER"


def _user_is_cashier(user) -> bool:
    return getattr(user, "role", None) == "CASHIER"


def _enforce_branch_scope(queryset, user):
    """
    Ensure branch scoping is consistent with loans module:
    - SUPER_ADMIN sees all.
    - Others limited to their branch.
    """
    if not _user_is_super_admin(user) and getattr(user, "branch_id", None):
        return queryset.filter(branch_id=user.branch_id)
    if not _user_is_super_admin(user):
        # no branch on user -> no access
        return queryset.none()
    return queryset


class SavingsProductViewSet(viewsets.ModelViewSet):
    queryset = SavingsProduct.objects.all()
    serializer_class = SavingsProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        # Everyone can see active products; super admin sees all.
        if _user_is_super_admin(self.request.user):
            return qs
        return qs.filter(is_active=True)

    def has_admin_perms(self, request):
        return _user_is_super_admin(request.user)

    def create(self, request, *args, **kwargs):
        if not self.has_admin_perms(request):
            return Response(status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not self.has_admin_perms(request):
            return Response(status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)


class SavingsAccountViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _base_queryset(self, request):
        qs = SavingsAccount.objects.select_related("client", "product", "branch", "created_by")
        return _enforce_branch_scope(qs, request.user)

    def list(self, request):
        client_id = request.query_params.get("client_id")
        qs = self._base_queryset(request)
        if client_id:
            qs = qs.filter(client_id=client_id)
        serializer = SavingsAccountSerializer(qs, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        account = get_object_or_404(self._base_queryset(request), pk=pk)
        serializer = SavingsAccountSerializer(account)
        return Response(serializer.data)

    @transaction.atomic
    def create(self, request):
        """
        Create savings account for ACTIVE client.
        Allowed for CASHIER, BRANCH_MANAGER, SUPER_ADMIN.
        """
        if not ( _user_is_cashier(request.user) or _user_is_branch_manager(request.user) or _user_is_super_admin(request.user)):
            return Response(status=status.HTTP_403_FORBIDDEN)

        serializer = CreateSavingsAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        client = get_object_or_404(Client.objects.select_related("branch"), pk=data["client_id"])
        # must be active and have approved KYC per loans module standards
        if client.status != "ACTIVE":
            return Response(
                {"detail": "Savings accounts can only be opened for ACTIVE clients."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # check KYC approval
        try:
            kyc = KYC.objects.get(client=client)
            if kyc.status != "APPROVED":
                return Response(
                    {"detail": "Client must have APPROVED KYC before opening savings account."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except KYC.DoesNotExist:
            return Response(
                {"detail": "Client must have APPROVED KYC before opening savings account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Branch scoping: staff must match client branch (unless super admin)
        if not _user_is_super_admin(request.user):
            if getattr(request.user, "branch_id", None) != getattr(client, "branch_id", None):
                return Response(status=status.HTTP_403_FORBIDDEN)

        product = get_object_or_404(SavingsProduct, pk=data["product_id"], is_active=True)

        # Simple account number: branch-code + client-id + incremental count
        existing_count = SavingsAccount.objects.filter(client=client).count()
        branch_code = getattr(client.branch, "code", "XXX")
        account_number = f"SAV-{branch_code}-{client.id}-{existing_count + 1}"

        account = SavingsAccount.objects.create(
            client=client,
            product=product,
            branch=client.branch,
            account_number=account_number,
            created_by=request.user,
        )

        opening_deposit = data.get("opening_deposit") or Decimal("0.00")
        if opening_deposit < product.min_opening_balance:
            return Response(
                {"detail": f"Opening deposit must be at least {product.min_opening_balance}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if opening_deposit > 0:
            SavingsTransaction.objects.create(
                account=account,
                tx_type="DEPOSIT",
                amount=opening_deposit,
                status="POSTED",
                posted_by=request.user,
                narration="Opening deposit",
            )

        try:
            create_audit_log(
                actor=request.user,
                action="SAVINGS_ACCOUNT_CREATED",
                target_type="SavingsAccount",
                target_id=str(account.id),
                summary=f"Savings account {account.account_number} opened for client {client.full_name}",
                ip_address=get_client_ip(request),
            )
        except Exception:
            pass

        return Response(SavingsAccountSerializer(account).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def deposit(self, request, pk=None):
        """
        Instant POSTED deposit.
        Allowed for LOAN_OFFICER, CASHIER, BRANCH_MANAGER, SUPER_ADMIN.
        """
        if not (
            _user_is_loan_officer(request.user)
            or _user_is_cashier(request.user)
            or _user_is_branch_manager(request.user)
            or _user_is_super_admin(request.user)
        ):
            return Response(status=status.HTTP_403_FORBIDDEN)

        account = get_object_or_404(self._base_queryset(request), pk=pk)
        if account.status != "ACTIVE":
            return Response({"detail": "Deposits only allowed on ACTIVE accounts."}, status=400)

        serializer = DepositSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        tx = SavingsTransaction.objects.create(
            account=account,
            tx_type="DEPOSIT",
            amount=data["amount"],
            status="POSTED",
            posted_by=request.user,
            reference=data.get("reference") or "",
            narration=data.get("narration") or "",
        )

        try:
            create_audit_log(
                actor=request.user,
                action="SAVINGS_DEPOSIT_POSTED",
                target_type="SavingsTransaction",
                target_id=str(tx.id),
                summary=f"Deposit {tx.amount} posted to {account.account_number}",
                ip_address=get_client_ip(request),
            )
        except Exception:
            pass

        return Response(SavingsTransactionSerializer(tx).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def withdraw(self, request, pk=None):
        """
        Withdrawal.
        - LOAN_OFFICER cannot withdraw.
        - CASHIER / BRANCH_MANAGER / SUPER_ADMIN can initiate.
        - Small amounts (<= threshold) are POSTED immediately.
        - Larger amounts become PENDING and require BM approval.
        """
        if not (
            _user_is_cashier(request.user)
            or _user_is_branch_manager(request.user)
            or _user_is_super_admin(request.user)
        ):
            return Response(status=status.HTTP_403_FORBIDDEN)

        account = get_object_or_404(self._base_queryset(request), pk=pk)
        if account.status != "ACTIVE":
            return Response({"detail": "Withdrawals only allowed on ACTIVE accounts."}, status=400)

        serializer = WithdrawSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        amount = data["amount"]

        product = account.product
        current_balance = get_account_balance(account)

        # Check sufficient funds & min balance
        resulting_balance = current_balance - amount
        if resulting_balance < product.min_balance:
            return Response(
                {"detail": "Withdrawal would breach minimum balance."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        requires_approval = amount > product.withdrawal_requires_approval_above
        status_value = "PENDING" if requires_approval else "POSTED"

        # always record who initiated the withdrawal; this is the cashier (or other
        # user) making the request.  previously pending requests left `posted_by`
        # blank which meant the pending list could not show who asked for the
        # withdrawal.  branch manager approval already uses `approved_by` so we
        # don't overwrite this field later.
        tx = SavingsTransaction.objects.create(
            account=account,
            tx_type="WITHDRAWAL",
            amount=amount,
            status=status_value,
            posted_by=request.user,
            reference=data.get("reference") or "",
            narration=data.get("narration") or "",
        )

        action_code = "SAVINGS_WITHDRAWAL_REQUESTED" if requires_approval else "SAVINGS_WITHDRAWAL_POSTED"
        try:
            create_audit_log(
                actor=request.user,
                action=action_code,
                target_type="SavingsTransaction",
                target_id=str(tx.id),
                summary=f"Withdrawal {tx.amount} for account {account.account_number} ({status_value}).",
                ip_address=get_client_ip(request),
            )
        except Exception:
            pass

        # For instant posted withdrawals, enforce ledger update by marking status POSTED now
        if not requires_approval:
            # nothing extra to do; balance derived from POSTED tx
            pass

        return Response(SavingsTransactionSerializer(tx).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def transactions(self, request, pk=None):
        account = get_object_or_404(self._base_queryset(request), pk=pk)
        qs = account.transactions.all().order_by("-created_at")[:50]
        serializer = SavingsTransactionSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def freeze(self, request, pk=None):
        if not (_user_is_branch_manager(request.user) or _user_is_super_admin(request.user)):
            return Response(status=status.HTTP_403_FORBIDDEN)
        account = get_object_or_404(self._base_queryset(request), pk=pk)
        if account.status == "FROZEN":
            return Response(SavingsAccountSerializer(account).data)
        account.status = "FROZEN"
        account.save(update_fields=["status"])
        try:
            create_audit_log(
                actor=request.user,
                action="SAVINGS_ACCOUNT_FROZEN",
                target_type="SavingsAccount",
                target_id=str(account.id),
                summary=f"Savings account {account.account_number} frozen.",
                ip_address=get_client_ip(request),
            )
        except Exception:
            pass
        return Response(SavingsAccountSerializer(account).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def close(self, request, pk=None):
        if not (_user_is_branch_manager(request.user) or _user_is_super_admin(request.user)):
            return Response(status=status.HTTP_403_FORBIDDEN)
        account = get_object_or_404(self._base_queryset(request), pk=pk)
        if account.status == "CLOSED":
            return Response(SavingsAccountSerializer(account).data)
        if get_account_balance(account) != Decimal("0.00"):
            return Response(
                {"detail": "Account can only be closed when balance is 0."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        account.status = "CLOSED"
        account.save(update_fields=["status"])
        try:
            create_audit_log(
                actor=request.user,
                action="SAVINGS_ACCOUNT_CLOSED",
                target_type="SavingsAccount",
                target_id=str(account.id),
                summary=f"Savings account {account.account_number} closed.",
                ip_address=get_client_ip(request),
            )
        except Exception:
            pass
        return Response(SavingsAccountSerializer(account).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def branch_manager_pending_withdrawals(request):
    """
    List PENDING withdrawals for current branch.
    Branch Manager only (Super Admin sees all).
    """
    if not (_user_is_branch_manager(request.user) or _user_is_super_admin(request.user)):
        return Response(status=status.HTTP_403_FORBIDDEN)

    qs = SavingsTransaction.objects.filter(tx_type="WITHDRAWAL", status="PENDING").select_related(
        "account", "account__client", "posted_by"
    )
    if not _user_is_super_admin(request.user) and getattr(request.user, "branch_id", None):
        qs = qs.filter(account__branch_id=request.user.branch_id)
    data = []
    for tx in qs:
        # display the full name of the user who initiated the request; fall back
        # to username if full name is blank for any reason (unlikely but safe).
        requester = None
        if tx.posted_by:
            try:
                requester = tx.posted_by.get_full_name() or tx.posted_by.username
            except Exception:
                requester = tx.posted_by.username
        data.append(
            {
                "id": tx.id,
                "account_id": tx.account_id,
                "account_number": tx.account.account_number,
                "client_name": tx.account.client.full_name,
                "amount": str(tx.amount),
                "requested_by": requester,
                "created_at": tx.created_at,
            }
        )
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def branch_manager_approve_withdrawal(request, tx_id: int):
    if not (_user_is_branch_manager(request.user) or _user_is_super_admin(request.user)):
        return Response(status=status.HTTP_403_FORBIDDEN)

    tx = get_object_or_404(
        SavingsTransaction.objects.select_related("account", "account__product"),
        pk=tx_id,
        tx_type="WITHDRAWAL",
        status="PENDING",
    )
    account = tx.account

    # Branch scoping
    if not _user_is_super_admin(request.user) and getattr(request.user, "branch_id", None) != account.branch_id:
        return Response(status=status.HTTP_403_FORBIDDEN)

    product = account.product
    current_balance = get_account_balance(account)
    resulting_balance = current_balance - tx.amount
    if resulting_balance < product.min_balance:
        return Response(
            {"detail": "Approval would breach minimum balance."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    tx.status = "POSTED"
    tx.approved_by = request.user
    tx.approved_at = datetime.utcnow()
    # posted_by already recorded at creation (cashier who requested), so leave it alone
    tx.save(update_fields=["status", "approved_by", "approved_at"])

    try:
        create_audit_log(
            actor=request.user,
            action="SAVINGS_WITHDRAWAL_APPROVED",
            target_type="SavingsTransaction",
            target_id=str(tx.id),
            summary=f"Savings withdrawal {tx.amount} approved for account {account.account_number}",
            ip_address=get_client_ip(request),
        )
    except Exception:
        pass

    return Response(SavingsTransactionSerializer(tx).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@transaction.atomic
def branch_manager_reject_withdrawal(request, tx_id: int):
    if not (_user_is_branch_manager(request.user) or _user_is_super_admin(request.user)):
        return Response(status=status.HTTP_403_FORBIDDEN)

    tx = get_object_or_404(
        SavingsTransaction.objects.select_related("account"),
        pk=tx_id,
        tx_type="WITHDRAWAL",
        status="PENDING",
    )
    account = tx.account

    if not _user_is_super_admin(request.user) and getattr(request.user, "branch_id", None) != account.branch_id:
        return Response(status=status.HTTP_403_FORBIDDEN)

    tx.status = "REJECTED"
    tx.approved_by = request.user
    tx.approved_at = datetime.utcnow()
    tx.save(update_fields=["status", "approved_by", "approved_at"])

    try:
        create_audit_log(
            actor=request.user,
            action="SAVINGS_WITHDRAWAL_REJECTED",
            target_type="SavingsTransaction",
            target_id=str(tx.id),
            summary=f"Savings withdrawal {tx.amount} rejected for account {account.account_number}",
            ip_address=get_client_ip(request),
        )
    except Exception:
        pass

    return Response(SavingsTransactionSerializer(tx).data)

