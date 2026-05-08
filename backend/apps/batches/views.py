from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from .models import Batch, BatchWeekPlan, BatchEnrollment
from .serializers import (
    BatchListSerializer,
    BatchDetailSerializer,
    BatchWriteSerializer,
    BatchWeekPlanListSerializer,
    BatchWeekPlanWriteSerializer,
    BatchEnrollmentSerializer,
    BatchEnrollmentBulkSerializer,
)
from .validators import validate_batch_hours_match_course


class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.select_related(
        'circular', 'center', 'course', 'created_by'
    ).prefetch_related('week_plans', 'enrollments').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ('center', 'course', 'circular', 'status')
    search_fields = ('batch_no', 'custom_batch_no', 'batch_name_bn', 'batch_name_en')
    ordering_fields = ('start_date', 'created_at', 'batch_name_bn')
    ordering = ('-start_date',)

    def get_serializer_class(self):
        if self.action == 'list':
            return BatchListSerializer
        elif self.action in ('create', 'update', 'partial_update'):
            return BatchWriteSerializer
        return BatchDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.user_type == 'center_admin' and user.center:
            qs = qs.filter(center=user.center)
        elif user.user_type == 'center_admin' and not user.center:
            return Batch.objects.none()
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def week_plans(self, request, pk=None):
        batch = self.get_object()
        plans = BatchWeekPlan.objects.filter(batch=batch).select_related(
            'lead_trainer__user', 'associate_trainer__user'
        )
        page = self.paginate_queryset(plans)
        if page is not None:
            serializer = BatchWeekPlanListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = BatchWeekPlanListSerializer(plans, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_week_plan(self, request, pk=None):
        batch = self.get_object()
        serializer = BatchWeekPlanWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(batch=batch)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def bulk_add_week_plans(self, request, pk=None):
        batch = self.get_object()
        data = request.data.get('plans', [])
        if not isinstance(data, list):
            return Response({'error': 'plans একটি তালিকা হতে হবে।'}, status=400)

        created = []
        errors = []
        with transaction.atomic():
            for idx, plan_data in enumerate(data):
                serializer = BatchWeekPlanWriteSerializer(data=plan_data)
                if serializer.is_valid():
                    serializer.save(batch=batch)
                    created.append(serializer.data)
                else:
                    errors.append({'index': idx, 'errors': serializer.errors})

        return Response({
            'created_count': len(created),
            'error_count': len(errors),
            'created': created,
            'errors': errors,
        })

    @action(detail=True, methods=['get'])
    def validate_hours(self, request, pk=None):
        is_valid, planned, course_hours = validate_batch_hours_match_course(pk)
        return Response({
            'is_valid': is_valid,
            'planned_hours': float(planned),
            'course_hours': course_hours,
            'difference': float(abs(course_hours - planned)),
        })

    @action(detail=True, methods=['get'])
    def enrollments(self, request, pk=None):
        batch = self.get_object()
        enrollments = BatchEnrollment.objects.filter(batch=batch).select_related(
            'trainee__user', 'trainee'
        )
        page = self.paginate_queryset(enrollments)
        if page is not None:
            serializer = BatchEnrollmentSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = BatchEnrollmentSerializer(enrollments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def enroll_trainees(self, request, pk=None):
        batch = self.get_object()
        serializer = BatchEnrollmentBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        trainee_ids = serializer.validated_data['trainee_ids']
        created = []
        skipped = []

        for tid in trainee_ids:
            _, was_created = BatchEnrollment.objects.get_or_create(
                trainee_id=tid,
                batch=batch,
                defaults={'status': BatchEnrollment.EnrollmentStatus.ACTIVE},
            )
            if was_created:
                created.append(tid)
            else:
                skipped.append(tid)

        batch.filled_seats = BatchEnrollment.objects.filter(
            batch=batch, status=BatchEnrollment.EnrollmentStatus.ACTIVE
        ).count()
        batch.save(update_fields=['filled_seats'])

        return Response({
            'enrolled': len(created),
            'already_enrolled': len(skipped),
            'filled_seats': batch.filled_seats,
            'total_seats': batch.total_seats,
        })

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        batch = self.get_object()
        if batch.status != Batch.BatchStatus.SCHEDULED:
            return Response({'error': 'শুধুমাত্র নির্ধারিত ব্যাচ শুরু করা যাবে।'}, status=400)

        is_valid, planned, course_hours = validate_batch_hours_match_course(pk)
        if not is_valid:
            return Response({
                'error': (
                    f'সাপ্তাহিক পরিকল্পনার মোট ঘন্টা ({float(planned):.1f}) '
                    f'কোর্সের মোট ঘন্টার ({course_hours}) সাথে মিলছে না।'
                ),
                'planned_hours': float(planned),
                'course_hours': course_hours,
            }, status=400)

        batch.status = Batch.BatchStatus.RUNNING
        batch.save(update_fields=['status'])
        return Response(BatchDetailSerializer(batch).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        batch = self.get_object()
        if batch.status not in (Batch.BatchStatus.SCHEDULED, Batch.BatchStatus.RUNNING):
            return Response({'error': 'ব্যাচ ইতিমধ্যে সমাপ্ত বা বাতিল।'}, status=400)

        BatchEnrollment.objects.filter(batch=batch, status=BatchEnrollment.EnrollmentStatus.ACTIVE).update(
            status=BatchEnrollment.EnrollmentStatus.COMPLETED,
        )

        batch.status = Batch.BatchStatus.COMPLETED
        batch.save(update_fields=['status'])
        return Response(BatchDetailSerializer(batch).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        batch = self.get_object()
        if batch.status == Batch.BatchStatus.COMPLETED:
            return Response({'error': 'সমাপ্ত ব্যাচ বাতিল করা যাবে না।'}, status=400)

        batch.status = Batch.BatchStatus.CANCELLED
        batch.save(update_fields=['status'])
        return Response(BatchDetailSerializer(batch).data)


class BatchWeekPlanViewSet(viewsets.ModelViewSet):
    queryset = BatchWeekPlan.objects.select_related(
        'batch', 'lead_trainer__user', 'associate_trainer__user'
    ).all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ('batch', 'term_no', 'class_type', 'day_of_week', 'lead_trainer')
    ordering = ('batch', 'term_no', 'term_day', 'session_no')

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return BatchWeekPlanWriteSerializer
        return BatchWeekPlanListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.user_type == 'center_admin' and user.center:
            qs = qs.filter(batch__center=user.center)
        elif user.user_type == 'center_admin' and not user.center:
            return BatchWeekPlan.objects.none()
        return qs


class BatchEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = BatchEnrollment.objects.select_related(
        'trainee__user', 'batch'
    ).all()
    permission_classes = [IsAuthenticated]
    serializer_class = BatchEnrollmentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ('batch', 'status')
    search_fields = ('trainee__registration_no', 'trainee__user__full_name_bn', 'trainee__user__phone')
    ordering = ('-enrollment_date',)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.user_type == 'center_admin' and user.center:
            qs = qs.filter(batch__center=user.center)
        elif user.user_type == 'center_admin' and not user.center:
            return BatchEnrollment.objects.none()
        return qs

    @action(detail=True, methods=['post'])
    def drop(self, request, pk=None):
        enrollment = self.get_object()
        if enrollment.status != BatchEnrollment.EnrollmentStatus.ACTIVE:
            return Response({'error': 'শুধুমাত্র সক্রিয় নথিভুক্তি বাতিল করা যাবে।'}, status=400)

        from django.utils import timezone
        enrollment.status = BatchEnrollment.EnrollmentStatus.DROPPED
        enrollment.dropped_date = request.data.get('dropped_date') or timezone.now().date()
        enrollment.drop_reason = request.data.get('drop_reason', '')
        enrollment.save(update_fields=['status', 'dropped_date', 'drop_reason'])

        batch = enrollment.batch
        batch.filled_seats = BatchEnrollment.objects.filter(
            batch=batch, status=BatchEnrollment.EnrollmentStatus.ACTIVE
        ).count()
        batch.save(update_fields=['filled_seats'])

        return Response(BatchEnrollmentSerializer(enrollment).data)
