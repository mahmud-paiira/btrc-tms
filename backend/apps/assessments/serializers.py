from rest_framework import serializers
from .models import Assessment, Reassessment
from apps.attendance.eligibility import check_trainee_eligibility


class EligibleTraineeSerializer(serializers.Serializer):
    trainee_id = serializers.IntegerField()
    trainee_name = serializers.CharField()
    trainee_reg_no = serializers.CharField()
    total_sessions = serializers.IntegerField()
    attended_sessions = serializers.IntegerField()
    attendance_percentage = serializers.FloatField()
    is_eligible = serializers.BooleanField()


class AssessmentSerializer(serializers.ModelSerializer):
    trainee_name = serializers.CharField(
        source='trainee.user.full_name_bn', read_only=True,
    )
    trainee_reg_no = serializers.CharField(
        source='trainee.registration_no', read_only=True,
    )
    assessor_name = serializers.CharField(
        source='assessor.user.full_name_bn', read_only=True, default=None,
    )
    assessed_by_name = serializers.CharField(
        source='assessed_by.full_name_bn', read_only=True, default=None,
    )
    assessment_type_display = serializers.CharField(
        source='get_assessment_type_display', read_only=True,
    )
    competency_status_display = serializers.CharField(
        source='get_competency_status_display', read_only=True,
    )

    class Meta:
        model = Assessment
        fields = '__all__'
        read_only_fields = ('percentage', 'assessed_at')


class ConductAssessmentSerializer(serializers.Serializer):
    batch = serializers.IntegerField(label='ব্যাচ আইডি')
    assessment_type = serializers.ChoiceField(
        choices=Assessment.AssessmentType.choices,
        label='মূল্যায়নের ধরণ',
    )
    assessment_date = serializers.DateField(label='মূল্যায়নের তারিখ')
    assessor = serializers.IntegerField(
        required=False, allow_null=True, label='মূল্যায়নকারী',
    )
    entries = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        label='মূল্যায়ন তালিকা',
    )

    def validate_entries(self, value):
        if not value:
            raise serializers.ValidationError('কমপক্ষে একজন প্রশিক্ষণার্থীর তথ্য দিন')

        batch_id = self.initial_data.get('batch')
        assessment_type = self.initial_data.get('assessment_type')
        ineligible = []

        for entry in value:
            if 'trainee' not in entry:
                raise serializers.ValidationError('প্রতিটি এন্ট্রিতে trainee আবশ্যক')

            trainee_id = entry['trainee']
            is_eligible, pct, _ = check_trainee_eligibility(
                int(trainee_id), int(batch_id),
            )
            if not is_eligible:
                ineligible.append({
                    'trainee_id': int(trainee_id),
                    'percentage': float(pct),
                })

            if assessment_type == 'final':
                prev_types = [
                    t for t in Assessment.AssessmentType.values
                    if t != 'final'
                ]
                for atype in prev_types:
                    exists = Assessment.objects.filter(
                        trainee_id=int(trainee_id),
                        batch_id=int(batch_id),
                        assessment_type=atype,
                        competency_status='competent',
                    ).exists()
                    if not exists:
                        raise serializers.ValidationError(
                            f'প্রশিক্ষণার্থী {trainee_id} চূড়ান্ত মূল্যায়নের পূর্বে '
                            f'"{atype}" মূল্যায়নে দক্ষ হয়নি।',
                        )

        if ineligible:
            names = ', '.join([str(i['trainee_id']) for i in ineligible[:5]])
            raise serializers.ValidationError(
                f'এই প্রশিক্ষণার্থীদের উপস্থিতি ৮০% এর নিচে। '
                f'মূল্যায়নের অনুমতি নেই: {names}',
            )

        return value

    def create(self, validated_data):
        batch_id = validated_data['batch']
        assessment_type = validated_data['assessment_type']
        assessment_date = validated_data['assessment_date']
        assessor_id = validated_data.get('assessor')
        entries = validated_data['entries']
        request_user = self.context['request'].user
        results = []

        for entry in entries:
            obj, created = Assessment.objects.update_or_create(
                trainee_id=int(entry['trainee']),
                batch_id=int(batch_id),
                assessment_type=assessment_type,
                is_reassessment=entry.get('is_reassessment', False),
                defaults={
                    'assessor_id': assessor_id or None,
                    'assessment_date': assessment_date,
                    'competency_status': entry.get('competency_status', 'absent'),
                    'marks_obtained': entry.get('marks_obtained', 0),
                    'total_marks': entry.get('total_marks', 100),
                    'remarks': entry.get('remarks', ''),
                    'assessed_by': request_user,
                },
            )
            results.append(obj)

        return results


class ReassessmentSerializer(serializers.ModelSerializer):
    original_assessment_id = serializers.IntegerField(write_only=True)
    reason = serializers.CharField(write_only=True)
    assessment = AssessmentSerializer(source='new_assessment', read_only=True)
    original = AssessmentSerializer(source='original_assessment', read_only=True)

    class Meta:
        model = Reassessment
        fields = (
            'id', 'original_assessment_id', 'reason',
            'original_assessment', 'new_assessment',
            'assessment', 'original',
            'requested_by', 'approved_by', 'created_at',
        )
        read_only_fields = (
            'original_assessment', 'new_assessment',
            'requested_by', 'approved_by', 'created_at',
        )

    def validate_original_assessment_id(self, value):
        try:
            assessment = Assessment.objects.get(pk=value)
        except Assessment.DoesNotExist:
            raise serializers.ValidationError('মূল্যায়নটি খুঁজে পাওয়া যায়নি।')

        if assessment.competency_status != 'not_competent':
            raise serializers.ValidationError(
                'শুধুমাত্র অদক্ষ (not_competent) মূল্যায়নের জন্য '
                'পুনর্মূল্যায়নের অনুরোধ করা যাবে।',
            )

        already_requested = Reassessment.objects.filter(
            original_assessment=assessment,
            new_assessment__isnull=True,
        ).exists()
        if already_requested:
            raise serializers.ValidationError(
                'ইতিমধ্যে এই মূল্যায়নের জন্য পুনর্মূল্যায়নের অনুরোধ করা হয়েছে।',
            )

        existing = Assessment.objects.filter(
            trainee=assessment.trainee,
            batch=assessment.batch,
            assessment_type=assessment.assessment_type,
            is_reassessment=True,
        ).exists()
        if existing:
            raise serializers.ValidationError(
                'এই প্রশিক্ষণার্থীর জন্য ইতিমধ্যে একটি পুনর্মূল্যায়ন করা হয়েছে। '
                'একাধিক পুনর্মূল্যায়নের অনুমতি নেই।',
            )

        return value

    def create(self, validated_data):
        request_user = self.context['request'].user
        original_assessment = Assessment.objects.get(
            pk=validated_data['original_assessment_id'],
        )

        new_assessment = Assessment.objects.create(
            trainee=original_assessment.trainee,
            batch=original_assessment.batch,
            assessor=original_assessment.assessor,
            assessment_type=original_assessment.assessment_type,
            assessment_date=original_assessment.assessment_date,
            competency_status='absent',
            marks_obtained=0,
            total_marks=original_assessment.total_marks,
            remarks=f'পুনর্মূল্যায়ন - {validated_data["reason"]}',
            assessed_by=request_user,
            is_reassessment=True,
        )

        reassessment = Reassessment.objects.create(
            original_assessment=original_assessment,
            new_assessment=new_assessment,
            reason=validated_data['reason'],
            requested_by=request_user,
        )

        return reassessment
