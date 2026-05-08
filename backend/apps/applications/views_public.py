import os
import tempfile
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.conf import settings
from .models import Application
from .serializers_public import (
    NIDUploadSerializer,
    PublicApplySerializer,
    ApplicationConfirmSerializer,
)
from .ocr.utils import extract_nid_data


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def ocr_extract(request):
    serializer = NIDUploadSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    front = serializer.validated_data['front_image']
    back = serializer.validated_data.get('back_image')

    tmp_dir = tempfile.mkdtemp()
    try:
        front_path = os.path.join(tmp_dir, 'front.jpg')
        with open(front_path, 'wb+') as f:
            for chunk in front.chunks():
                f.write(chunk)

        back_path = None
        if back:
            back_path = os.path.join(tmp_dir, 'back.jpg')
            with open(back_path, 'wb+') as f:
                for chunk in back.chunks():
                    f.write(chunk)

        extracted = extract_nid_data(front_path, back_path)

        return Response({
            'success': True,
            'data': {
                'nid': extracted.get('nid', ''),
                'name_bn': extracted.get('name_bn', ''),
                'father_name': extracted.get('father_name', ''),
                'mother_name': extracted.get('mother_name', ''),
                'date_of_birth': extracted.get('date_of_birth', ''),
                'address': extracted.get('address', ''),
                'blood_group': extracted.get('blood_group', ''),
            },
        })
    except Exception as e:
        return Response(
            {'success': False, 'error': f'OCR প্রসেসিং ব্যর্থ হয়েছে: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    finally:
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)


@api_view(['GET'])
def check_nid(request, nid):
    clean_nid = nid.replace(' ', '').replace('-', '')
    exists = Application.objects.filter(nid=clean_nid).exists()
    return Response({
        'exists': exists,
        'nid': clean_nid,
        'message': 'এই এনআইডি নম্বর দিয়ে ইতিমধ্যে আবেদন করা হয়েছে' if exists else 'এনআইডি নম্বরটি ব্যবহারযোগ্য',
    })


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def public_apply(request):
    serializer = PublicApplySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    application = serializer.save()

    confirm = ApplicationConfirmSerializer(application)
    return Response(
        confirm.data,
        status=status.HTTP_201_CREATED,
    )
