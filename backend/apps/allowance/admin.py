from django.contrib import admin
from .models import AllowanceCategory, TraineeAllowance


@admin.register(AllowanceCategory)
class AllowanceCategoryAdmin(admin.ModelAdmin):
    list_display = ('name_bn', 'name_en', 'amount_per_session', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name_bn', 'name_en')


@admin.register(TraineeAllowance)
class TraineeAllowanceAdmin(admin.ModelAdmin):
    list_display = ('trainee', 'batch', 'category', 'attended_sessions', 'calculated_amount', 'status')
    list_filter = ('status', 'category')
    search_fields = ('trainee__registration_no',)
