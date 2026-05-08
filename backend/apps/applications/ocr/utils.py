import cv2
import pytesseract
import re
from PIL import Image
import numpy as np
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

pytesseract.pytesseract.tesseract_cmd = getattr(settings, 'TESSERACT_PATH', r'C:\Program Files\Tesseract-OCR\tesseract.exe')


def preprocess_image(image_path):
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    denoised = cv2.medianBlur(thresh, 3)
    return denoised


def extract_nid_number(text):
    patterns = [
        r'(?:ID|ID NO|আইডি|INO|IO NO|সনদ|পরিচয়পত্র|পরিচয়পত্র|আইডনিং)\s*[:\s]?\s*(\d{10,17})',
        r'(\d{10,17})',
    ]

    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            clean = re.sub(r'\D', '', m)
            if len(clean) in (10, 11, 13, 17):
                return clean
    return None


def _clean_bangla_name(raw):
    raw = raw.strip()
    start = None
    for i, ch in enumerate(raw):
        if '\u0980' <= ch <= '\u09FF':
            start = i
            break
    if start is not None:
        raw = raw[start:]
    raw = re.sub(r'[^\u0980-\u09FF\s]', '', raw).strip()
    return raw if len(raw) > 3 else None


def extract_bangla_name(text):
    patterns = [
        r':?\s*[নন]াম\s*[:ঃ\s]\s*([^\n]+)',
        r'[নন]াম\s*:\s*([^\n]+)',
        r'Name\s*:\s*([^\n]+)',
        r'[নন]ামঃ\s*([^\n]+)',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            name = _clean_bangla_name(match.group(1))
            if name:
                return name

    SKIP_LINE_KEYWORDS = [
        'http', 'www', '.com', '@', 'সরকার', 'গণপ্রজাতন্ত্রী', 'জাতীয়',
        'পরিচয়', 'পরিচয়', 'NATIONAL', 'IDENTITY', 'REPUBLIC',
        'Government', 'People', 'Republic', 'স্মার্ট', 'কার্ড',
        'বাংলাদেশ', 'বাংলাদশে',
    ]
    LABEL_WORDS = ['নাম', 'পিতা', 'মাতা', 'জন্ম', 'ঠিকানা', 'ঠকিনা',
                   'আইডি', 'বয়স', 'ধর্ম', 'পেশা', 'রক্ত', 'Father',
                   'Mother', 'DOB', 'ID', 'Address']
    for line in text.split('\n'):
        line_lower = line.lower()
        if any(kw.lower() in line_lower for kw in SKIP_LINE_KEYWORDS):
            continue
        line_stripped = line.strip()
        if any(line_stripped.startswith(w + ':') or line_stripped.startswith(w + 'ঃ') for w in LABEL_WORDS):
            continue
        cleaned = _clean_bangla_name(line)
        if cleaned:
            bn_count = sum(1 for ch in line if '\u0980' <= ch <= '\u09FF')
            if bn_count >= 4 and bn_count > len(line) * 0.3:
                return cleaned

    return None


def extract_father_name(text):
    patterns = [
        r':?\s*প[ি]?[ত][ি]?[োও]?[া]?[র]?\s*নাম\s*[:ঃ]?\s*([^\n]+)',
        r':?\s*পতি\s*[:ঃ\s]\s*([^\n]+)',
        r':?\s*পিতা\s*[:ঃ\s]\s*([^\n]+)',
        r'Father\s*:?\s*([^\n]+)',
        r'পিতাঃ\s*([^\n]+)',
        r'পিতা\s+([\u0980-\u09FF\s]+)',
        r'পতি\s+([\u0980-\u09FF\s]+)',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            bn_cleaned = _clean_bangla_name(name)
            if bn_cleaned:
                return bn_cleaned
            if name:
                return name
    return None


def extract_mother_name(text):
    patterns = [
        r':?\s*মাতার\s*নাম\s*[:ঃ]?\s*([^\n]+)',
        r':?\s*মাতা\s*[:;ঃ\s]\s*([^\n]+)',
        r'Mother\s*:?\s*([^\n]+)',
        r'মাতাঃ\s*([^\n]+)',
        r'মাতা\s+([\u0980-\u09FF\s]+)',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            bn_cleaned = _clean_bangla_name(name)
            if bn_cleaned:
                return bn_cleaned
            if name:
                return name
    return None


BANGLA_DIGITS = str.maketrans('০১২৩৪৫৬৭৮৯', '0123456789')

MONTH_MAP = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
    'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
}

BANGLA_MONTH_MAP = {
    'জানুয়ারি': '01', 'ফেব্রুয়ারি': '02', 'মার্চ': '03', 'এপ্রিল': '04',
    'মে': '05', 'জুন': '06', 'জুলাই': '07', 'আগস্ট': '08',
    'সেপ্টেম্বর': '09', 'অক্টোবর': '10', 'নভেম্বর': '11', 'ডিসেম্বর': '12',
    'জানুয়ারি': '01', 'ফেব্রুয়ারি': '02',
}


def _normalize_date(raw):
    raw = raw.strip()
    raw_latin = raw.translate(BANGLA_DIGITS)

    for m_name, m_num in BANGLA_MONTH_MAP.items():
        if m_name in raw_latin:
            m = re.search(r'(\d{1,2})\s*' + re.escape(m_name) + r'\s*(\d{4})', raw_latin)
            if m:
                day, year = m.group(1).zfill(2), m.group(2)
                return f'{year}-{m_num}-{day}'
            m = re.search(r'(\d{4})\s*' + re.escape(m_name) + r'\s*(\d{1,2})', raw_latin)
            if m:
                year, day = m.group(1), m.group(2).zfill(2)
                return f'{year}-{m_num}-{day}'

    m = re.match(r'(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})', raw_latin)
    if m:
        day, mon, year = m.group(1).zfill(2), m.group(2).lower()[:3], m.group(3)
        month = MONTH_MAP.get(mon)
        if month:
            return f'{year}-{month}-{day}'
    m = re.match(r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', raw_latin)
    if m:
        d1, d2, year = int(m.group(1)), int(m.group(2)), m.group(3)
        if d1 > 12:
            return f'{year}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}'
        if d2 > 12:
            return f'{year}-{m.group(1).zfill(2)}-{m.group(2).zfill(2)}'
        return f'{year}-{m.group(1).zfill(2)}-{m.group(2).zfill(2)}'
    return raw_latin if raw_latin != raw else raw


def extract_date_of_birth(text):
    patterns = [
        r'জন্ম\s*(?:তারিখ|তারখি)?\s*[:ঃ\s]\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
        r'জন্ম\s*(?:তারিখ|তারখি)?\s*[:ঃ\s]\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})',
        r'জন্ম\s*(?:তারিখ|তারখি)?\s*[:ঃ\s]\s*(\d{1,2}\s+[\u0980-\u09FF]+\s+\d{4})',
        r'জন্ম\s*[:ঃ\s]\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
        r'জন্ম\s*[:ঃ\s]\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})',
        r'জন্ম\s*[:ঃ\s]\s*(\d{1,2}\s+[\u0980-\u09FF]+\s+\d{4})',
        r'DOB\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
        r'DOB\s*:?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})',
        r'Date\s*Of\s*Birth\s*:?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})',
        r'Date\s*of\s*Birth\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
        r'Date\s*Of\s*\w+\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})',
        r'Date\s*of\s*Birth\s*:?\s*(\d{1,2}\s+[\u0980-\u09FF]+\s+\d{4})',
        r'(\d{2}[/-]\d{2}[/-]\d{4})',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return _normalize_date(match.group(1))
    return None


def extract_address(text):
    patterns = [
        r'ঠিকানা\s*[:ঃ]\s*([^\n]+(?:\n[^\n]+){0,3})',
        r'ঠকিনা\s*[:ঃ]\s*([^\n]+(?:\n[^\n]+){0,3})',
        r'Address\s*:\s*([^\n]+(?:\n[^\n]+){0,3})',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            address = match.group(1).strip()
            address = re.sub(r'\s+', ' ', address)
            return address[:200]
    return None


def parse_mrz(text):
    mrz_pattern = r'([A-Z<]{2,})([A-Z0-9<]+)'
    match = re.search(mrz_pattern, text)

    if match:
        mrz_line = match.group(0)
        doc_match = re.search(r'[A-Z<]{2}([A-Z0-9<]+)', mrz_line)
        if doc_match:
            doc_number = doc_match.group(1).replace('<', '')
            return {'mrz_raw': mrz_line, 'document_number': doc_number}
    return None


def extract_nid_data(image_path, image_type='front'):
    try:
        processed_img = preprocess_image(image_path)
        pil_image = Image.fromarray(processed_img)

        custom_config = r'--oem 3 --psm 6 -l ben+eng'
        text = pytesseract.image_to_string(pil_image, config=custom_config)

        logger.info(f"OCR extracted text length: {len(text)} characters")

        if image_type == 'front':
            data = {
                'nid_number': extract_nid_number(text),
                'name_bn': extract_bangla_name(text),
                'father_name': extract_father_name(text),
                'mother_name': extract_mother_name(text),
                'date_of_birth': extract_date_of_birth(text),
                'raw_text': text[:500],
            }
        else:
            mrz_data = parse_mrz(text)
            data = {
                'address': extract_address(text),
                'mrz_data': mrz_data,
                'raw_text': text[:500],
            }

        return data

    except Exception as e:
        logger.error(f"OCR extraction failed: {str(e)}")
        return {'error': str(e), 'raw_text': ''}
