import json
import logging
import decimal
from decimal import Decimal
from rest_framework import serializers
from .models import Application, ChecklistResponse
from apps.circulars.models import Circular, ChecklistItem
from apps.system_config.models import Gender, Education, Demography

logger = logging.getLogger(__name__)


class NIDUploadSerializer(serializers.Serializer):
    front_image = serializers.ImageField(label='এনআইডির সামনের ছবি')
    back_image = serializers.ImageField(required=False, allow_null=True, label='এনআইডির পেছনের ছবি')


class ChecklistResponseSerializer(serializers.Serializer):
    checklist_item_id = serializers.IntegerField(label='চেকলিস্ট আইটেম আইডি')
    value = serializers.CharField(label='উত্তর')


class PublicApplySerializer(serializers.ModelSerializer):
    circular_url = serializers.SlugField(write_only=True, label='সার্কুলার ইউআরএল')
    chosen_center_id = serializers.IntegerField(label='নির্বাচিত কেন্দ্র')
    checklist_responses = serializers.JSONField(required=False, write_only=True)
    gender_id = serializers.IntegerField(required=False, allow_null=True, label='লিঙ্গ')
    education_level_id = serializers.IntegerField(required=False, allow_null=True, label='শিক্ষাগত যোগ্যতা')
    present_division_id = serializers.IntegerField(required=False, allow_null=True, label='বর্তমান বিভাগ')
    present_district_id = serializers.IntegerField(required=False, allow_null=True, label='বর্তমান জেলা')
    permanent_division_id = serializers.IntegerField(required=False, allow_null=True, label='স্থায়ী বিভাগ')
    permanent_district_id = serializers.IntegerField(required=False, allow_null=True, label='স্থায়ী জেলা')
    user_id = serializers.IntegerField(required=False, write_only=True, label='ব্যবহারকারী')

    class Meta:
        model = Application
        fields = (
            'circular_url',
            'chosen_center_id',
            'checklist_responses',
            'name_bn', 'name_en',
            'father_name_bn', 'mother_name_bn',
            'date_of_birth', 'nid',
            'phone', 'email',
            'present_address', 'permanent_address',
            'education_qualification', 'profile_image',
            'nid_front_image', 'nid_back_image',
            'gender_id',
            'education_level_id',
            'present_division_id', 'present_district_id',
            'permanent_division_id', 'permanent_district_id',
            'user_id',
        )

    def validate_phone(self, value):
        if not value.isdigit() or len(value) != 11:
            raise serializers.ValidationError('ফোন নম্বর ১১ ডিজিটের হতে হবে (01XXXXXXXXX)')
        if not value.startswith('01'):
            raise serializers.ValidationError('ফোন নম্বর 01 দিয়ে শুরু হতে হবে')
        return value

    def validate_nid(self, value):
        clean = value.replace(' ', '').replace('-', '')
        if len(clean) not in (10, 17):
            raise serializers.ValidationError('এনআইডি ১০ বা ১৭ ডিজিটের হতে হবে')
        request = self.context.get('request')
        # Skip NID uniqueness check if user already has application for this circular
        if request and request.user.is_authenticated:
            user = request.user
            if Application.objects.filter(user=user, nid=clean).exists():
                return clean
        if Application.objects.filter(nid=clean).exists():
            raise serializers.ValidationError('এই এনআইডি নম্বর দিয়ে ইতিমধ্যে আবেদন করা হয়েছে')
        return clean

    def validate_date_of_birth(self, value):
        from datetime import date
        today = date.today()
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 21:
            raise serializers.ValidationError('বয়স কমপক্ষে ২১ বছর হতে হবে')
        return value

    def validate_circular_url(self, value):
        try:
            circular = Circular.objects.get(public_url=value, status=Circular.Status.PUBLISHED)
        except Circular.DoesNotExist:
            raise serializers.ValidationError('সার্কুলারটি বৈধ নয় বা প্রকাশিত হয়নি')
        return circular

    def validate_chosen_center_id(self, value):
        from apps.centers.models import Center
        try:
            center = Center.objects.get(id=value)
        except Center.DoesNotExist:
            raise serializers.ValidationError('নির্বাচিত কেন্দ্রটি বৈধ নয়')
        return center

    def validate_checklist_responses(self, value):
        if not value:
            return value
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                raise serializers.ValidationError('চেকলিস্ট ডাটা বৈধ JSON নয়')
        if not isinstance(value, list):
            raise serializers.ValidationError('চেকলিস্ট ডাটা একটি তালিকা হতে হবে')
        item_ids = [r['checklist_item_id'] for r in value]
        existing = ChecklistItem.objects.filter(id__in=item_ids)
        existing_ids = set(existing.values_list('id', flat=True))
        for item_id in item_ids:
            if item_id not in existing_ids:
                raise serializers.ValidationError(f'চেকলিস্ট আইটেম {item_id} বৈধ নয়')
        return value

    def validate_gender_id(self, value):
        if value:
            try:
                return Gender.objects.get(id=value)
            except Gender.DoesNotExist:
                raise serializers.ValidationError('লিঙ্গটি বৈধ নয়')
        return None

    def validate_education_level_id(self, value):
        if value:
            try:
                return Education.objects.get(id=value)
            except Education.DoesNotExist:
                raise serializers.ValidationError('শিক্ষাগত যোগ্যতা বৈধ নয়')
        return None

    def resolve_demography(self, value, label):
        if value:
            try:
                return Demography.objects.get(id=value)
            except Demography.DoesNotExist:
                raise serializers.ValidationError(f'{label} বৈধ নয়')
        return None

    def validate_present_division_id(self, value):
        return self.resolve_demography(value, 'বর্তমান বিভাগ')

    def validate_present_district_id(self, value):
        return self.resolve_demography(value, 'বর্তমান জেলা')

    def validate_permanent_division_id(self, value):
        return self.resolve_demography(value, 'স্থায়ী বিভাগ')

    def validate_permanent_district_id(self, value):
        return self.resolve_demography(value, 'স্থায়ী জেলা')

    def create(self, validated_data):
        circular = validated_data.pop('circular_url')
        chosen_center = validated_data.pop('chosen_center_id')
        user_id = validated_data.pop('user_id', None)
        raw_checklist = validated_data.pop('checklist_responses', [])
        if isinstance(raw_checklist, str):
            raw_checklist = json.loads(raw_checklist)
        checklist_data = raw_checklist if isinstance(raw_checklist, list) else []

        # Map *_id fields to model FK field names
        validated_data['gender'] = validated_data.pop('gender_id', None)
        validated_data['education_level'] = validated_data.pop('education_level_id', None)
        validated_data['present_division'] = validated_data.pop('present_division_id', None)
        validated_data['present_district'] = validated_data.pop('present_district_id', None)
        validated_data['permanent_division'] = validated_data.pop('permanent_division_id', None)
        validated_data['permanent_district'] = validated_data.pop('permanent_district_id', None)

        extra = {}
        if user_id:
            from apps.accounts.models import User
            try:
                extra['user'] = User.objects.get(id=user_id)
            except User.DoesNotExist:
                pass

        application = Application.objects.create(
            circular=circular, chosen_center=chosen_center, **validated_data, **extra,
        )

        # Process checklist responses and auto-screen
        total_score = Decimal('0')
        max_score = circular.auto_screen_total_score
        min_score = circular.auto_screen_min_score

        for data in checklist_data:
            item = ChecklistItem.objects.get(id=data['checklist_item_id'])
            response_value = data['value']
            is_pass, score = evaluate_checklist_item(item, response_value)
            ChecklistResponse.objects.create(
                application=application,
                checklist_item=item,
                value=response_value,
                is_pass=is_pass,
                score_achieved=score if is_pass else Decimal('0'),
            )
            if is_pass:
                total_score += score

        if checklist_data:
            application.auto_screen_score = total_score
            application.auto_screen_pass = total_score >= min_score if max_score > 0 else None
            application.save(update_fields=['auto_screen_score', 'auto_screen_pass'])
            logger.info(
                f'Auto-screen for {application.application_no}: score={total_score}, '
                f'min={min_score}, pass={application.auto_screen_pass}',
            )

        return application


def evaluate_checklist_item(item, value):
    from datetime import date

    try:
        if item.criteria_type == 'age':
            # value is date_of_birth (YYYY-MM-DD)
            dob_parts = value.split('-')
            dob = date(int(dob_parts[0]), int(dob_parts[1]), int(dob_parts[2]))
            today = date.today()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            return compare_value(age, item.operator, Decimal(item.expected_value)), item.score

        elif item.criteria_type == 'education':
            applicant_rank = ChecklistItem.education_rank(value)
            expected_rank = ChecklistItem.education_rank(item.expected_value)
            return compare_value(applicant_rank, item.operator, expected_rank), item.score

        elif item.criteria_type in ('experience_years', 'height_cm', 'weight_kg', 'number'):
            val = Decimal(value)
            expected = Decimal(item.expected_value)
            return compare_value(val, item.operator, expected), item.score

        elif item.criteria_type == 'boolean':
            return value.lower() == item.expected_value.lower(), item.score

        elif item.criteria_type == 'text_match':
            return value.strip().lower() == item.expected_value.strip().lower(), item.score

        return False, Decimal('0')
    except (ValueError, TypeError, decimal.InvalidOperation) as e:
        logger.warning(f'Checklist evaluation error: {e}')
        return False, Decimal('0')


def compare_value(actual, operator, expected):
    if operator == '>=':
        return actual >= expected
    elif operator == '<=':
        return actual <= expected
    elif operator == '==':
        return actual == expected
    elif operator == '>':
        return actual > expected
    elif operator == '<':
        return actual < expected
    elif operator == 'between':
        expected_str = str(expected)
        if ',' in expected_str:
            parts = expected_str.split(',')
            return Decimal(parts[0].strip()) <= actual <= Decimal(parts[1].strip())
        return False
    return False


class ApplicationConfirmSerializer(serializers.ModelSerializer):
    circular_title_bn = serializers.CharField(source='circular.title_bn', read_only=True)
    center_name_bn = serializers.CharField(source='chosen_center.name_bn', read_only=True, default=None)

    class Meta:
        model = Application
        fields = (
            'application_no', 'name_bn', 'nid', 'phone',
            'circular_title_bn', 'center_name_bn',
            'applied_at', 'status',
        )
