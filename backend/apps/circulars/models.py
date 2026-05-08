from django.db import models
from ckeditor.fields import RichTextField
from apps.accounts.models import User
from apps.centers.models import Center
from apps.courses.models import Course


class Circular(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'খসড়া'
        PUBLISHED = 'published', 'প্রকাশিত'
        CLOSED = 'closed', 'বন্ধ'
        COMPLETED = 'completed', 'সমাপ্ত'

    center = models.ForeignKey(
        Center, on_delete=models.CASCADE,
        related_name='circulars', verbose_name='প্রশিক্ষণ কেন্দ্র',
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE,
        related_name='circulars', verbose_name='কোর্স',
    )
    title_bn = models.CharField(max_length=255, verbose_name='শিরোনাম (বাংলায়)')
    title_en = models.CharField(max_length=255, verbose_name='শিরোনাম (ইংরেজিতে)')
    description = RichTextField(verbose_name='বিস্তারিত')
    application_start_date = models.DateField(verbose_name='আবেদন শুরুর তারিখ')
    application_end_date = models.DateField(verbose_name='আবেদনের শেষ তারিখ')
    training_start_date = models.DateField(verbose_name='প্রশিক্ষণ শুরুর তারিখ')
    training_end_date = models.DateField(verbose_name='প্রশিক্ষণ শেষের তারিখ')
    total_seats = models.PositiveIntegerField(verbose_name='মোট আসন')
    remaining_seats = models.PositiveIntegerField(verbose_name='অবশিষ্ট আসন')
    fee = models.DecimalField(
        max_digits=10, decimal_places=2,
        blank=True, null=True,
        verbose_name='কোর্স ফি (ঐচ্ছিক)',
        help_text='খালি রাখলে কোর্সের ডিফল্ট ফি নেওয়া হবে',
    )
    status = models.CharField(
        max_length=15, choices=Status.choices,
        default=Status.DRAFT, verbose_name='অবস্থা',
    )
    public_url = models.SlugField(
        max_length=100, unique=True, blank=True, null=True,
        verbose_name='পাবলিক ইউআরএল',
        help_text='সাধারণ ব্যবহারকারীদের জন্য ইউনিক লিংক',
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='created_circulars', verbose_name='তৈরি করেছেন',
    )
    published_at = models.DateTimeField(null=True, blank=True, verbose_name='প্রকাশের তারিখ')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'সার্কুলার'
        verbose_name_plural = 'সার্কুলারসমূহ'
        ordering = ('-created_at',)
        indexes = [
            models.Index(fields=['status', 'public_url']),
            models.Index(fields=['center', 'status']),
        ]

    def __str__(self):
        return f'{self.title_bn} - {self.center.code}'

    def save(self, *args, **kwargs):
        if not self.remaining_seats:
            self.remaining_seats = self.total_seats
        super().save(*args, **kwargs)
