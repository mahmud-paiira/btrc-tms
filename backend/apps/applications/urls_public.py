from django.urls import path
from .ocr.views import ocr_extract, OCRStatusView, OCRTestView
from .views_public import check_nid, public_apply

urlpatterns = [
    path('ocr/status/', OCRStatusView.as_view(), name='ocr-status'),
    path('ocr/extract/', ocr_extract, name='ocr-extract'),
    path('ocr/test/', OCRTestView.as_view(), name='ocr-test'),
    path('check-nid/<str:nid>/', check_nid, name='check-nid'),
    path('apply/', public_apply, name='public-apply'),
]
