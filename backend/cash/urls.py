from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import BranchVaultViewSet, TellerSessionViewSet, CashLedgerViewSet

router = DefaultRouter()
router.register(r"vaults", BranchVaultViewSet, basename="cash-vaults")
router.register(r"sessions", TellerSessionViewSet, basename="cash-sessions")
router.register(r"ledger", CashLedgerViewSet, basename="cash-ledger")

urlpatterns = [
    path("", include(router.urls)),
]