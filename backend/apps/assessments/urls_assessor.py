from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_assessor import AssessorAssessmentViewSet

router = DefaultRouter()
router.register(r'assessment', AssessorAssessmentViewSet, basename='assessor-assessment')

urlpatterns = [
    path('', include(router.urls)),
]
