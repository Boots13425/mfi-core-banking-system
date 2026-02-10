from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsLoanOfficer(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "LOAN_OFFICER"
        )


class LoanOfficerReadOnlyClientProfile(BasePermission):
    """
    Used for endpoints that expose read-only client summary to loan officers.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS and request.user.role == "LOAN_OFFICER":
            return True
        return False

