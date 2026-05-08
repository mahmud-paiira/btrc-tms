from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Batch, BatchWeekPlan, BatchEnrollment
from .validators import validate_no_trainer_overlap


class BatchListSerializer(serializers.ModelSerializer):
    circular_title = serializers.CharField(source='circular.title_bn', read_only=True)
    center_name = serializers.CharField(source='center.name_bn', read_only=True)
    course_name = serializers.CharField(source='course.name_bn', read_only=True)
    week_plan_count = serializers.SerializerMethodField()
    enrolled_count = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = (
            'id', 'batch_no', 'custom_batch_no', 'batch_name_bn', 'batch_name_en',
            'circular', 'circular_title', 'center', 'center_name',
            'course', 'course_name',
            'start_date', 'end_date',
            'total_seats', 'filled_seats', 'waitlist_seats',
            'status', 'week_plan_count', 'enrolled_count',
            'created_at', 'updated_at',
        )
        read_only_fields = ('batch_no', 'created_at', 'updated_at')

    def get_week_plan_count(self, obj):
        return obj.week_plans.count()

    def get_enrolled_count(self, obj):
        return obj.enrollments.filter(status=BatchEnrollment.EnrollmentStatus.ACTIVE).count()


class BatchDetailSerializer(serializers.ModelSerializer):
    circular_title = serializers.CharField(source='circular.title_bn', read_only=True)
    circular_training_start = serializers.DateField(source='circular.training_start_date', read_only=True)
    center_name = serializers.CharField(source='center.name_bn', read_only=True)
    center_code = serializers.CharField(source='center.code', read_only=True)
    course_name = serializers.CharField(source='course.name_bn', read_only=True)
    course_duration_hours = serializers.IntegerField(source='course.duration_hours', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = '__all__'
        read_only_fields = ('batch_no', 'created_at', 'updated_at')

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name_bn or obj.created_by.email
        return None


class BatchWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Batch
        fields = (
            'custom_batch_no', 'circular', 'center', 'course',
            'batch_name_bn', 'batch_name_en',
            'start_date', 'end_date',
            'total_seats', 'filled_seats', 'waitlist_seats',
            'status',
        )
        read_only_fields = ('batch_no', 'created_at', 'updated_at')

    def validate(self, attrs):
        if attrs.get('start_date') and attrs.get('circular'):
            circular = attrs['circular']
            if attrs['start_date'] < circular.training_start_date:
                raise serializers.ValidationError({
                    'start_date': f'শুরুর তারিখ ({attrs["start_date"]}) সার্কুলারের প্রশিক্ষণ শুরুর তারিখ '
                                  f'({circular.training_start_date}) এর পূর্বে হতে পারবে না।'
                })
        if attrs.get('start_date') and attrs.get('end_date'):
            if attrs['start_date'] > attrs['end_date']:
                raise serializers.ValidationError({
                    'end_date': 'শেষের তারিখ শুরুর তারিখের পরে হতে হবে।'
                })
        if attrs.get('filled_seeds', 0) > attrs.get('total_seats', 0):
            raise serializers.ValidationError({
                'filled_seats': 'পূরণকৃত আসন মোট আসনের বেশি হতে পারবে না।'
            })
        return attrs


class BatchWeekPlanListSerializer(serializers.ModelSerializer):
    lead_trainer_name = serializers.CharField(source='lead_trainer.user.full_name_bn', read_only=True)
    associate_trainer_name = serializers.SerializerMethodField()
    class_type_display = serializers.CharField(source='get_class_type_display', read_only=True)
    day_of_week_display = serializers.CharField(source='get_day_of_week_display', read_only=True)

    class Meta:
        model = BatchWeekPlan
        fields = (
            'id', 'batch', 'term_no', 'term_day', 'session_no',
            'class_type', 'class_type_display',
            'start_date', 'end_date', 'day_of_week', 'day_of_week_display',
            'start_time', 'end_time', 'duration_hours',
            'training_room_bn', 'training_room_en',
            'lead_trainer', 'lead_trainer_name',
            'associate_trainer', 'associate_trainer_name',
            'topic_bn', 'topic_en',
        )

    def get_associate_trainer_name(self, obj):
        if obj.associate_trainer:
            return obj.associate_trainer.user.full_name_bn
        return None


class BatchWeekPlanWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = BatchWeekPlan
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

    def validate(self, attrs):
        if attrs.get('start_date') and attrs.get('end_date'):
            if attrs['start_date'] > attrs['end_date']:
                raise serializers.ValidationError({
                    'end_date': 'শেষের তারিখ শুরুর তারিখের পরে হতে হবে।'
                })

        if attrs.get('start_time') and attrs.get('end_time'):
            if attrs['start_time'] >= attrs['end_time']:
                raise serializers.ValidationError({
                    'end_time': 'শেষের সময় শুরুর সময়ের পরে হতে হবে।'
                })

        if attrs.get('duration_hours') and attrs.get('start_time') and attrs.get('end_time'):
            from datetime import timedelta
            s = attrs['start_time']
            e = attrs['end_time']
            diff = timedelta(hours=e.hour - s.hour, minutes=e.minute - s.minute)
            diff_hours = diff.total_seconds() / 3600
            if diff_hours < 0:
                diff_hours += 24
            if abs(float(attrs['duration_hours']) - diff_hours) > 0.25:
                raise serializers.ValidationError({
                    'duration_hours': (
                        f'সময়কাল ({attrs["duration_hours"]} ঘন্টা) শুরুর ও শেষের সময়ের '
                        f'ব্যবধানের ({diff_hours:.2f} ঘন্টা) সাথে মিলছে না।'
                    )
                })

        lead = attrs.get('lead_trainer')
        dow = attrs.get('day_of_week')
        st = attrs.get('start_time')
        et = attrs.get('end_time')
        exclude = self.instance.pk if self.instance else None

        if lead and dow and st and et:
            try:
                validate_no_trainer_overlap(lead.id, dow, st, et, exclude_id=exclude)
            except DjangoValidationError as e:
                raise serializers.ValidationError({'lead_trainer': e.message})

        return attrs


class BatchWeekPlanBulkSerializer(serializers.Serializer):
    plans = BatchWeekPlanWriteSerializer(many=True)


class BatchEnrollmentSerializer(serializers.ModelSerializer):
    trainee_name = serializers.CharField(source='trainee.user.full_name_bn', read_only=True)
    trainee_reg_no = serializers.CharField(source='trainee.registration_no', read_only=True)
    batch_name = serializers.CharField(source='batch.batch_name_bn', read_only=True)

    class Meta:
        model = BatchEnrollment
        fields = (
            'id', 'trainee', 'trainee_name', 'trainee_reg_no',
            'batch', 'batch_name',
            'enrollment_date', 'status',
            'dropped_date', 'drop_reason',
        )
        read_only_fields = ('enrollment_date',)

    def validate(self, attrs):
        if attrs.get('status') == BatchEnrollment.EnrollmentStatus.DROPPED:
            from django.utils import timezone
            attrs['dropped_date'] = attrs.get('dropped_date') or timezone.now().date()
        return attrs


class BatchEnrollmentBulkSerializer(serializers.Serializer):
    trainee_ids = serializers.ListField(
        child=serializers.IntegerField(),
        label='প্রশিক্ষণার্থী আইডি সমূহ',
    )
    batch = serializers.PrimaryKeyRelatedField(
        queryset=Batch.objects.all(),
        label='ব্যাচ',
    )
