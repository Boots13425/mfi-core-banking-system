from __future__ import annotations

from decimal import Decimal
from rest_framework import serializers

from clients.models import Client
from .models import SavingsProduct, SavingsAccount, SavingsTransaction, get_account_balance


class SavingsProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavingsProduct
        fields = [
            "id",
            "code",
            "name",
            "min_opening_balance",
            "min_balance",
            "interest_rate",
            "withdrawal_requires_approval_above",
            "withdrawal_fee",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class SavingsAccountSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    balance = serializers.SerializerMethodField()

    class Meta:
        model = SavingsAccount
        fields = [
            "id",
            "client",
            "client_name",
            "product",
            "product_name",
            "branch",
            "branch_name",
            "account_number",
            "status",
            "created_by",
            "created_at",
            "balance",
        ]
        read_only_fields = ["id", "created_by", "created_at", "branch", "balance"]

    def get_balance(self, obj):
        return str(get_account_balance(obj))


class CreateSavingsAccountSerializer(serializers.Serializer):
    client_id = serializers.IntegerField()
    product_id = serializers.IntegerField()
    opening_deposit = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0.00"), required=False
    )


class SavingsTransactionSerializer(serializers.ModelSerializer):
    posted_by_username = serializers.CharField(source="posted_by.username", read_only=True)
    # full name via User.get_full_name(); falls back to username automatically
    posted_by_full_name = serializers.CharField(source="posted_by.get_full_name", read_only=True)

    class Meta:
        model = SavingsTransaction
        fields = [
            "id",
            "account",
            "tx_type",
            "amount",
            "status",
            "is_credit_adjustment",
            "posted_by",
            "posted_by_username",
            "posted_by_full_name",
            "approved_by",
            "approved_at",
            "reference",
            "narration",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "account",
            "status",
            "is_credit_adjustment",
            "posted_by",
            "posted_by_username",
            "approved_by",
            "approved_at",
            "created_at",
        ]


class DepositSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    reference = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    narration = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    payment_method = serializers.ChoiceField(choices=["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CHECK"], required=False)


class WithdrawSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    reference = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=64)
    narration = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    payment_method = serializers.ChoiceField(choices=["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CHECK"], required=False)

