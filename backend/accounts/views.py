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
from django.core.cache import cache
from django.conf import settings
from django.db.models import Q
from django.http import JsonResponse

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
    send_otp_email,
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
def send_otp(request):
    """
    Generate and email a 6-digit verification OTP code.
    Stores the code in Django cache for 5 minutes.
    """
    email = request.data.get('email')
    if not email:
        return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        otp = send_otp_email(email)
        # Store OTP in Django cache for 5 minutes (300 seconds)
        cache.set(f"otp_{email}", otp, timeout=300)

        create_audit_log(
            actor=None,
            action='OTP_SENT',
            target_type='User',
            target_id=email,
            summary=f"OTP verification code sent to {email}",
            ip_address=get_client_ip(request),
        )

        return Response(
            {'detail': 'Verification code sent successfully.'},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {'detail': f'Failed to send email: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """
    Verify the provided 6-digit OTP code against the cached value.
    """
    email = request.data.get('email')
    otp = request.data.get('otp')

    if not email or not otp:
        return Response(
            {'detail': 'Email and verification code are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    cached_otp = cache.get(f"otp_{email}")

    if not cached_otp:
        return Response(
            {'detail': 'Verification code has expired or was not requested.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if str(cached_otp) != str(otp).strip():
        return Response(
            {'detail': 'Invalid verification code.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Clear OTP from cache after successful verification
    cache.delete(f"otp_{email}")

    create_audit_log(
        actor=None,
        action='OTP_VERIFIED',
        target_type='User',
        target_id=email,
        summary=f"OTP verification successful for {email}",
        ip_address=get_client_ip(request),
    )

    return Response(
        {'detail': 'Email verified successfully.'},
        status=status.HTTP_200_OK
    )


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

    user = User.objects.filter(username=username).first()

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
    except Exception:
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_dashboard(request):
    user = request.user
    
    # Adjust this based on where your account/savings balance is stored
    # Example assuming user has a related savings account profile:
    balance = getattr(user, 'balance', 0.00) 
    
    return Response({
        "userId": user.id,
        "fullName": user.get_full_name() or user.username,
        "email": user.email,
        "bankNumber": getattr(user, 'account_number', 'N/A'),
        "balance": float(balance),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def get_mobile_dashboard(request):
    """
    Mobile bridge endpoint - called by Node.js server on behalf of a logged-in
    app user. Protected by a shared service token header instead of JWT.

    Query params:
      - email (required)
      - account_number (optional, used to narrow down if client has multiple accounts)

    Returns client info, savings account balance and recent transactions.
    """
    # 1. Validate service token
    service_token = request.headers.get('X-Service-Token', '')
    expected_token = getattr(settings, 'MOBILE_SERVICE_TOKEN', '')
    if not expected_token or service_token != expected_token:
        return Response(
            {'detail': 'Unauthorized. Invalid or missing service token.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # 2. Get lookup params
    email = (request.query_params.get('email') or '').strip().lower()
    account_number = (request.query_params.get('account_number') or '').strip()

    if not email:
        return Response(
            {'detail': 'email query parameter is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 3. Import here to avoid circular imports
    try:
        from clients.models import Client
        from savings.models import SavingsAccount, SavingsTransaction, get_account_balance
    except ImportError as e:
        return Response(
            {'detail': f'Server configuration error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # 4. Find client by email
    try:
        client = Client.objects.select_related('branch').get(email__iexact=email)
    except Client.DoesNotExist:
        return Response(
            {'detail': 'No bank client found matching this email address.',
             'client_found': False},
            status=status.HTTP_404_NOT_FOUND
        )
    except Client.MultipleObjectsReturned:
        client = Client.objects.select_related('branch').filter(
            email__iexact=email
        ).first()

    # 5. Get savings accounts for this client
    accounts_qs = SavingsAccount.objects.select_related(
        'product', 'branch'
    ).filter(client=client)

    if account_number:
        accounts_qs = accounts_qs.filter(account_number=account_number)

    # Pick primary account (first ACTIVE, else first)
    primary_account = (
        accounts_qs.filter(status='ACTIVE').first()
        or accounts_qs.first()
    )

    if not primary_account:
        return Response({
            'client_found': True,
            'client': {
                'full_name': client.full_name,
                'email': client.email,
                'phone': client.phone or '',
                'status': client.status,
                'branch': client.branch.name if client.branch else '',
            },
            'account': None,
            'balance': 0.0,
            'current_balance': 0.0,
            'recent_transactions': [],
            'message': 'Client found but has no savings account.'
        })

    # 6. Calculate balance
    balance = get_account_balance(primary_account)

    # 7. Fetch recent transactions (last 20 POSTED or PENDING)
    recent_txs = SavingsTransaction.objects.filter(
        account=primary_account,
        status__in=['POSTED', 'PENDING']
    ).order_by('-created_at')[:20]

    transactions_data = [
        {
            'id': tx.id,
            'transaction_type': tx.tx_type,
            'amount': str(tx.amount),
            'status': tx.status,
            'narration': tx.narration or '',
            'reference': tx.reference or '',
            'payment_method': tx.payment_method or '',
            'created_at': tx.created_at.isoformat(),
        }
        for tx in recent_txs
    ]

    # 8. Build all savings accounts summary
    all_accounts = []
    for acc in accounts_qs:
        acc_balance = get_account_balance(acc)
        all_accounts.append({
            'account_number': acc.account_number,
            'product_name': acc.product.name if acc.product else '',
            'status': acc.status,
            'balance': str(acc_balance),
            'branch': acc.branch.name if acc.branch else '',
            'is_primary': acc.id == primary_account.id,
        })

    return Response({
        'client_found': True,
        'client': {
            'full_name': client.full_name,
            'email': client.email,
            'phone': client.phone or '',
            'status': client.status,
            'branch': client.branch.name if client.branch else '',
        },
        'account': {
            'account_number': primary_account.account_number,
            'product_name': primary_account.product.name if primary_account.product else '',
            'status': primary_account.status,
            'branch': primary_account.branch.name if primary_account.branch else '',
        },
        'available_balance': str(balance),
        'current_balance': str(balance),
        'all_accounts': all_accounts,
        'recent_transactions': transactions_data,
    })

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