from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoanProductViewSet, LoanOfficerClientListView, LoanContextView,
    LoanViewSet, BranchManagerLoanViewSet, CashierLoanViewSet
)

router = DefaultRouter()
router.register(r'loan-products', LoanProductViewSet, basename='loan-product')
router.register(r'loans', LoanViewSet, basename='loan')

urlpatterns = [
    path('', include(router.urls)),
    
    # Loan Officer endpoints
    path('loan-officer/clients/', LoanOfficerClientListView.as_view({'get': 'get_active_clients'}), name='loan-officer-clients'),
    path('loan-officer/clients/<int:client_id>/loan-context/', LoanContextView.as_view({'get': 'get_loan_context'}), name='loan-context'),
    
    # Branch Manager endpoints
    path('branch-manager/loans/submitted/', BranchManagerLoanViewSet.as_view({'get': 'submitted'}), name='bm-submitted-loans'),
    path('branch-manager/loans/<int:loan_id>/', BranchManagerLoanViewSet.as_view({'get': 'detail'}), name='bm-loan-detail'),
    path('branch-manager/loans/<int:loan_id>/approve/', BranchManagerLoanViewSet.as_view({'post': 'approve'}), name='bm-approve'),
    path('branch-manager/loans/<int:loan_id>/reject/', BranchManagerLoanViewSet.as_view({'post': 'reject'}), name='bm-reject'),
    path('branch-manager/loans/<int:loan_id>/request-changes/', BranchManagerLoanViewSet.as_view({'post': 'request_changes'}), name='bm-request-changes'),
    
    # Cashier endpoints
    path('cashier/loans/approved/', CashierLoanViewSet.as_view({'get': 'approved'}), name='cashier-approved-loans'),
    path('cashier/loans/<int:loan_id>/disburse/', CashierLoanViewSet.as_view({'post': 'disburse'}), name='cashier-disburse'),
]
