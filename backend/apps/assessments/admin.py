from django.contrib import admin
from .models import Assessment, Reassessment


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = (
        'trainee', 'batch', 'assessment_type', 'competency_status',
        'marks_obtained', 'total_marks', 'percentage', 'assessed_at',
    )
    list_filter = ('assessment_type', 'competency_status', 'batch', 'assessment_date')
    search_fields = (
        'trainee__registration_no', 'trainee__user__full_name_bn',
    )
    readonly_fields = ('percentage', 'assessed_at')
    raw_id_fields = ('trainee', 'assessor', 'assessed_by')
    date_hierarchy = 'assessment_date'


@admin.register(Reassessment)
class ReassessmentAdmin(admin.ModelAdmin):
    list_display = ('original_assessment', 'new_assessment', 'reason', 'requested_by', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('original_assessment__trainee__registration_no',)
    raw_id_fields = ('original_assessment', 'new_assessment', 'requested_by', 'approved_by')
