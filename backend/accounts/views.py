from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q

from .models import User, Branch, AuditLog
from .serializers import (
    UserSerializer, CreateUserSerializer, UpdateUserSerializer,
    LoginSerializer, EmailLoginSerializer, InviteSetPasswordSerializer,
    BranchSerializer, AuditLogSerializer
)
from .permissions import IsSuperAdmin
from .utils import (
    send_invite_email,
    send_password_reset_email,
    create_audit_log,
    get_client_ip,
)

MAX_LOGIN_ATTEMPTS = 4


def _handle_failed_login_attempt(request, user):
    """
    Increment failed attempts for non-super-admin operators and auto-deactivate at threshold.
    Returns (locked: bool, remaining_attempts: int | None).
    """
    if not user or user.role == 'SUPER_ADMIN':
        # Do not lock out super admins via this mechanism
        return False, None

    if not user.is_active:
        return False, None

    user.failed_login_attempts += 1

    if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
        user.is_active = False
        user.save(update_fields=['failed_login_attempts', 'is_active'])

        create_audit_log(
            actor=None,
            action='USER_AUTO_DEACTIVATED',
            target_type='User',
            target_id=str(user.id),
            summary=(
                f"User {user.username} ({user.email}) automatically deactivated "
                f"after {MAX_LOGIN_ATTEMPTS} failed login attempts"
            ),
            ip_address=get_client_ip(request),
        )
        return True, 0

    remaining = MAX_LOGIN_ATTEMPTS - user.failed_login_attempts
    user.save(update_fields=['failed_login_attempts'])
    return False, remaining


def _reset_failed_attempts_if_needed(user):
    if user and user.failed_login_attempts:
        user.failed_login_attempts = 0
        user.save(update_fields=['failed_login_attempts'])


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login with username + password (with limited trial attempts for operators)"""
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response(
            {'detail': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Best-effort fetch to track attempts even on invalid credentials
    user = User.objects.filter(username=username).first()

    # If the account is already inactive, short-circuit with clear message
    if user and not user.is_active:
        return Response(
            {
                'detail': (
                    'Your account is inactive. Please contact the Super Admin for '
                    'activation and/or password reset.'
                )
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    auth_user = authenticate(username=username, password=password)
    if not auth_user:
        # Failed login attempt
        locked, remaining = _handle_failed_login_attempt(request, user)
        if locked:
            return Response(
                {
                    'detail': (
                        'Your account has been deactivated due to too many failed '
                        'login attempts. Please contact the Super Admin for '
                        'activation and/or password reset.'
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Generic invalid credentials message with remaining attempts info when available
        if remaining is not None and remaining > 0:
            return Response(
                {
                    'detail': (
                        f'Invalid credentials. You have {remaining} '
                        f'login attempt{"s" if remaining != 1 else ""} left '
                        'before your account is deactivated.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {'detail': 'Invalid credentials'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Successful authentication – ensure account is active
    if not auth_user.is_active:
        return Response(
            {
                'detail': (
                    'Your account is inactive. Please contact the Super Admin for '
                    'activation and/or password reset.'
                )
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    _reset_failed_attempts_if_needed(auth_user)

    refresh = RefreshToken.for_user(auth_user)
    return Response(
        {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(auth_user).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def login_email(request):
    """Login with email + password (with limited trial attempts for operators)"""
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response(
            {'detail': 'Email and password are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.filter(email=email).first()

    if not user:
        # No user to track attempts for, just generic error
        return Response(
            {'detail': 'Invalid email or password'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user.is_active:
        return Response(
            {
                'detail': (
                    'Your account is inactive. Please contact the Super Admin for '
                    'activation and/or password reset.'
                )
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    if not user.check_password(password):
        locked, remaining = _handle_failed_login_attempt(request, user)
        if locked:
            return Response(
                {
                    'detail': (
                        'Your account has been deactivated due to too many failed '
                        'login attempts. Please contact the Super Admin for '
                        'activation and/or password reset.'
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if remaining is not None and remaining > 0:
            return Response(
                {
                    'detail': (
                        f'Invalid email or password. You have {remaining} '
                        f'login attempt{"s" if remaining != 1 else ""} left '
                        'before your account is deactivated.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {'detail': 'Invalid email or password'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    _reset_failed_attempts_if_needed(user)

    refresh = RefreshToken.for_user(user)
    return Response(
        {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """Refresh access token using refresh token"""
    refresh = request.data.get('refresh')
    if not refresh:
        return Response(
            {'detail': 'Refresh token is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        refresh_token_obj = RefreshToken(refresh)
        access = str(refresh_token_obj.access_token)
        return Response({'access': access}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'detail': 'Invalid refresh token'},
            status=status.HTTP_401_UNAUTHORIZED
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    """Get current user profile"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([AllowAny])
def invite_set_password(request):
    """Set password for invited user"""
    serializer = InviteSetPasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    uid = serializer.validated_data['uid']
    token = serializer.validated_data['token']
    new_password = serializer.validated_data['new_password']
    
    token_generator = PasswordResetTokenGenerator()
    
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response(
            {'detail': 'Invalid user ID'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not token_generator.check_token(user, token):
        return Response(
            {'detail': 'Invalid or expired token'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Determine whether this is an initial invite or a password reset
    had_usable_password_before = user.has_usable_password()

    user.set_password(new_password)
    user.is_active = True
    user.save()
    
    action = 'PASSWORD_SET_VIA_INVITE'
    summary = f"User {user.username} ({user.email}) set password via invite link"
    if had_usable_password_before:
        action = 'PASSWORD_RESET_COMPLETED'
        summary = f"User {user.username} ({user.email}) reset password via reset link"
    
    create_audit_log(
        actor=None,
        action=action,
        target_type='User',
        target_id=str(user.id),
        summary=summary
    )
    
    return Response({
        'detail': 'Password set successfully'
    }, status=status.HTTP_200_OK)

class BranchViewSet(viewsets.ModelViewSet):
    """Branch management (Super Admin only)"""
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [IsSuperAdmin]
    
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            branch = Branch.objects.get(id=response.data['id'])
            create_audit_log(
                actor=request.user,
                action='BRANCH_CREATED',
                target_type='Branch',
                target_id=str(branch.id),
                summary=f"Branch '{branch.name}' ({branch.code}) created in {branch.region}",
                ip_address=get_client_ip(request)
            )
        return response
    
    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        if response.status_code == 200:
            branch = Branch.objects.get(id=response.data['id'])
            create_audit_log(
                actor=request.user,
                action='BRANCH_UPDATED',
                target_type='Branch',
                target_id=str(branch.id),
                summary=f"Branch '{branch.name}' updated",
                ip_address=get_client_ip(request)
            )
        return response
    
    @action(detail=True, methods=['patch'])
    def toggle_active(self, request, pk=None):
        """Toggle branch active status"""
        branch = self.get_object()
        branch.is_active = not branch.is_active
        branch.save()
        
        create_audit_log(
            actor=request.user,
            action='BRANCH_TOGGLED',
            target_type='Branch',
            target_id=str(branch.id),
            summary=f"Branch '{branch.name}' toggled to is_active={branch.is_active}",
            ip_address=get_client_ip(request)
        )
        
        serializer = self.get_serializer(branch)
        return Response(serializer.data)

class UserViewSet(viewsets.ModelViewSet):
    """User management (Super Admin only)"""
    serializer_class = UserSerializer
    permission_classes = [IsSuperAdmin]
    
    def get_queryset(self):
        queryset = User.objects.all()
        
        role = self.request.query_params.get('role')
        branch = self.request.query_params.get('branch')
        is_active = self.request.query_params.get('is_active')
        search = self.request.query_params.get('search')
        
        if role:
            queryset = queryset.filter(role=role)
        if branch:
            queryset = queryset.filter(branch_id=branch)
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(username__icontains=search)
            )
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateUserSerializer
        if self.action in ['update', 'partial_update']:
            return UpdateUserSerializer
        return UserSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = User.objects.create_user(
            username=serializer.validated_data['username'],
            email=serializer.validated_data['email'],
            first_name=serializer.validated_data.get('first_name', ''),
            last_name=serializer.validated_data.get('last_name', ''),
            role=serializer.validated_data['role'],
            branch=serializer.validated_data.get('branch'),
            is_active=False
        )
        user.set_unusable_password()
        user.save()
        
        send_invite_email(user)
        
        create_audit_log(
            actor=request.user,
            action='USER_INVITED',
            target_type='User',
            target_id=str(user.id),
            summary=f"User {user.username} ({user.email}) invited as {user.get_role_display()}",
            ip_address=get_client_ip(request)
        )
        
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        user = self.get_object()
        old_role = user.role
        old_branch = user.branch_id
        
        response = super().update(request, *args, **kwargs)
        
        if response.status_code == 200:
            user.refresh_from_db()
            if old_role != user.role:
                create_audit_log(
                    actor=request.user,
                    action='USER_ROLE_CHANGED',
                    target_type='User',
                    target_id=str(user.id),
                    summary=f"User {user.username} role changed from {old_role} to {user.role}",
                    ip_address=get_client_ip(request)
                )
            if old_branch != user.branch_id:
                create_audit_log(
                    actor=request.user,
                    action='USER_BRANCH_CHANGED',
                    target_type='User',
                    target_id=str(user.id),
                    summary=f"User {user.username} branch changed",
                    ip_address=get_client_ip(request)
                )
            if any(key in request.data for key in ['email', 'first_name', 'last_name']):
                create_audit_log(
                    actor=request.user,
                    action='USER_UPDATED',
                    target_type='User',
                    target_id=str(user.id),
                    summary=f"User {user.username} information updated",
                    ip_address=get_client_ip(request)
                )
        
        return response
    
    @action(detail=True, methods=['post'])
    def send_password_reset(self, request, pk=None):
        """
        Send a password reset link to the selected operator.
        """
        user = self.get_object()

        # Reuse the same set-password link generation logic used for invitations.
        send_password_reset_email(user)

        create_audit_log(
            actor=request.user,
            action='PASSWORD_RESET_LINK_SENT',
            target_type='User',
            target_id=str(user.id),
            summary=f"Password reset link sent to {user.username} ({user.email})",
            ip_address=get_client_ip(request)
        )

        return Response(
            {'detail': 'Password reset link sent successfully'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['patch'])
    def activate(self, request, pk=None):
        """Activate user"""
        user = self.get_object()
        user.is_active = True
        user.save()
        
        create_audit_log(
            actor=request.user,
            action='USER_ACTIVATED',
            target_type='User',
            target_id=str(user.id),
            summary=f"User {user.username} activated",
            ip_address=get_client_ip(request)
        )
        
        return Response(UserSerializer(user).data)
    
    @action(detail=True, methods=['patch'])
    def deactivate(self, request, pk=None):
        """Deactivate user"""
        user = self.get_object()
        user.is_active = False
        user.save()
        
        create_audit_log(
            actor=request.user,
            action='USER_DEACTIVATED',
            target_type='User',
            target_id=str(user.id),
            summary=f"User {user.username} deactivated",
            ip_address=get_client_ip(request)
        )
        
        return Response(UserSerializer(user).data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def branch_cashiers(self, request):
        """Get cashiers in the requesting user's branch (for branch managers)"""
        user = request.user
        branch_id = getattr(user, 'branch_id', None)
        
        if not branch_id:
            return Response({'detail': 'User must belong to a branch.'}, status=status.HTTP_400_BAD_REQUEST)
        
        cashiers = User.objects.filter(branch_id=branch_id, role='CASHIER', is_active=True).order_by('first_name', 'last_name')
        serializer = UserSerializer(cashiers, many=True)
        return Response(serializer.data)

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Audit logs (Super Admin only)"""
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsSuperAdmin]
    
    def get_queryset(self):
        queryset = AuditLog.objects.all()
        
        action = self.request.query_params.get('action')
        actor = self.request.query_params.get('actor')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if action:
            queryset = queryset.filter(action=action)
        if actor:
            queryset = queryset.filter(actor_id=actor)
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        return queryset