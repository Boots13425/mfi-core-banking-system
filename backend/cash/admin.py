from django.contrib import admin
from .models import BranchVault, TellerSession, CashLedgerEntry


@admin.register(BranchVault)
class BranchVaultAdmin(admin.ModelAdmin):
    list_display = ("id", "branch", "created_at", "updated_at")
    search_fields = ("branch__name",)


@admin.register(TellerSession)
class TellerSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "branch", "cashier", "status", "opening_amount", "confirmed_opening_amount", "closed_at", "variance_amount")
    list_filter = ("status", "branch")
    search_fields = ("cashier__username", "cashier__email")


@admin.register(CashLedgerEntry)
class CashLedgerEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "branch", "session", "event_type", "direction", "amount", "reference_type", "reference_id", "created_at")
    list_filter = ("event_type", "direction", "branch")
    search_fields = ("reference_type", "reference_id", "narration")