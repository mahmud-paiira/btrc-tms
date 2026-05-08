from datetime import date, timedelta

from django.db.models import Count, Q, Avg
from django.db.models.functions import TruncMonth
from django.utils import timezone

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.centers.models import Center
from apps.batches.models import Batch, BatchEnrollment
from apps.trainees.models import Trainee
from apps.applications.models import Application
from apps.attendance.models import Attendance, AttendanceSummary
from apps.assessments.models import Assessment
from apps.certificates.models import Certificate
from apps.jobplacement.models import JobPlacement
from apps.trainers.models import Trainer
from apps.assessors.models import Assessor
from apps.notifications.models import Notification
from apps.circulars.models import Circular


class IsCenterAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.user_type == 'center_admin' or request.user.is_superuser


class CenterDashboardViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsCenterAdmin]

    def _get_center(self, request):
        if request.user.user_type == 'head_office':
            cid = request.query_params.get('center')
            if cid:
                return Center.objects.filter(id=cid).first()
            return Center.objects.first()
        return request.user.center

    def _get_batches(self, center):
        if not center:
            return Batch.objects.none()
        return Batch.objects.filter(center=center)

    def _get_trainees(self, center):
        if not center:
            return Trainee.objects.none()
        return Trainee.objects.filter(center=center)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        center = self._get_center(request)
        if not center:
            return Response({'error': 'আপনার কোনো কেন্দ্র নির্ধারিত নেই।'}, status=400)

        batches = self._get_batches(center)
        trainees = self._get_trainees(center)

        active_batches = batches.filter(status='running').count()
        total_trainees = trainees.count()
        enrolled_trainees = trainees.filter(status='enrolled').count()

        today = date.today()
        today_attendance = Attendance.objects.filter(
            batch__center=center, session_date=today,
        ).values('status').annotate(count=Count('id'))

        today_present = sum(
            a['count'] for a in today_attendance if a['status'] in ('present', 'late')
        )
        today_total = sum(a['count'] for a in today_attendance)

        completed_batches = batches.filter(status='completed')
        total_placed = JobPlacement.objects.filter(batch__in=completed_batches).count()
        total_completed_trainees = Trainee.objects.filter(
            center=center, batch__in=completed_batches,
        ).count()
        placement_rate = round(
            (total_placed / total_completed_trainees * 100) if total_completed_trainees else 0, 1,
        )

        app_stats = Application.objects.filter(
            circular__center=center,
        ).aggregate(
            total=Count('id'),
            pending=Count('id', filter=Q(status='pending')),
            selected=Count('id', filter=Q(status='selected')),
            rejected=Count('id', filter=Q(status='rejected')),
        )

        return Response({
            'center_name': center.name_bn,
            'center_code': center.code,
            'active_batches': active_batches,
            'total_trainees': total_trainees,
            'enrolled_trainees': enrolled_trainees,
            'today_attendance': {
                'present': today_present,
                'total': today_total,
                'percentage': round((today_present / today_total * 100) if today_total else 0, 1),
            },
            'placement_rate': placement_rate,
            'applications': app_stats,
            'total_batches': batches.count(),
            'completed_batches': completed_batches.count(),
        })

    @action(detail=False, methods=['get'])
    def charts(self, request):
        center = self._get_center(request)
        if not center:
            return Response({'error': 'কেন্দ্র নির্ধারিত নেই।'}, status=400)

        # Attendance trend per batch (running batches)
        running_batches = self._get_batches(center).filter(status='running')
        attendance_trend = []
        for b in running_batches:
            summary = AttendanceSummary.objects.filter(batch=b).aggregate(
                avg_pct=Avg('attendance_percentage'),
            )
            avg_pct = float(summary['avg_pct']) if summary['avg_pct'] else 0
            total = AttendanceSummary.objects.filter(batch=b).count()
            attendance_trend.append({
                'batch_id': b.id,
                'batch_name': b.batch_name_bn or b.batch_no,
                'avg_attendance': round(avg_pct, 1),
                'total_trainees': total,
            })

        # Assessment pass/fail per completed batch
        completed_batches = self._get_batches(center).filter(status='completed')
        assessment_ratio = []
        for b in completed_batches:
            results = Assessment.objects.filter(batch=b).aggregate(
                competent=Count('id', filter=Q(competency_status='competent')),
                not_competent=Count('id', filter=Q(competency_status='not_competent')),
                absent=Count('id', filter=Q(competency_status='absent')),
            )
            total = results['competent'] + results['not_competent'] + results['absent']
            if total > 0:
                assessment_ratio.append({
                    'batch_id': b.id,
                    'batch_name': b.batch_name_bn or b.batch_no,
                    'competent': results['competent'],
                    'not_competent': results['not_competent'],
                    'absent': results['absent'],
                    'pass_rate': round(results['competent'] / total * 100, 1),
                })

        # Monthly enrollment
        six_months_ago = date.today() - timedelta(days=180)
        monthly = (
            Trainee.objects
            .filter(center=center, enrollment_date__gte=six_months_ago)
            .annotate(month=TruncMonth('enrollment_date'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        monthly_enrollment = [
            {'month': m['month'].strftime('%Y-%m'), 'count': m['count']}
            for m in monthly
        ]

        return Response({
            'attendance_trend': attendance_trend,
            'assessment_ratio': assessment_ratio,
            'monthly_enrollment': monthly_enrollment,
        })

    @action(detail=False, methods=['get'])
    def alerts(self, request):
        center = self._get_center(request)
        if not center:
            return Response({'error': 'কেন্দ্র নির্ধারিত নেই।'}, status=400)

        today = date.today()
        alerts_list = []

        # Low attendance batches (<80%)
        low_attn_batches = []
        running_batches = self._get_batches(center).filter(status='running')
        for b in running_batches:
            low_count = AttendanceSummary.objects.filter(
                batch=b, attendance_percentage__lt=80,
            ).count()
            total_count = AttendanceSummary.objects.filter(batch=b).count()
            if low_count > 0:
                low_attn_batches.append({
                    'batch_id': b.id,
                    'batch_name': b.batch_name_bn or b.batch_no,
                    'low_attendance_count': low_count,
                    'total_trainees': total_count,
                })
        alerts_list.append({
            'type': 'low_attendance',
            'title': 'নিম্ন উপস্থিতির সতর্কতা',
            'message': f'{len(low_attn_batches)} টি ব্যাচে ৮০% এর নিচে উপস্থিতি আছে।',
            'data': low_attn_batches,
            'severity': 'danger',
        })

        # Pending assessments (running batches missing assessment types)
        pending_assess_batches = []
        for b in running_batches:
            existing_types = set(
                Assessment.objects.filter(batch=b)
                .values_list('assessment_type', flat=True).distinct()
            )
            required_types = {'pre_evaluation', 'written', 'viva', 'practical', 'final'}
            missing = required_types - existing_types
            if missing:
                pending_assess_batches.append({
                    'batch_id': b.id,
                    'batch_name': b.batch_name_bn or b.batch_no,
                    'missing_types': list(missing),
                })
        alerts_list.append({
            'type': 'pending_assessments',
            'title': 'বাকি মূল্যায়ন',
            'message': f'{len(pending_assess_batches)} টি ব্যাচে মূল্যায়ন বাকি আছে।',
            'data': pending_assess_batches,
            'severity': 'warning',
        })

        # Unverified certificates
        unverified = Certificate.objects.filter(
            batch__center=center, is_verified=False,
        ).count()
        alerts_list.append({
            'type': 'unverified_certificates',
            'title': 'অযাচাইকৃত সার্টিফিকেট',
            'message': f'{unverified} টি সার্টিফিকেট যাচাই করা হয়নি।',
            'data': {'count': unverified},
            'severity': unverified > 0 and 'info' or 'success',
        })

        # Upcoming batch starts (next 7 days)
        upcoming = self._get_batches(center).filter(
            status='scheduled',
            start_date__gte=today,
            start_date__lte=today + timedelta(days=7),
        )
        alerts_list.append({
            'type': 'upcoming_batches',
            'title': 'আগামী ব্যাচ',
            'message': f'{upcoming.count()} টি ব্যাচ শুরু হতে যাচ্ছে।',
            'data': [
                {'batch_id': b.id, 'batch_name': b.batch_name_bn or b.batch_no, 'start_date': b.start_date}
                for b in upcoming
            ],
            'severity': 'primary',
        })

        return Response(alerts_list)

    @action(detail=False, methods=['get'])
    def quick_actions(self, request):
        center = self._get_center(request)
        if not center:
            return Response({'error': 'কেন্দ্র নির্ধারিত নেই।'}, status=400)

        pending_apps = Application.objects.filter(circular__center=center, status='pending').count()
        running_batches = self._get_batches(center).filter(status='running').count()
        today = date.today()
        today_total = Attendance.objects.filter(
            batch__center=center, session_date=today,
        ).count()
        needs_attendance = today_total == 0 and running_batches > 0

        eligible_certs = 0
        for b in self._get_batches(center).filter(status='completed'):
            has_final_competent = Assessment.objects.filter(
                batch=b, assessment_type='final', competency_status='competent',
            ).exists()
            no_cert = not Certificate.objects.filter(batch=b).exists()
            if has_final_competent and no_cert:
                eligible_certs += 1

        return Response({
            'pending_applications': pending_apps,
            'running_batches': running_batches,
            'needs_attendance_today': needs_attendance,
            'eligible_certificates': eligible_certs,
            'can_publish_circular': Circular.objects.filter(center=center, status='draft').exists(),
        })

    @action(detail=False, methods=['get'])
    def recent_activity(self, request):
        center = self._get_center(request)
        if not center:
            return Response({'error': 'কেন্দ্র নির্ধারিত নেই।'}, status=400)

        seven_days_ago = timezone.now() - timedelta(days=7)

        recent_apps = Application.objects.filter(
            circular__center=center, applied_at__gte=seven_days_ago,
        ).select_related('circular').order_by('-applied_at')[:5]

        pending_trainers = Trainer.objects.filter(
            center=center, approval_status='pending',
        ).count()
        pending_assessors = Assessor.objects.filter(
            center=center, approval_status='pending',
        ).count()

        return Response({
            'recent_applications': [
                {
                    'id': a.id,
                    'name': a.name_bn or a.name_en,
                    'circular': a.circular.title_bn if a.circular else None,
                    'applied_at': a.applied_at,
                    'status': a.status,
                }
                for a in recent_apps
            ],
            'pending_trainers': pending_trainers,
            'pending_assessors': pending_assessors,
        })

    @action(detail=False, methods=['get'])
    def notifications(self, request):
        center = self._get_center(request)
        center_users = []
        if center:
            from apps.accounts.models import User
            center_users = User.objects.filter(center=center)

        recent = Notification.objects.filter(
            recipient__in=center_users,
        ).order_by('-created_at')[:10]

        return Response([
            {
                'id': n.id,
                'subject': n.subject,
                'message': n.message,
                'channel': n.channel,
                'status': n.status,
                'created_at': n.created_at,
            }
            for n in recent
        ])
