from rest_framework.permissions import BasePermission


def _role(user):
    return getattr(user, "role", None) or getattr(user, "user_type", None) or ""


class IsBranchManager(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and _role(request.user) in ["BRANCH_MANAGER", "MANAGER"]


class IsCashier(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and _role(request.user) in ["CASHIER", "TELLER"]


class IsCashierOrBranchManager(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and _role(request.user) in ["CASHIER", "TELLER", "BRANCH_MANAGER", "MANAGER"]