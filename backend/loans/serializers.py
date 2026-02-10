from __future__ import annotations

from decimal import Decimal
from rest_framework import serializers

from clients.models import Client
from .models import Loan, LoanInstallment, Repayment
from .services import refresh_overdue_flags_for_loan


class LoanOfficerClientListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ["id", "full_name", "national_id", "phone", "status"]


class ClientLoanContextSerializer(serializers.Serializer):
    client = serializers.DictField()
    computed_state = serializers.CharField()
    active_loan = serializers.DictField(allow_null=True)
    loan_history = serializers.ListField(child=serializers.DictField())
    risk = serializers.DictField()
    recovery_notes_placeholder = serializers.DictField()


class CreateLoanSerializer(serializers.Serializer):
    client_id = serializers.IntegerField()
    principal_amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    interest_rate = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=Decimal("0.00"))
    number_of_installments = serializers.IntegerField(min_value=1, max_value=520)
    repayment_frequency = serializers.ChoiceField(choices=Loan.RepaymentFrequency.choices)
    disbursement_date = serializers.DateField()
    first_due_date = serializers.DateField()

    def validate(self, data):
        if data["first_due_date"] < data["disbursement_date"]:
            raise serializers.ValidationError({"first_due_date": "First due date must be on/after disbursement date."})
        return data


class LoanInstallmentSerializer(serializers.ModelSerializer):
    days_overdue = serializers.SerializerMethodField()

    class Meta:
        model = LoanInstallment
        fields = [
            "id",
            "installment_number",
            "due_date",
            "amount_due",
            "amount_paid",
            "status",
            "days_overdue",
        ]

    def get_days_overdue(self, obj):
        return obj.compute_days_overdue()


class RepaymentSerializer(serializers.ModelSerializer):
    recorded_by_username = serializers.CharField(source="recorded_by.username", read_only=True)

    class Meta:
        model = Repayment
        fields = [
            "id",
            "loan",
            "installment",
            "amount_paid",
            "payment_date",
            "recorded_by",
            "recorded_by_username",
            "note",
            "created_at",
        ]
        read_only_fields = ["id", "recorded_by", "created_at"]


class LoanDetailSerializer(serializers.ModelSerializer):
    installments = LoanInstallmentSerializer(many=True, read_only=True)
    repayments = RepaymentSerializer(many=True, read_only=True)
    risk = serializers.SerializerMethodField()

    class Meta:
        model = Loan
        fields = [
            "id",
            "client",
            "principal_amount",
            "interest_rate",
            "number_of_installments",
            "repayment_frequency",
            "disbursement_date",
            "first_due_date",
            "status",
            "created_by",
            "created_at",
            "installments",
            "repayments",
            "risk",
        ]
        read_only_fields = ["id", "created_by", "created_at", "installments", "repayments", "risk"]

    def get_risk(self, obj):
        r = refresh_overdue_flags_for_loan(obj)
        return {"label": r.label, "max_days_overdue": r.max_days_overdue}


class RecordRepaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    payment_date = serializers.DateField()
    installment_id = serializers.IntegerField(required=False, allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)

