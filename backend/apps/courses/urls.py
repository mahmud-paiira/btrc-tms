from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CourseViewSet,
    CourseConfigurationViewSet,
    CourseBillViewSet,
    CourseChapterViewSet,
    UnitOfCompetencyViewSet,
)

router = DefaultRouter()
router.register(r'', CourseViewSet, basename='course')
router.register(r'configurations', CourseConfigurationViewSet, basename='course-config')
router.register(r'bills', CourseBillViewSet, basename='course-bill')
router.register(r'chapters', CourseChapterViewSet, basename='course-chapter')
router.register(r'competencies', UnitOfCompetencyViewSet, basename='course-competency')

urlpatterns = [
    path('', include(router.urls)),
]
