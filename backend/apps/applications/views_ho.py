from rest_framework import viewsets, permissions
from rest_framework import serializers
from .models import NIDAccessLog


class IsHeadOffice(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.user_type == request.user.UserType.HEAD_OFFICE
        )


class NIDAccessLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='requester_name', read_only=True)
    user_phone = serializers.CharField(source='requester_phone', read_only=True)

    class Meta:
        model = NIDAccessLog
        fields = (
            'id', 'user', 'user_name', 'user_phone',
            'action', 'result', 'target_nid', 'target_name',
            'requester_name', 'requester_phone', 'requester_address',
            'ip_address', 'user_agent', 'request_path', 'message', 'created_at',
        )


class NIDAccessLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NIDAccessLog.objects.all()
    serializer_class = NIDAccessLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]
    search_fields = (
        'target_nid', 'target_name', 'requester_name',
        'requester_phone', 'ip_address', 'user_agent', 'message',
    )
    filterset_fields = ('action', 'result', 'user')
    ordering_fields = ('created_at', 'id')
    ordering = ('-created_at',)
