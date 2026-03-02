from django.core.exceptions import ValidationError
from django.core.files.images import get_image_dimensions
import mimetypes


def validate_photo_format(file):
    """
    Validate that uploaded file is JPEG or PNG only.
    Checks both MIME type and file extension.
    """
    if not file:
        return

    # Check MIME type
    mime_type, _ = mimetypes.guess_type(file.name)
    if mime_type not in ['image/jpeg', 'image/png']:
        raise ValidationError(
            f'Unsupported photo format. Only JPEG and PNG are allowed. '
            f'Got: {mime_type or "unknown"}',
            code='invalid_photo_format'
        )

    # Check file extension
    allowed_extensions = ['.jpg', '.jpeg', '.png']
    file_ext = str(file.name).lower()
    if not any(file_ext.endswith(ext) for ext in allowed_extensions):
        raise ValidationError(
            'File must have .jpg, .jpeg, or .png extension.',
            code='invalid_extension'
        )

    # Check image dimensions are valid
    try:
        width, height = get_image_dimensions(file)
        if width is None or height is None:
            raise ValidationError(
                'Unable to determine image dimensions. '
                'Please ensure the file is a valid image.',
                code='invalid_image'
            )
    except Exception as e:
        raise ValidationError(
            f'Invalid image file: {str(e)}',
            code='invalid_image'
        )


def validate_photo_size(file, max_size_mb=5):
    """
    Validate that uploaded file does not exceed max size.
    Default: 5MB
    """
    if not file:
        return

    max_size_bytes = max_size_mb * 1024 * 1024
    if file.size > max_size_bytes:
        raise ValidationError(
            f'Photo size exceeds {max_size_mb}MB limit. '
            f'Current size: {file.size / (1024*1024):.2f}MB',
            code='photo_too_large'
        )
