from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    login,
    login_email,
    refresh_token,
    get_user_profile,
    invite_set_password,
    BranchViewSet,
    UserViewSet,
    AuditLogViewSet
)

router = DefaultRouter()
router.register(r'admin/branches', BranchViewSet, basename='branch')
router.register(r'admin/users', UserViewSet, basename='user')
router.register(r'admin/audit-logs', AuditLogViewSet, basename='audit-log')

urlpatterns = [
    path('auth/login/', login, name='login'),
    path('auth/login-email/', login_email, name='login-email'),
    path('auth/refresh/', refresh_token, name='refresh'),
    path('auth/me/', get_user_profile, name='user-profile'),
    path('auth/invite-set-password/', invite_set_password, name='invite-set-password'),
    path('', include(router.urls)),
]
