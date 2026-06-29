from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Assessment
from .serializers import (
    AssessmentSerializer,
    ConductAssessmentSerializer,
)
from apps.batches.models import Batch, BatchEnrollment, BatchAssessor
from apps.attendance.models import AttendanceSummary


class IsAssessorUser(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'assessor_profile')


class AssessorAssessmentViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAssessorUser]

    def _get_assessor(self, request):
        return getattr(request.user, 'assessor_profile', None)

    def _check_batch_access(self, assessor, batch_id):
        return BatchAssessor.objects.filter(
            assessor=assessor, batch_id=batch_id,
        ).exists()

    @action(detail=False, methods=['get'], url_path='batch/(?P<batch_id>[^/.]+)/eligible')
    def batch_eligible(self, request, batch_id=None):
        assessor = self._get_assessor(request)
        if not assessor:
            return Response({'detail': 'মূল্যায়নকারী প্রোফাইল পাওয়া যায়নি।'}, status=404)

        if not self._check_batch_access(assessor, batch_id):
            return Response({'detail': 'আপনি এই ব্যাচের জন্য নির্ধারিত নন।'}, status=403)

        batch = Batch.objects.filter(pk=batch_id).first()
        if not batch:
            return Response({'detail': 'ব্যাচটি খুঁজে পাওয়া যায়নি।'}, status=404)

        enrolled = BatchEnrollment.objects.filter(
            batch_id=batch_id, status=BatchEnrollment.EnrollmentStatus.ACTIVE,
        ).select_related('trainee__user')

        all_types = list(Assessment.AssessmentType.values)
        data = []
        for e in enrolled:
            trainee = e.trainee
            summary = AttendanceSummary.objects.filter(
                trainee=trainee, batch_id=int(batch_id),
            ).first()
            pct = float(summary.attendance_percentage) if summary else 0

            done_types = list(
                Assessment.objects.filter(
                    trainee=trainee,
                    batch_id=int(batch_id),
                ).values_list('assessment_type', flat=True).distinct()
            )
            pending_types = [at for at in all_types if at not in done_types]

            data.append({
                'trainee_id': trainee.id,
                'trainee_name': trainee.user.full_name_bn,
                'trainee_reg_no': trainee.registration_no,
                'registration_no': trainee.registration_no,
                'attendance_percentage': pct,
                'completed_assessments': done_types,
                'pending_assessment_types': pending_types,
                'can_take_final': 'final' in pending_types,
            })

        return Response({
            'batch_id': int(batch_id),
            'batch_name': batch.batch_name_bn,
            'eligible_count': len(data),
            'trainees': data,
        })

    @action(detail=False, methods=['post'], url_path='conduct')
    def conduct(self, request):
        assessor = self._get_assessor(request)
        if not assessor:
            return Response({'detail': 'মূল্যায়নকারী প্রোফাইল পাওয়া যায়নি।'}, status=404)

        data = request.data.copy()
        data['assessor'] = assessor.id

        serializer = ConductAssessmentSerializer(
            data=data, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        results = serializer.save()
        return Response(
            AssessmentSerializer(results, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get'], url_path='batch/(?P<batch_id>[^/.]+)/results')
    def batch_results(self, request, batch_id=None):
        assessor = self._get_assessor(request)
        if not assessor:
            return Response({'detail': 'মূল্যায়নকারী প্রোফাইল পাওয়া যায়নি।'}, status=404)

        if not self._check_batch_access(assessor, batch_id):
            return Response({'detail': 'আপনি এই ব্যাচের জন্য নির্ধারিত নন।'}, status=403)

        batch_qs = Assessment.objects.filter(batch_id=batch_id)

        total = batch_qs.count()
        if total == 0:
            return Response({
                'batch_id': int(batch_id),
                'total_trainees': 0,
                'assessed_count': 0,
                'competent_count': 0,
                'not_competent_count': 0,
                'absent_count': 0,
                'avg_percentage': 0,
                'max_percentage': 0,
                'min_percentage': 0,
                'by_type': {},
            })

        from django.db.models import Count, Q, Avg, Max, Min
        agg = batch_qs.aggregate(
            avg_pct=Avg('percentage'),
            max_pct=Max('percentage'),
            min_pct=Min('percentage'),
            competent_count=Count('id', filter=Q(competency_status='competent')),
            not_competent_count=Count('id', filter=Q(competency_status='not_competent')),
            absent_count=Count('id', filter=Q(competency_status='absent')),
        )

        all_assessments = batch_qs.select_related(
            'trainee__user', 'assessor__user',
        ).values(
            'id', 'trainee_id', 'assessment_type', 'competency_status',
            'marks_obtained', 'total_marks', 'percentage',
            'remarks', 'is_reassessment',
        )

        assessments_by_type = {}
        for a in all_assessments:
            atype = a['assessment_type']
            if atype not in assessments_by_type:
                assessments_by_type[atype] = []
            assessments_by_type[atype].append(a)

        by_type = {}
        for atype, _ in Assessment.AssessmentType.choices:
            type_qs = batch_qs.filter(assessment_type=atype)
            type_total = type_qs.count()
            if type_total:
                by_type[atype] = {
                    'total': type_total,
                    'competent': type_qs.filter(competency_status='competent').count(),
                    'not_competent': type_qs.filter(competency_status='not_competent').count(),
                    'absent': type_qs.filter(competency_status='absent').count(),
                    'avg_percentage': float(
                        type_qs.aggregate(avg=Avg('percentage'))['avg'] or 0,
                    ),
                    'assessments': assessments_by_type.get(atype, []),
                }

        return Response({
            'batch_id': int(batch_id),
            'total_trainees': total,
            'assessed_count': total,
            'competent_count': agg['competent_count'],
            'not_competent_count': agg['not_competent_count'],
            'absent_count': agg['absent_count'],
            'avg_percentage': float(agg['avg_pct'] or 0),
            'max_percentage': float(agg['max_pct'] or 0),
            'min_percentage': float(agg['min_pct'] or 0),
            'by_type': by_type,
        })
