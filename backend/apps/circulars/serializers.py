from rest_framework import serializers
from .models import Circular, ChecklistItem


class ChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = '__all__'
        read_only_fields = ('id', 'circular')


class CircularListSerializer(serializers.ModelSerializer):
    eligible_centers = serializers.SerializerMethodField()
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_name = serializers.CharField(source='course.name_bn', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Circular
        fields = (
            'id', 'public_url', 'circular_no', 'edition',
            'title_bn', 'title_en',
            'all_centers', 'eligible_centers',
            'course', 'course_code', 'course_name',
            'description',
            'training_start_date', 'training_end_date',
            'total_seats', 'remaining_seats',
            'fee',
            'auto_screen_total_score', 'auto_screen_min_score',
            'default_overflow_percentage',
            'routing_weight_seats', 'routing_weight_distance', 'routing_weight_merit',
            'waitlist_validity_days',
            'application_start_date', 'application_end_date',
            'status', 'status_display',
            'published_at', 'created_at',
        )

    def _center_data(self, c):
        return {
            'id': c.id, 'code': c.code, 'name_bn': c.name_bn, 'name_en': c.name_en,
            'center_type': c.center_type, 'overflow_percentage': float(c.overflow_percentage),
            'quality_score': float(c.quality_score),
            'latitude': float(c.latitude) if c.latitude else None,
            'longitude': float(c.longitude) if c.longitude else None,
        }

    def get_eligible_centers(self, obj):
        if obj.all_centers:
            from apps.centers.models import Center
            return [self._center_data(c) for c in Center.objects.all()]
        return [self._center_data(c) for c in obj.eligible_centers.all()]


class CircularDetailSerializer(serializers.ModelSerializer):
    eligible_centers = serializers.SerializerMethodField()
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_name = serializers.CharField(source='course.name_bn', read_only=True)
    course_type = serializers.CharField(source='course.get_course_type_display', read_only=True)
    course_duration = serializers.CharField(source='course.duration_months', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    def get_created_by_name(self, obj):
        return obj.created_by.full_name_bn if obj.created_by else None
    checklist_items = ChecklistItemSerializer(many=True, read_only=True)

    class Meta:
        model = Circular
        fields = '__all__'

    def _center_data(self, c):
        return {
            'id': c.id, 'code': c.code, 'name_bn': c.name_bn, 'name_en': c.name_en,
            'address': c.address, 'phone': c.phone,
            'center_type': c.center_type, 'overflow_percentage': float(c.overflow_percentage),
            'quality_score': float(c.quality_score),
            'latitude': float(c.latitude) if c.latitude else None,
            'longitude': float(c.longitude) if c.longitude else None,
        }

    def get_eligible_centers(self, obj):
        if obj.all_centers:
            from apps.centers.models import Center
            return [self._center_data(c) for c in Center.objects.all()]
        return [self._center_data(c) for c in obj.eligible_centers.all()]


class CircularWriteSerializer(serializers.ModelSerializer):
    eligible_centers = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False,
        label='উপযুক্ত কেন্দ্রের আইডি',
    )
    checklist_items = ChecklistItemSerializer(many=True, required=False)

    class Meta:
        model = Circular
        fields = '__all__'
        read_only_fields = (
            'public_url', 'remaining_seats',
            'published_at', 'created_at', 'updated_at', 'created_by',
        )

    def validate(self, attrs):
        if not attrs.get('all_centers') and not attrs.get('eligible_centers'):
            raise serializers.ValidationError({'eligible_centers': 'কমপক্ষে একটি কেন্দ্র নির্বাচন করুন অথবা "সব কেন্দ্র" চিহ্নিত করুন।'})
        return attrs

    def create(self, validated_data):
        centers_data = validated_data.pop('eligible_centers', [])
        checklist_data = validated_data.pop('checklist_items', [])
        circular = Circular.objects.create(**validated_data)
        if centers_data and not circular.all_centers:
            circular.eligible_centers.set(centers_data)
        for item_data in checklist_data:
            ChecklistItem.objects.create(circular=circular, **item_data)
        return circular

    def update(self, instance, validated_data):
        centers_data = validated_data.pop('eligible_centers', None)
        checklist_data = validated_data.pop('checklist_items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if centers_data is not None and not instance.all_centers:
            instance.eligible_centers.set(centers_data)
        elif instance.all_centers:
            instance.eligible_centers.clear()
        if checklist_data is not None:
            instance.checklist_items.all().delete()
            for item_data in checklist_data:
                ChecklistItem.objects.create(circular=instance, **item_data)
        return instance


class PublicCircularSerializer(serializers.ModelSerializer):
    eligible_centers = serializers.SerializerMethodField()
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_name = serializers.CharField(source='course.name_bn', read_only=True)
    course_type_display = serializers.CharField(source='course.get_course_type_display', read_only=True)
    course_duration_months = serializers.IntegerField(source='course.duration_months', read_only=True)
    checklist_items = serializers.SerializerMethodField()

    class Meta:
        model = Circular
        fields = (
            'public_url', 'circular_no', 'edition',
            'title_bn', 'title_en', 'description',
            'all_centers', 'eligible_centers',
            'course_code', 'course_name', 'course_type_display',
            'course_duration_months',
            'total_seats', 'remaining_seats',
            'auto_screen_total_score', 'auto_screen_min_score',
            'default_overflow_percentage',
            'routing_weight_seats', 'routing_weight_distance', 'routing_weight_merit',
            'application_start_date', 'application_end_date',
            'training_start_date', 'training_end_date',
            'checklist_items',
        )

    def get_eligible_centers(self, obj):
        if obj.all_centers:
            from apps.centers.models import Center
            return [
                {'id': c.id, 'code': c.code, 'name_bn': c.name_bn, 'name_en': c.name_en,
                 'address': c.address, 'phone': c.phone,
                 'center_type': c.center_type, 'overflow_percentage': float(c.overflow_percentage),
                 'quality_score': float(c.quality_score),
                 'latitude': float(c.latitude) if c.latitude else None,
                 'longitude': float(c.longitude) if c.longitude else None,
                 }
                for c in Center.objects.all()
            ]
        return [
            {'id': c.id, 'code': c.code, 'name_bn': c.name_bn, 'name_en': c.name_en,
             'address': c.address, 'phone': c.phone,
             'center_type': c.center_type, 'overflow_percentage': float(c.overflow_percentage),
             'quality_score': float(c.quality_score),
             'latitude': float(c.latitude) if c.latitude else None,
             'longitude': float(c.longitude) if c.longitude else None,
             }
            for c in obj.eligible_centers.all()
        ]

    def get_checklist_items(self, obj):
        return ChecklistItemSerializer(obj.checklist_items.all(), many=True).data
