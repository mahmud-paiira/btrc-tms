from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Certificate, CertificateBatchZip
from .serializers import (
    CertificateSerializer,
    IssueCertificateSerializer,
    BatchIssueSerializer,
    EligibleTraineeSerializer,
    TaskStatusSerializer,
    CertificateBatchZipSerializer,
)


class IsCenterAdminOrHeadOffice(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return (
            request.user.user_type in ('center_admin', 'head_office')
            or request.user.is_superuser
        )


class CenterCertificateViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsCenterAdminOrHeadOffice]

    def get_center_id(self, request):
        if request.user.user_type == 'head_office':
            return request.query_params.get('center')
        return request.user.center_id

    @action(detail=False, methods=['get'], url_path='eligible/(?P<batch_id>[^/.]+)')
    def eligible_trainees(self, request, batch_id=None):
        from apps.trainees.models import Trainee
        from apps.assessments.models import Assessment

        center_id = self.get_center_id(request)
        trainees = Trainee.objects.filter(
            batch_id=batch_id, status='enrolled',
        ).select_related('user')
        if center_id:
            trainees = trainees.filter(center_id=center_id)

        data = []
        for t in trainees:
            has_competent_final = Assessment.objects.filter(
                trainee=t, batch_id=batch_id,
                assessment_type='final',
                competency_status='competent',
            ).exists()
            has_cert = Certificate.objects.filter(
                trainee=t, batch_id=batch_id,
            ).exists()
            data.append({
                'trainee_id': t.id,
                'trainee_name': t.user.full_name_bn,
                'trainee_reg_no': t.registration_no,
                'trainee_nid': t.user.nid,
                'has_final_competent': has_competent_final,
                'has_certificate': has_cert,
                'eligible': has_competent_final and not has_cert,
            })

        return Response({
            'batch_id': int(batch_id),
            'total_trainees': len(data),
            'eligible_count': sum(1 for d in data if d['eligible']),
            'trainees': data,
        })

    @action(detail=False, methods=['post'], url_path='issue')
    def issue(self, request):
        serializer = IssueCertificateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        trainee_id = serializer.validated_data['trainee']
        batch_id = serializer.validated_data['batch']

        from apps.trainees.models import Trainee
        from apps.batches.models import Batch

        trainee = Trainee.objects.select_related('center').get(id=trainee_id)
        batch = Batch.objects.get(id=batch_id)
        center_id = self.get_center_id(request)

        if center_id and str(trainee.center_id) != str(center_id):
            return Response(
                {'detail': 'আপনি শুধুমাত্র নিজ কেন্দ্রের প্রশিক্ষণার্থীদের সার্টিফিকেট ইস্যু করতে পারেন।'},
                status=status.HTTP_403_FORBIDDEN,
            )

        cert = Certificate.objects.create(
            trainee_id=trainee_id,
            batch_id=batch_id,
        )
        return Response(
            CertificateSerializer(cert).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['post'], url_path='batch-issue')
    def batch_issue(self, request):
        serializer = BatchIssueSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        batch_id = serializer.validated_data['batch']
        trainee_ids = serializer.validated_data['trainees']
        center_id = self.get_center_id(request)

        from apps.trainees.models import Trainee

        created = []
        skipped = []

        for tid in trainee_ids:
            if Certificate.objects.filter(trainee_id=tid, batch_id=batch_id).exists():
                skipped.append(tid)
                continue
            if center_id:
                t = Trainee.objects.filter(id=tid, center_id=center_id).first()
                if not t:
                    skipped.append(tid)
                    continue
            cert = Certificate.objects.create(trainee_id=tid, batch_id=batch_id)
            created.append(cert.id)

        return Response({
            'created_count': len(created),
            'skipped_count': len(skipped),
            'skipped_trainee_ids': skipped,
            'certificates': CertificateSerializer(
                Certificate.objects.filter(id__in=created).select_related(
                    'trainee__user', 'batch',
                ),
                many=True,
            ).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='list')
    def list_certificates(self, request):
        center_id = self.get_center_id(request)
        qs = Certificate.objects.select_related(
            'trainee__user', 'batch', 'verified_by',
        ).all()
        if center_id:
            qs = qs.filter(trainee__center_id=center_id)

        batch = request.query_params.get('batch')
        if batch:
            qs = qs.filter(batch_id=batch)

        status_filter = request.query_params.get('is_verified')
        if status_filter in ('true', 'false'):
            qs = qs.filter(is_verified=status_filter == 'true')

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size
        total = qs.count()
        results = qs[start:end]

        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'results': CertificateSerializer(results, many=True).data,
        })

    @action(detail=False, methods=['get'], url_path='task-status/(?P<task_id>[^/.]+)')
    def task_status(self, request, task_id=None):
        from celery.result import AsyncResult
        task = AsyncResult(task_id)
        data = {
            'task_id': task_id,
            'state': task.state,
            'result': task.result if task.state == 'SUCCESS' else None,
        }
        return Response(data)

    @action(detail=False, methods=['get'], url_path='zips')
    def list_zips(self, request):
        center_id = self.get_center_id(request)
        qs = CertificateBatchZip.objects.all().order_by('-created_at')
        if center_id:
            qs = qs.filter(batch__center_id=center_id)
        batch = request.query_params.get('batch')
        if batch:
            qs = qs.filter(batch_id=batch)
        return Response(
            CertificateBatchZipSerializer(qs[:20], many=True).data,
        )
