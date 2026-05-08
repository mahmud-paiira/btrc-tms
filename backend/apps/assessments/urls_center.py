from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_center import CenterAssessmentViewSet

router = DefaultRouter()
router.register(r'assessment', CenterAssessmentViewSet, basename='center-assessment')

urlpatterns = [
    path('', include(router.urls)),
]
