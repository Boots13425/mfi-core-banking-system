from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .permissions import IsCashier, IsBranchManager, IsManagerAuditorOrSuperAdmin
from .services import build_cashier_daily_pack, build_branch_daily_pack, branch_liquidity


class ReportsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _parse_date(self, request):
        s = request.query_params.get("date")
        if not s:
            return timezone.localdate()
        try:
            return timezone.datetime.strptime(s, "%Y-%m-%d").date()
        except Exception:
            return timezone.localdate()

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsCashier])
    def cashier_daily_pack(self, request):
        day = self._parse_date(request)
        data = build_cashier_daily_pack(request.user, day=day)
        return Response(data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsBranchManager])
    def branch_daily_pack(self, request):
        day = self._parse_date(request)
        branch_id = getattr(request.user, "branch_id", None)
        if not branch_id:
            return Response({"detail": "User has no branch assigned."}, status=400)
        data = build_branch_daily_pack(int(branch_id), day=day)
        return Response(data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsBranchManager])
    def branch_liquidity(self, request):
        day = self._parse_date(request)
        branch_id = getattr(request.user, "branch_id", None)
        if not branch_id:
            return Response({"detail": "User has no branch assigned."}, status=400)
        data = branch_liquidity(int(branch_id), day=day)
        return Response(data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsManagerAuditorOrSuperAdmin])
    def admin_branch_daily_pack(self, request):
        """
        Auditor / Super Admin:
        Provide branch_id explicitly.
        """
        day = self._parse_date(request)
        branch_id = request.query_params.get("branch_id")
        if not branch_id:
            return Response({"detail": "branch_id is required"}, status=400)
        data = build_branch_daily_pack(int(branch_id), day=day)
        return Response(data)