from decimal import Decimal
from rest_framework import serializers
from django.utils import timezone

from .models import BranchVault, TellerSession, CashLedgerEntry, TellerSessionStatus
from .services import compute_expected_drawer_balance


class BranchVaultSerializer(serializers.ModelSerializer):
    class Meta:
        model = BranchVault
        fields = ["id", "branch", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class TellerSessionSerializer(serializers.ModelSerializer):
    expected_drawer_balance = serializers.SerializerMethodField()

    class Meta:
        model = TellerSession
        fields = [
            "id",
            "branch",
            "cashier",
            "status",
            "opening_amount",
            "allocated_by",
            "allocated_at",
            "confirmed_opening_amount",
            "confirmed_at",
            "confirmed_by",
            "opened_at",
            "counted_closing_amount",
            "expected_closing_amount",
            "variance_amount",
            "variance_note",
            "closed_at",
            "closed_by",
            "reviewed_at",
            "reviewed_by",
            "review_note",
            "expected_drawer_balance",
        ]
        read_only_fields = [
            "id",
            "allocated_at",
            "confirmed_at",
            "opened_at",
            "closed_at",
            "reviewed_at",
            "expected_closing_amount",
            "variance_amount",
            "expected_drawer_balance",
        ]

    def get_expected_drawer_balance(self, obj: TellerSession):
        if obj.status != TellerSessionStatus.ACTIVE:
            return None
        return str(compute_expected_drawer_balance(obj))


class TellerSessionAllocateSerializer(serializers.Serializer):
    cashier_id = serializers.IntegerField()
    opening_amount = serializers.DecimalField(max_digits=14, decimal_places=2)

    def validate_opening_amount(self, v: Decimal):
        if v <= 0:
            raise serializers.ValidationError("opening_amount must be > 0.")
        return v


class TellerSessionConfirmSerializer(serializers.Serializer):
    counted_opening_amount = serializers.DecimalField(max_digits=14, decimal_places=2)

    def validate_counted_opening_amount(self, v: Decimal):
        if v <= 0:
            raise serializers.ValidationError("counted_opening_amount must be > 0.")
        return v


class TellerSessionCloseSerializer(serializers.Serializer):
    counted_closing_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    variance_note = serializers.CharField(required=False, allow_blank=True, default="")


class TellerSessionReviewSerializer(serializers.Serializer):
    review_note = serializers.CharField(required=False, allow_blank=True, default="")
    reviewed = serializers.BooleanField(default=True)


class CashLedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = CashLedgerEntry
        fields = [
            "id",
            "branch",
            "session",
            "event_type",
            "direction",
            "amount",
            "narration",
            "reference_type",
            "reference_id",
            "created_by",
            "created_at",
            "reverses_entry",
        ]
        read_only_fields = ["id", "created_at"]