# from rest_framework.decorators import api_view, permission_classes
# from rest_framework.permissions import AllowAny
# from rest_framework.response import Response
# from rest_framework import status

# # Import your database models (adjust model names based on your project structure)
# # from accounts.models import Client  # or clients.models
# # from savings.models import SavingsAccount, Transaction  # or similar app names

# @api_view(['POST'])
# @permission_classes([AllowAny])
# def get_user_dashboard(request):
#     # 1. Extract query params sent from Mobile App
#     email = request.query_params.get('email')
#     bank_number = request.query_params.get('bankNumber') or request.query_params.get('accountNumber')

#     if not email or not bank_number:
#         return Response(
#             {"error": "Missing parameters: 'email' and 'bankNumber' are required."},
#             status=status.HTTP_400_BAD_REQUEST
#         )

#     try:
#         # 2. Query Client from Database
#         client = Client.objects.filter(email__iexact=email.strip()).first()
#         if not client:
#             return Response(
#                 {"error": f"No client found with email: {email}"},
#                 status=status.HTTP_404_NOT_FOUND
#             )

#         # 3. Query Account from Database using Account Number
#         account = SavingsAccount.objects.filter(account_number__iexact=bank_number.strip()).first()
#         if not account:
#             return Response(
#                 {"error": f"No savings account found with account number: {bank_number}"},
#                 status=status.HTTP_404_NOT_FOUND
#             )

#         # 4. Fetch Recent Transactions linked to this Account
#         # Assumes Transaction model has a foreign key to SavingsAccount
#         recent_txs = Transaction.objects.filter(account=account).order_by('-created_at')[:10]

#         # 5. Serialize Transaction List
#         transactions_data = []
#         for tx in recent_txs:
#             transactions_data.append({
#                 "id": tx.id,
#                 "amount": str(tx.amount),
#                 "transaction_type": getattr(tx, 'transaction_type', 'DEPOSIT'),
#                 "description": getattr(tx, 'description', 'Transaction'),
#                 "status": getattr(tx, 'status', 'COMPLETED'),
#                 "created_at": tx.created_at.isoformat() if hasattr(tx, 'created_at') and tx.created_at else None,
#             })

#         # 6. Return Dynamic Live Data Response
#         return Response({
#             "status": "success",
#             "client": {
#                 "id": client.id,
#                 "first_name": getattr(client, 'first_name', ''),
#                 "last_name": getattr(client, 'last_name', ''),
#                 "email": client.email,
#             },
#             "account": {
#                 "id": account.id,
#                 "account_number": account.account_number,
#                 "balance": str(getattr(account, 'balance', '0.00')),
#                 "current_balance": str(getattr(account, 'current_balance', getattr(account, 'balance', '0.00'))),
#             },
#             "recent_transactions": transactions_data
#         }, status=status.HTTP_200_OK)

#     except Exception as e:
#         # Prevents HTML 500 error pages from breaking the app
#         return Response(
#             {"error": f"Server Error: {str(e)}"},
#             status=status.HTTP_500_INTERNAL_SERVER_ERROR
#         )