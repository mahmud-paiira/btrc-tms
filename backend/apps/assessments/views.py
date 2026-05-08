from django.db.models import Avg, Max, Min, Count, Q
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Assessment, Reassessment
from .serializers import (
    AssessmentSerializer,
    ConductAssessmentSerializer,
    ReassessmentSerializer,
)


class AssessmentViewSet(viewsets.ModelViewSet):
    queryset = Assessment.objects.select_related(
        'batch', 'trainee__user', 'assessor__user', 'assessed_by',
    ).all()

    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('batch', 'trainee', 'assessor', 'assessment_type', 'competency_status')
    search_fields = ('trainee__user__full_name_bn', 'trainee__registration_no')
    ordering_fields = ('assessment_date', 'percentage')
    ordering = ('-assessment_date',)

    def get_serializer_class(self):
        return AssessmentSerializer

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        serializer = ConductAssessmentSerializer(
            data=request.data, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        results = serializer.save()
        return Response(
            AssessmentSerializer(results, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get'], url_path='batch-results/(?P<batch_id>[^/.]+)')
    def batch_results(self, request, batch_id=None):
        qs = self.get_queryset().filter(batch_id=batch_id)
        total = qs.count()
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

        agg = qs.aggregate(
            avg_pct=Avg('percentage'),
            max_pct=Max('percentage'),
            min_pct=Min('percentage'),
            competent_count=Count('id', filter=Q(competency_status='competent')),
            not_competent_count=Count('id', filter=Q(competency_status='not_competent')),
            absent_count=Count('id', filter=Q(competency_status='absent')),
        )

        all_assessments = qs.values(
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
            type_qs = qs.filter(assessment_type=atype)
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

    @action(detail=False, methods=['get'], url_path='trainee-results/(?P<trainee_id>[^/.]+)')
    def trainee_results(self, request, trainee_id=None):
        qs = self.get_queryset().filter(trainee_id=trainee_id)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='reassessment-requests')
    def reassessment_requests(self, request):
        qs = Reassessment.objects.select_related(
            'original_assessment__trainee__user',
            'original_assessment__batch',
            'new_assessment',
            'requested_by',
            'approved_by',
        ).all()
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
