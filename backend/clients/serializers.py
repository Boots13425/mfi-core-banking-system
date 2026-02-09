from rest_framework import serializers
from .models import Client


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
