from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssessorViewSet, AssessorMappingViewSet, TrainerAssessorLinkViewSet

router = DefaultRouter()
router.register(r'', AssessorViewSet, basename='assessor')
router.register(r'mappings', AssessorMappingViewSet, basename='assessor-mapping')
router.register(r'trainer-links', TrainerAssessorLinkViewSet, basename='trainer-assessor-link')

urlpatterns = [
    path('', include(router.urls)),
]
