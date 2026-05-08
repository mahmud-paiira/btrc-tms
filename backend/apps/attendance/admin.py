from django.contrib import admin
from .models import Attendance, AttendanceSummary


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = (
        'trainee', 'batch', 'session_date', 'session_no',
        'status', 'lead_trainer', 'marked_by', 'marked_at',
    )
    list_filter = ('status', 'session_date', 'batch')
    search_fields = (
        'trainee__registration_no', 'trainee__user__full_name_bn',
    )
    raw_id_fields = ('trainee', 'lead_trainer', 'associate_trainer')
    date_hierarchy = 'session_date'


@admin.register(AttendanceSummary)
class AttendanceSummaryAdmin(admin.ModelAdmin):
    list_display = (
        'trainee', 'batch', 'total_sessions',
        'attended_sessions', 'attendance_percentage',
    )
    list_filter = ('batch',)
    search_fields = ('trainee__registration_no', 'trainee__user__full_name_bn')
    raw_id_fields = ('trainee',)