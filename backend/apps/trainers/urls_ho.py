from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_ho import HOTrainerViewSet, HOTrainerMappingViewSet

router = DefaultRouter()
router.register(r'trainers', HOTrainerViewSet, basename='ho-trainer')
router.register(r'trainer-mappings', HOTrainerMappingViewSet, basename='ho-trainer-mapping')

urlpatterns = [
    path('', include(router.urls)),
]
