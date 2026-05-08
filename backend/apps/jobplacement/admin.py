from django.contrib import admin
from .models import JobPlacement, JobTracking


class JobTrackingInline(admin.TabularInline):
    model = JobTracking
    extra = 0
    readonly_fields = ('tracked_at',)
    raw_id_fields = ('tracked_by',)


@admin.register(JobPlacement)
class JobPlacementAdmin(admin.ModelAdmin):
    list_display = (
        'trainee', 'batch', 'employment_type', 'employer_name',
        'designation_bn', 'salary', 'is_current', 'start_date',
    )
    list_filter = ('employment_type', 'is_current', 'batch')
    search_fields = (
        'trainee__registration_no', 'trainee__user__full_name_bn',
        'employer_name', 'designation_bn',
    )
    raw_id_fields = ('trainee', 'batch', 'created_by')
    date_hierarchy = 'start_date'
    inlines = [JobTrackingInline]


@admin.register(JobTracking)
class JobTrackingAdmin(admin.ModelAdmin):
    list_display = (
        'job_placement', 'tracking_month', 'tracking_date',
        'is_still_employed', 'salary_changed', 'promoted',
    )
    list_filter = ('tracking_month', 'is_still_employed')
    raw_id_fields = ('job_placement', 'tracked_by')
