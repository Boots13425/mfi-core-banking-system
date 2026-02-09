from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('client_number', 'full_name', 'phone', 'email', 'status', 'branch', 'created_by', 'created_at')
    search_fields = ('full_name', 'national_id', 'phone', 'email')
    list_filter = ('status', 'branch')
