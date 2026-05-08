from rest_framework import serializers
from .models import (
    Course,
    CourseConfiguration,
    CourseBill,
    CourseChapter,
    UnitOfCompetency,
)


class CourseConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseConfiguration
        exclude = ('course',)


class CourseBillSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseBill
        exclude = ('course',)


class CourseChapterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseChapter
        exclude = ('course',)


class UnitOfCompetencySerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitOfCompetency
        exclude = ('course',)


class CourseListSerializer(serializers.ModelSerializer):
    course_type_display = serializers.CharField(source='get_course_type_display', read_only=True)
    term_display = serializers.CharField(source='get_term_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.full_name_bn', read_only=True, default=None,
    )

    class Meta:
        model = Course
        fields = (
            'id', 'code', 'name_bn', 'name_en', 'course_type', 'course_type_display',
            'term', 'term_display', 'duration_months', 'fee',
            'status', 'status_display', 'created_by_name', 'created_at',
        )


class CourseDetailSerializer(serializers.ModelSerializer):
    configuration = CourseConfigurationSerializer(read_only=True)
    bills = CourseBillSerializer(many=True, read_only=True)
    chapters = CourseChapterSerializer(many=True, read_only=True)
    competencies = UnitOfCompetencySerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.full_name_bn', read_only=True, default=None,
    )

    class Meta:
        model = Course
        fields = '__all__'


class CourseWriteSerializer(serializers.ModelSerializer):
    configuration = CourseConfigurationSerializer(required=False)
    bills = CourseBillSerializer(many=True, required=False)
    chapters = CourseChapterSerializer(many=True, required=False)
    competencies = UnitOfCompetencySerializer(many=True, required=False)

    class Meta:
        model = Course
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by')

    def create(self, validated_data):
        config_data = validated_data.pop('configuration', None)
        bills_data = validated_data.pop('bills', [])
        chapters_data = validated_data.pop('chapters', [])
        competencies_data = validated_data.pop('competencies', [])

        course = Course.objects.create(**validated_data)

        if config_data:
            CourseConfiguration.objects.create(course=course, **config_data)

        for item in bills_data:
            CourseBill.objects.create(course=course, **item)
        for item in chapters_data:
            CourseChapter.objects.create(course=course, **item)
        for item in competencies_data:
            UnitOfCompetency.objects.create(course=course, **item)

        return course

    def update(self, instance, validated_data):
        config_data = validated_data.pop('configuration', None)
        bills_data = validated_data.pop('bills', None)
        chapters_data = validated_data.pop('chapters', None)
        competencies_data = validated_data.pop('competencies', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if config_data is not None:
            CourseConfiguration.objects.update_or_create(
                course=instance, defaults=config_data,
            )

        if bills_data is not None:
            instance.bills.all().delete()
            for item in bills_data:
                CourseBill.objects.create(course=instance, **item)

        if chapters_data is not None:
            instance.chapters.all().delete()
            for item in chapters_data:
                CourseChapter.objects.create(course=instance, **item)

        if competencies_data is not None:
            instance.competencies.all().delete()
            for item in competencies_data:
                UnitOfCompetency.objects.create(course=instance, **item)

        return instance
