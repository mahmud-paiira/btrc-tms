from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views_ho import HOReportViewSet, HOScheduledReportViewSet

router = DefaultRouter()
router.register(r'reports', HOReportViewSet, basename='ho-report')
router.register(r'scheduled-reports', HOScheduledReportViewSet, basename='ho-scheduled-report')

urlpatterns = [
    path('', include(router.urls)),
]
