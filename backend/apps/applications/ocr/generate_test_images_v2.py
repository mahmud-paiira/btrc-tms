from PIL import Image, ImageDraw, ImageFont
import os

FONTS = [
    r"C:\Windows\Fonts\Nirmala.ttc",
    r"C:\Windows\Fonts\kalpurush.ttf",
    r"C:\Windows\Fonts\Siyamrupali.ttf",
]
FONT_PATH = None
for f in FONTS:
    if os.path.exists(f):
        FONT_PATH = f
        break

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "media")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_old_nid():
    img = Image.new('RGB', (1200, 800), 'white')
    draw = ImageDraw.Draw(img)
    font_lg = ImageFont.truetype(FONT_PATH, 42)
    font_md = ImageFont.truetype(FONT_PATH, 36)
    font_sm = ImageFont.truetype(FONT_PATH, 30)

    lines = [
        (font_lg, "গণপ্রজাতন্ত্রী বাংলাদেশ সরকার"),
        (font_lg, "জাতীয় পরিচয়পত্র"),
        (font_md, "নাম: মোঃ রহিম উদ্দিন"),
        (font_md, "পিতার নাম: মোঃ করিম উদ্দিন"),
        (font_md, "মাতার নাম: মোছাঃ রহিমা বেগম"),
        (font_md, "জন্ম তারিখ: ১৫ মার্চ ১৯৮৫"),
        (font_md, "আইডি নং: 1234567890123"),
        (font_sm, "ঠিকানা: ঢাকা, বাংলাদেশ"),
    ]

    y = 30
    for font, text in lines:
        draw.text((50, y), text, font=font, fill=(0, 0, 0))
        y += 70

    path = os.path.join(OUTPUT_DIR, "test_old_nid_v2.jpg")
    img.save(path, quality=98)
    print(f"Using font: {FONT_PATH}")
    print(f"Saved: {path}")
    return path

def create_new_nid_front():
    img = Image.new('RGB', (1200, 800), (250, 248, 255))
    draw = ImageDraw.Draw(img)
    font_lg = ImageFont.truetype(FONT_PATH, 40)
    font_md = ImageFont.truetype(FONT_PATH, 34)
    font_label = ImageFont.truetype(FONT_PATH, 26)

    draw.text((50, 20), "গণপ্রজাতন্ত্রী বাংলাদেশ সরকার", font=font_lg, fill=(0, 0, 120))
    draw.rectangle([30, 75, 1170, 80], fill=(0, 100, 0))
    draw.text((50, 100), "বাংলাদেশ স্মার্ট কার্ড", font=font_lg, fill=(0, 0, 120))

    fields = [
        (170, "নাম", font_label, (100,100,100), "শাহীন আলম", font_md, (0,0,0)),
        (250, "পিতা", font_label, (100,100,100), "আব্দুল জলিল", font_md, (0,0,0)),
        (330, "মাতা", font_label, (100,100,100), "জাহানারা বেগম", font_md, (0,0,0)),
        (410, "জন্ম", font_label, (100,100,100), "১০-০৫-১৯৯২", font_md, (0,0,0)),
        (490, "আইডি নং", font_label, (100,100,100), "9876543210123", font_md, (0,0,0)),
    ]

    for y_off, label, lf, lc, value, vf, vc in fields:
        draw.text((50, y_off), label, font=lf, fill=lc)
        draw.text((200, y_off), value, font=vf, fill=vc)

    en_fields = [
        (170, "Name", font_label, (100,100,100), "SHAHEEN ALAM", font_md, (0,0,0)),
        (250, "Father", font_label, (100,100,100), "ABDUL JALIL", font_md, (0,0,0)),
        (330, "Mother", font_label, (100,100,100), "JAHANARA BEGUM", font_md, (0,0,0)),
        (410, "DOB", font_label, (100,100,100), "10-05-1992", font_md, (0,0,0)),
        (490, "ID NO", font_label, (100,100,100), "9876543210123", font_md, (0,0,0)),
    ]

    for y_off, label, lf, lc, value, vf, vc in en_fields:
        draw.text((600, y_off), label, font=lf, fill=lc)
        draw.text((750, y_off), value, font=vf, fill=vc)

    path = os.path.join(OUTPUT_DIR, "test_new_nid_v2.jpg")
    img.save(path, quality=98)
    print(f"Saved: {path}")
    return path

if __name__ == "__main__":
    create_old_nid()
    create_new_nid_front()
