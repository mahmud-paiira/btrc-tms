from django.utils import timezone
from django.db.models import Prefetch, Q, Count
from rest_framework import viewsets, status, permissions, filters as drf_filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Assessor, AssessorMapping, TrainerAssessorLink
from .serializers import (
    AssessorListSerializer, AssessorDetailSerializer,
    AssessorWriteSerializer, AssessorMappingSerializer,
    AssessorApprovalSerializer,
)
from apps.trainers.models import Trainer
from apps.centers.models import ActionLog
from apps.accounts.models import User
from apps.batches.models import Batch
from apps.assessments.models import Assessment
from apps.assessments.serializers import AssessmentSerializer


class IsHeadOffice(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.user_type == 'head_office' or request.user.is_superuser


class HOAssessorViewSet(viewsets.ModelViewSet):
    queryset = Assessor.objects.select_related('user', 'approved_by').prefetch_related(
        Prefetch('mappings', queryset=AssessorMapping.objects.select_related('center', 'course', 'approved_by')),
    ).all()
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]
    filter_backends = (DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter)
    filterset_fields = ('status', 'approval_status', 'expertise_area', 'years_of_experience')
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

    def _log(self, request, action_desc, target_id=None):
        ActionLog.objects.create(
            user=request.user,
            action=action_desc,
            target_type='Assessor',
            target_id=str(target_id) if target_id else '',
            description=action_desc,
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )

    def perform_create(self, serializer):
        obj = serializer.save()
        self._log(self.request, f'Created assessor {obj.assessor_no}', obj.id)

    def perform_update(self, serializer):
        obj = serializer.save()
        self._log(self.request, f'Updated assessor {obj.assessor_no}', obj.id)

    def perform_destroy(self, instance):
        self._log(self.request, f'Deleted assessor {instance.assessor_no}', instance.id)
        instance.delete()

    @action(detail=False)
    def pending(self, request):
        qs = self.queryset.filter(approval_status=Assessor.ApprovalStatus.PENDING)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = AssessorDetailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = AssessorDetailSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        obj = self.get_object()
        serializer = AssessorApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj.approval_status = Assessor.ApprovalStatus.APPROVED
        obj.status = Assessor.Status.ACTIVE
        obj.approved_by = request.user
        obj.approved_at = timezone.now()
        obj.save(update_fields=['approval_status', 'status', 'approved_by', 'approved_at'])
        self._log(request, f'Approved assessor {obj.assessor_no}', obj.id)
        return Response(AssessorDetailSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        obj = self.get_object()
        remarks = request.data.get('remarks', '')
        obj.approval_status = Assessor.ApprovalStatus.REJECTED
        obj.status = Assessor.Status.PENDING
        obj.approved_by = request.user
        obj.approved_at = timezone.now()
        obj.save(update_fields=['approval_status', 'status', 'approved_by', 'approved_at'])
        self._log(request, f'Rejected assessor {obj.assessor_no}: {remarks}', obj.id)
        return Response(AssessorDetailSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        obj = self.get_object()
        obj.status = Assessor.Status.SUSPENDED
        obj.save(update_fields=['status'])
        self._log(request, f'Suspended assessor {obj.assessor_no}', obj.id)
        return Response(AssessorDetailSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        obj = self.get_object()
        if obj.approval_status != Assessor.ApprovalStatus.APPROVED:
            return Response({'error': 'প্রথমে মূল্যায়নকারীকে অনুমোদন করুন'}, status=400)
        obj.status = Assessor.Status.ACTIVE
        obj.save(update_fields=['status'])
        self._log(request, f'Activated assessor {obj.assessor_no}', obj.id)
        return Response(AssessorDetailSerializer(obj).data)

    @action(detail=True)
    def track(self, request, pk=None):
        obj = self.get_object()
        return Response(AssessorDetailSerializer(obj).data)

    @action(detail=False, methods=['get'])
    def track_by_number(self, request):
        val = request.query_params.get('assessor_no', '')
        try:
            obj = self.queryset.get(assessor_no__iexact=val)
            return Response(AssessorDetailSerializer(obj).data)
        except Assessor.DoesNotExist:
            return Response({'error': 'মূল্যায়নকারী পাওয়া যায়নি'}, status=404)

    @action(detail=False, methods=['get'])
    def track_by_nid(self, request):
        val = request.query_params.get('nid', '')
        try:
            obj = self.queryset.get(nid__iexact=val)
            return Response(AssessorDetailSerializer(obj).data)
        except Assessor.DoesNotExist:
            return Response({'error': 'মূল্যায়নকারী পাওয়া যায়নি'}, status=404)

    @action(detail=False, methods=['get'])
    def track_by_mobile(self, request):
        val = request.query_params.get('phone', '')
        try:
            obj = self.queryset.get(user__phone__iexact=val)
            return Response(AssessorDetailSerializer(obj).data)
        except Assessor.DoesNotExist:
            return Response({'error': 'মূল্যায়নকারী পাওয়া যায়নি'}, status=404)

    @action(detail=False, methods=['get'])
    def track_by_bcn(self, request):
        val = request.query_params.get('bcn', '')
        try:
            obj = self.queryset.get(birth_certificate_no__iexact=val)
            return Response(AssessorDetailSerializer(obj).data)
        except Assessor.DoesNotExist:
            return Response({'error': 'মূল্যায়নকারী পাওয়া যায়নি'}, status=404)

    @action(detail=False, methods=['post'])
    def map(self, request):
        serializer = AssessorMappingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mapping = serializer.save()
        self._log(request, f'Mapped assessor {mapping.assessor.assessor_no} to {mapping.center.code} / {mapping.course.code}')
        return Response(AssessorMappingSerializer(mapping).data, status=201)

    @action(detail=True, methods=['post'])
    def unmap(self, request, pk=None):
        mapping_id = request.data.get('mapping_id')
        if not mapping_id:
            return Response({'error': 'mapping_id required'}, status=400)
        try:
            mapping = AssessorMapping.objects.get(id=mapping_id, assessor_id=pk)
            mapping.delete()
            self._log(request, f'Unmapped assessor mapping {mapping_id}')
            return Response({'status': 'unmapped'})
        except AssessorMapping.DoesNotExist:
            return Response({'error': 'Mapping not found'}, status=404)

    @action(detail=False, methods=['post'])
    def convert(self, request):
        trainer_id = request.data.get('trainer_id')
        retain = request.data.get('retain_trainer_status', True)
        if not trainer_id:
            return Response({'error': 'trainer_id required'}, status=400)
        try:
            trainer = Trainer.objects.select_related('user').get(id=trainer_id)
        except Trainer.DoesNotExist:
            return Response({'error': 'প্রশিক্ষক পাওয়া যায়নি'}, status=404)

        if hasattr(trainer.user, 'assessor_profile'):
            return Response({'error': 'এই ব্যবহারকারী ইতিমধ্যে একজন মূল্যায়নকারী'}, status=400)

        import random
        assessor_no = f'ASR{timezone.now().strftime("%y%m")}{random.randint(1000,9999)}'

        assessor = Assessor.objects.create(
            user=trainer.user,
            assessor_no=assessor_no,
            nid=trainer.nid,
            birth_certificate_no=trainer.birth_certificate_no,
            date_of_birth=trainer.date_of_birth,
            father_name_bn=trainer.father_name_bn,
            mother_name_bn=trainer.mother_name_bn,
            education_qualification=trainer.education_qualification,
            years_of_experience=trainer.years_of_experience,
            expertise_area=trainer.expertise_area,
            bank_account_no=trainer.bank_account_no,
            bank_name=trainer.bank_name,
        )

        TrainerAssessorLink.objects.create(
            trainer=trainer,
            assessor=assessor,
            converted_by=request.user,
            remarks='Converted via HO panel',
        )

        if not retain:
            trainer.status = Trainer.Status.SUSPENDED
            trainer.save(update_fields=['status'])

        self._log(request, f'Converted trainer {trainer.trainer_no} to assessor {assessor_no}', assessor.id)
        return Response({
            'status': 'converted',
            'trainer_no': trainer.trainer_no,
            'assessor_no': assessor_no,
            'retain_trainer': retain,
            'assessor': AssessorDetailSerializer(assessor).data,
        }, status=201)

    @action(detail=False, methods=['get'])
    def export(self, request):
        qs = self.filter_queryset(self.queryset)
        data = []
        for a in qs:
            data.append({
                'assessor_no': a.assessor_no,
                'name_bn': a.user.full_name_bn,
                'name_en': a.user.full_name_en,
                'email': a.user.email,
                'phone': a.user.phone,
                'nid': a.nid,
                'status': a.status,
                'approval_status': a.approval_status,
                'expertise_area': a.expertise_area,
                'years_of_experience': a.years_of_experience,
                'certification': a.certification,
                'created_at': a.created_at.isoformat() if a.created_at else '',
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

    @action(detail=False, methods=['get'])
    def search_trainers(self, request):
        q = request.query_params.get('q', '')
        if len(q) < 2:
            return Response([])
        trainers = Trainer.objects.select_related('user').filter(
            ~Q(user__assessor_profile__isnull=False),
        ).filter(
            Q(trainer_no__icontains=q) |
            Q(nid__icontains=q) |
            Q(user__phone__icontains=q) |
            Q(user__full_name_bn__icontains=q) |
            Q(user__full_name_en__icontains=q)
        )[:20]
        return Response([{
            'id': t.id,
            'trainer_no': t.trainer_no,
            'name_bn': t.user.full_name_bn,
            'name_en': t.user.full_name_en,
            'email': t.user.email,
            'phone': t.user.phone,
            'nid': t.nid,
            'status': t.status,
            'expertise_area': t.expertise_area,
            'years_of_experience': t.years_of_experience,
        } for t in trainers])

    @action(detail=True, methods=['get'])
    def batches(self, request, pk=None):
        assessor = self.get_object()
        batch_ids = Assessment.objects.filter(
            assessor=assessor,
        ).values_list('batch_id', flat=True).distinct()
        qs = Batch.objects.filter(id__in=list(batch_ids)).select_related('center', 'course')
        return Response([{
            'id': b.id,
            'batch_no': b.batch_no,
            'batch_name_bn': b.batch_name_bn,
            'center_code': b.center.code,
            'center_name': b.center.name_bn,
            'course_code': b.course.code,
            'course_name': b.course.name_bn,
            'start_date': str(b.start_date),
            'end_date': str(b.end_date),
            'status': b.status,
            'total_seats': b.total_seats,
            'filled_seats': b.filled_seats,
            'assessments_count': Assessment.objects.filter(assessor=assessor, batch=b).count(),
        } for b in qs])

    @action(detail=True, methods=['get'])
    def assessments(self, request, pk=None):
        assessor = self.get_object()
        qs = Assessment.objects.filter(assessor=assessor).select_related(
            'trainee__user', 'batch', 'assessed_by',
        ).order_by('-assessment_date')
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = AssessmentSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = AssessmentSerializer(qs, many=True)
        return Response(serializer.data)


class HOAssessorMappingViewSet(viewsets.ModelViewSet):
    queryset = AssessorMapping.objects.select_related('assessor', 'center', 'course', 'approved_by').all()
    serializer_class = AssessorMappingSerializer
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]
    filter_backends = (DjangoFilterBackend, drf_filters.SearchFilter)
    filterset_fields = ('assessor', 'center', 'course', 'status', 'is_primary')

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        mapping = self.get_object()
        mapping.status = 'active'
        mapping.approved_by = request.user
        mapping.approved_at = timezone.now()
        mapping.save(update_fields=['status', 'approved_by', 'approved_at'])
        ActionLog.objects.create(
            user=request.user,
            action='approved assessor mapping',
            target_type='AssessorMapping',
            target_id=str(mapping.id),
            description=f'Approved mapping {mapping.assessor.assessor_no} → {mapping.center.code}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        return Response(AssessorMappingSerializer(mapping).data)
