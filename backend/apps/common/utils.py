BANGLA_DIGITS = '\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef'


def to_english_digits(value):
    """Convert Bengali/Arabic-Indic digits to English digits."""
    if not isinstance(value, str):
        value = str(value)
    for i, bd in enumerate(BANGLA_DIGITS):
        value = value.replace(bd, str(i))
    return value
