from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Assessment, Reassessment
from .serializers import (
    AssessmentSerializer,
    ConductAssessmentSerializer,
    ReassessmentSerializer,
)
from apps.attendance.eligibility import get_batch_eligibility, check_trainee_eligibility


class IsCenterAdminOrHeadOffice(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return (
            request.user.user_type in ('center_admin', 'head_office')
            or request.user.is_superuser
        )


class CenterAssessmentViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsCenterAdminOrHeadOffice]

    def get_center_id(self, request):
        if request.user.user_type == 'head_office':
            return request.query_params.get('center')
        return request.user.center_id

    @action(detail=False, methods=['get'], url_path='batch/(?P<batch_id>[^/.]+)/eligible')
    def batch_eligible(self, request, batch_id=None):
        from apps.batches.models import Batch
        from apps.trainees.models import Trainee

        center_id = self.get_center_id(request)
        batch = Batch.objects.filter(pk=batch_id).first()
        if not batch:
            return Response(
                {'detail': 'ব্যাচটি খুঁজে পাওয়া যায়নি।'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if center_id and str(batch.center_id) != str(center_id):
            return Response(
                {'detail': 'আপনি শুধুমাত্র নিজ কেন্দ্রের ব্যাচ দেখতে পারেন।'},
                status=status.HTTP_403_FORBIDDEN,
            )

        eligibility_data = get_batch_eligibility(int(batch_id))
        eligible_trainees = [
            t for t in eligibility_data['trainees'] if t['is_eligible']
        ]

        all_types = [t for t in Assessment.AssessmentType.values]
        data = []
        for t in eligible_trainees:
            trainee = Trainee.objects.filter(pk=t['trainee_id']).first()
            if not trainee:
                continue
            done_types = list(
                Assessment.objects.filter(
                    trainee_id=t['trainee_id'],
                    batch_id=int(batch_id),
                ).values_list('assessment_type', flat=True).distinct()
            )
            pending_types = [at for at in all_types if at not in done_types]

            data.append({
                'trainee_id': t['trainee_id'],
                'trainee_name': t['trainee_name'],
                'trainee_reg_no': t['trainee_reg_no'],
                'registration_no': t['trainee_reg_no'],
                'attendance_percentage': t['attendance_percentage'],
                'completed_assessments': done_types,
                'pending_assessment_types': pending_types,
                'can_take_final': (
                    'final' in pending_types and
                    all(
                        at in done_types
                        for at in all_types if at != 'final'
                    )
                ),
            })

        return Response({
            'batch_id': int(batch_id),
            'batch_name': batch.batch_name_bn,
            'eligible_count': len(data),
            'trainees': data,
        })

    @action(detail=False, methods=['post'], url_path='conduct')
    def conduct(self, request):
        serializer = ConductAssessmentSerializer(
            data=request.data, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        results = serializer.save()
        return Response(
            AssessmentSerializer(results, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['post'], url_path='reassessment/request')
    def reassessment_request(self, request):
        serializer = ReassessmentSerializer(
            data=request.data, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        reassessment = serializer.save()
        return Response({
            'id': reassessment.id,
            'original_assessment': AssessmentSerializer(
                reassessment.original_assessment,
            ).data,
            'new_assessment': AssessmentSerializer(
                reassessment.new_assessment,
            ).data,
            'reason': reassessment.reason,
            'created_at': reassessment.created_at,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='reassessment/requests')
    def reassessment_requests(self, request):
        qs = Reassessment.objects.select_related(
            'original_assessment__trainee__user',
            'original_assessment__batch',
            'new_assessment',
            'requested_by',
            'approved_by',
        ).all()

        center_id = self.get_center_id(request)
        if center_id:
            qs = qs.filter(
                original_assessment__batch__center_id=center_id,
            )

        data = []
        for r in qs:
            data.append({
                'id': r.id,
                'original_assessment': AssessmentSerializer(
                    r.original_assessment,
                ).data,
                'new_assessment': (
                    AssessmentSerializer(r.new_assessment).data
                    if r.new_assessment else None
                ),
                'reason': r.reason,
                'requested_by_name': (
                    r.requested_by.full_name_bn if r.requested_by else None
                ),
                'approved_by_name': (
                    r.approved_by.full_name_bn if r.approved_by else None
                ),
                'created_at': r.created_at,
            })

        return Response(data)

    @action(detail=False, methods=['get'], url_path='batch/(?P<batch_id>[^/.]+)/results')
    def batch_results(self, request, batch_id=None):
        from django.db.models import Count, Q, Avg, Max, Min

        center_id = self.get_center_id(request)
        batch_qs = Assessment.objects.filter(batch_id=batch_id)
        if center_id:
            batch_qs = batch_qs.filter(batch__center_id=center_id)

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
