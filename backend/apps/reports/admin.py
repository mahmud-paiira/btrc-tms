from django.contrib import admin
from .models import Report, ScheduledReport


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'report_type', 'generated_by',
        'is_ready', 'task_id', 'generated_at', 'created_at',
    )
    list_filter = ('report_type', 'is_ready')
    search_fields = ('title',)
    readonly_fields = ('task_id', 'error_message', 'generated_at', 'created_at')


@admin.register(ScheduledReport)
class ScheduledReportAdmin(admin.ModelAdmin):
    list_display = ('title', 'report_type', 'frequency', 'is_active', 'last_run_at')
    list_filter = ('frequency', 'is_active', 'report_type')
    search_fields = ('title',)