import os
import uuid
import tempfile
import logging

from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import extract_nid_data
from ..serializers_public import NIDUploadSerializer
from ..models import OcrAuditLog

logger = logging.getLogger(__name__)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def ocr_extract(request):
    serializer = NIDUploadSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    front = serializer.validated_data['front_image']
    back = serializer.validated_data.get('back_image')

    session_id = uuid.uuid4().hex[:16]
    ip = request.META.get('REMOTE_ADDR', '')
    tmp_dir = tempfile.mkdtemp()

    front_path = None
    back_path = None
    audit = None

    try:
        front_path = os.path.join(tmp_dir, f'{session_id}_front.jpg')
        with open(front_path, 'wb+') as f:
            for chunk in front.chunks():
                f.write(chunk)

        if back:
            back_path = os.path.join(tmp_dir, f'{session_id}_back.jpg')
            with open(back_path, 'wb+') as f:
                for chunk in back.chunks():
                    f.write(chunk)

        front_data = extract_nid_data(front_path, 'front')

        back_data = None
        if back_path:
            back_data = extract_nid_data(back_path, 'back')

        raw_text = front_data.get('raw_text', '')

        nid = front_data.get('nid_number', '')
        name_bn = front_data.get('name_bn', '')
        father_name = front_data.get('father_name', '')
        mother_name = front_data.get('mother_name', '')
        date_of_birth = front_data.get('date_of_birth', '')
        address = back_data.get('address', '') if back_data else ''

        has_nid = bool(nid)
        has_name = bool(name_bn)
        confidence = (50 if has_nid else 0) + (30 if has_name else 0) + (10 if father_name else 0) + (10 if mother_name else 0)

        if confidence >= 60 and has_nid and has_name:
            result_status = OcrAuditLog.Result.SUCCESS
            http_status = status.HTTP_200_OK
            response_data = {
                'success': True,
                'confidence': confidence,
                'requires_manual': False,
                'data': {
                    'nid': nid,
                    'name_bn': name_bn,
                    'name_en': '',
                    'father_name': father_name,
                    'mother_name': mother_name,
                    'date_of_birth': date_of_birth,
                    'address': address,
                    'blood_group': '',
                },
            }

        elif confidence >= 30:
            result_status = OcrAuditLog.Result.LOW_CONFIDENCE
            http_status = status.HTTP_200_OK
            response_data = {
                'success': True,
                'confidence': confidence,
                'requires_manual': True,
                'message': 'OCR নির্ভুলতা কম। অনুগ্রহ করে তথ্য যাচাই করে সম্পাদন করুন।',
                'data': {
                    'nid': nid,
                    'name_bn': name_bn,
                    'name_en': '',
                    'father_name': father_name,
                    'mother_name': mother_name,
                    'date_of_birth': date_of_birth,
                    'address': address,
                    'blood_group': '',
                },
            }
        else:
            result_status = OcrAuditLog.Result.FAILED
            http_status = status.HTTP_422_UNPROCESSABLE_ENTITY
            response_data = {
                'success': False,
                'confidence': confidence,
                'requires_manual': True,
                'error': 'OCR নির্ভুলতা খুবই কম। অনুগ্রহ করে ম্যানুয়ালি তথ্য দিন।',
                'message': 'আপনার এনআইডির ছবি ভালোভাবে তুলে আবার চেষ্টা করুন। অথবা নিচের ফর্মটি পূরণ করুন।',
            }

        audit = OcrAuditLog(
            session_id=session_id,
            front_image=front_path or '',
            back_image=back_path or '',
            extracted_nid=nid[:20],
            extracted_name=name_bn[:255],
            confidence_score=confidence,
            result=result_status,
            raw_text_snippet=raw_text[:500],
            ip_address=ip or None,
        )
        audit.save()

        logger.info(
            f'OCR {session_id}: confidence={confidence}, '
            f'nid={"✓" if has_nid else "✗"}, name={"✓" if has_name else "✗"}'
        )

        return Response(response_data, status=http_status)

    except Exception as e:
        logger.error(f'OCR error [{session_id}]: {str(e)}', exc_info=True)

        if audit is None:
            audit = OcrAuditLog(
                session_id=session_id,
                front_image=front_path or '',
                back_image=back_path or '',
                result=OcrAuditLog.Result.FAILED,
                error_message=str(e)[:500],
                ip_address=ip or None,
            )
            audit.save()
        else:
            audit.result = OcrAuditLog.Result.FAILED
            audit.error_message = str(e)[:500]
            audit.save(update_fields=['result', 'error_message'])

        return Response(
            {
                'success': False,
                'error': 'OCR প্রসেসিং ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
                'requires_manual': True,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    finally:
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)


class OCRStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from django.conf import settings
        import os

        try:
            tesseract_path = getattr(settings, 'TESSERACT_PATH', '')
            if not tesseract_path or not os.path.exists(tesseract_path):
                return Response({
                    'available': False,
                    'message': 'Tesseract not installed. Please contact administrator.',
                })

            tessdata_dir = os.path.join(os.path.dirname(tesseract_path), 'tessdata')
            ben_file = os.path.join(tessdata_dir, 'ben.traineddata')

            if not os.path.exists(ben_file):
                return Response({
                    'available': False,
                    'message': 'Bengali language data missing. OCR may not work correctly.',
                })

            return Response({
                'available': True,
                'message': 'OCR is ready',
                'tesseract_path': tesseract_path,
            })
        except Exception as e:
            return Response({
                'available': False,
                'message': f'OCR error: {str(e)}',
            })


class OCRTestView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, format=None):
        image_file = request.FILES.get('image')
        image_type = request.data.get('type', 'front')

        if not image_file:
            return Response(
                {'error': 'No image file provided'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            for chunk in image_file.chunks():
                tmp_file.write(chunk)
            tmp_path = tmp_file.name

        try:
            result = extract_nid_data(tmp_path, image_type)
            os.unlink(tmp_path)
            return Response({
                'success': True,
                'data': result,
                'message': 'OCR extraction completed',
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"OCR test failed: {str(e)}")
            os.unlink(tmp_path)
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
