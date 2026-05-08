from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect, render
from django.http import JsonResponse
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
import subprocess
import os
import tempfile
from pathlib import Path
from django.contrib import messages
import urllib.request
from apps.applications.ocr.utils import extract_nid_data


def root_redirect(request):
    if settings.DEBUG:
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        return redirect(frontend_url)
    return JsonResponse({
        "service": "BRTC Training Management System",
        "version": "1.0",
        "docs": "/swagger/",
        "admin": "/admin/",
    })

schema_view = get_schema_view(
    openapi.Info(
        title="BRTC TMS API",
        default_version='v1',
        description="Training Management System for BRTC – 27 Training Centers",
        terms_of_service="https://www.brtc.gov.bd/",
        contact=openapi.Contact(email="admin@brtc.gov.bd"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

def ocr_status_view(request):
    context = {}
    try:
        result = subprocess.run(
            [getattr(settings, 'TESSERACT_PATH', 'tesseract'), '--version'],
            capture_output=True, text=True, timeout=10,
        )
        context['tesseract_version'] = result.stdout.splitlines()[0] if result.returncode == 0 else 'Not found'

        lang_result = subprocess.run(
            [getattr(settings, 'TESSERACT_PATH', 'tesseract'), '--list-langs'],
            capture_output=True, text=True, timeout=10,
        )
        available = lang_result.stdout.splitlines()
        context['ben_available'] = 'ben' in available
        context['tesseract_path'] = getattr(settings, 'TESSERACT_PATH', 'tesseract')
    except Exception as e:
        context['error'] = str(e)
    return render(request, 'admin/ocr_status.html', context)


def ocr_test_view(request):
    if request.method != 'POST':
        return redirect('ocr-status')
    image_file = request.FILES.get('test_image')
    image_type = request.POST.get('image_type', 'front')
    if not image_file:
        messages.error(request, 'No image file provided')
        return redirect('ocr-status')
    try:
        suffix = Path(image_file.name).suffix or '.jpg'
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            for chunk in image_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name
        result = extract_nid_data(tmp_path, image_type)
        os.unlink(tmp_path)
        if result.get('error'):
            messages.error(request, f'OCR Error: {result["error"]}')
        else:
            lines = [f'{k}: {v}' for k, v in result.items() if v]
            messages.success(request, 'Extracted:\n' + '\n'.join(lines))
    except Exception as e:
        messages.error(request, f'OCR failed: {e}')
    return redirect('ocr-status')


def download_ben_data_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    tessdata_dir = Path(getattr(settings, 'TESSERACT_PATH', 'tesseract')).parent / 'tessdata'
    if not tessdata_dir.exists():
        tessdata_dir = Path(r'C:\Program Files\Tesseract-OCR\tessdata')
    dest = tessdata_dir / 'ben.traineddata'
    if dest.exists():
        return JsonResponse({'message': 'ben.traineddata already exists'})
    try:
        url = 'https://github.com/tesseract-ocr/tessdata/raw/main/ben.traineddata'
        urllib.request.urlretrieve(url, dest)
        return JsonResponse({'message': 'ben.traineddata downloaded successfully'})
    except Exception as e:
        return JsonResponse({'message': f'Download failed: {e}'}, status=500)


urlpatterns = [
    path('', root_redirect, name='root'),
    path('admin/', admin.site.urls),
    path('admin/ocr-status/', admin.site.admin_view(ocr_status_view), name='ocr-status'),
    path('admin/ocr-test/', admin.site.admin_view(ocr_test_view), name='ocr-test'),

    path('api/admin/download-ben-data/', admin.site.admin_view(download_ben_data_view), name='download-ben-data'),

    # API modules
    path('api/auth/', include('apps.accounts.urls')),
    path('api/centers/', include('apps.centers.urls')),
    path('api/courses/', include('apps.courses.urls')),
    path('api/trainers/', include('apps.trainers.urls')),
    path('api/assessors/', include('apps.assessors.urls')),
    path('api/circulars/', include('apps.circulars.urls')),
    path('api/applications/', include('apps.applications.urls')),
    path('api/batches/', include('apps.batches.urls')),
    path('api/attendance/', include('apps.attendance.urls')),
    path('api/assessments/', include('apps.assessments.urls')),
    path('api/certificates/', include('apps.certificates.urls')),
    path('api/jobplacement/', include('apps.jobplacement.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/trainees/', include('apps.trainees.urls')),
    path('api/trainee/', include('apps.trainees.urls_trainee')),

    # Center endpoints
    path('api/center/', include('apps.applications.urls_center')),
    path('api/center/attendance/', include('apps.attendance.urls_center')),
    path('api/center/', include('apps.centers.urls_center_dashboard')),
    path('api/center/', include('apps.assessments.urls_center')),
    path('api/center/', include('apps.certificates.urls_center')),
    path('api/center/', include('apps.jobplacement.urls_center')),

    # Head Office endpoints
    path('api/ho/', include('apps.centers.urls_ho')),
    path('api/ho/', include('apps.centers.urls_ho_centers')),
    path('api/ho/', include('apps.courses.urls_ho')),
    path('api/ho/', include('apps.trainers.urls_ho')),
    path('api/ho/', include('apps.assessors.urls_ho')),
    path('api/ho/', include('apps.circulars.urls_ho')),
    path('api/ho/', include('apps.finance.urls_ho')),
    path('api/ho/', include('apps.reports.urls_ho')),
    path('api/ho/', include('apps.accounts.urls_ho')),
    path('api/ho/system/', include('apps.system_config.urls_ho')),

    # Public endpoints
    path('api/public/', include('apps.applications.urls_public')),
    path('api/public/', include('apps.certificates.urls_public')),

    # Swagger / ReDoc
    re_path(r'^swagger(?P<format>\.json|\.yaml)$',
            schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0),
         name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0),
         name='schema-redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
