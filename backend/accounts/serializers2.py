# from rest_framework import serializers

# # Import models from your respective Django apps (adjust import paths as needed)
# from clients.models import Client
# from accounts.models import Account
# from savings.models import Transaction  # Or wherever your transaction model is located


# class TransactionSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Transaction
#         fields = ['id', 'transaction_type', 'amount', 'description', 'created_at']


# class ClientDashboardSerializer(serializers.ModelSerializer):
#     full_name = serializers.SerializerMethodField()

#     class Meta:
#         model = Client
#         fields = ['id', 'email', 'phone', 'full_name']

#     def get_full_name(self, obj):
#         return f"{obj.first_name} {obj.last_name}"


# class AccountDashboardSerializer(serializers.ModelSerializer):
#     client = ClientDashboardSerializer(read_only=True)
#     recent_transactions = serializers.SerializerMethodField()

#     class Meta:
#         model = Account
#         fields = ['id', 'account_number', 'balance', 'account_type', 'client', 'recent_transactions']

#     def get_recent_transactions(self, obj):
#         # Fetches the 15 most recent transactions linked to this account
#         transactions = Transaction.objects.filter(account=obj).order_by('-created_at')[:15]
#         return TransactionSerializer(transactions, many=True).data