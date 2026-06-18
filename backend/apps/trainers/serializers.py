from rest_framework import serializers
from .models import Trainer, TrainerMapping


class NestedUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    full_name_bn = serializers.CharField()
    full_name_en = serializers.CharField()
    phone = serializers.CharField()
    profile_image = serializers.ImageField(read_only=True)


class TrainerMappingSerializer(serializers.ModelSerializer):
    trainer_no = serializers.CharField(source='trainer.trainer_no', read_only=True)
    center_code = serializers.CharField(source='center.code', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    approved_by_name = serializers.CharField(
        source='approved_by.full_name_bn', read_only=True, default=None,
    )

    class Meta:
        model = TrainerMapping
        fields = '__all__'
        read_only_fields = ('approved_at', 'created_at')


class TrainerListSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    user_full_name_bn = serializers.CharField(source='user.full_name_bn', read_only=True)
    user_full_name_en = serializers.CharField(source='user.full_name_en', read_only=True)
    profile_image = serializers.ImageField(source='user.profile_image', read_only=True)
    education_name = serializers.CharField(source='education.name_bn', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    approval_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    center_names = serializers.SerializerMethodField()

    class Meta:
        model = Trainer
        fields = (
            'id', 'trainer_no',
            'user_full_name_bn', 'user_full_name_en',
            'user_email', 'user_phone',
            'profile_image',
            'education_name', 'education_qualification', 'years_of_experience',
            'status', 'status_display', 'approval_status', 'approval_display',
            'center_names',
            'created_at',
        )

    def get_center_names(self, obj):
        mappings = getattr(obj, 'mappings', None)
        if mappings is None:
            return None
        names = list(dict.fromkeys(m.center.name_bn for m in mappings.all() if m.center))
        return ', '.join(names) if names else None


class TrainerDetailSerializer(serializers.ModelSerializer):
    user = NestedUserSerializer(read_only=True)
    mappings = TrainerMappingSerializer(many=True, read_only=True)
    approved_by_name = serializers.CharField(
        source='approved_by.full_name_bn', read_only=True, default=None,
    )
    education_name = serializers.CharField(source='education.name_bn', read_only=True)

    class Meta:
        model = Trainer
        fields = '__all__'


class TrainerWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trainer
        fields = '__all__'
        read_only_fields = ('user', 'approval_status', 'approved_by', 'approved_at', 'created_at', 'updated_at', 'trainer_no')

    def validate_nid(self, value):
        if len(value) not in (10, 17):
            raise serializers.ValidationError('এনআইডি ১০ বা ১৭ ডিজিটের হতে হবে। আপনি {len(value)} ডিজিট দিয়েছেন।')
        return value


class TrainerApprovalSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'], label='অ্যাকশন')
    remarks = serializers.CharField(required=False, allow_blank=True, label='মন্তব্য')


class TrainerTrackSerializer(serializers.Serializer):
    query = serializers.CharField(label='সার্চ টার্ম')
    search_by = serializers.ChoiceField(
        choices=['trainer_no', 'nid', 'mobile', 'birth_certificate_no'],
        default='trainer_no',
        label='অনুসন্ধানের ধরণ',
    )
