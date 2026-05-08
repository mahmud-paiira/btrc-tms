from rest_framework import serializers
from .models import Attendance, AttendanceSummary


class AttendanceSerializer(serializers.ModelSerializer):
    trainee_name = serializers.CharField(
        source='trainee.user.full_name_bn', read_only=True,
    )
    trainee_reg_no = serializers.CharField(
        source='trainee.registration_no', read_only=True,
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True,
    )
    lead_trainer_name = serializers.CharField(
        source='lead_trainer.user.full_name_bn', read_only=True,
    )
    associate_trainer_name = serializers.CharField(
        source='associate_trainer.user.full_name_bn', read_only=True, default=None,
    )
    marked_by_name = serializers.CharField(
        source='marked_by.full_name_bn', read_only=True, default=None,
    )

    class Meta:
        model = Attendance
        fields = '__all__'
        read_only_fields = ('marked_by', 'marked_at')


class AttendanceListSerializer(serializers.ModelSerializer):
    trainee_name = serializers.CharField(
        source='trainee.user.full_name_bn', read_only=True,
    )
    trainee_reg_no = serializers.CharField(
        source='trainee.registration_no', read_only=True,
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True,
    )

    class Meta:
        model = Attendance
        fields = (
            'id', 'trainee', 'trainee_name', 'trainee_reg_no',
            'batch', 'session_date', 'session_no', 'status', 'status_display',
            'lead_trainer', 'associate_trainer', 'guest_trainer_name',
            'remarks', 'marked_by', 'marked_at',
        )


class MarkAttendanceSerializer(serializers.Serializer):
    batch = serializers.IntegerField(label='ব্যাচ আইডি')
    session_date = serializers.DateField(label='সেশনের তারিখ')
    session_no = serializers.IntegerField(label='সেশন নম্বর')
    entries = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        label='উপস্থিতি তালিকা',
    )

    def validate_entries(self, value):
        if not value:
            raise serializers.ValidationError('কমপক্ষে একজন প্রশিক্ষণার্থীর তথ্য দিন')
        for entry in value:
            if 'trainee' not in entry:
                raise serializers.ValidationError('প্রতিটি এন্ট্রিতে trainee আবশ্যক')
            if 'status' not in entry:
                raise serializers.ValidationError('প্রতিটি এন্ট্রিতে status আবশ্যক')
            status_val = entry['status']
            valid_statuses = [s.value for s in Attendance.Status]
            if status_val not in valid_statuses:
                raise serializers.ValidationError(
                    f"status অবশ্যই {', '.join(valid_statuses)} এর একটি হতে হবে",
                )
        return value

    def create(self, validated_data):
        batch_id = validated_data['batch']
        session_date = validated_data['session_date']
        session_no = validated_data['session_no']
        entries = validated_data['entries']
        user = self.context['request'].user
        results = []
        for entry in entries:
            status_val = entry['status']
            lead_trainer = entry.get('lead_trainer')
            associate_trainer = entry.get('associate_trainer')
            obj, created = Attendance.objects.update_or_create(
                trainee_id=entry['trainee'],
                batch_id=batch_id,
                session_date=session_date,
                session_no=session_no,
                defaults={
                    'status': status_val,
                    'lead_trainer_id': lead_trainer,
                    'associate_trainer_id': associate_trainer or None,
                    'guest_trainer_name': entry.get('guest_trainer_name', ''),
                    'remarks': entry.get('remarks', ''),
                    'marked_by': user,
                },
            )
            results.append(obj)
        return results


class AttendanceSummarySerializer(serializers.ModelSerializer):
    trainee_name = serializers.CharField(
        source='trainee.user.full_name_bn', read_only=True,
    )
    trainee_reg_no = serializers.CharField(
        source='trainee.registration_no', read_only=True,
    )
    batch_name = serializers.CharField(
        source='batch.batch_name_bn', read_only=True, default=None,
    )

    class Meta:
        model = AttendanceSummary
        fields = '__all__'


class BatchAttendanceCalendarSerializer(serializers.Serializer):
    date = serializers.DateField()
    sessions = serializers.ListField(child=serializers.DictField(child=serializers.CharField()))


class EligibilitySerializer(serializers.Serializer):
    trainee_id = serializers.IntegerField()
    trainee_name = serializers.CharField()
    trainee_reg_no = serializers.CharField()
    total_sessions = serializers.IntegerField()
    attended_sessions = serializers.IntegerField()
    attendance_percentage = serializers.FloatField()
    is_eligible = serializers.BooleanField()