from rest_framework.permissions import BasePermission

class IsSuperAdmin(BasePermission):
    """Allow access only to SUPER_ADMIN role"""
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'SUPER_ADMIN'
        )