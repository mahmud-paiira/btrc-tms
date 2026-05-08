from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Certificate
from .serializers import PublicCertificateSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def verify_certificate(request, cert_no):
    try:
        cert = Certificate.objects.select_related(
            'trainee__user', 'batch__course', 'batch__center',
        ).get(certificate_no=cert_no)
    except Certificate.DoesNotExist:
        return Response(
            {
                'is_valid': False,
                'error': 'সার্টিফিকেট বৈধ নয়',
                'certificate_no': cert_no,
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    cert.verified_count += 1
    cert.last_verified_at = timezone.now()
    cert.save(update_fields=['verified_count', 'last_verified_at'])

    data = {
        'is_valid': True,
        'certificate_no': cert.certificate_no,
        'trainee_name': cert.trainee.user.full_name_bn,
        'trainee_reg_no': cert.trainee.registration_no,
        'batch_name': cert.batch.batch_name_bn,
        'course_name': cert.batch.course.name_bn if cert.batch.course else '',
        'center_name': cert.batch.center.name_bn if cert.batch.center else '',
        'issue_date': cert.issue_date,
        'is_verified': cert.is_verified,
        'verified_count': cert.verified_count,
    }
    return Response(data)
