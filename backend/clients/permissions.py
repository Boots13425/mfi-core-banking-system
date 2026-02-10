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
        # Only Cashier is allowed to create and perform most write actions
        if user.role == 'CASHIER':
            return True

        # Allow Branch Manager to perform specific non-safe actions such as
        # approving/rejecting KYC and deactivating a client. These actions are
        # implemented as viewset actions named 'approve_kyc', 'reject_kyc',
        # and 'deactivate'. For other write actions, Branch Manager is not allowed.
        action = getattr(view, 'action', None)
        if user.role == 'BRANCH_MANAGER' and action in ('approve_kyc', 'reject_kyc', 'deactivate'):
            return True

        return False
