from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    SavingsProductViewSet,
    SavingsAccountViewSet,
    branch_manager_pending_withdrawals,
    branch_manager_approve_withdrawal,
    branch_manager_reject_withdrawal,
)


router = DefaultRouter()
router.register(r"savings/products", SavingsProductViewSet, basename="savings-product")
router.register(r"savings/accounts", SavingsAccountViewSet, basename="savings-account")


urlpatterns = [
    path(
        "branch-manager/savings/withdrawals/pending/",
        branch_manager_pending_withdrawals,
        name="bm-savings-pending-withdrawals",
    ),
    path(
        "branch-manager/savings/withdrawals/<int:tx_id>/approve/",
        branch_manager_approve_withdrawal,
        name="bm-savings-approve-withdrawal",
    ),
    path(
        "branch-manager/savings/withdrawals/<int:tx_id>/reject/",
        branch_manager_reject_withdrawal,
        name="bm-savings-reject-withdrawal",
    ),
]

urlpatterns += router.urls

