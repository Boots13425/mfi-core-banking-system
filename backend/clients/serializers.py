from rest_framework import serializers
from .models import Client, KYC, KYCDocument


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = [
            'id',
            'client_number',
            'full_name',
            'national_id',
            'phone',
            'email',
            'address',
            'status',
            'branch',
            'created_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('client_number', 'created_by', 'created_at', 'updated_at')

    def validate(self, data):
        national_id = data.get('national_id')
        phone = data.get('phone')
        email = data.get('email')

        duplicates = Client.objects.none()
        if national_id:
            duplicates = duplicates | Client.objects.filter(national_id__iexact=national_id)
        if phone:
            duplicates = duplicates | Client.objects.filter(phone__iexact=phone)
        if email:
            duplicates = duplicates | Client.objects.filter(email__iexact=email)

        # Exclude soft-deactivated clients? We treat duplicates regardless of status to avoid duplicates.
        if duplicates.exists():
            raise serializers.ValidationError({'detail': 'A client with the same national ID, phone, or email already exists.'})

        return data

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data['created_by'] = request.user
            # If loan officer has a branch and branch not supplied, set it
            if not validated_data.get('branch') and getattr(request.user, 'branch', None):
                validated_data['branch'] = request.user.branch
        return super().create(validated_data)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Add KYC status if KYC exists
        try:
            kyc = instance.kyc
            representation['kyc_status'] = kyc.status
        except KYC.DoesNotExist:
            representation['kyc_status'] = None
        return representation


class KYCDocumentSerializer(serializers.ModelSerializer):
    filename = serializers.SerializerMethodField()
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)
    
    def get_filename(self, obj):
        return obj.filename()

    class Meta:
        model = KYCDocument
        fields = [
            'id',
            'document_type',
            'file',
            'filename',
            'uploaded_by',
            'uploaded_by_username',
            'created_at',
        ]
        read_only_fields = ('uploaded_by', 'created_at')

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data['uploaded_by'] = request.user
        return super().create(validated_data)


class KYCSerializer(serializers.ModelSerializer):
    documents = KYCDocumentSerializer(many=True, read_only=True)
    initiated_by_username = serializers.CharField(source='initiated_by.username', read_only=True)
    reviewed_by_username = serializers.CharField(source='reviewed_by.username', read_only=True, allow_null=True)
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    client_number = serializers.UUIDField(source='client.client_number', read_only=True)

    class Meta:
        model = KYC
        fields = [
            'id',
            'client',
            'client_name',
            'client_number',
            'status',
            'initiated_by',
            'initiated_by_username',
            'reviewed_by',
            'reviewed_by_username',
            'rejection_reason',
            'documents',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('initiated_by', 'reviewed_by', 'created_at', 'updated_at')


class InitiateKYCSerializer(serializers.Serializer):
    """Serializer for initiating KYC"""
    pass


class ApproveKYCSerializer(serializers.Serializer):
    """Serializer for approving KYC"""
    pass


class RejectKYCSerializer(serializers.Serializer):
    """Serializer for rejecting KYC"""
    rejection_reason = serializers.CharField(required=True, allow_blank=False)
