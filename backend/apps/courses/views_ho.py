from rest_framework import viewsets, filters, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.template.loader import render_to_string
from django.http import HttpResponse
from weasyprint import HTML

from .models import (
    Course, CourseConfiguration, CourseBill, CourseChapter, UnitOfCompetency,
)
from .serializers import (
    CourseListSerializer, CourseDetailSerializer, CourseWriteSerializer,
    CourseConfigurationSerializer, CourseBillSerializer,
    CourseChapterSerializer, UnitOfCompetencySerializer,
)
from apps.centers.models import ActionLog


class IsHeadOffice(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.user_type == 'head_office' or request.user.is_superuser


class HOCourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.select_related(
        'configuration', 'created_by',
    ).prefetch_related('bills', 'chapters', 'competencies').all()
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]
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
        course = serializer.save(created_by=self.request.user)
        ActionLog.objects.create(
            user=self.request.user, action='created course',
            target_type='Course', target_id=str(course.id),
            description=f'Created course {course.code} - {course.name_bn}',
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
        )

    def perform_update(self, serializer):
        course = serializer.save()
        ActionLog.objects.create(
            user=self.request.user, action='updated course',
            target_type='Course', target_id=str(course.id),
            description=f'Updated course {course.code}',
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
        )

    def perform_destroy(self, instance):
        ActionLog.objects.create(
            user=self.request.user, action='deleted course',
            target_type='Course', target_id=str(instance.id),
            description=f'Deleted course {instance.code}',
            ip_address=self.request.META.get('REMOTE_ADDR', ''),
        )
        instance.delete()

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'কোন আইডি প্রদান করা হয়নি'}, status=400)
        deleted = 0
        errors = []
        for pk in ids:
            try:
                obj = self.get_queryset().get(pk=pk)
                self.perform_destroy(obj)
                deleted += 1
            except Exception as e:
                msg = str(e.detail[0]) if hasattr(e, 'detail') and isinstance(e.detail, list) else str(e)
                errors.append(msg)
        return Response({'deleted': deleted, 'errors': errors})

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        course = self.get_object()
        course.status = Course.Status.ACTIVE
        course.save(update_fields=['status'])
        return Response({'status': course.status})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        course = self.get_object()
        course.status = Course.Status.DRAFT
        course.save(update_fields=['status'])
        return Response({'status': course.status})

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def print_course(self, request, pk=None):
        if not request.user.is_authenticated:
            token = request.query_params.get('token')
            if token:
                from rest_framework_simplejwt.tokens import AccessToken
                try:
                    user_id = AccessToken(token).payload.get('user_id')
                    from django.contrib.auth import get_user_model
                    request.user = get_user_model().objects.get(id=user_id)
                except Exception:
                    pass
            if not request.user.is_authenticated:
                return Response({'detail': 'Authentication credentials were not provided.'},
                                status=status.HTTP_401_UNAUTHORIZED)
        course = self.get_object()
        html = render_to_string('courses/print_course.html', {
            'course': course,
            'config': getattr(course, 'configuration', None),
            'chapters': course.chapters.all(),
            'competencies': course.competencies.all(),
            'bills': course.bills.all(),
        })
        pdf = HTML(string=html).write_pdf()
        filename = f'course_{course.code}.pdf'
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response

    @action(detail=True, methods=['get', 'post', 'put'])
    def configuration(self, request, pk=None):
        course = self.get_object()
        if request.method == 'GET':
            config = getattr(course, 'configuration', None)
            if not config:
                return Response({})
            return Response(CourseConfigurationSerializer(config).data)
        if request.method == 'POST':
            serializer = CourseConfigurationSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            config, _ = CourseConfiguration.objects.update_or_create(
                course=course, defaults=serializer.validated_data,
            )
            return Response(CourseConfigurationSerializer(config).data, status=status.HTTP_201_CREATED)
        config = getattr(course, 'configuration', None)
        if not config:
            return Response({'error': 'No configuration found'}, status=404)
        serializer = CourseConfigurationSerializer(config, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'])
    def chapters(self, request, pk=None):
        course = self.get_object()
        if request.method == 'GET':
            return Response(CourseChapterSerializer(course.chapters.all(), many=True).data)
        serializer = CourseChapterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(course=course)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'])
    def competency(self, request, pk=None):
        course = self.get_object()
        if request.method == 'GET':
            return Response(UnitOfCompetencySerializer(course.competencies.all(), many=True).data)
        serializer = UnitOfCompetencySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(course=course)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'])
    def bill(self, request, pk=None):
        course = self.get_object()
        if request.method == 'GET':
            return Response(CourseBillSerializer(course.bills.all(), many=True).data)
        serializer = CourseBillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(course=course)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class HOCourseChapterViewSet(viewsets.ModelViewSet):
    queryset = CourseChapter.objects.select_related('course').all()
    serializer_class = CourseChapterSerializer
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]


class HOCourseBillViewSet(viewsets.ModelViewSet):
    queryset = CourseBill.objects.select_related('course').all()
    serializer_class = CourseBillSerializer
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]


class HOCourseCompetencyViewSet(viewsets.ModelViewSet):
    queryset = UnitOfCompetency.objects.select_related('course').all()
    serializer_class = UnitOfCompetencySerializer
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]
