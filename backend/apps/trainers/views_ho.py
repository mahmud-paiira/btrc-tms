from django.utils import timezone
from django.db.models import Q, Count, Prefetch
from rest_framework import viewsets, status, permissions, filters as drf_filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Trainer, TrainerMapping
from .serializers import (
    TrainerListSerializer, TrainerDetailSerializer,
    TrainerWriteSerializer, TrainerMappingSerializer,
    TrainerApprovalSerializer,
)
from apps.centers.models import ActionLog


class IsHeadOffice(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.user_type == 'head_office' or request.user.is_superuser


class HOTrainerViewSet(viewsets.ModelViewSet):
    queryset = Trainer.objects.select_related('user', 'approved_by').prefetch_related(
        Prefetch('mappings', queryset=TrainerMapping.objects.select_related('center', 'course', 'approved_by')),
    ).all()
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]
    filter_backends = (DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter)
    filterset_fields = ('status', 'approval_status', 'expertise_area', 'years_of_experience')
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

    def _log(self, request, action_desc, target_id=None):
        ActionLog.objects.create(
            user=request.user,
            action=action_desc,
            target_type='Trainer',
            target_id=str(target_id) if target_id else '',
            description=action_desc,
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )

    def perform_create(self, serializer):
        trainer = serializer.save()
        self._log(self.request, f'Created trainer {trainer.trainer_no}', trainer.id)

    def perform_update(self, serializer):
        trainer = serializer.save()
        self._log(self.request, f'Updated trainer {trainer.trainer_no}', trainer.id)

    def perform_destroy(self, instance):
        self._log(self.request, f'Deleted trainer {instance.trainer_no}', instance.id)
        instance.delete()

    @action(detail=False)
    def pending(self, request):
        qs = self.queryset.filter(approval_status=Trainer.ApprovalStatus.PENDING)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = TrainerDetailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = TrainerDetailSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        trainer = self.get_object()
        serializer = TrainerApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        trainer.approval_status = Trainer.ApprovalStatus.APPROVED
        trainer.status = Trainer.Status.ACTIVE
        trainer.approved_by = request.user
        trainer.approved_at = timezone.now()
        trainer.save(update_fields=['approval_status', 'status', 'approved_by', 'approved_at'])
        self._log(request, f'Approved trainer {trainer.trainer_no}', trainer.id)
        return Response(TrainerDetailSerializer(trainer).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        trainer = self.get_object()
        remarks = request.data.get('remarks', '')
        trainer.approval_status = Trainer.ApprovalStatus.REJECTED
        trainer.status = Trainer.Status.PENDING
        trainer.approved_by = request.user
        trainer.approved_at = timezone.now()
        trainer.save(update_fields=['approval_status', 'status', 'approved_by', 'approved_at'])
        self._log(request, f'Rejected trainer {trainer.trainer_no}: {remarks}', trainer.id)
        return Response(TrainerDetailSerializer(trainer).data)

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        trainer = self.get_object()
        trainer.status = Trainer.Status.SUSPENDED
        trainer.save(update_fields=['status'])
        self._log(request, f'Suspended trainer {trainer.trainer_no}', trainer.id)
        return Response(TrainerDetailSerializer(trainer).data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        trainer = self.get_object()
        if trainer.approval_status != Trainer.ApprovalStatus.APPROVED:
            return Response({'error': 'প্রথমে প্রশিক্ষককে অনুমোদন করুন'}, status=400)
        trainer.status = Trainer.Status.ACTIVE
        trainer.save(update_fields=['status'])
        self._log(request, f'Activated trainer {trainer.trainer_no}', trainer.id)
        return Response(TrainerDetailSerializer(trainer).data)

    @action(detail=True, methods=['post'])
    def blacklist(self, request, pk=None):
        trainer = self.get_object()
        trainer.status = Trainer.Status.SUSPENDED
        trainer.approval_status = Trainer.ApprovalStatus.REJECTED
        trainer.save(update_fields=['status', 'approval_status'])
        self._log(request, f'Blacklisted trainer {trainer.trainer_no}', trainer.id)
        return Response({'status': 'blacklisted', 'trainer_no': trainer.trainer_no})

    @action(detail=True)
    def track(self, request, pk=None):
        trainer = self.get_object()
        return Response(TrainerDetailSerializer(trainer).data)

    @action(detail=False, methods=['get'])
    def track_by_number(self, request):
        trainer_no = request.query_params.get('trainer_no', '')
        try:
            trainer = self.queryset.get(trainer_no__iexact=trainer_no)
            return Response(TrainerDetailSerializer(trainer).data)
        except Trainer.DoesNotExist:
            return Response({'error': 'প্রশিক্ষক পাওয়া যায়নি'}, status=404)

    @action(detail=False, methods=['get'])
    def track_by_nid(self, request):
        nid = request.query_params.get('nid', '')
        try:
            trainer = self.queryset.get(nid__iexact=nid)
            return Response(TrainerDetailSerializer(trainer).data)
        except Trainer.DoesNotExist:
            return Response({'error': 'প্রশিক্ষক পাওয়া যায়নি'}, status=404)

    @action(detail=False, methods=['get'])
    def track_by_mobile(self, request):
        phone = request.query_params.get('phone', '')
        try:
            trainer = self.queryset.get(user__phone__iexact=phone)
            return Response(TrainerDetailSerializer(trainer).data)
        except Trainer.DoesNotExist:
            return Response({'error': 'প্রশিক্ষক পাওয়া যায়নি'}, status=404)

    @action(detail=False, methods=['get'])
    def track_by_bcn(self, request):
        bcn = request.query_params.get('bcn', '')
        try:
            trainer = self.queryset.get(birth_certificate_no__iexact=bcn)
            return Response(TrainerDetailSerializer(trainer).data)
        except Trainer.DoesNotExist:
            return Response({'error': 'প্রশিক্ষক পাওয়া যায়নি'}, status=404)

    @action(detail=False, methods=['post'])
    def map(self, request):
        mapping_serializer = TrainerMappingSerializer(data=request.data)
        mapping_serializer.is_valid(raise_exception=True)
        mapping = mapping_serializer.save()
        self._log(request, f'Mapped trainer {mapping.trainer.trainer_no} to {mapping.center.code} / {mapping.course.code}')
        return Response(TrainerMappingSerializer(mapping).data, status=201)

    @action(detail=True, methods=['post'])
    def unmap(self, request, pk=None):
        mapping_id = request.data.get('mapping_id')
        if not mapping_id:
            return Response({'error': 'mapping_id required'}, status=400)
        try:
            mapping = TrainerMapping.objects.get(id=mapping_id, trainer_id=pk)
            mapping.delete()
            self._log(request, f'Unmapped trainer mapping {mapping_id}')
            return Response({'status': 'unmapped'})
        except TrainerMapping.DoesNotExist:
            return Response({'error': 'Mapping not found'}, status=404)

    @action(detail=False, methods=['get'])
    def export(self, request):
        qs = self.filter_queryset(self.queryset)
        data = []
        for t in qs:
            data.append({
                'trainer_no': t.trainer_no,
                'name_bn': t.user.full_name_bn,
                'name_en': t.user.full_name_en,
                'email': t.user.email,
                'phone': t.user.phone,
                'nid': t.nid,
                'status': t.status,
                'approval_status': t.approval_status,
                'expertise_area': t.expertise_area,
                'years_of_experience': t.years_of_experience,
                'created_at': t.created_at.isoformat() if t.created_at else '',
            })
        return Response(data)

    @action(detail=False, methods=['get'])
    def centers(self, request):
        from apps.centers.models import Center
        qs = Center.objects.filter(status=Center.Status.ACTIVE).values('id', 'code', 'name_bn', 'name_en')
        return Response(list(qs))

    @action(detail=False, methods=['get'])
    def courses(self, request):
        from apps.courses.models import Course
        center_id = request.query_params.get('center_id')
        qs = Course.objects.filter(status=Course.Status.ACTIVE)
        if center_id:
            qs = qs.filter(batch__center_id=center_id).distinct()
        return Response(list(qs.values('id', 'code', 'name_bn', 'name_en')))


class HOTrainerMappingViewSet(viewsets.ModelViewSet):
    queryset = TrainerMapping.objects.select_related('trainer', 'center', 'course', 'approved_by').all()
    serializer_class = TrainerMappingSerializer
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]
    filter_backends = (DjangoFilterBackend, drf_filters.SearchFilter)
    filterset_fields = ('trainer', 'center', 'course', 'status', 'is_primary')

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        mapping = self.get_object()
        mapping.status = 'active'
        mapping.approved_by = request.user
        mapping.approved_at = timezone.now()
        mapping.save(update_fields=['status', 'approved_by', 'approved_at'])
        ActionLog.objects.create(
            user=request.user,
            action='approved trainer mapping',
            target_type='TrainerMapping',
            target_id=str(mapping.id),
            description=f'Approved mapping {mapping.trainer.trainer_no} → {mapping.center.code}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        return Response(TrainerMappingSerializer(mapping).data)
