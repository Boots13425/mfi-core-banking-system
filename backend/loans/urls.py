from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import loan_officer_clients, loan_officer_client_loan_context, LoanViewSet


router = DefaultRouter()
router.register(r"loans", LoanViewSet, basename="loan")


urlpatterns = [
    # Loan Officer scoped access
    path("loan-officer/clients", loan_officer_clients, name="loan-officer-clients"),
    path(
        "loan-officer/clients/<int:clientId>/loan-context",
        loan_officer_client_loan_context,
        name="loan-officer-client-loan-context",
    ),
]

urlpatterns += router.urls

