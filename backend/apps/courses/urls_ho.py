from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_ho import (
    HOCourseViewSet, HOCourseChapterViewSet,
    HOCourseBillViewSet, HOCourseCompetencyViewSet,
)

router = DefaultRouter()
router.register(r'courses', HOCourseViewSet, basename='ho-course')
router.register(r'chapters', HOCourseChapterViewSet, basename='ho-chapter')
router.register(r'bills', HOCourseBillViewSet, basename='ho-bill')
router.register(r'competencies', HOCourseCompetencyViewSet, basename='ho-competency')

urlpatterns = [
    path('', include(router.urls)),
]
