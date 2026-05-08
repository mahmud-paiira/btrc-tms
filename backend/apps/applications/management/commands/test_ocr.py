"""
Test script for OCR functionality
Run: python manage.py test_ocr
"""

from django.core.management.base import BaseCommand
from django.conf import settings
import pytesseract
import subprocess


class Command(BaseCommand):
    help = 'Test OCR configuration and functionality'

    def _write(self, msg):
        try:
            self.stdout.write(msg)
        except UnicodeEncodeError:
            safe = msg.encode('ascii', errors='replace').decode('ascii')
            self.stdout.write(safe)

    def handle(self, *args, **options):
        self.stdout.write("OCR Testing Configuration...")

        # 1. Check Tesseract installation
        self.stdout.write("\n1. Checking Tesseract installation...")
        try:
            result = subprocess.run(
                [settings.TESSERACT_PATH, '--version'],
                capture_output=True, text=True,
            )
            if result.returncode == 0:
                self.stdout.write(self.style.SUCCESS(f"   Tesseract found: {settings.TESSERACT_PATH}"))
                self.stdout.write(f"   Version: {result.stdout.splitlines()[0]}")
            else:
                self.stdout.write(self.style.ERROR(f"   Tesseract error: {result.stderr}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   Tesseract not found: {e}"))
            return

        # 2. Check Bengali language data
        self.stdout.write("\n2. Checking Bengali language data...")
        import os
        tessdata_path = os.path.join(os.path.dirname(settings.TESSERACT_PATH), 'tessdata', 'ben.traineddata')
        if os.path.exists(tessdata_path):
            self.stdout.write(self.style.SUCCESS(f"   Bengali language data found: {tessdata_path}"))
        else:
            self.stdout.write(self.style.WARNING(f"   Bengali data not found at: {tessdata_path}"))
            self.stdout.write("   Please download ben.traineddata from:")
            self.stdout.write("   https://github.com/tesseract-ocr/tessdata/blob/main/ben.traineddata")
            self.stdout.write(f"   And place in: {os.path.dirname(tessdata_path)}")

        # 3. Test extraction with sample images
        self.stdout.write("\n3. Testing OCR extraction...")
        from apps.applications.ocr.utils import extract_nid_data

        samples = [
            ('media/sample1_nid.jpg', 'Old NID'),
            ('media/sample2_nid-front.jpg', 'New NID (front)'),
        ]

        for sample_path, label in samples:
            if os.path.exists(sample_path):
                self._write(f"\n   --- {label} ---")
                result = extract_nid_data(sample_path, 'front')
                nid = result.get('nid_number') or 'None'
                name = result.get('name_bn') or 'None'
                father = result.get('father_name') or 'None'
                dob = result.get('date_of_birth') or 'None'
                self._write(f"   NID: {nid}")
                self._write(f"   Name: {name}")
                self._write(f"   Father: {father}")
                self._write(f"   DOB: {dob}")
                if nid and nid != 'None':
                    self._write(self.style.SUCCESS(f"   OK - NID extracted"))
            else:
                self._write(f"\n   --- {label} ---")
                self._write(f"   No sample at {sample_path}")

        self.stdout.write(self.style.SUCCESS("\nOCR test complete!"))
