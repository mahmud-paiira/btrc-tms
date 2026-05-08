from rest_framework import serializers
from .models import Budget, Voucher, VoucherItem, MakerCheckerApprover


class VoucherItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoucherItem
        fields = ('id', 'account_head', 'debit_amount', 'credit_amount', 'description')


class BudgetListSerializer(serializers.ModelSerializer):
    center_code = serializers.CharField(source='center.code', read_only=True)
    center_name = serializers.CharField(source='center.name_bn', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True, default=None)
    course_name = serializers.CharField(source='course.name_bn', read_only=True, default=None)
    utilization_pct = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = (
            'id', 'center', 'center_code', 'center_name',
            'course', 'course_code', 'course_name',
            'fiscal_year', 'allocated_amount', 'expended_amount',
            'utilization_pct', 'created_at',
        )

    def get_utilization_pct(self, obj):
        if obj.allocated_amount:
            return round(obj.expended_amount / obj.allocated_amount * 100, 1)
        return 0


class BudgetDetailSerializer(serializers.ModelSerializer):
    center_code = serializers.CharField(source='center.code', read_only=True)
    center_name = serializers.CharField(source='center.name_bn', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True, default=None)
    course_name = serializers.CharField(source='course.name_bn', read_only=True, default=None)
    created_by_name = serializers.CharField(
        source='created_by.full_name_bn', read_only=True, default=None,
    )

    class Meta:
        model = Budget
        fields = '__all__'


class BudgetWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Budget
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'expended_amount')


class VoucherItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoucherItem
        fields = ('account_head', 'debit_amount', 'credit_amount', 'description')


class VoucherListSerializer(serializers.ModelSerializer):
    center_code = serializers.CharField(source='center.code', read_only=True, default=None)
    center_name = serializers.CharField(source='center.name_bn', read_only=True, default=None)
    voucher_type_display = serializers.CharField(source='get_voucher_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    item_count = serializers.SerializerMethodField()
    workflow_status = serializers.SerializerMethodField()

    class Meta:
        model = Voucher
        fields = (
            'id', 'voucher_no', 'voucher_type', 'voucher_type_display',
            'amount', 'status', 'status_display', 'voucher_date',
            'center', 'center_code', 'center_name',
            'description', 'item_count', 'workflow_status', 'created_at',
        )

    def get_item_count(self, obj):
        return obj.items.count()

    def get_workflow_status(self, obj):
        try:
            wf = obj.workflow
            stages = []
            if wf.maker: stages.append('maker')
            if wf.checker: stages.append('checker')
            if wf.approver: stages.append('approver')
            return stages
        except MakerCheckerApprover.DoesNotExist:
            return []


class VoucherDetailSerializer(serializers.ModelSerializer):
    center_code = serializers.CharField(source='center.code', read_only=True, default=None)
    center_name = serializers.CharField(source='center.name_bn', read_only=True, default=None)
    voucher_type_display = serializers.CharField(source='get_voucher_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.full_name_bn', read_only=True, default=None,
    )
    items = VoucherItemSerializer(many=True, read_only=True)
    workflow = serializers.SerializerMethodField()

    class Meta:
        model = Voucher
        fields = '__all__'

    def get_workflow(self, obj):
        try:
            wf = obj.workflow
            return {
                'maker': wf.maker.full_name_bn if wf.maker else None,
                'maker_date': wf.maker_date,
                'checker': wf.checker.full_name_bn if wf.checker else None,
                'checker_date': wf.checker_date,
                'approver': wf.approver.full_name_bn if wf.approver else None,
                'approver_date': wf.approver_date,
            }
        except MakerCheckerApprover.DoesNotExist:
            return None


class VoucherWriteSerializer(serializers.ModelSerializer):
    items = VoucherItemWriteSerializer(many=True)

    class Meta:
        model = Voucher
        fields = (
            'voucher_type', 'amount', 'description', 'center',
            'voucher_date', 'items',
        )

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError('কমপক্ষে একটি আইটেম প্রয়োজন')
        total_debit = sum(d.get('debit_amount', 0) or 0 for d in items)
        total_credit = sum(d.get('credit_amount', 0) or 0 for d in items)
        if abs(total_debit - total_credit) > 0.01:
            raise serializers.ValidationError('ডেবিট ও ক্রেডিট এর সমষ্টি সমান হতে হবে')
        return items

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        last_today = Voucher.objects.filter(
            created_at__date=self.context['request'].created_at.date(),
        ).count() if hasattr(self.context['request'], 'created_at') else 0
        from datetime import date
        today = date.today()
        voucher_no = f'V-{today.strftime("%Y%m%d")}-{last_today + 1:04d}'
        validated_data['voucher_no'] = voucher_no
        voucher = Voucher.objects.create(**validated_data)
        for item_data in items_data:
            VoucherItem.objects.create(voucher=voucher, **item_data)
        return voucher

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                VoucherItem.objects.create(voucher=instance, **item_data)
        return instance


class UtilizationReportSerializer(serializers.Serializer):
    center_code = serializers.CharField()
    center_name = serializers.CharField()
    allocated_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    expended_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    utilization_pct = serializers.FloatField()


class SoEResponseSerializer(serializers.Serializer):
    voucher_date = serializers.DateField()
    voucher_no = serializers.CharField()
    description = serializers.CharField()
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    approved_by = serializers.CharField(default=None)
    center_name = serializers.CharField(default=None)


class TrialBalanceItemSerializer(serializers.Serializer):
    account_head = serializers.CharField()
    total_debit = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_credit = serializers.DecimalField(max_digits=15, decimal_places=2)
    balance = serializers.DecimalField(max_digits=15, decimal_places=2)


class LedgerEntrySerializer(serializers.Serializer):
    voucher_no = serializers.CharField()
    voucher_date = serializers.DateField()
    description = serializers.CharField()
    debit_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    credit_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    running_balance = serializers.DecimalField(max_digits=15, decimal_places=2)
