from rest_framework.permissions import BasePermission


class IsLoanOfficer(BasePermission):
    """Only loan officers can access."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Prefer direct `role` on the user (accounts.User). Fallback to `profile` if present.
        role = getattr(request.user, 'role', None)
        if role:
            return role == 'LOAN_OFFICER'
        if hasattr(request.user, 'profile'):
            return getattr(request.user.profile, 'role', None) == 'LOAN_OFFICER'
        return False


class IsBranchManager(BasePermission):
    """Only branch managers can access."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = getattr(request.user, 'role', None)
        if role:
            return role == 'BRANCH_MANAGER'
        if hasattr(request.user, 'profile'):
            return getattr(request.user.profile, 'role', None) == 'BRANCH_MANAGER'
        return False


class IsCashier(BasePermission):
    """Only cashiers can access."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = getattr(request.user, 'role', None)
        if role:
            return role == 'CASHIER'
        if hasattr(request.user, 'profile'):
            return getattr(request.user.profile, 'role', None) == 'CASHIER'
        return False


class IsLoanOfficerOrBranchManager(BasePermission):
    """Loan officer or branch manager."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = getattr(request.user, 'role', None)
        if role:
            return role in ['LOAN_OFFICER', 'BRANCH_MANAGER']
        if hasattr(request.user, 'profile'):
            return getattr(request.user.profile, 'role', None) in ['LOAN_OFFICER', 'BRANCH_MANAGER']
        return False
