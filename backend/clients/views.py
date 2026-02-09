from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import Client
from .serializers import ClientSerializer
from .permissions import IsCashierOrBranchManagerReadOnly
from accounts.models import AuditLog


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    queryset = Client.objects.all()
    permission_classes = (IsCashierOrBranchManagerReadOnly,)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        params = self.request.query_params

        # Branch managers see only clients in their branch
        if user.role == 'BRANCH_MANAGER' and user.branch:
            qs = qs.filter(branch=user.branch)

        # Filters: branch, status, name
        branch = params.get('branch')
        status_param = params.get('status')
        name = params.get('name')

        if branch:
            qs = qs.filter(branch__id=branch)
        if status_param:
            qs = qs.filter(status__iexact=status_param)
        if name:
            qs = qs.filter(full_name__icontains=name)

        return qs

    def perform_create(self, serializer):
        client = serializer.save()
        # Audit log
        try:
            AuditLog.objects.create(
                actor=self.request.user,
                action='CLIENT_CREATED',
                target_type='Client',
                target_id=str(client.client_number),
                summary=f'Client {client.full_name} created by {self.request.user}',
            )
        except Exception:
            pass

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        client = serializer.save()

        if old_status != client.status:
            try:
                AuditLog.objects.create(
                    actor=self.request.user,
                    action='CLIENT_STATUS_CHANGED',
                    target_type='Client',
                    target_id=str(client.client_number),
                    summary=(
                        f'Client {client.full_name} status changed '
                        f'from {old_status} to {client.status} by {self.request.user}'
                    ),
                )
            except Exception:
                pass

    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        """
        Soft deactivate a client.
        No hard deletes are allowed in this system.
        """
        client = get_object_or_404(Client, pk=pk)
        old_status = client.status
        client.status = 'INACTIVE'
        client.save()

        try:
            AuditLog.objects.create(
                actor=request.user,
                action='CLIENT_STATUS_CHANGED',
                target_type='Client',
                target_id=str(client.client_number),
                summary=f'Client {client.full_name} deactivated by {request.user}',
            )
        except Exception:
            pass

        return Response(
            {'detail': 'Client deactivated.'},
            status=status.HTTP_200_OK
        )

    def destroy(self, request, *args, **kwargs):
        """
        Explicitly block hard deletes.
        """
        return Response(
            {
                'detail': 'Hard delete is not allowed. Use deactivate instead.'
            },
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
