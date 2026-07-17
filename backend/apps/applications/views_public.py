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
def verify_nid(request):
    nid = request.data.get('nid', '').replace(' ', '').replace('-', '')
    date_of_birth = request.data.get('date_of_birth', '')

    if len(nid) not in (10, 17):
        return Response({'verified': False, 'message': 'এনআইডি ১০ বা ১৭ ডিজিটের হতে হবে'}, status=400)
    if not date_of_birth:
        return Response({'verified': False, 'message': 'জন্ম তারিখ নির্বাচন করুন'}, status=400)

    from datetime import date
    try:
        dob = date.fromisoformat(date_of_birth)
    except (ValueError, TypeError):
        return Response({'verified': False, 'message': 'জন্ম তারিখ ফরমেট সঠিক নয়'}, status=400)

    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    if age < 21:
        return Response({'verified': False, 'message': f'বয়স {age} বছর। ন্যূনতম ২১ বছর হতে হবে।'})

    return Response({
        'verified': True,
        'message': 'এনআইডি সফলভাবে যাচাই করা হয়েছে',
        'name_bn': request.user.full_name_bn if request.user.is_authenticated else '',
        'date_of_birth': date_of_birth,
        'age': age,
    })


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def public_apply(request):
    data = request.data.copy()
    if request.user.is_authenticated:
        data['user_id'] = request.user.id
        data['name_bn'] = request.user.full_name_bn
        data['name_en'] = request.user.full_name_en
        data['nid'] = request.user.nid
        data['phone'] = request.user.phone
    serializer = PublicApplySerializer(data=data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    application = serializer.save()

    confirm = ApplicationConfirmSerializer(application)
    return Response(
        confirm.data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
def print_application(request, application_no):
    try:
        app = Application.objects.select_related(
            'chosen_center', 'circular__course', 'user',
        ).get(application_no=application_no)
    except Application.DoesNotExist:
        return Response({'error': 'আবেদন পাওয়া যায়নি'}, status=404)

    from django.template.loader import render_to_string
    from weasyprint import HTML
    from django.http import HttpResponse

    html = render_to_string('applications/print_application.html', {
        'app': app,
        'circular': app.circular,
        'center': app.chosen_center,
        'course': app.circular.course,
    })
    pdf = HTML(string=html).write_pdf()
    filename = f'application_{app.application_no}.pdf'
    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    return response
