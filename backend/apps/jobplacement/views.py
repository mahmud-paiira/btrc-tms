from django.db.models import Count, Q, Avg
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import JobPlacement, JobTracking
from .serializers import (
    JobPlacementSerializer,
    JobTrackingSerializer,
    BatchSummarySerializer,
)


class JobPlacementViewSet(viewsets.ModelViewSet):
    queryset = JobPlacement.objects.select_related(
        'trainee__user', 'batch', 'created_by',
    ).all()

    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('employment_type', 'is_current', 'batch', 'trainee')
    search_fields = (
        'trainee__registration_no', 'trainee__user__full_name_bn',
        'employer_name', 'designation_bn', 'designation_en',
    )
    ordering_fields = ('created_at', 'start_date', 'salary')
    ordering = ('-created_at',)

    def get_serializer_class(self):
        return JobPlacementSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['put'], url_path='release')
    def release(self, request, pk=None):
        placement = self.get_object()
        release_date = request.data.get('release_date')
        if not release_date:
            return Response(
                {'release_date': 'অবমুক্তির তারিখ আবশ্যক।'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        placement.release_date = release_date
        placement.is_current = False
        placement.save(update_fields=['release_date', 'is_current'])
        return Response(JobPlacementSerializer(placement).data)

    @action(detail=False, methods=['get'], url_path='batch-summary/(?P<batch_id>[^/.]+)')
    def batch_summary(self, request, batch_id=None):
        from apps.trainees.models import Trainee
        from apps.batches.models import Batch

        total_trainees = Trainee.objects.filter(batch_id=batch_id).count()
        placements = self.get_queryset().filter(batch_id=batch_id)
        placed_count = placements.count()

        by_type = {}
        for etype, _ in JobPlacement.EmploymentType.choices:
            by_type[etype] = placements.filter(employment_type=etype).count()

        batch = Batch.objects.filter(pk=batch_id).first()
        placement_rate = round(
            (placed_count / total_trainees * 100) if total_trainees else 0, 2,
        )

        return Response({
            'batch_id': int(batch_id),
            'batch_name': batch.batch_name_bn if batch else '',
            'total_trainees': total_trainees,
            'placed_count': placed_count,
            'placement_rate': placement_rate,
            'by_type': by_type,
            'currently_employed': placements.filter(is_current=True).count(),
            'avg_salary': float(
                placements.aggregate(avg=Avg('salary'))['avg'] or 0,
            ),
        })

    @action(detail=False, methods=['post'], url_path='tracking')
    def add_tracking(self, request):
        serializer = JobTrackingSerializer(
            data=request.data, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        tracking = serializer.save()
        return Response(
            JobTrackingSerializer(tracking).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get'], url_path='trackings/(?P<placement_id>[^/.]+)')
    def placement_trackings(self, request, placement_id=None):
        qs = JobTracking.objects.filter(
            job_placement_id=placement_id,
        ).select_related('tracked_by').order_by('tracking_month')
        return Response(JobTrackingSerializer(qs, many=True).data)
