from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_ho import HOSystemConfigViewSet, GenderViewSet, EducationViewSet, DemographyViewSet

router = DefaultRouter()
router.register(r'', HOSystemConfigViewSet, basename='ho-system')
router.register(r'genders', GenderViewSet, basename='ho-gender')
router.register(r'educations', EducationViewSet, basename='ho-education')
router.register(r'demographies', DemographyViewSet, basename='ho-demography')

urlpatterns = [
    path('', include(router.urls)),
]
