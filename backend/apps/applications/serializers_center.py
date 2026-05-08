from rest_framework import serializers
from .models import Application


class ApplicationCenterListSerializer(serializers.ModelSerializer):
    circular_title = serializers.CharField(source='circular.title_bn', read_only=True)
    circular_id = serializers.IntegerField(source='circular.id', read_only=True)

    class Meta:
        model = Application
        fields = (
            'id', 'application_no', 'name_bn', 'nid', 'phone',
            'circular_id', 'circular_title',
            'status', 'applied_at', 'reviewed_at',
            'profile_image',
        )


class ApplicationCenterDetailSerializer(serializers.ModelSerializer):
    circular_title = serializers.CharField(source='circular.title_bn', read_only=True)
    center_name = serializers.CharField(source='circular.center.name_bn', read_only=True)
    course_name = serializers.CharField(source='circular.course.name_bn', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = '__all__'

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.full_name_bn or obj.reviewed_by.email
        return None


class ApplicationReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=['selected', 'rejected', 'waitlisted'],
        label='অবস্থা',
    )
    remarks = serializers.CharField(required=False, allow_blank=True, label='মন্তব্য')


class ApplicationBulkReviewSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(),
        label='আইডি সমূহ',
    )
    status = serializers.ChoiceField(
        choices=['selected', 'rejected', 'waitlisted'],
        label='অবস্থা',
    )
    remarks = serializers.CharField(required=False, allow_blank=True, label='মন্তব্য')
