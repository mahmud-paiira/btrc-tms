from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Trainee
from .serializers import (
    TraineeListSerializer,
    TraineeDetailSerializer,
    TraineeWriteSerializer,
)


class TraineeViewSet(viewsets.ModelViewSet):
    queryset = Trainee.objects.select_related(
        'user', 'center', 'batch'
    ).all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ('center', 'batch', 'status')
    search_fields = (
        'registration_no', 'user__full_name_bn', 'user__full_name_en',
        'user__email', 'user__phone', 'user__nid',
    )
    ordering_fields = ('enrollment_date', 'registration_no', 'status')
    ordering = ('-enrollment_date',)

    def get_serializer_class(self):
        if self.action == 'list':
            return TraineeListSerializer
        elif self.action in ('create', 'update', 'partial_update'):
            return TraineeWriteSerializer
        return TraineeDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.user_type == 'center_admin' and user.center:
            qs = qs.filter(center=user.center)
        return qs
