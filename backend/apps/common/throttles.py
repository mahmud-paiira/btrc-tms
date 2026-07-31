from rest_framework.throttling import AnonRateThrottle


class LoginThrottle(AnonRateThrottle):
    scope = 'auth'


class OTPThrottle(AnonRateThrottle):
    scope = 'otp'


class RegistrationThrottle(AnonRateThrottle):
    scope = 'registration'


class PublicCheckThrottle(AnonRateThrottle):
    scope = 'public_check'


class PublicApplyThrottle(AnonRateThrottle):
    scope = 'public_apply'


class OCRThrottle(AnonRateThrottle):
    scope = 'ocr'


class PrintThrottle(AnonRateThrottle):
    scope = 'print'


class VerifyCertThrottle(AnonRateThrottle):
    scope = 'verify_cert'
