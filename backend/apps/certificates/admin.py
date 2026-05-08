from django.contrib import admin
from .models import Certificate, CertificateBatchZip


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):

    def download_pdf(self, obj):
        if obj.pdf_file:
            return f'<a href="{obj.pdf_file.url}" target="_blank">PDF</a>'
        return '—'
    download_pdf.allow_tags = True
    download_pdf.short_description = 'PDF'

    list_display = (
        'certificate_no', 'trainee', 'batch', 'issue_date',
        'is_verified', 'verified_count', 'last_verified_at', download_pdf,
    )
    readonly_fields = (
        'certificate_no', 'qr_code_url', 'qr_code_image', 'pdf_file',
        'verification_url', 'issue_date', 'is_verified',
        'verified_count', 'last_verified_at', 'created_at',
    )
    raw_id_fields = ('trainee', 'batch')


@admin.register(CertificateBatchZip)
class CertificateBatchZipAdmin(admin.ModelAdmin):
    list_display = ('batch', 'total_certificates', 'success_count', 'fail_count', 'is_ready', 'created_at')
    list_filter = ('is_ready', 'batch')
    readonly_fields = ('zip_file', 'task_id', 'created_at')
    raw_id_fields = ('batch',)
