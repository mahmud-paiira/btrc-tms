from rest_framework import serializers
from .models import JobPlacement, JobTracking


class JobPlacementSerializer(serializers.ModelSerializer):
    trainee_name = serializers.CharField(
        source='trainee.user.full_name_bn', read_only=True,
    )
    trainee_reg_no = serializers.CharField(
        source='trainee.registration_no', read_only=True,
    )
    batch_name = serializers.CharField(
        source='batch.batch_name_bn', read_only=True, default=None,
    )
    employment_type_display = serializers.CharField(
        source='get_employment_type_display', read_only=True,
    )
    created_by_name = serializers.CharField(
        source='created_by.full_name_bn', read_only=True, default=None,
    )

    class Meta:
        model = JobPlacement
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at')


class ReleaseJobSerializer(serializers.Serializer):
    release_date = serializers.DateField(label='অবমুক্তির তারিখ')

    def validate_release_date(self, value):
        if value and self.instance and value < self.instance.start_date:
            raise serializers.ValidationError(
                'অবমুক্তির তারিখ শুরুর তারিখের পরে হতে হবে।',
            )
        return value


class JobTrackingSerializer(serializers.ModelSerializer):
    job_placement_id = serializers.IntegerField(label='চাকরি স্থাপন আইডি')
    tracked_by_name = serializers.CharField(
        source='tracked_by.full_name_bn', read_only=True, default=None,
    )
    tracking_month_display = serializers.CharField(
        source='get_tracking_month_display', read_only=True,
    )

    class Meta:
        model = JobTracking
        fields = (
            'id', 'job_placement', 'job_placement_id', 'tracking_month',
            'tracking_date', 'is_still_employed', 'salary_changed',
            'new_salary', 'promoted', 'new_designation', 'comments',
            'tracked_by', 'tracked_by_name', 'tracked_at',
            'tracking_month_display',
        )
        read_only_fields = ('job_placement', 'tracked_by', 'tracked_at')

    def validate(self, data):
        placement_id = data.get('job_placement_id')
        tracking_month = data.get('tracking_month')
        if placement_id and tracking_month:
            if JobTracking.objects.filter(
                job_placement_id=placement_id,
                tracking_month=tracking_month,
            ).exists():
                raise serializers.ValidationError(
                    f'{tracking_month} মাসের ট্র্যাকিং ইতিমধ্যে করা হয়েছে।',
                )
        return data

    def create(self, validated_data):
        placement_id = validated_data.pop('job_placement_id')
        validated_data['job_placement_id'] = placement_id
        validated_data['tracked_by'] = self.context['request'].user
        return super().create(validated_data)


class BatchSummarySerializer(serializers.Serializer):
    batch_id = serializers.IntegerField()
    batch_name = serializers.CharField()
    total_trainees = serializers.IntegerField()
    placed_count = serializers.IntegerField()
    placement_rate = serializers.FloatField()
    by_type = serializers.DictField(child=serializers.IntegerField())
    currently_employed = serializers.IntegerField()
    avg_salary = serializers.FloatField()
