from django.urls import path
from .views_public import public_genders, public_educations, public_demographies

urlpatterns = [
    path('genders/', public_genders, name='public-genders'),
    path('educations/', public_educations, name='public-educations'),
    path('demographies/', public_demographies, name='public-demographies'),
]
