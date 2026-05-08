from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_ho import HOAssessorViewSet, HOAssessorMappingViewSet

router = DefaultRouter()
router.register(r'assessors', HOAssessorViewSet, basename='ho-assessor')
router.register(r'assessor-mappings', HOAssessorMappingViewSet, basename='ho-assessor-mapping')

urlpatterns = [
    path('', include(router.urls)),
]
