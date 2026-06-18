import random
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def generate_otp(length=6):
    test_otp = getattr(settings, 'TEST_OTP', None)
    if test_otp:
        return str(test_otp).zfill(length)[:length]
    return ''.join(str(random.randint(0, 9)) for _ in range(length))


def send_otp_sms(phone, otp_code):
    logger.info(f'[SMS MOCK] OTP for {phone}: {otp_code}')
    print(f'[SMS] আপনার OTP কোড: {otp_code}')
