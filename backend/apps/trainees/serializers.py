from rest_framework import serializers
from .models import Trainee


class TraineeListSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name_bn', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    batch_name = serializers.CharField(source='batch.batch_name_bn', read_only=True, default=None)
    center_name = serializers.CharField(source='center.name_bn', read_only=True)

    class Meta:
        model = Trainee
        fields = (
            'id', 'registration_no', 'user', 'user_name', 'user_phone', 'user_email',
            'center', 'center_name', 'batch', 'batch_name',
            'status', 'enrollment_date',
        )


class TraineeDetailSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name_bn', read_only=True)
    user_name_en = serializers.CharField(source='user.full_name_en', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_nid = serializers.CharField(source='user.nid', read_only=True)
    batch_name = serializers.CharField(source='batch.batch_name_bn', read_only=True, default=None)
    center_name = serializers.CharField(source='center.name_bn', read_only=True)

    class Meta:
        model = Trainee
        fields = '__all__'


class TraineeWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trainee
        fields = (
            'bank_account_no', 'bank_name', 'bank_branch',
            'nominee_name', 'nominee_relation', 'nominee_phone',
            'batch',
        )
