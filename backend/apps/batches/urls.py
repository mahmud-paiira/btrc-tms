from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BatchViewSet, BatchWeekPlanViewSet, BatchEnrollmentViewSet

router = DefaultRouter()
router.register(r'batches', BatchViewSet)
router.register(r'week-plans', BatchWeekPlanViewSet)
router.register(r'enrollments', BatchEnrollmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
