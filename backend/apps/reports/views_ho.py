from datetime import date, timedelta

from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.centers.models import ActionLog
from .models import Report, ScheduledReport
from .services import ReportGenerator


CACHE_TTL = 60 * 60


class IsHeadOffice(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.user_type == 'head_office' or request.user.is_superuser


REPORT_TYPES = [
    'center-wise', 'course-wise', 'trainer-performance', 'assessor-performance',
    'trainee-demographics', 'attendance-compliance', 'assessment',
    'certificate', 'job-placement', 'financial-soe', 'budget-vs-actual',
    'batch-completion', 'application-funnel', 'revenue',
    'gender-diversity', 'regional', 'monthly-trend', 'audit-log', 'compliance',
]

REPORT_METHOD_MAP = {
    'center-wise': 'center_wise',
    'course-wise': 'course_wise',
    'trainer-performance': 'trainer_performance',
    'assessor-performance': 'assessor_performance',
    'trainee-demographics': 'trainee_demographics',
    'attendance-compliance': 'attendance_compliance',
    'assessment': 'assessment',
    'certificate': 'certificate',
    'job-placement': 'job_placement',
    'financial-soe': 'financial_soe',
    'budget-vs-actual': 'budget_vs_actual',
    'batch-completion': 'batch_completion',
    'application-funnel': 'application_funnel',
    'revenue': 'revenue',
    'gender-diversity': 'gender_diversity',
    'regional': 'regional',
    'monthly-trend': 'monthly_trend',
    'audit-log': 'audit_log',
    'compliance': 'compliance',
}


class HOReportViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]

    def _generate(self, request, report_key):
        params = request.query_params.dict()
        generator = ReportGenerator(params)
        method_name = REPORT_METHOD_MAP.get(report_key)
        if not method_name:
            return Response({'error': 'Invalid report type'}, status=400)

        export_fmt = params.pop('export', None)
        if export_fmt and export_fmt in ('csv', 'excel', 'pdf'):
            content, ext, mime, title = generator.export(report_key.replace('-', '_'), export_fmt)
            filename = f'{report_key}_{date.today().isoformat()}.{ext}'
            ActionLog.objects.create(
                user=request.user, action=f'exported {report_key} report',
                target_type='Report', description=f'Exported {title} as {export_fmt}',
                ip_address=request.META.get('REMOTE_ADDR', ''),
            )
            response = HttpResponse(content, content_type=mime)
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response

        try:
            data = getattr(generator, method_name)()
        except Exception as e:
            return Response({'error': str(e)}, status=500)

        ActionLog.objects.create(
            user=request.user, action=f'viewed {report_key} report',
            target_type='Report', description=f'Viewed {data.get("title", report_key)} report',
            ip_address=request.META.get('REMOTE_ADDR', ''),
        )
        return Response(data)

    @action(detail=False, methods=['get'])
    def center_wise(self, request):
        return self._generate(request, 'center-wise')

    @action(detail=False, methods=['get'])
    def course_wise(self, request):
        return self._generate(request, 'course-wise')

    @action(detail=False, methods=['get'])
    def trainer_performance(self, request):
        return self._generate(request, 'trainer-performance')

    @action(detail=False, methods=['get'])
    def assessor_performance(self, request):
        return self._generate(request, 'assessor-performance')

    @action(detail=False, methods=['get'])
    def trainee_demographics(self, request):
        return self._generate(request, 'trainee-demographics')

    @action(detail=False, methods=['get'])
    def attendance_compliance(self, request):
        return self._generate(request, 'attendance-compliance')

    @action(detail=False, methods=['get'])
    def assessment(self, request):
        return self._generate(request, 'assessment')

    @action(detail=False, methods=['get'])
    def certificate(self, request):
        return self._generate(request, 'certificate')

    @action(detail=False, methods=['get'])
    def job_placement(self, request):
        return self._generate(request, 'job-placement')

    @action(detail=False, methods=['get'])
    def financial_soe(self, request):
        return self._generate(request, 'financial-soe')

    @action(detail=False, methods=['get'])
    def budget_vs_actual(self, request):
        return self._generate(request, 'budget-vs-actual')

    @action(detail=False, methods=['get'])
    def batch_completion(self, request):
        return self._generate(request, 'batch-completion')

    @action(detail=False, methods=['get'])
    def application_funnel(self, request):
        return self._generate(request, 'application-funnel')

    @action(detail=False, methods=['get'])
    def revenue(self, request):
        return self._generate(request, 'revenue')

    @action(detail=False, methods=['get'])
    def gender_diversity(self, request):
        return self._generate(request, 'gender-diversity')

    @action(detail=False, methods=['get'])
    def regional(self, request):
        return self._generate(request, 'regional')

    @action(detail=False, methods=['get'])
    def monthly_trend(self, request):
        return self._generate(request, 'monthly-trend')

    @action(detail=False, methods=['get'])
    def audit_log(self, request):
        return self._generate(request, 'audit-log')

    @action(detail=False, methods=['get'])
    def compliance(self, request):
        return self._generate(request, 'compliance')

    @action(detail=False, methods=['get'])
    def list_types(self, request):
        return Response(REPORT_TYPES)


class HOScheduledReportViewSet(viewsets.ModelViewSet):
    queryset = ScheduledReport.objects.select_related('created_by').all()
    permission_classes = [permissions.IsAuthenticated, IsHeadOffice]
    ordering = ('-created_at',)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
