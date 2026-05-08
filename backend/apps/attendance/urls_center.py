from django.urls import path
from .views_center import CenterAttendanceViewSet

urlpatterns = [
    path('batch/<int:batch_id>/', CenterAttendanceViewSet.as_view({'get': 'batch_calendar'}), name='center-attendance-batch'),
    path('mark/', CenterAttendanceViewSet.as_view({'post': 'mark'}), name='center-attendance-mark'),
    path('eligibility/<int:batch_id>/', CenterAttendanceViewSet.as_view({'get': 'eligibility'}), name='center-attendance-eligibility'),
    path('summary/<int:batch_id>/', CenterAttendanceViewSet.as_view({'get': 'summary'}), name='center-attendance-summary'),
]