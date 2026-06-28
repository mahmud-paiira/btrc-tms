import logging
from datetime import date
from django.db import models
from django.core.validators import RegexValidator, MinLengthValidator
from apps.accounts.models import User
from apps.centers.models import Center
from apps.circulars.models import Circular
from apps.system_config.models import Gender, Education, Demography

logger = logging.getLogger(__name__)


def generate_application_no():
    from django.db.models import Max
    year = date.today().year
    prefix = f'BRTC-{year}-'
    last = Application.objects.filter(
        application_no__startswith=prefix
    ).aggregate(Max('application_no'))['application_no__max']
    if last:
        try:
            last_num = int(last.split('-')[-1])
            new_num = last_num + 1
        except (ValueError, IndexError):
            new_num = 1
    else:
        new_num = 1
    return f'{prefix}{new_num:05d}'


class Application(models.Model):
    class ApplicationStatus(models.TextChoices):
        PENDING = 'pending', 'পেন্ডিং'
        AUTO_REJECTED = 'auto_rejected', 'স্বয়ংক্রিয়ভাবে বাতিল'
        SELECTED = 'selected', 'নির্বাচিত'
        REJECTED = 'rejected', 'বাতিল'
        WAITLISTED = 'waitlisted', 'অপেক্ষমাণ'
        ENROLLED = 'enrolled', 'নথিভুক্ত'

    application_no = models.CharField(
        max_length=20, unique=True, editable=False,
        verbose_name='আবেদন নম্বর',
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='applications',
        null=True, blank=True,
        verbose_name='ব্যবহারকারী',
    )
    circular = models.ForeignKey(
        Circular, on_delete=models.CASCADE,
        related_name='applications', verbose_name='সার্কুলার',
    )
    chosen_center = models.ForeignKey(
        Center, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='applications', verbose_name='নির্বাচিত কেন্দ্র',
    )
    routed_center = models.ForeignKey(
        Center, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='routed_applications',
        verbose_name='রুটিকৃত কেন্দ্র',
        help_text='সিস্টেম কর্তৃক নির্ধারিত কেন্দ্র (chosen_center থেকে ভিন্ন হতে পারে)',
    )
    status = models.CharField(
        max_length=20, choices=ApplicationStatus.choices,
        default=ApplicationStatus.PENDING, verbose_name='অবস্থা',
    )
    waitlist_position = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name='অপেক্ষমাণ অবস্থান',
    )
    merit_score = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        verbose_name='মেধা স্কোর',
        help_text='চেকলিস্ট ভিত্তিক মোট মেধা স্কোর',
    )
    auto_screen_pass = models.BooleanField(
        null=True, blank=True,
        verbose_name='অটো-স্ক্রিন পাস',
        help_text='True = স্বয়ংক্রিয় স্ক্রিনিং পাস করেছে, False = ব্যর্থ, Null = এখনো পরীক্ষা করা হয়নি',
    )
    auto_screen_score = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        verbose_name='অটো-স্ক্রিন স্কোর',
    )

    # Personal info
    name_bn = models.CharField(max_length=255, verbose_name='নাম (বাংলায়)')
    name_en = models.CharField(max_length=255, blank=True, verbose_name='নাম (ইংরেজিতে)')
    father_name_bn = models.CharField(max_length=255, verbose_name='পিতার নাম')
    mother_name_bn = models.CharField(max_length=255, verbose_name='মাতার নাম')
    gender = models.ForeignKey(Gender, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='লিঙ্গ')
    spouse_name_bn = models.CharField(
        max_length=255, blank=True, verbose_name='স্বামী/স্ত্রীর নাম',
    )
    date_of_birth = models.DateField(verbose_name='জন্ম তারিখ')
    nid = models.CharField(
        max_length=20, verbose_name='জাতীয় পরিচয়পত্র নং',
        validators=[MinLengthValidator(10)],
    )

    # Contact
    phone_regex = RegexValidator(
        regex=r'^01\d{9}$',
        message='ফোন নম্বর ১১ ডিজিটের হতে হবে এবং 01 দিয়ে শুরু হতে হবে',
    )
    phone = models.CharField(
        max_length=11, validators=[phone_regex],
        verbose_name='মোবাইল নম্বর',
    )
    alternate_phone = models.CharField(
        max_length=11, blank=True, validators=[phone_regex],
        verbose_name='বিকল্প মোবাইল নম্বর',
    )
    email = models.EmailField(blank=True, verbose_name='ইমেইল')

    # Address
    present_address = models.TextField(verbose_name='বর্তমান ঠিকানা')
    permanent_address = models.TextField(blank=True, verbose_name='স্থায়ী ঠিকানা')
    present_division = models.ForeignKey(Demography, on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name='বর্তমান বিভাগ')
    present_district = models.ForeignKey(Demography, on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name='বর্তমান জেলা')
    permanent_division = models.ForeignKey(Demography, on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name='স্থায়ী বিভাগ')
    permanent_district = models.ForeignKey(Demography, on_delete=models.SET_NULL, null=True, blank=True, related_name='+', verbose_name='স্থায়ী জেলা')

    # Education & Profession
    education_qualification = models.TextField(blank=True, verbose_name='শিক্ষাগত যোগ্যতা')
    education_level = models.ForeignKey(Education, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='শিক্ষাগত যোগ্যতা')
    profession = models.CharField(
        max_length=255, blank=True, verbose_name='পেশা',
    )

    # Documents
    profile_image = models.ImageField(
        upload_to='applications/photos/', blank=True,
        verbose_name='ছবি',
    )
    nid_front_image = models.ImageField(
        upload_to='applications/nid/', blank=True,
        verbose_name='এনআইডি (সামনে)',
    )
    nid_back_image = models.ImageField(
        upload_to='applications/nid/', blank=True,
        verbose_name='এনআইডি (পেছনে)',
    )

    # Review
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reviewed_applications', verbose_name='পর্যালোচক',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='পর্যালোচনার তারিখ')
    remarks = models.TextField(blank=True, verbose_name='মন্তব্য')

    # Committee
    committee = models.ForeignKey(
        'circulars.Committee', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='applications', verbose_name='নির্বাচন কমিটি',
    )
    committee_decision_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='committee_decisions', verbose_name='কমিটির সিদ্ধান্তকারী',
    )
    committee_decision_at = models.DateTimeField(
        null=True, blank=True, verbose_name='কমিটির সিদ্ধান্তের তারিখ',
    )

    # Metadata
    applied_at = models.DateTimeField(auto_now_add=True, verbose_name='আবেদনের তারিখ')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='হালনাগাদের তারিখ')

    class Meta:
        verbose_name = 'আবেদন'
        verbose_name_plural = 'আবেদনসমূহ'
        ordering = ('-applied_at',)
        indexes = [
            models.Index(fields=['circular', 'status']),
            models.Index(fields=['nid']),
            models.Index(fields=['applied_at']),
            models.Index(fields=['auto_screen_pass']),
        ]

    def save(self, *args, **kwargs):
        if not self.application_no:
            self.application_no = generate_application_no()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.application_no} - {self.name_bn}'


class ChecklistResponse(models.Model):
    application = models.ForeignKey(
        Application, on_delete=models.CASCADE,
        related_name='checklist_responses', verbose_name='আবেদন',
    )
    checklist_item = models.ForeignKey(
        'circulars.ChecklistItem', on_delete=models.CASCADE,
        verbose_name='চেকলিস্ট আইটেম',
    )
    value = models.TextField(verbose_name='উত্তর')
    is_pass = models.BooleanField(default=False, verbose_name='পাস')
    score_achieved = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=0, verbose_name='প্রাপ্ত স্কোর',
    )

    class Meta:
        verbose_name = 'চেকলিস্ট উত্তর'
        verbose_name_plural = 'চেকলিস্ট উত্তরসমূহ'
        unique_together = ('application', 'checklist_item')

    def __str__(self):
        return f'{self.application.application_no} - {self.checklist_item.label_bn} : {"পাস" if self.is_pass else "ফেল"}'


class OcrAuditLog(models.Model):
    class Result(models.TextChoices):
        SUCCESS = 'success', 'Success'
        LOW_CONFIDENCE = 'low_confidence', 'Low Confidence'
        FAILED = 'failed', 'Failed'

    session_id = models.CharField(max_length=64, db_index=True, verbose_name='Session ID')
    front_image = models.CharField(max_length=500, blank=True, verbose_name='Front Image Path')
    back_image = models.CharField(max_length=500, blank=True, verbose_name='Back Image Path')
    extracted_nid = models.CharField(max_length=20, blank=True, verbose_name='Extracted NID')
    extracted_name = models.CharField(max_length=255, blank=True, verbose_name='Extracted Name')
    confidence_score = models.FloatField(default=0.0, verbose_name='Confidence Score')
    result = models.CharField(
        max_length=20, choices=Result.choices,
        default=Result.FAILED, verbose_name='Result',
    )
    error_message = models.TextField(blank=True, verbose_name='Error Message')
    raw_text_snippet = models.TextField(blank=True, verbose_name='Raw OCR Snippet')
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'OCR Audit Log'
        verbose_name_plural = 'OCR Audit Logs'
        ordering = ('-created_at',)

    def __str__(self):
        return f'{self.session_id} - {self.result} ({self.confidence_score}%)'


class RoutingLog(models.Model):
    application = models.ForeignKey(
        Application, on_delete=models.CASCADE,
        related_name='routing_logs', verbose_name='আবেদন',
    )
    from_center = models.ForeignKey(
        Center, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='routing_logs_from',
        verbose_name='থেকে কেন্দ্র',
    )
    to_center = models.ForeignKey(
        Center, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='routing_logs_to',
        verbose_name='তে কেন্দ্র',
    )
    load_factor = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        verbose_name='লোড ফ্যাক্টর (%)',
    )
    priority_score = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True,
        verbose_name='প্রাধান্য স্কোর',
    )
    reason = models.TextField(blank=True, verbose_name='কারণ')
    routed_at = models.DateTimeField(auto_now_add=True, verbose_name='রুটিংয়ের তারিখ')

    class Meta:
        verbose_name = 'রুটিং লগ'
        verbose_name_plural = 'রুটিং লগসমূহ'
        ordering = ('-routed_at',)

    def __str__(self):
        return f'{self.application.application_no} → {self.to_center}'


class WaitlistHistory(models.Model):
    application = models.ForeignKey(
        Application, on_delete=models.CASCADE,
        related_name='waitlist_history', verbose_name='আবেদন',
    )
    center = models.ForeignKey(
        Center, on_delete=models.CASCADE,
        related_name='waitlist_history', verbose_name='কেন্দ্র',
    )
    position = models.PositiveIntegerField(verbose_name='অবস্থান')
    is_active = models.BooleanField(default=True, verbose_name='সক্রিয়')
    promoted_at = models.DateTimeField(null=True, blank=True, verbose_name='উন্নীত হওয়ার তারিখ')
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name='মেয়াদ শেষের তারিখ')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'অপেক্ষমাণ ইতিহাস'
        verbose_name_plural = 'অপেক্ষমাণ ইতিহাসসমূহ'
        ordering = ('position',)

    def __str__(self):
        return f'{self.application.application_no} - {self.center.code} (#{self.position})'

