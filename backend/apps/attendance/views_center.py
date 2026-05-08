from collections import defaultdict

from django.db.models import Q, Count
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.batches.models import Batch
from .models import Attendance, AttendanceSummary
from .serializers import (
    AttendanceSerializer,
    MarkAttendanceSerializer,
    AttendanceSummarySerializer,
    EligibilitySerializer,
)


class IsCenterAdminOrHeadOffice(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return (
            request.user.user_type in ('center_admin', 'head_office')
            or request.user.is_superuser
        )


class CenterAttendanceViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsCenterAdminOrHeadOffice]

    def get_center_filter(self, request):
        if request.user.user_type == 'center_admin' and request.user.center:
            return {'center': request.user.center}
        return {}

    @action(detail=False, methods=['get'], url_path='batch/(?P<batch_id>[^/.]+)')
    def batch_calendar(self, request, batch_id=None):
        try:
            batch = Batch.objects.get(id=batch_id)
        except Batch.DoesNotExist:
            return Response({'error': 'ব্যাচ পাওয়া যায়নি'}, status=404)

        center_filter = self.get_center_filter(request)
        if center_filter and batch.center_id != request.user.center_id:
            return Response({'error': 'আপনার কেন্দ্রের ব্যাচ নয়'}, status=403)

        attendances = Attendance.objects.select_related(
            'trainee__user', 'lead_trainer__user',
        ).filter(batch_id=batch_id).order_by('session_date', 'session_no')

        calendar = defaultdict(list)
        for a in attendances:
            key = a.session_date.isoformat()
            calendar[key].append({
                'attendance_id': a.id,
                'trainee_id': a.trainee_id,
                'trainee_name': a.trainee.user.full_name_bn,
                'trainee_reg_no': a.trainee.registration_no,
                'session_no': a.session_no,
                'status': a.status,
                'status_display': a.get_status_display(),
                'lead_trainer': a.lead_trainer_id,
                'lead_trainer_name': a.lead_trainer.user.full_name_bn if a.lead_trainer else None,
                'remarks': a.remarks,
            })

        return Response({
            'batch_id': int(batch_id),
            'batch_name': batch.batch_name_bn,
            'calendar': [
                {'date': date, 'sessions': sessions}
                for date, sessions in sorted(calendar.items())
            ],
        })

    @action(detail=False, methods=['post'])
    def mark(self, request):
        serializer = MarkAttendanceSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        results = serializer.save()
        return Response(
            AttendanceSerializer(results, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get'], url_path='eligibility/(?P<batch_id>[^/.]+)')
    def eligibility(self, request, batch_id=None):
        try:
            batch = Batch.objects.get(id=batch_id)
        except Batch.DoesNotExist:
            return Response({'error': 'ব্যাচ পাওয়া যায়নি'}, status=404)

        center_filter = self.get_center_filter(request)
        if center_filter and batch.center_id != request.user.center_id:
            return Response({'error': 'আপনার কেন্দ্রের ব্যাচ নয়'}, status=403)

        summaries = AttendanceSummary.objects.select_related(
            'trainee__user',
        ).filter(batch_id=batch_id).order_by('attendance_percentage')

        threshold = request.query_params.get('threshold', 80)
        try:
            threshold = float(threshold)
        except ValueError:
            threshold = 80.0

        data = []
        for s in summaries:
            is_eligible = s.attendance_percentage >= threshold
            data.append({
                'trainee_id': s.trainee_id,
                'trainee_name': s.trainee.user.full_name_bn,
                'trainee_reg_no': s.trainee.registration_no,
                'total_sessions': s.total_sessions,
                'attended_sessions': s.attended_sessions,
                'attendance_percentage': float(s.attendance_percentage),
                'is_eligible': is_eligible,
            })

        return Response({
            'batch_id': int(batch_id),
            'threshold': threshold,
            'eligible_count': sum(1 for d in data if d['is_eligible']),
            'ineligible_count': sum(1 for d in data if not d['is_eligible']),
            'trainees': data,
        })

    @action(detail=False, methods=['get'], url_path='summary/(?P<batch_id>[^/.]+)')
    def summary(self, request, batch_id=None):
        try:
            batch = Batch.objects.get(id=batch_id)
        except Batch.DoesNotExist:
            return Response({'error': 'ব্যাচ পাওয়া যায়নি'}, status=404)

        summaries = AttendanceSummary.objects.select_related(
            'trainee__user',
        ).filter(batch_id=batch_id).order_by('-attendance_percentage')
        serializer = AttendanceSummarySerializer(summaries, many=True)
        return Response({
            'batch_id': int(batch_id),
            'batch_name': batch.batch_name_bn,
            'summaries': serializer.data,
        })