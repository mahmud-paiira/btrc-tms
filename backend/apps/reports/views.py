from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Report
from .serializers import ReportSerializer, ReportGenerateSerializer
from .tasks import generate_report


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.select_related('generated_by').all()
    serializer_class = ReportSerializer
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('report_type', 'generated_by', 'is_ready')
    search_fields = ('title',)
    ordering_fields = ('created_at',)
    ordering = ('-created_at',)

    def perform_create(self, serializer):
        serializer.save(generated_by=self.request.user)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        serializer = ReportGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = Report.objects.create(
            title=serializer.validated_data['title'],
            report_type=serializer.validated_data['report_type'],
            parameters=serializer.validated_data['parameters'],
            generated_by=request.user,
        )
        task = generate_report.delay(report.id)
        report.task_id = task.id
        report.save(update_fields=['task_id'])
        return Response(
            ReportSerializer(report).data,
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        report = self.get_object()
        report.is_ready = False
        report.error_message = ''
        report.file.delete(save=False)
        report.save(update_fields=['is_ready', 'error_message'])
        task = generate_report.delay(report.id)
        report.task_id = task.id
        report.save(update_fields=['task_id'])
        return Response(ReportSerializer(report).data)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        report = self.get_object()
        if not report.is_ready or not report.file:
            return Response(
                {'error': 'প্রতিবেদন প্রস্তুত নয়'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from django.http import FileResponse
        return FileResponse(
            report.file.open('rb'),
            as_attachment=True,
            filename=f'{report.title}.csv',
        )

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        report = self.get_object()
        return Response({
            'id': report.id,
            'is_ready': report.is_ready,
            'task_id': report.task_id,
            'error_message': report.error_message,
            'file_url': report.file.url if report.file and report.is_ready else None,
            'generated_at': report.generated_at,
        })