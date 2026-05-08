from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    Course,
    CourseConfiguration,
    CourseBill,
    CourseChapter,
    UnitOfCompetency,
)
from .serializers import (
    CourseListSerializer,
    CourseDetailSerializer,
    CourseWriteSerializer,
    CourseConfigurationSerializer,
    CourseBillSerializer,
    CourseChapterSerializer,
    UnitOfCompetencySerializer,
)


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.select_related(
        'configuration', 'created_by',
    ).prefetch_related(
        'bills', 'chapters', 'competencies',
    ).all()

    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('course_type', 'term', 'session', 'status', 'stipend_eligible')
    search_fields = ('code', 'name_bn', 'name_en')
    ordering_fields = ('code', 'created_at', 'fee', 'duration_months')
    ordering = ('-created_at',)

    def get_serializer_class(self):
        if self.action == 'list':
            return CourseListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return CourseWriteSerializer
        return CourseDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CourseConfigurationViewSet(viewsets.ModelViewSet):
    queryset = CourseConfiguration.objects.select_related('course').all()
    serializer_class = CourseConfigurationSerializer
    filterset_fields = ('course',)


class CourseBillViewSet(viewsets.ModelViewSet):
    queryset = CourseBill.objects.select_related('course').all()
    serializer_class = CourseBillSerializer
    filterset_fields = ('course', 'is_mandatory')


class CourseChapterViewSet(viewsets.ModelViewSet):
    queryset = CourseChapter.objects.select_related('course').all()
    serializer_class = CourseChapterSerializer
    filterset_fields = ('course',)
    ordering = ('course', 'chapter_no')


class UnitOfCompetencyViewSet(viewsets.ModelViewSet):
    queryset = UnitOfCompetency.objects.select_related('course').all()
    serializer_class = UnitOfCompetencySerializer
    filterset_fields = ('course',)
    search_fields = ('code', 'name_bn', 'name_en')
