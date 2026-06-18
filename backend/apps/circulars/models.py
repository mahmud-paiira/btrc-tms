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

    course = models.ForeignKey(
        Course, on_delete=models.CASCADE,
        related_name='circulars', verbose_name='কোর্স',
    )
    eligible_centers = models.ManyToManyField(
        Center, related_name='circulars',
        verbose_name='উপযুক্ত কেন্দ্রসমূহ',
        help_text='যে সমস্ত কেন্দ্রের জন্য এই সার্কুলার প্রযোজ্য',
        blank=True,
    )
    all_centers = models.BooleanField(
        default=False, verbose_name='সব কেন্দ্র',
        help_text='সকল কেন্দ্রের জন্য প্রযোজ্য (চিহ্নিত করলে উপযুক্ত কেন্দ্র নির্বাচনের প্রয়োজন নেই)',
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
    auto_screen_total_score = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        verbose_name='অটো-স্ক্রিন মোট স্কোর',
        help_text='চেকলিস্টের সর্বোচ্চ সম্ভাব্য স্কোর',
    )
    auto_screen_min_score = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        verbose_name='অটো-স্ক্রিন ন্যূনতম স্কোর',
        help_text='অটো-স্ক্রিন পাস করার জন্য প্রয়োজনীয় ন্যূনতম স্কোর',
    )
    default_overflow_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=20.00,
        verbose_name='ডিফল্ট অতিরিক্ত আবেদনের হার (%)',
        help_text='সার্কুলার লেভেলে ডিফল্ট P মান। প্রতি কেন্দ্রের নিজস্ব P না থাকলে এই মান ব্যবহার হবে।',
    )
    routing_weight_seats = models.DecimalField(
        max_digits=3, decimal_places=2, default=0.50,
        verbose_name='রুটিং ওজন (আসন)',
        help_text='w₁ — উপলব্ধ আসনের উপর ভিত্তি করে রুটিং স্কোরের ওজন',
    )
    routing_weight_distance = models.DecimalField(
        max_digits=3, decimal_places=2, default=0.30,
        verbose_name='রুটিং ওজন (দূরত্ব)',
        help_text='w₂ — দূরত্বের উপর ভিত্তি করে রুটিং স্কোরের ওজন',
    )
    routing_weight_merit = models.DecimalField(
        max_digits=3, decimal_places=2, default=0.20,
        verbose_name='রুটিং ওজন (মেধা)',
        help_text='w₃ — কেন্দ্রের গুণগত মানের উপর ভিত্তি করে রুটিং স্কোরের ওজন',
    )
    waitlist_validity_days = models.PositiveIntegerField(
        default=30,
        verbose_name='অপেক্ষমাণ তালিকার বৈধতা (দিন)',
        help_text='ব্যাচ শুরুর পর কত দিন পর্যন্ত অপেক্ষমাণ তালিকা বৈধ থাকবে',
    )
    circular_no = models.CharField(
        max_length=50, blank=True, null=True,
        verbose_name='সার্কুলার নম্বর',
        help_text='যেমন: BRTC/সার্কুলার/২০২৬/০১',
    )
    edition = models.PositiveIntegerField(
        default=1, verbose_name='সংস্করণ',
        help_text='সার্কুলারের সংস্করণ নম্বর',
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
        ]

    def __str__(self):
        if self.all_centers:
            return f'{self.title_bn} - সব কেন্দ্র'
        centers = ', '.join(self.eligible_centers.values_list('code', flat=True)[:3])
        return f'{self.title_bn} - {centers}'

    def save(self, *args, **kwargs):
        if not self.remaining_seats:
            self.remaining_seats = self.total_seats
        super().save(*args, **kwargs)

    def get_eligible_centers_list(self):
        return self.eligible_centers.all()


class CircularCenterAllocation(models.Model):
    circular = models.ForeignKey(
        Circular, on_delete=models.CASCADE,
        related_name='center_allocations', verbose_name='সার্কুলার',
    )
    center = models.ForeignKey(
        Center, on_delete=models.CASCADE,
        related_name='circular_allocations', verbose_name='কেন্দ্র',
    )
    allocated_seats = models.PositiveIntegerField(verbose_name='বরাদ্দকৃত আসন')

    class Meta:
        verbose_name = 'সার্কুলার কেন্দ্র বরাদ্দ'
        verbose_name_plural = 'সার্কুলার কেন্দ্র বরাদ্দ'
        unique_together = ('circular', 'center')

    def __str__(self):
        return f'{self.circular.title_bn} → {self.center.name_bn}: {self.allocated_seats} আসন'


class ChecklistItem(models.Model):
    CRITERIA_TYPES = [
        ('age', 'বয়স'),
        ('education', 'শিক্ষাগত যোগ্যতা'),
        ('experience_years', 'অভিজ্ঞতা (বছর)'),
        ('height_cm', 'উচ্চতা (সেমি)'),
        ('weight_kg', 'ওজন (কেজি)'),
        ('boolean', 'হ্যাঁ/না'),
        ('text_match', 'টেক্সট ম্যাচ'),
        ('number', 'সংখ্যা'),
    ]
    OPERATORS = [
        ('>=', '>= (এর সমান বা বেশি)'),
        ('<=', '<= (এর সমান বা কম)'),
        ('==', '== (সমান)'),
        ('>', '> (এর বেশি)'),
        ('<', '< (এর কম)'),
        ('between', 'এর মধ্যে'),
    ]
    EDUCATION_LEVELS = [
        ('p5', 'পঞ্চম শ্রেণী', 'Class 5'),
        ('p8', 'অষ্টম শ্রেণী', 'Class 8'),
        ('ssc', 'এসএসসি', 'SSC'),
        ('hsc', 'এইচএসসি', 'HSC'),
        ('graduate', 'স্নাতক', 'Graduate'),
        ('post_graduate', 'স্নাতকোত্তর', 'Post Graduate'),
    ]

    circular = models.ForeignKey(
        Circular, on_delete=models.CASCADE,
        related_name='checklist_items', verbose_name='সার্কুলার',
    )
    criteria_type = models.CharField(
        max_length=20, choices=CRITERIA_TYPES,
        verbose_name='নির্ধারক',
    )
    label_bn = models.CharField(max_length=255, verbose_name='লেবেল (বাংলায়)')
    label_en = models.CharField(max_length=255, blank=True, verbose_name='লেবেল (ইংরেজিতে)')
    operator = models.CharField(
        max_length=10, choices=OPERATORS,
        verbose_name='তুলনামূলক অপারেটর',
    )
    expected_value = models.CharField(
        max_length=255, verbose_name='প্রত্যাশিত মান',
        help_text='যেমন: 18 (বয়সের জন্য), ssc (শিক্ষার জন্য), 18,35 (between এর জন্য)',
    )
    score = models.DecimalField(
        max_digits=10, decimal_places=2,
        verbose_name='স্কোর',
        help_text='এই শর্ত পূরণ করলে প্রাপ্ত স্কোর',
    )
    required = models.BooleanField(default=True, verbose_name='বাধ্যতামূলক')
    order = models.IntegerField(default=0, verbose_name='ক্রম')

    class Meta:
        verbose_name = 'চেকলিস্ট আইটেম'
        verbose_name_plural = 'চেকলিস্ট আইটেমসমূহ'
        ordering = ('order',)

    def __str__(self):
        return f'{self.label_bn} ({self.get_criteria_type_display()})'

    @staticmethod
    def education_rank(level_key):
        ranks = {'p5': 1, 'p8': 2, 'ssc': 3, 'hsc': 4, 'graduate': 5, 'post_graduate': 6}
        r = ranks.get(level_key, 0)
        if r:
            return r
        from apps.system_config.models import Education
        try:
            lookup = int(level_key)
            return Education.objects.get(id=lookup).rank
        except (ValueError, Education.DoesNotExist):
            return 0


class Committee(models.Model):
    circular = models.ForeignKey(
        Circular, on_delete=models.CASCADE,
        related_name='committees', verbose_name='সার্কুলার',
    )
    name = models.CharField(max_length=255, verbose_name='কমিটির নাম')
    members = models.ManyToManyField(
        User, related_name='selection_committees',
        verbose_name='কমিটির সদস্য',
    )
    is_active = models.BooleanField(default=True, verbose_name='সক্রিয়')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'নির্বাচন কমিটি'
        verbose_name_plural = 'নির্বাচন কমিটিসমূহ'

    def __str__(self):
        return f'{self.name} ({self.circular.title_bn})'
