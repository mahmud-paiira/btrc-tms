from django.contrib import admin
from .models import Circular


@admin.register(Circular)
class CircularAdmin(admin.ModelAdmin):
    list_display = (
        'title_bn', 'public_url', 'center', 'course',
        'total_seats', 'remaining_seats', 'status', 'published_at',
    )
    list_filter = ('status', 'center', 'course')
    search_fields = ('title_bn', 'title_en', 'public_url')
    readonly_fields = ('public_url', 'remaining_seats', 'published_at', 'created_at', 'updated_at')

    fieldsets = (
        (None, {
            'fields': ('center', 'course', 'title_bn', 'title_en'),
        }),
        ('তারিখ', {
            'fields': (
                'application_start_date', 'application_end_date',
                'training_start_date', 'training_end_date',
            ),
        }),
        ('আসন ও ফি', {
            'fields': ('total_seats', 'remaining_seats', 'fee'),
        }),
        ('অবস্থা', {
            'fields': ('status', 'public_url', 'published_at', 'created_by'),
        }),
        ('বিস্তারিত', {
            'fields': ('description',),
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
