from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Certificate
from .serializers import (
    CertificateSerializer,
    IssueCertificateSerializer,
)


class CertificateViewSet(viewsets.ModelViewSet):
    queryset = Certificate.objects.select_related(
        'trainee__user', 'batch', 'verified_by',
    ).all()

    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('trainee', 'batch', 'is_verified')
    search_fields = (
        'certificate_no', 'trainee__registration_no',
        'trainee__user__full_name_bn',
    )
    ordering_fields = ('issue_date', 'created_at')
    ordering = ('-issue_date',)

    def get_serializer_class(self):
        return CertificateSerializer

    @action(detail=False, methods=['post'])
    def generate(self, request):
        serializer = IssueCertificateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cert = Certificate.objects.create(
            trainee_id=serializer.validated_data['trainee'],
            batch_id=serializer.validated_data['batch'],
        )
        return Response(
            CertificateSerializer(cert).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['post'])
    def verify(self, request):
        cert_no = request.data.get('certificate_no', '')
        try:
            cert = Certificate.objects.get(certificate_no=cert_no)
        except Certificate.DoesNotExist:
            return Response(
                {'is_valid': False, 'error': 'সার্টিফিকেট বৈধ নয়'},
                status=status.HTTP_404_NOT_FOUND,
            )
        cert.is_verified = True
        cert.verified_count += 1
        cert.last_verified_at = timezone.now()
        cert.verified_by = request.user
        cert.save(update_fields=[
            'is_verified', 'verified_count', 'last_verified_at', 'verified_by',
        ])
        return Response(CertificateSerializer(cert).data)

    @action(detail=False, methods=['get'], url_path='verify/(?P<cert_no>[^/.]+)')
    def verify_by_no(self, request, cert_no=None):
        try:
            cert = Certificate.objects.get(certificate_no=cert_no)
            return Response({
                'is_valid': True,
                'certificate_no': cert.certificate_no,
                'trainee_name': cert.trainee.user.full_name_bn,
                'trainee_reg_no': cert.trainee.registration_no,
                'batch_name': str(cert.batch),
                'course_name': str(cert.batch.course),
                'center_name': str(cert.batch.center),
                'issue_date': cert.issue_date,
                'is_verified': cert.is_verified,
                'verified_count': cert.verified_count,
            })
        except Certificate.DoesNotExist:
            return Response(
                {'is_valid': False, 'error': 'সার্টিফিকেট বৈধ নয়'},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        cert = self.get_object()
        cert.generate_qr_code()
        cert.generate_pdf()
        cert.save(update_fields=['qr_code_url', 'qr_code_image', 'pdf_file'])
        return Response(CertificateSerializer(cert).data)

    @action(detail=False, methods=['get'], url_path='download/(?P<cert_no>[^/.]+)')
    def download(self, request, cert_no=None):
        try:
            cert = Certificate.objects.get(certificate_no=cert_no)
        except Certificate.DoesNotExist:
            return Response(
                {'error': 'সার্টিফিকেট পাওয়া যায়নি'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not cert.pdf_file:
            return Response(
                {'error': 'PDF ফাইল পাওয়া যায়নি'},
                status=status.HTTP_404_NOT_FOUND,
            )
        from django.http import FileResponse
        return FileResponse(
            cert.pdf_file.open('rb'),
            as_attachment=True,
            filename=f'{cert.certificate_no}.pdf',
        )
