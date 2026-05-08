from django.db.models import Count, Avg, Sum, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import date, timedelta

from rest_framework import viewsets, status, permissions, filters as drf_filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Center, Infrastructure, Employee, ActionLog
from .serializers import (
    CenterListSerializer, CenterDetailSerializer,
    InfrastructureSerializer, EmployeeSerializer,
)
from apps.trainees.models import Trainee
from apps.batches.models import Batch
from apps.attendance.models import AttendanceSummary
from apps.jobplacement.models import JobPlacement
from apps.trainers.models import Trainer
from apps.assessors.models import Assessor


class IsHeadOffice(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.user_type == 'head_office' or request.user.is_superuser


class HOCenterViewSet(viewsets.ModelViewSet):
    queryset = Center.objects.prefetch_related('infrastructures', 'employees').all()
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]
    filter_backends = (DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter)
    filterset_fields = ('status',)
    search_fields = ('code', 'name_bn', 'name_en', 'phone', 'email', 'address')
    ordering_fields = ('code', 'name_en', 'created_at')
    ordering = ('name_en',)

    def get_serializer_class(self):
        if self.action == 'list':
            return CenterListSerializer
        return CenterDetailSerializer

    def perform_create(self, serializer):
        center = serializer.save()
        ActionLog.objects.create(
            user=self.request.user,
            action='created center',
            target_type='Center',
            target_id=str(center.id),
            description=f'Created center {center.code} - {center.name_bn}',
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
        )

    def perform_update(self, serializer):
        center = serializer.save()
        ActionLog.objects.create(
            user=self.request.user,
            action='updated center',
            target_type='Center',
            target_id=str(center.id),
            description=f'Updated center {center.code} - {center.name_bn}',
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
        )

    def perform_destroy(self, instance):
        if instance.batch_set.exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError('এই কেন্দ্রে ব্যাচ আছে। প্রথমে ব্যাচ স্থানান্তর বা মুছুন।')
        ActionLog.objects.create(
            user=self.request.user,
            action='deleted center',
            target_type='Center',
            target_id=str(instance.id),
            description=f'Deleted center {instance.code} - {instance.name_bn}',
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
        )
        instance.delete()

    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        center = self.get_object()
        center.status = Center.Status.SUSPENDED if center.status == Center.Status.ACTIVE else Center.Status.ACTIVE
        center.save(update_fields=['status'])
        ActionLog.objects.create(
            user=request.user,
            action='toggled center status',
            target_type='Center',
            target_id=str(center.id),
            description=f'Set center {center.code} to {center.status}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        return Response({'status': center.status})

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        center = self.get_object()
        today = date.today()
        last_12mo = today - timedelta(days=365)

        monthly_enrollment = (
            Trainee.objects.filter(center=center, enrollment_date__gte=last_12mo)
            .annotate(month=TruncMonth('enrollment_date'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )

        batch_count = Batch.objects.filter(center=center).count()
        running_batches = Batch.objects.filter(center=center, status='running').count()
        completed_batches = Batch.objects.filter(center=center, status='completed').count()

        t_total = Trainee.objects.filter(center=center).count()
        t_enrolled = Trainee.objects.filter(center=center, status='enrolled').count()
        t_completed = Trainee.objects.filter(center=center, status='completed').count()
        t_dropped = Trainee.objects.filter(center=center, status='dropped').count()

        return Response({
            'center_name': center.name_bn,
            'center_code': center.code,
            'trainee_count': t_total,
            'active_batch_count': center.get_active_batch_count(),
            'attendance_rate': center.get_attendance_rate(),
            'placement_rate': center.get_placement_rate(),
            'total_batches': batch_count,
            'running_batches': running_batches,
            'completed_batches': completed_batches,
            'enrolled_trainees': t_enrolled,
            'completed_trainees': t_completed,
            'dropped_trainees': t_dropped,
            'monthly_enrollment': [
                {'month': m['month'].strftime('%Y-%m'), 'count': m['count']}
                for m in monthly_enrollment
            ],
        })

    @action(detail=True, methods=['get', 'post'])
    def infrastructure(self, request, pk=None):
        center = self.get_object()
        if request.method == 'GET':
            qs = center.infrastructures.all()
            return Response(InfrastructureSerializer(qs, many=True).data)
        serializer = InfrastructureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(center=center)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'])
    def employees(self, request, pk=None):
        center = self.get_object()
        if request.method == 'GET':
            qs = center.employees.select_related('user').all()
            return Response(EmployeeSerializer(qs, many=True).data)
        serializer = EmployeeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(center=center)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class HOInfrastructureViewSet(viewsets.ModelViewSet):
    queryset = Infrastructure.objects.select_related('center').all()
    serializer_class = InfrastructureSerializer
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]
    filter_backends = (DjangoFilterBackend, drf_filters.SearchFilter)
    filterset_fields = ('center', 'status')
    search_fields = ('room_no', 'location_bn', 'location_en')


class HOEmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related('user', 'center').all()
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]
    filter_backends = (DjangoFilterBackend, drf_filters.SearchFilter)
    filterset_fields = ('center', 'status', 'is_contact_person')
    search_fields = ('employee_no', 'user__full_name_bn', 'user__full_name_en', 'designation_bn')
