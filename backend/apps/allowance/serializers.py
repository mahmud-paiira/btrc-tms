from rest_framework import serializers
from .models import AllowanceCategory, AllowanceTier, TraineeAllowance


class AllowanceTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = AllowanceTier
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class AllowanceCategorySerializer(serializers.ModelSerializer):
    tiers = AllowanceTierSerializer(many=True, read_only=True)

    class Meta:
        model = AllowanceCategory
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at')


class TraineeAllowanceListSerializer(serializers.ModelSerializer):
    trainee_name = serializers.CharField(source='trainee.full_name_bn', read_only=True)
    registration_no = serializers.CharField(source='trainee.registration_no', read_only=True)
    category_name = serializers.CharField(source='category.name_bn', read_only=True)

    class Meta:
        model = TraineeAllowance
        fields = (
            'id', 'trainee', 'trainee_name', 'registration_no',
            'batch', 'category', 'category_name',
            'total_sessions', 'attended_sessions',
            'calculated_amount', 'approved_amount', 'status',
            'approved_by', 'approved_at',
            'disbursed_by', 'disbursed_at',
            'payment_method', 'transaction_id', 'disbursement_notes',
        )
        read_only_fields = (
            'calculated_amount', 'status',
            'approved_by', 'approved_at', 'disbursed_by', 'disbursed_at',
        )


class TraineeAllowanceWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TraineeAllowance
        fields = ('trainee', 'batch', 'category', 'total_sessions', 'attended_sessions')
