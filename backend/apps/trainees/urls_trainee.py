from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_trainee import TraineePortalViewSet

router = DefaultRouter()
router.register(r'me', TraineePortalViewSet, basename='trainee-portal')

urlpatterns = [
    path('', include(router.urls)),
]
