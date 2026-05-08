from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Trainer, TrainerMapping
from .serializers import (
    TrainerListSerializer,
    TrainerDetailSerializer,
    TrainerWriteSerializer,
    TrainerMappingSerializer,
    TrainerApprovalSerializer,
    TrainerTrackSerializer,
)


class TrainerViewSet(viewsets.ModelViewSet):
    queryset = Trainer.objects.select_related('user', 'approved_by').prefetch_related(
        'mappings__center', 'mappings__course',
    ).all()

    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('status', 'approval_status', 'expertise_area')
    search_fields = (
        'trainer_no', 'nid', 'birth_certificate_no',
        'user__email', 'user__phone',
        'user__full_name_bn', 'user__full_name_en',
    )
    ordering_fields = ('trainer_no', 'years_of_experience', 'created_at')
    ordering = ('-created_at',)

    def get_serializer_class(self):
        if self.action == 'list':
            return TrainerListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return TrainerWriteSerializer
        return TrainerDetailSerializer

    @action(detail=False, methods=['post'])
    def track(self, request):
        serializer = TrainerTrackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        query = serializer.validated_data['query']
        search_by = serializer.validated_data['search_by']

        lookup = {
            'trainer_no': 'trainer_no__iexact',
            'nid': 'nid__iexact',
            'mobile': 'user__phone__iexact',
            'birth_certificate_no': 'birth_certificate_no__iexact',
        }
        try:
            trainer = Trainer.objects.select_related('user').get(
                **{lookup[search_by]: query}
            )
            return Response(TrainerDetailSerializer(trainer).data)
        except Trainer.DoesNotExist:
            return Response(
                {'error': 'কোনো প্রশিক্ষক পাওয়া যায়নি'},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        trainer = self.get_object()
        serializer = TrainerApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action_val = serializer.validated_data['action']
        if action_val == 'approve':
            trainer.approval_status = Trainer.ApprovalStatus.APPROVED
            trainer.status = Trainer.Status.ACTIVE
        else:
            trainer.approval_status = Trainer.ApprovalStatus.REJECTED
            trainer.status = Trainer.Status.PENDING

        trainer.approved_by = request.user
        trainer.approved_at = timezone.now()
        trainer.save()
        return Response(TrainerDetailSerializer(trainer).data)


class TrainerMappingViewSet(viewsets.ModelViewSet):
    queryset = TrainerMapping.objects.select_related(
        'trainer', 'center', 'course', 'approved_by',
    ).all()
    serializer_class = TrainerMappingSerializer
    filter_backends = (DjangoFilterBackend, filters.SearchFilter)
    filterset_fields = ('trainer', 'center', 'course', 'status', 'is_primary')
    search_fields = ('trainer__trainer_no', 'center__code', 'course__code')
