from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import Attendance
from .serializers import AttendanceSerializer, AttendanceListSerializer
from .eligibility import get_batch_eligibility


class AttendanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Attendance.objects.select_related(
            'trainee__user', 'batch', 'lead_trainer__user',
            'associate_trainer__user', 'marked_by',
        )
        if user.is_superuser or user.user_type == 'head_office':
            return qs.all()
        if user.user_type == 'center_admin' and user.center:
            return qs.filter(batch__center=user.center)
        if user.user_type == 'trainer':
            from apps.trainers.models import Trainer
            try:
                trainer = user.trainer_profile
                batch_ids = qs.filter(
                    Q(lead_trainer=trainer) | Q(associate_trainer=trainer)
                ).values_list('batch_id', flat=True).distinct()
                return qs.filter(batch_id__in=batch_ids)
            except Trainer.DoesNotExist:
                return qs.none()
        return qs.none()
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('batch', 'trainee', 'session_date', 'status')
    search_fields = (
        'trainee__registration_no', 'trainee__user__full_name_bn',
    )
    ordering_fields = ('session_date', 'session_no', 'marked_at')
    ordering = ('-session_date', '-session_no')

    def get_serializer_class(self):
        if self.action == 'list':
            return AttendanceListSerializer
        return AttendanceSerializer

    def perform_create(self, serializer):
        serializer.save(marked_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='eligibility/batch/(?P<batch_id>[^/.]+)')
    def batch_eligibility(self, request, batch_id=None):
        threshold = request.query_params.get('threshold', 80)
        try:
            threshold = float(threshold)
        except ValueError:
            threshold = 80.0

        data = get_batch_eligibility(int(batch_id), threshold=threshold)
        data['batch_id'] = int(batch_id)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='trainee-eligibility/(?P<trainee_id>[^/.]+)/(?P<batch_id>[^/.]+)')
    def trainee_eligibility(self, request, trainee_id=None, batch_id=None):
        from .eligibility import check_trainee_eligibility
        is_eligible, percentage, summary = check_trainee_eligibility(
            int(trainee_id), int(batch_id),
        )
        return Response({
            'trainee_id': int(trainee_id),
            'batch_id': int(batch_id),
            'is_eligible': is_eligible,
            'attendance_percentage': float(percentage),
            **summary,
        })