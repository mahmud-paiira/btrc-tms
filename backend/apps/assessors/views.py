from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Assessor, AssessorMapping, TrainerAssessorLink
from .serializers import (
    AssessorListSerializer,
    AssessorDetailSerializer,
    AssessorWriteSerializer,
    AssessorMappingSerializer,
    AssessorApprovalSerializer,
    AssessorTrackSerializer,
    TrainerAssessorLinkSerializer,
)


class AssessorViewSet(viewsets.ModelViewSet):
    queryset = Assessor.objects.select_related('user', 'approved_by').prefetch_related(
        'mappings__center', 'mappings__course',
    ).all()

    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('status', 'approval_status', 'expertise_area')
    search_fields = (
        'assessor_no', 'nid', 'birth_certificate_no',
        'user__email', 'user__phone',
        'user__full_name_bn', 'user__full_name_en',
    )
    ordering_fields = ('assessor_no', 'years_of_experience', 'created_at')
    ordering = ('-created_at',)

    def get_serializer_class(self):
        if self.action == 'list':
            return AssessorListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return AssessorWriteSerializer
        return AssessorDetailSerializer

    @action(detail=False, methods=['post'])
    def track(self, request):
        serializer = AssessorTrackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        query = serializer.validated_data['query']
        search_by = serializer.validated_data['search_by']

        lookup = {
            'assessor_no': 'assessor_no__iexact',
            'nid': 'nid__iexact',
            'mobile': 'user__phone__iexact',
            'birth_certificate_no': 'birth_certificate_no__iexact',
        }
        try:
            assessor = Assessor.objects.select_related('user').get(
                **{lookup[search_by]: query}
            )
            return Response(AssessorDetailSerializer(assessor).data)
        except Assessor.DoesNotExist:
            return Response(
                {'error': 'কোনো মূল্যায়নকারী পাওয়া যায়নি'},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        assessor = self.get_object()
        serializer = AssessorApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action_val = serializer.validated_data['action']
        if action_val == 'approve':
            assessor.approval_status = Assessor.ApprovalStatus.APPROVED
            assessor.status = Assessor.Status.ACTIVE
        else:
            assessor.approval_status = Assessor.ApprovalStatus.REJECTED
            assessor.status = Assessor.Status.PENDING

        assessor.approved_by = request.user
        assessor.approved_at = timezone.now()
        assessor.save()
        return Response(AssessorDetailSerializer(assessor).data)


class AssessorMappingViewSet(viewsets.ModelViewSet):
    queryset = AssessorMapping.objects.select_related(
        'assessor', 'center', 'course', 'approved_by',
    ).all()
    serializer_class = AssessorMappingSerializer
    filter_backends = (DjangoFilterBackend, filters.SearchFilter)
    filterset_fields = ('assessor', 'center', 'course', 'status', 'is_primary')
    search_fields = ('assessor__assessor_no', 'center__code', 'course__code')


class TrainerAssessorLinkViewSet(viewsets.ModelViewSet):
    queryset = TrainerAssessorLink.objects.select_related(
        'trainer', 'assessor', 'converted_by',
    ).all()
    serializer_class = TrainerAssessorLinkSerializer
    filter_backends = (DjangoFilterBackend,)
    filterset_fields = ('trainer', 'assessor')
