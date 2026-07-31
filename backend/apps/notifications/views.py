from rest_framework import viewsets, permissions
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    filterset_fields = ('recipient', 'channel', 'status')

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Notification.objects.none()
        if self.request.user.user_type == 'head_office' or self.request.user.is_superuser:
            return Notification.objects.all()
        return Notification.objects.filter(recipient=self.request.user)
