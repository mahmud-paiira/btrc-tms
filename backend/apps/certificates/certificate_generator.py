import io
import os
import zipfile

from django.conf import settings
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
from weasyprint import HTML


def generate_pdf_for_certificate(certificate, template='certificates/certificate_template.html'):
    html_string = render_to_string(template, {
        'certificate': certificate,
        'trainee': certificate.trainee,
        'batch': certificate.batch,
        'STATIC_URL': settings.STATIC_URL,
        'SITE_URL': settings.SITE_URL,
    })

    pdf_buffer = io.BytesIO()
    HTML(string=html_string).write_pdf(pdf_buffer)
    pdf_buffer.seek(0)
    return pdf_buffer


def save_pdf_for_certificate(certificate):
    pdf_buffer = generate_pdf_for_certificate(certificate)
    filename = f'cert_{certificate.certificate_no}.pdf'
    certificate.pdf_file.save(filename, ContentFile(pdf_buffer.getvalue()), save=False)
    certificate.save(update_fields=['pdf_file'])
    return certificate.pdf_file


def generate_zip_of_certificates(certificates, zip_filename='certificates_batch.zip'):
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for cert in certificates:
            if cert.pdf_file and cert.pdf_file.name:
                try:
                    pdf_data = cert.pdf_file.read()
                    pdf_filename = f'{cert.certificate_no}.pdf'
                    zf.writestr(pdf_filename, pdf_data)
                    cert.pdf_file.seek(0)
                except Exception:
                    pdf_buffer = generate_pdf_for_certificate(cert)
                    pdf_filename = f'{cert.certificate_no}.pdf'
                    zf.writestr(pdf_filename, pdf_buffer.getvalue())

    zip_buffer.seek(0)
    return zip_buffer


def batch_generate_pdfs_for_certificates(certificates):
    results = []
    for cert in certificates:
        try:
            save_pdf_for_certificate(cert)
            results.append({'id': cert.id, 'certificate_no': cert.certificate_no, 'success': True})
        except Exception as e:
            results.append({'id': cert.id, 'certificate_no': cert.certificate_no, 'success': False, 'error': str(e)})
    return results
