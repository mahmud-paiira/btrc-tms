import io
import zipfile

from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile


@shared_task(bind=True, max_retries=3)
def batch_generate_certificates(self, certificate_ids, batch_id=None):
    from .models import Certificate
    from .certificate_generator import save_pdf_for_certificate

    results = []
    success_count = 0
    fail_count = 0

    for cert_id in certificate_ids:
        try:
            cert = Certificate.objects.get(id=cert_id)
            save_pdf_for_certificate(cert)
            results.append({
                'id': cert.id,
                'certificate_no': cert.certificate_no,
                'success': True,
            })
            success_count += 1
        except Certificate.DoesNotExist:
            results.append({'id': cert_id, 'success': False, 'error': 'Certificate not found'})
            fail_count += 1
        except Exception as e:
            try:
                cert = Certificate.objects.get(id=cert_id)
                results.append({
                    'id': cert.id,
                    'certificate_no': cert.certificate_no,
                    'success': False,
                    'error': str(e),
                })
            except Certificate.DoesNotExist:
                results.append({'id': cert_id, 'success': False, 'error': str(e)})
            fail_count += 1

    return {
        'task_id': self.request.id,
        'batch_id': batch_id,
        'total': len(certificate_ids),
        'success_count': success_count,
        'fail_count': fail_count,
        'results': results,
    }


@shared_task(bind=True)
def batch_generate_zip(self, certificate_ids, batch_id=None):
    from .models import Certificate
    from .certificate_generator import generate_pdf_for_certificate

    zip_buffer = io.BytesIO()
    success_count = 0
    fail_count = 0

    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for cert_id in certificate_ids:
            try:
                cert = Certificate.objects.select_related(
                    'trainee__user', 'batch__course', 'batch__center',
                ).get(id=cert_id)

                if cert.pdf_file and cert.pdf_file.name:
                    try:
                        pdf_data = cert.pdf_file.read()
                        cert.pdf_file.seek(0)
                    except Exception:
                        pdf_buffer = generate_pdf_for_certificate(cert)
                        pdf_data = pdf_buffer.getvalue()
                else:
                    pdf_buffer = generate_pdf_for_certificate(cert)
                    pdf_data = pdf_buffer.getvalue()
                    cert.pdf_file.save(
                        f'cert_{cert.certificate_no}.pdf',
                        ContentFile(pdf_data),
                        save=False,
                    )
                    cert.save(update_fields=['pdf_file'])

                pdf_filename = f'{cert.certificate_no}.pdf'
                zf.writestr(pdf_filename, pdf_data)
                success_count += 1

            except Certificate.DoesNotExist:
                fail_count += 1
            except Exception:
                fail_count += 1

    zip_buffer.seek(0)

    from django.core.files.base import ContentFile
    from .models import CertificateBatchZip

    zip_obj = CertificateBatchZip.objects.create(
        batch_id=batch_id,
        total_certificates=len(certificate_ids),
        success_count=success_count,
        fail_count=fail_count,
        task_id=self.request.id,
    )
    zip_filename = f'certificates_batch_{batch_id or "all"}.zip'
    zip_obj.zip_file.save(zip_filename, ContentFile(zip_buffer.getvalue()), save=False)
    zip_obj.is_ready = True
    zip_obj.save(update_fields=['zip_file', 'is_ready'])

    return {
        'task_id': self.request.id,
        'zip_id': zip_obj.id,
        'batch_id': batch_id,
        'total': len(certificate_ids),
        'success_count': success_count,
        'fail_count': fail_count,
    }
