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
from .utils import send_invite_email, create_audit_log, get_client_ip

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login with username + password (backward compatible)"""
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']
    
    if not user.is_active:
        return Response(
            {'detail': 'User account is inactive'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_email(request):
    """Login with email + password"""
    serializer = EmailLoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']
    
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data
    }, status=status.HTTP_200_OK)

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
    
    user.set_password(new_password)
    user.is_active = True
    user.save()
    
    create_audit_log(
        actor=None,
        action='PASSWORD_SET_VIA_INVITE',
        target_type='User',
        target_id=str(user.id),
        summary=f"User {user.username} ({user.email}) set password via invite link"
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