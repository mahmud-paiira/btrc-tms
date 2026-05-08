from django.contrib import admin
from .models import Assessor, AssessorMapping, TrainerAssessorLink


class AssessorMappingInline(admin.TabularInline):
    model = AssessorMapping
    extra = 1
    verbose_name_plural = 'মূল্যায়নকারী ম্যাপিং'


@admin.register(Assessor)
class AssessorAdmin(admin.ModelAdmin):
    inlines = (AssessorMappingInline,)

    list_display = (
        'assessor_no', 'user', 'nid', 'expertise_area',
        'years_of_experience', 'status', 'approval_status', 'created_at',
    )
    list_filter = ('status', 'approval_status', 'expertise_area')
    search_fields = (
        'assessor_no', 'nid', 'birth_certificate_no',
        'user__email', 'user__phone', 'user__full_name_bn',
    )
    readonly_fields = ('approval_status', 'approved_by', 'approved_at', 'created_at', 'updated_at')

    fieldsets = (
        (None, {
            'fields': ('user', 'assessor_no'),
        }),
        ('ব্যক্তিগত তথ্য', {
            'fields': (
                'nid', 'birth_certificate_no', 'date_of_birth',
                'father_name_bn', 'mother_name_bn',
            ),
        }),
        ('পেশাগত তথ্য', {
            'fields': (
                'education_qualification', 'years_of_experience',
                'expertise_area', 'certification',
            ),
        }),
        ('ব্যাংক তথ্য', {
            'fields': ('bank_account_no', 'bank_name'),
        }),
        ('অবস্থা', {
            'fields': ('status', 'approval_status', 'approved_by', 'approved_at'),
        }),
    )


@admin.register(AssessorMapping)
class AssessorMappingAdmin(admin.ModelAdmin):
    list_display = ('assessor', 'center', 'course', 'is_primary', 'status')
    list_filter = ('status', 'is_primary', 'center')
    search_fields = ('assessor__assessor_no', 'center__code', 'course__code')


@admin.register(TrainerAssessorLink)
class TrainerAssessorLinkAdmin(admin.ModelAdmin):
    list_display = ('trainer', 'assessor', 'converted_at', 'converted_by')
    search_fields = ('trainer__trainer_no', 'assessor__assessor_no')
