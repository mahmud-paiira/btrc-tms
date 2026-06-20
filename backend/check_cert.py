"""Check certificate PDF status."""
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'brtc_tms.settings')
import django; django.setup()
from apps.certificates.models import Certificate

cert = Certificate.objects.filter(certificate_no='BRTC-CERT-SEED-00057').first()
if not cert:
    print('Certificate not found')
else:
    print(f'pdf_file: {cert.pdf_file}')
    print(f'pdf_file.name: {cert.pdf_file.name}')
    if cert.pdf_file:
        path = cert.pdf_file.path
        print(f'path: {path}')
        print(f'exists: {os.path.exists(path)}')
        if os.path.exists(path):
            print(f'size: {os.path.getsize(path)} bytes')
    print(f'qr_code_image: {cert.qr_code_image}')
    print(f'qr_code_image.name: {cert.qr_code_image.name}')
