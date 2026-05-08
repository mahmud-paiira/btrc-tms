from django.contrib import admin
from .models import Budget, Voucher, VoucherItem, MakerCheckerApprover


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ('center', 'fiscal_year', 'course', 'allocated_amount', 'expended_amount', 'utilization_pct')
    list_filter = ('fiscal_year', 'center')
    search_fields = ('center__name_bn', 'fiscal_year')

    def utilization_pct(self, obj):
        if obj.allocated_amount:
            return f'{round(obj.expended_amount / obj.allocated_amount * 100, 1)}%'
        return '0%'
    utilization_pct.short_description = 'ব্যবহার'


@admin.register(Voucher)
class VoucherAdmin(admin.ModelAdmin):
    list_display = ('voucher_no', 'voucher_type', 'amount', 'status', 'created_at')
    list_filter = ('status', 'voucher_type')
    search_fields = ('voucher_no',)


@admin.register(VoucherItem)
class VoucherItemAdmin(admin.ModelAdmin):
    list_display = ('voucher', 'account_head', 'debit_amount', 'credit_amount')


@admin.register(MakerCheckerApprover)
class MakerCheckerApproverAdmin(admin.ModelAdmin):
    list_display = ('voucher', 'maker', 'checker', 'approver')
