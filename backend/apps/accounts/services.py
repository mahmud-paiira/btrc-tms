import secrets
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def generate_otp(length=6):
    test_otp = getattr(settings, 'TEST_OTP', None)
    if test_otp and settings.DEBUG:
        logger.warning('TEST_OTP is active — development mode only')
        return str(test_otp).zfill(length)[:length]
    return ''.join(str(secrets.randbelow(10)) for _ in range(length))


def send_otp_sms(phone, otp_code):
    logger.debug(f'[SMS MOCK] OTP for {phone}: {otp_code}')
