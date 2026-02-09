from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsCashierOrBranchManagerReadOnly(BasePermission):
    """Cashier can create and view; Branch Manager can view only (their branch).

    Other read-only access allowed to SUPER_ADMIN and AUDITOR.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method in SAFE_METHODS:
            # Allow Cashier and Branch Manager (and Super Admin / Auditor) to read
            return user.role in ('CASHIER', 'BRANCH_MANAGER', 'SUPER_ADMIN', 'AUDITOR')

        # Non-safe methods (create, update, partial_update)
        # Only Cashier is allowed to create; only Cashier may change status
        return user.role == 'CASHIER'
