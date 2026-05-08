from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JobPlacementViewSet

router = DefaultRouter()
router.register(r'', JobPlacementViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
