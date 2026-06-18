from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Gender, Education, Demography
from .serializers import GenderSerializer, EducationSerializer, DemographySerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def public_genders(request):
    qs = Gender.objects.all().order_by('order')
    return Response(GenderSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_educations(request):
    qs = Education.objects.all().order_by('order')
    return Response(EducationSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_demographies(request):
    qs = Demography.objects.select_related('parent').all().order_by('type', 'name_bn')
    return Response(DemographySerializer(qs, many=True).data)
