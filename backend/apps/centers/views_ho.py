from datetime import date, timedelta

from django.db.models import Count, Q, Sum, Avg, Max, Min
from django.db.models.functions import TruncMonth
from django.utils import timezone

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.centers.models import Center, ActionLog
from apps.courses.models import Course
from apps.circulars.models import Circular
from apps.trainees.models import Trainee
from apps.trainers.models import Trainer
from apps.assessors.models import Assessor
from apps.applications.models import Application
from apps.batches.models import Batch, BatchEnrollment
from apps.attendance.models import AttendanceSummary, Attendance
from apps.assessments.models import Assessment
from apps.certificates.models import Certificate
from apps.jobplacement.models import JobPlacement, JobTracking
from apps.notifications.models import Notification


class IsHeadOffice(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.user_type == 'head_office' or request.user.is_superuser


class HeadOfficeDashboardViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]

    @action(detail=False, methods=['get'])
    def summary(self, request):
        total_centers = Center.objects.count()
        active_centers = Center.objects.filter(status='active').count()
        total_courses = Course.objects.count()
        active_circulars = Circular.objects.filter(
            status=Circular.Status.PUBLISHED,
            application_start_date__lte=date.today(),
        ).count()
        total_trainees = Trainee.objects.count()
        enrolled_trainees = Trainee.objects.filter(status='enrolled').count()
        completed_trainees = Trainee.objects.filter(status='completed').count()
        total_batches = Batch.objects.count()
        running_batches = Batch.objects.filter(status='running').count()

        pending_trainers = Trainer.objects.filter(approval_status='pending').count()
        pending_assessors = Assessor.objects.filter(approval_status='pending').count()
        pending_applications = Application.objects.filter(status='pending').count()
        total_pending = pending_trainers + pending_assessors + pending_applications

        today = date.today()
        today_attendance = Attendance.objects.filter(session_date=today)
        total_today = today_attendance.count()
        present_today = today_attendance.filter(
            Q(status=Attendance.Status.PRESENT) | Q(status=Attendance.Status.LATE),
        ).count()
        today_attendance_rate = round((present_today / total_today * 100) if total_today else 0, 1)

        low_attendance_batches = Batch.objects.filter(
            status__in=['running', 'active'],
        ).annotate(
            avg_attendance=Avg('attendance_summaries__attendance_percentage'),
        ).filter(avg_attendance__lt=80).count()

        return Response({
            'total_centers': total_centers,
            'active_centers': active_centers,
            'total_courses': total_courses,
            'active_circulars': active_circulars,
            'total_trainees': total_trainees,
            'enrolled_trainees': enrolled_trainees,
            'completed_trainees': completed_trainees,
            'total_batches': total_batches,
            'running_batches': running_batches,
            'pending_trainers': pending_trainers,
            'pending_assessors': pending_assessors,
            'pending_applications': pending_applications,
            'total_pending': total_pending,
            'today_attendance_rate': today_attendance_rate,
            'attendance_warning_count': low_attendance_batches,
        })

    @action(detail=False, methods=['get'])
    def center_enrollment_chart(self, request):
        data = []
        centers = Center.objects.filter(status='active')
        for c in centers:
            count = Trainee.objects.filter(center=c).count()
            data.append({
                'center_name': c.name_bn,
                'center_code': c.code,
                'trainee_count': count,
            })
        return Response(data)

    @action(detail=False, methods=['get'])
    def monthly_registrations(self, request):
        months = int(request.query_params.get('months', 12))
        since = date.today() - timedelta(days=months * 30)
        data = (
            Trainee.objects
            .filter(enrollment_date__gte=since)
            .annotate(month=TruncMonth('enrollment_date'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        return Response([
            {'month': d['month'].strftime('%Y-%m'), 'count': d['count']}
            for d in data
        ])

    @action(detail=False, methods=['get'])
    def completion_rate(self, request):
        total = Trainee.objects.count()
        completed = Trainee.objects.filter(status='completed').count()
        failed = Trainee.objects.filter(status='failed').count()
        dropped = Trainee.objects.filter(status='dropped').count()
        enrolled = Trainee.objects.filter(status='enrolled').count()
        return Response({
            'total': total,
            'completed': completed,
            'failed': failed,
            'dropped': dropped,
            'enrolled': enrolled,
            'completion_rate': round((completed / total * 100) if total else 0, 1),
        })

    @action(detail=False, methods=['get'])
    def placement_chart(self, request):
        data = []
        batches = Batch.objects.filter(status='completed').order_by('-end_date')[:20]
        for b in batches:
            total = Trainee.objects.filter(batch=b).count()
            placed = JobPlacement.objects.filter(batch=b).count()
            data.append({
                'batch_id': b.id,
                'batch_name': b.batch_name_bn or b.batch_no,
                'total_trainees': total,
                'placed_count': placed,
                'placement_rate': round((placed / total * 100) if total else 0, 1),
            })
        return Response(data)

    @action(detail=False, methods=['get'])
    def batch_status_counts(self, request):
        data = []
        for status_choice, label in Batch.BatchStatus.choices:
            count = Batch.objects.filter(status=status_choice).count()
            data.append({'status': status_choice, 'label': label, 'count': count})
        return Response(data)

    @action(detail=False, methods=['get'])
    def course_demand(self, request):
        data = (
            Batch.objects.values('course__name_bn')
            .annotate(total=Count('id'), total_seats=Sum('total_seats'))
            .order_by('-total')[:10]
        )
        return Response([
            {'course_name': d['course__name_bn'], 'batch_count': d['total'], 'total_seats': d['total_seats']}
            for d in data
        ])

    @action(detail=False, methods=['get'])
    def recent_activity(self, request):
        days = int(request.query_params.get('days', 7))
        since = timezone.now() - timedelta(days=days)
        new_applications = Application.objects.filter(applied_at__gte=since).count()
        new_enrollments = Trainee.objects.filter(enrollment_date__gte=since.date()).count()
        new_certificates = Certificate.objects.filter(issue_date__gte=since.date()).count()
        new_placements = JobPlacement.objects.filter(created_at__gte=since).count()
        return Response({
            'new_applications': new_applications,
            'new_enrollments': new_enrollments,
            'new_certificates': new_certificates,
            'new_placements': new_placements,
        })

    @action(detail=False, methods=['get'])
    def center_performance(self, request):
        data = []
        centers = Center.objects.filter(status='active')
        for c in centers:
            t_count = Trainee.objects.filter(center=c).count()
            b_count = Batch.objects.filter(center=c).count()
            completed = Trainee.objects.filter(center=c, status='completed').count()
            placed = JobPlacement.objects.filter(batch__center=c).count()
            data.append({
                'center_name': c.name_bn,
                'center_code': c.code,
                'trainee_count': t_count,
                'batch_count': b_count,
                'completed_count': completed,
                'placed_count': placed,
            })
        return Response(data)

    @action(detail=False, methods=['get'])
    def charts(self, request):
        center_enrollment = []
        for c in Center.objects.filter(status='active'):
            center_enrollment.append({
                'center_name': c.name_bn,
                'center_code': c.code,
                'trainee_count': Trainee.objects.filter(center=c).count(),
            })

        months = int(request.query_params.get('months', 12))
        since = date.today() - timedelta(days=months * 30)
        monthly = (
            Trainee.objects.filter(enrollment_date__gte=since)
            .annotate(month=TruncMonth('enrollment_date'))
            .values('month').annotate(count=Count('id')).order_by('month')
        )
        monthly_registration = [
            {'month': d['month'].strftime('%Y-%m'), 'count': d['count']}
            for d in monthly
        ]

        cr_total = Trainee.objects.count()
        cr_completed = Trainee.objects.filter(status='completed').count()
        completion = {
            'total': cr_total,
            'completed': cr_completed,
            'completion_rate': round((cr_completed / cr_total * 100) if cr_total else 0, 1),
        }

        placement = []
        for b in Batch.objects.filter(status='completed').order_by('-end_date')[:20]:
            total = Trainee.objects.filter(batch=b).count()
            placed = JobPlacement.objects.filter(batch=b).count()
            placement.append({
                'batch_name': b.batch_name_bn or b.batch_no,
                'total_trainees': total,
                'placed_count': placed,
                'placement_rate': round((placed / total * 100) if total else 0, 1),
            })

        return Response({
            'center_wise_enrollment': center_enrollment,
            'monthly_registration': monthly_registration,
            'course_completion': completion,
            'placement_trend': placement,
        })

    @action(detail=False, methods=['get'])
    def recent_activities(self, request):
        logs = ActionLog.objects.select_related('user').all()[:20]
        return Response([
            {
                'user': str(log.user) if log.user else 'System',
                'action': log.action,
                'target_type': log.target_type,
                'target_id': log.target_id,
                'description': log.description,
                'ip_address': log.ip_address,
                'timestamp': log.created_at.isoformat(),
            }
            for log in logs
        ])
