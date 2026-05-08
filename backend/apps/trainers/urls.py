from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TrainerViewSet, TrainerMappingViewSet

router = DefaultRouter()
router.register(r'', TrainerViewSet, basename='trainer')
router.register(r'mappings', TrainerMappingViewSet, basename='trainer-mapping')

urlpatterns = [
    path('', include(router.urls)),
]
