from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_decode
from .models import User, Branch, AuditLog

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'code', 'region', 'phone', 'address', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class UserSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'branch', 'branch_name', 'is_active', 'date_joined']
        read_only_fields = ['id', 'date_joined']

class CreateUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'role', 'branch']
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value
    
    def validate(self, data):
        role = data.get('role')
        branch = data.get('branch')
        
        if role != 'SUPER_ADMIN' and not branch:
            raise serializers.ValidationError("Non-super admin users must have a branch assigned")
        
        if role == 'SUPER_ADMIN' and branch:
            raise serializers.ValidationError("Super admin cannot be assigned to a branch")
        
        return data

class UpdateUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'role', 'branch']
    
    def validate_email(self, value):
        user = self.instance
        if User.objects.filter(email=value).exclude(id=user.id).exists():
            raise serializers.ValidationError("Email already exists")
        return value
    
    def validate(self, data):
        role = data.get('role', self.instance.role)
        branch = data.get('branch', self.instance.branch)
        
        if role != 'SUPER_ADMIN' and not branch:
            raise serializers.ValidationError("Non-super admin users must have a branch assigned")
        
        if role == 'SUPER_ADMIN' and branch:
            raise serializers.ValidationError("Super admin cannot be assigned to a branch")
        
        return data

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        user = authenticate(
            username=data.get('username'),
            password=data.get('password')
        )
        if not user:
            raise serializers.ValidationError("Invalid credentials")
        data['user'] = user
        return data

class EmailLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password")
        
        if not user.check_password(password):
            raise serializers.ValidationError("Invalid email or password")
        
        if not user.is_active:
            raise serializers.ValidationError("User account is inactive")
        
        data['user'] = user
        return data

class InviteSetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")
        return data

class AuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = ['id', 'actor', 'actor_username', 'action', 'action_display', 'target_type', 'target_id', 'summary', 'ip_address', 'created_at']
        read_only_fields = fields