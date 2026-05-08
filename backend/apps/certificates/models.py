from datetime import date

from django.db import models
from django.utils.text import slugify
from apps.batches.models import Batch
from apps.trainees.models import Trainee
from apps.accounts.models import User


def generate_certificate_no():
    from django.db.models import Max
    year = date.today().year
    prefix = f'BRTC-CERT-{year}-'
    last = Certificate.objects.filter(
        certificate_no__startswith=prefix
    ).aggregate(Max('certificate_no'))['certificate_no__max']
    if last:
        try:
            parts = last.split('-')
            last_num = int(parts[-1])
            new_num = last_num + 1
        except (ValueError, IndexError):
            new_num = 1
    else:
        new_num = 1
    return f'{prefix}{new_num:05d}'


class Certificate(models.Model):
    certificate_no = models.CharField(
        max_length=50, unique=True, editable=False,
        verbose_name='সার্টিফিকেট নং',
    )
    trainee = models.ForeignKey(
        Trainee, on_delete=models.CASCADE,
        related_name='certificates', verbose_name='প্রশিক্ষণার্থী',
    )
    batch = models.ForeignKey(
        Batch, on_delete=models.CASCADE,
        related_name='certificates', verbose_name='ব্যাচ',
    )
    qr_code_url = models.TextField(
        blank=True, verbose_name='QR কোড URL',
        help_text='QR কোড ইমেজের URL',
    )
    qr_code_image = models.FileField(
        upload_to='certificates/qrcodes/', blank=True,
        verbose_name='QR কোড (ছবি)',
    )
    issue_date = models.DateField(
        auto_now_add=True, verbose_name='ইস্যুর তারিখ',
    )
    pdf_file = models.FileField(
        upload_to='certificates/pdfs/', blank=True,
        verbose_name='PDF ফাইল',
    )
    verification_url = models.SlugField(
        max_length=100, unique=True, blank=True,
        verbose_name='যাচাইকরণ URL',
    )
    is_verified = models.BooleanField(
        default=False, verbose_name='যাচাইকৃত',
    )
    verified_count = models.PositiveIntegerField(
        default=0, verbose_name='যাচাইকরণ সংখ্যা',
    )
    last_verified_at = models.DateTimeField(
        null=True, blank=True, verbose_name='সর্বশেষ যাচাইকরণ',
    )
    verified_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='verified_certificates', verbose_name='যাচাইকারী',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'সার্টিফিকেট'
        verbose_name_plural = 'সার্টিফিকেটসমূহ'
        ordering = ('-issue_date',)
        indexes = [
            models.Index(fields=['trainee', 'batch']),
            models.Index(fields=['verification_url']),
        ]

    def save(self, *args, **kwargs):
        if not self.certificate_no:
            self.certificate_no = generate_certificate_no()
        if not self.verification_url:
            self.verification_url = slugify(self.certificate_no)
        super().save(*args, **kwargs)

    def generate_qr_code(self):
        import qrcode
        from io import BytesIO
        from django.core.files.base import ContentFile
        from django.conf import settings

        verification_link = f'{settings.SITE_URL}/verify/certificate/{self.certificate_no}'
        self.qr_code_url = verification_link

        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(verification_link)
        qr.make(fit=True)
        img = qr.make_image(fill_color='black', back_color='white')
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        filename = f'cert_{self.certificate_no}.png'
        self.qr_code_image.save(filename, ContentFile(buffer.getvalue()), save=False)

    def generate_pdf(self):
        from django.template.loader import render_to_string
        from weasyprint import HTML
        from io import BytesIO
        from django.core.files.base import ContentFile
        html_string = render_to_string('certificates/certificate_template.html', {
            'certificate': self,
            'trainee': self.trainee,
            'batch': self.batch,
        })
        pdf_file = BytesIO()
        HTML(string=html_string).write_pdf(pdf_file)
        filename = f'cert_{self.certificate_no}.pdf'
        self.pdf_file.save(filename, ContentFile(pdf_file.getvalue()), save=False)

    def __str__(self):
        return f'{self.certificate_no} - {self.trainee.registration_no}'


class CertificateBatchZip(models.Model):
    batch = models.ForeignKey(
        Batch, on_delete=models.CASCADE, null=True, blank=True,
        related_name='certificate_zips', verbose_name='ব্যাচ',
    )
    zip_file = models.FileField(
        upload_to='certificates/zips/', blank=True,
        verbose_name='ZIP ফাইল',
    )
    total_certificates = models.PositiveIntegerField(default=0, verbose_name='মোট সার্টিফিকেট')
    success_count = models.PositiveIntegerField(default=0, verbose_name='সফল')
    fail_count = models.PositiveIntegerField(default=0, verbose_name='ব্যর্থ')
    task_id = models.CharField(
        max_length=255, blank=True, verbose_name='টাস্ক আইডি',
    )
    is_ready = models.BooleanField(default=False, verbose_name='প্রস্তুত')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'সার্টিফিকেট ZIP'
        verbose_name_plural = 'সার্টিফিকেট ZIP'
        ordering = ('-created_at',)

    def __str__(self):
        return f'ZIP - Batch {self.batch_id} ({self.created_at})'
