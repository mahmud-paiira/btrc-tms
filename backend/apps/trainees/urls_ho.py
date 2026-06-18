from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_ho import HOTraineeViewSet

router = DefaultRouter()
router.register(r'trainees', HOTraineeViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
