from django.core.validators import FileExtensionValidator

ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
ALLOWED_DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']

image_validator = FileExtensionValidator(allowed_extensions=ALLOWED_IMAGE_EXTENSIONS)
document_validator = FileExtensionValidator(allowed_extensions=ALLOWED_DOCUMENT_EXTENSIONS)
