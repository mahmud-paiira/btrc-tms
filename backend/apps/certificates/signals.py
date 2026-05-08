from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='certificates.Certificate')
def certificate_post_save(sender, instance, created, **kwargs):
    if created:
        instance.generate_qr_code()
        instance.generate_pdf()
        instance.save(update_fields=['qr_code_url', 'qr_code_image', 'pdf_file'])
