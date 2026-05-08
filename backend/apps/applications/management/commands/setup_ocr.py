"""
Django management command to setup OCR
Run: python manage.py setup_ocr
"""

from django.core.management.base import BaseCommand
import subprocess
import os
import sys


class Command(BaseCommand):
    help = 'Setup Tesseract OCR for the application'

    def handle(self, *args, **options):
        self.stdout.write("Setting up Tesseract OCR...")

        # Check if running on Windows
        if sys.platform == 'win32':
            tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

            # Add to PATH if not already there
            import winreg
            current_path = os.environ.get('PATH', '')
            tess_dir = r'C:\Program Files\Tesseract-OCR'

            if tess_dir not in current_path:
                self.stdout.write(f"Adding {tess_dir} to PATH...")
                # Add to user PATH
                SDK = winreg.HKEY_CURRENT_USER
                key = winreg.OpenKey(SDK, 'Environment', 0, winreg.KEY_ALL_ACCESS)
                try:
                    existing_path, _ = winreg.QueryValueEx(key, 'PATH')
                except:
                    existing_path = ''
                new_path = f"{existing_path};{tess_dir}"
                winreg.SetValueEx(key, 'PATH', 0, winreg.REG_EXPAND_SZ, new_path)
                winreg.CloseKey(key)
                self.stdout.write(self.style.SUCCESS("Added Tesseract to PATH"))
            else:
                self.stdout.write("Tesseract already in PATH")

        self.stdout.write(self.style.SUCCESS("OCR setup complete!"))
        self.stdout.write("\nNext steps:")
        self.stdout.write("1. Restart your terminal")
        self.stdout.write("2. Run: python manage.py test_ocr")
