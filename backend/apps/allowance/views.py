from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from .models import AllowanceCategory, AllowanceTier, TraineeAllowance
from .serializers import (
    AllowanceCategorySerializer,
    AllowanceTierSerializer,
    TraineeAllowanceListSerializer,
    TraineeAllowanceWriteSerializer,
)


class AllowanceCategoryViewSet(viewsets.ModelViewSet):
    queryset = AllowanceCategory.objects.all()
    serializer_class = AllowanceCategorySerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AllowanceTierViewSet(viewsets.ModelViewSet):
    queryset = AllowanceTier.objects.select_related('category').all()
    serializer_class = AllowanceTierSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ('category', 'is_active')
    ordering = ('category', 'min_percentage')


class TraineeAllowanceViewSet(viewsets.ModelViewSet):
    queryset = TraineeAllowance.objects.select_related(
        'trainee', 'batch', 'category'
    )
    permission_classes = [IsAuthenticated]
    filterset_fields = ('batch', 'category', 'status', 'trainee')

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return TraineeAllowanceWriteSerializer
        return TraineeAllowanceListSerializer

    def perform_create(self, serializer):
        allowance = serializer.save()
        allowance.calculate()

    @action(detail=False, methods=['post'])
    def calculate_batch(self, request):
        batch_id = request.data.get('batch')
        if not batch_id:
            return Response({'error': 'batch is required'}, status=status.HTTP_400_BAD_REQUEST)

        allowances = TraineeAllowance.objects.filter(batch_id=batch_id)

        from apps.attendance.models import Attendance, AttendanceSummary

        for allowance in allowances:
            summary, created = AttendanceSummary.objects.get_or_create(
                trainee=allowance.trainee, batch_id=batch_id,
            )
            if not created:
                summary.refresh()
            allowance.total_sessions = summary.total_sessions
            allowance.attended_sessions = summary.attended_sessions
            allowance.calculate()

        return Response({'message': f'{allowances.count()} allowances recalculated'})

    @action(detail=False, methods=['post'])
    def generate(self, request):
        batch_id = request.data.get('batch')
        if not batch_id:
            return Response({'error': 'batch is required'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.trainees.models import Trainee
        from apps.batches.models import BatchEnrollment

        trainee_ids = BatchEnrollment.objects.filter(
            batch_id=batch_id, status='active',
        ).values_list('trainee_id', flat=True)

        categories = AllowanceCategory.objects.filter(is_active=True)
        count = 0
        for trainee_id in trainee_ids:
            for cat in categories:
                _, created = TraineeAllowance.objects.get_or_create(
                    trainee_id=trainee_id,
                    batch_id=batch_id,
                    category=cat,
                    defaults={'total_sessions': 0, 'attended_sessions': 0},
                )
                if created:
                    count += 1

        return Response({'message': f'{count} allowance records created'})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        allowance = self.get_object()
        if allowance.status != TraineeAllowance.AllowanceStatus.CALCULATED:
            return Response({'error': 'Only calculated allowances can be approved'}, status=400)
        allowance.status = TraineeAllowance.AllowanceStatus.APPROVED
        allowance.approved_amount = request.data.get('approved_amount', allowance.calculated_amount)
        allowance.approved_by = request.user
        allowance.approved_at = timezone.now()
        allowance.save()
        return Response(TraineeAllowanceListSerializer(allowance).data)

    @action(detail=True, methods=['post'])
    def disburse(self, request, pk=None):
        allowance = self.get_object()
        if allowance.status != TraineeAllowance.AllowanceStatus.APPROVED:
            return Response({'error': 'শুধুমাত্র অনুমোদিত ভাতা বিতরণ করা যাবে।'}, status=400)
        allowance.status = TraineeAllowance.AllowanceStatus.DISBURSED
        allowance.disbursed_by = request.user
        allowance.disbursed_at = timezone.now()
        allowance.payment_method = request.data.get('payment_method', '')
        allowance.transaction_id = request.data.get('transaction_id', '')
        allowance.disbursement_notes = request.data.get('disbursement_notes', '')
        allowance.save()
        return Response(TraineeAllowanceListSerializer(allowance).data)
