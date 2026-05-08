import os
from django.test import TestCase
from .utils import (
    extract_nid_number,
    _clean_bangla_name,
    extract_bangla_name,
    extract_father_name,
    extract_mother_name,
    _normalize_date,
    extract_date_of_birth,
    extract_address,
    extract_nid_data,
)

MEDIA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "media")


class ExtractNidNumberTests(TestCase):
    def test_plain_digits_13(self):
        self.assertEqual(extract_nid_number("1234567890123"), "1234567890123")

    def test_plain_digits_10(self):
        self.assertEqual(extract_nid_number("1234567890"), "1234567890")

    def test_plain_digits_17(self):
        self.assertEqual(extract_nid_number("12345678901234567"), "12345678901234567")

    def test_plain_digits_11(self):
        self.assertEqual(extract_nid_number("46371159205"), "46371159205")

    def test_with_id_label(self):
        text = "ID: 1234567890123"
        self.assertEqual(extract_nid_number(text), "1234567890123")

    def test_with_id_no_label(self):
        text = "ID NO 1234567890123"
        self.assertEqual(extract_nid_number(text), "1234567890123")

    def test_with_bangla_ai_label(self):
        text = "আইডি নং: 1234567890123"
        self.assertEqual(extract_nid_number(text), "1234567890123")

    def test_with_bangla_ai_label_no_colon(self):
        text = "আইডি 1234567890123"
        self.assertEqual(extract_nid_number(text), "1234567890123")

    def test_with_ainding_label(self):
        text = "আইডনিং: 9876543210123"
        self.assertEqual(extract_nid_number(text), "9876543210123")

    def test_skips_short_digits(self):
        self.assertIsNone(extract_nid_number("12345"))

    def test_mixed_text(self):
        text = "Name: John\nID: 1234567890123\nAddress: Dhaka"
        self.assertEqual(extract_nid_number(text), "1234567890123")


class CleanBanglaNameTests(TestCase):
    def test_cleans_non_bangla_prefix(self):
        result = _clean_bangla_name("NC Is রহিম উদ্দিন")
        self.assertEqual(result, "রহিম উদ্দিন")

    def test_cleans_english_only(self):
        self.assertIsNone(_clean_bangla_name("John Doe"))

    def test_cleans_mixed_middle(self):
        result = _clean_bangla_name("We ছাঃ ARAN বগেম")
        self.assertEqual(result, "ছাঃ  বগেম")

    def test_short_name(self):
        self.assertIsNone(_clean_bangla_name("ab"))


class ExtractBanglaNameTests(TestCase):
    def test_with_label_colon(self):
        text = "নাম: মোঃ মাহমুদ হোসেন"
        self.assertEqual(extract_bangla_name(text), "মোঃ মাহমুদ হোসেন")

    def test_with_label_bengali_colon(self):
        text = "নামঃ মোঃ মাহমুদ হোসেন"
        self.assertEqual(extract_bangla_name(text), "মোঃ মাহমুদ হোসেন")

    def test_fallback_no_label(self):
        text = "মোঃ মাহমুদ হোসেন\nবয়স: ৩০"
        self.assertEqual(extract_bangla_name(text), "মোঃ মাহমুদ হোসেন")

    def test_skips_government_lines(self):
        text = "গণপ্রজাতন্ত্রী বাংলাদেশ সরকার\nনাম: মোঃ রহিম উদ্দিন"
        self.assertEqual(extract_bangla_name(text), "মোঃ রহিম উদ্দিন")

    def test_skips_smart_card_lines(self):
        text = "বাংলাদেশ স্মার্ট কার্ড\nনাম: শাহীন আলম"
        self.assertEqual(extract_bangla_name(text), "শাহীন আলম")

    def test_handles_garbled_label(self):
        text = "নাম NC Is রহিম উদ্দিন"
        result = extract_bangla_name(text)
        self.assertIsNotNone(result)
        self.assertIn("রহিম", result)

    def test_skips_labeled_lines_in_fallback(self):
        text = "কিছু তথ্য\nনাম: শাহীন আলম\nপিতা: আব্দুল জলিল"
        self.assertEqual(extract_bangla_name(text), "শাহীন আলম")


class ExtractFatherNameTests(TestCase):
    def test_bangla_pitar_name(self):
        text = "পিতার নাম: মোঃ করিম উদ্দিন"
        self.assertEqual(extract_father_name(text), "মোঃ করিম উদ্দিন")

    def test_bangla_pita_no_name(self):
        text = "পিতা: আব্দুল জলিল"
        self.assertEqual(extract_father_name(text), "আব্দুল জলিল")

    def test_english_father(self):
        text = "Father: ABDUL JALIL"
        self.assertEqual(extract_father_name(text), "ABDUL JALIL")

    def test_bangla_pati(self):
        text = "পতি আব্দুল জলিল"
        self.assertEqual(extract_father_name(text), "আব্দুল জলিল")

    def test_garbled_pitar(self):
        text = "পতোার নাম: করিম উদ্দিন"
        self.assertEqual(extract_father_name(text), "করিম উদ্দিন")

    def test_not_found(self):
        self.assertIsNone(extract_father_name("নাম: কিছু"))


class ExtractMotherNameTests(TestCase):
    def test_bangla_matar_name(self):
        text = "মাতার নাম: মোছাঃ রহিমা বেগম"
        self.assertEqual(extract_mother_name(text), "মোছাঃ রহিমা বেগম")

    def test_bangla_mata(self):
        text = "মাতা: জাহানারা বেগম"
        result = extract_mother_name(text)
        self.assertIn("জাহানারা", result)

    def test_english_mother(self):
        text = "Mother: JAHANARA BEGUM"
        self.assertEqual(extract_mother_name(text), "JAHANARA BEGUM")

    def test_not_found(self):
        self.assertIsNone(extract_mother_name("নাম: কিছু"))

    def test_mata_no_colon(self):
        text = "মাতা জাহানারা বেগম"
        self.assertIn("জাহানারা", extract_mother_name(text))


class NormalizeDateTests(TestCase):
    def test_english_month_name(self):
        self.assertEqual(_normalize_date("15 Dec 1979"), "1979-12-15")

    def test_dd_mm_yyyy(self):
        self.assertEqual(_normalize_date("15-03-1985"), "1985-03-15")

    def test_mm_dd_yyyy(self):
        self.assertEqual(_normalize_date("03-15-1985"), "1985-03-15")

    def test_dd_slash_mm_slash_yyyy(self):
        self.assertEqual(_normalize_date("15/03/1985"), "1985-03-15")

    def test_bangla_month_march(self):
        self.assertEqual(_normalize_date("১৫ মার্চ ১৯৮৫"), "1985-03-15")

    def test_bangla_month_april(self):
        self.assertEqual(_normalize_date("১৫ এপ্রিল ১৯৮৫"), "1985-04-15")

    def test_bangla_digits_in_date(self):
        self.assertEqual(_normalize_date("১০-০৫-১৯৯২"), "1992-10-05")

    def test_bangla_digits_swapped(self):
        self.assertEqual(_normalize_date("০৫-১০-১৯৯২"), "1992-05-10")


class ExtractDateOfBirthTests(TestCase):
    def test_bangla_label_date(self):
        text = "জন্ম: 15-03-1985"
        self.assertEqual(extract_date_of_birth(text), "1985-03-15")

    def test_bangla_label_with_tarik(self):
        text = "জন্ম তারিখ: 15-03-1985"
        self.assertEqual(extract_date_of_birth(text), "1985-03-15")

    def test_bangla_label_with_garbled_tarik(self):
        text = "জন্ম তারখি: ১৫ মার্চ ১৯৮৫"
        self.assertEqual(extract_date_of_birth(text), "1985-03-15")

    def test_english_dob(self):
        text = "DOB: 15 Dec 1979"
        self.assertEqual(extract_date_of_birth(text), "1979-12-15")

    def test_date_of_birth_label(self):
        text = "Date of Birth: 01 May 1984"
        self.assertEqual(extract_date_of_birth(text), "1984-05-01")

    def test_bare_date_fallback(self):
        text = "কিছু তথ্য\n15-03-1985\nঠিকানা"
        self.assertEqual(extract_date_of_birth(text), "1985-03-15")


class ExtractAddressTests(TestCase):
    def test_bangla_label(self):
        text = "ঠিকানা: ঢাকা, বাংলাদেশ"
        self.assertEqual(extract_address(text), "ঢাকা, বাংলাদেশ")

    def test_english_label(self):
        text = "Address: Dhaka, Bangladesh"
        self.assertEqual(extract_address(text), "Dhaka, Bangladesh")

    def test_not_found(self):
        self.assertIsNone(extract_address("নাম: কিছু"))


class IntegrationTests(TestCase):
    def test_old_nid_v2_extracts_all_fields(self):
        path = os.path.join(MEDIA_DIR, "test_old_nid_v2.jpg")
        if not os.path.exists(path):
            self.skipTest("test_old_nid_v2.jpg not found")
        result = extract_nid_data(path, "front")
        self.assertEqual(result.get("nid_number"), "1234567890123")
        self.assertIsNotNone(result.get("name_bn"))
        self.assertIsNotNone(result.get("father_name"))
        self.assertIsNotNone(result.get("mother_name"))
        self.assertIsNotNone(result.get("date_of_birth"))

    def test_new_nid_v2_extracts_all_fields(self):
        path = os.path.join(MEDIA_DIR, "test_new_nid_v2.jpg")
        if not os.path.exists(path):
            self.skipTest("test_new_nid_v2.jpg not found")
        result = extract_nid_data(path, "front")
        self.assertEqual(result.get("nid_number"), "9876543210123")
        self.assertIn("শাহীন", result.get("name_bn", ""))
        self.assertIn("জললি", result.get("father_name", ""))
        self.assertIn("জাহানারা", result.get("mother_name", ""))
        self.assertEqual(result.get("date_of_birth"), "1992-10-05")

    def test_nid_number_extracted_from_old_nid(self):
        path = os.path.join(MEDIA_DIR, "test_old_nid_v2.jpg")
        if not os.path.exists(path):
            self.skipTest("test_old_nid_v2.jpg not found")
        result = extract_nid_data(path, "front")
        self.assertIsNotNone(result.get("nid_number"))
