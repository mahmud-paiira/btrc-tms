from rest_framework import serializers
from .models import Assessor, AssessorMapping, TrainerAssessorLink


class AssessorMappingSerializer(serializers.ModelSerializer):
    assessor_no = serializers.CharField(source='assessor.assessor_no', read_only=True)
    center_code = serializers.CharField(source='center.code', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    approved_by_name = serializers.CharField(
        source='approved_by.full_name_bn', read_only=True, default=None,
    )

    class Meta:
        model = AssessorMapping
        fields = '__all__'
        read_only_fields = ('approved_at', 'created_at')


class AssessorListSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    approval_display = serializers.CharField(source='get_approval_status_display', read_only=True)

    class Meta:
        model = Assessor
        fields = (
            'id', 'assessor_no', 'user_email', 'user_phone',
            'nid', 'expertise_area', 'years_of_experience',
            'status', 'status_display', 'approval_status', 'approval_display',
            'created_at',
        )


class AssessorDetailSerializer(serializers.ModelSerializer):
    mappings = AssessorMappingSerializer(many=True, read_only=True)
    approved_by_name = serializers.CharField(
        source='approved_by.full_name_bn', read_only=True, default=None,
    )

    class Meta:
        model = Assessor
        fields = '__all__'


class AssessorWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assessor
        fields = '__all__'
        read_only_fields = ('approval_status', 'approved_by', 'approved_at', 'created_at', 'updated_at')

    def validate_nid(self, value):
        if len(value) not in (10, 17):
            raise serializers.ValidationError('এনআইডি ১০ বা ১৭ ডিজিটের হতে হবে')
        return value


class AssessorApprovalSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'], label='অ্যাকশন')
    remarks = serializers.CharField(required=False, allow_blank=True, label='মন্তব্য')


class AssessorTrackSerializer(serializers.Serializer):
    query = serializers.CharField(label='সার্চ টার্ম')
    search_by = serializers.ChoiceField(
        choices=['assessor_no', 'nid', 'mobile', 'birth_certificate_no'],
        default='assessor_no',
        label='অনুসন্ধানের ধরণ',
    )


class TrainerAssessorLinkSerializer(serializers.ModelSerializer):
    trainer_no = serializers.CharField(source='trainer.trainer_no', read_only=True)
    assessor_no = serializers.CharField(source='assessor.assessor_no', read_only=True)
    converted_by_name = serializers.CharField(
        source='converted_by.full_name_bn', read_only=True, default=None,
    )

    class Meta:
        model = TrainerAssessorLink
        fields = '__all__'
        read_only_fields = ('converted_at',)
