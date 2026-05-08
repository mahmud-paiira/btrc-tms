from django.contrib import admin
from .models import Trainer, TrainerMapping


class TrainerMappingInline(admin.TabularInline):
    model = TrainerMapping
    extra = 1
    verbose_name_plural = 'প্রশিক্ষক ম্যাপিং'


@admin.register(Trainer)
class TrainerAdmin(admin.ModelAdmin):
    inlines = (TrainerMappingInline,)

    list_display = (
        'trainer_no', 'user', 'nid', 'expertise_area',
        'years_of_experience', 'status', 'approval_status', 'created_at',
    )
    list_filter = ('status', 'approval_status', 'expertise_area')
    search_fields = (
        'trainer_no', 'nid', 'birth_certificate_no',
        'user__email', 'user__phone', 'user__full_name_bn',
    )
    readonly_fields = ('approval_status', 'approved_by', 'approved_at', 'created_at', 'updated_at')

    fieldsets = (
        (None, {
            'fields': ('user', 'trainer_no'),
        }),
        ('ব্যক্তিগত তথ্য', {
            'fields': (
                'nid', 'birth_certificate_no', 'date_of_birth',
                'father_name_bn', 'mother_name_bn',
            ),
        }),
        ('পেশাগত তথ্য', {
            'fields': (
                'education_qualification', 'years_of_experience', 'expertise_area',
            ),
        }),
        ('ব্যাংক তথ্য', {
            'fields': ('bank_account_no', 'bank_name'),
        }),
        ('অবস্থা', {
            'fields': ('status', 'approval_status', 'approved_by', 'approved_at'),
        }),
    )


@admin.register(TrainerMapping)
class TrainerMappingAdmin(admin.ModelAdmin):
    list_display = ('trainer', 'center', 'course', 'is_primary', 'status')
    list_filter = ('status', 'is_primary', 'center')
    search_fields = ('trainer__trainer_no', 'center__code', 'course__code')
