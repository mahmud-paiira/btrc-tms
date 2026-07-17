BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯'

def to_english_digits(value):
    """Convert Bengali/Arabic-Indic digits to English digits."""
    if not isinstance(value, str):
        value = str(value)
    for i, bd in enumerate(BANGLA_DIGITS):
        value = value.replace(bd, str(i))
    return value
