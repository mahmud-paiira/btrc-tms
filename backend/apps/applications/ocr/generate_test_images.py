from PIL import Image, ImageDraw, ImageFont
import os

FONT_PATH = r"C:\Windows\Fonts\kalpurush.ttf"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "media")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def draw_text_centered(draw, y, text, font, fill=(0,0,0)):
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    x = (800 - w) // 2
    draw.text((x, y), text, font=font, fill=fill)

def create_old_nid():
    img = Image.new('RGB', (800, 500), 'white')
    draw = ImageDraw.Draw(img)
    font_lg = ImageFont.truetype(FONT_PATH, 36)
    font_md = ImageFont.truetype(FONT_PATH, 28)
    font_sm = ImageFont.truetype(FONT_PATH, 24)

    draw.text((50, 20), "গণপ্রজাতন্ত্রী বাংলাদেশ সরকার", font=font_lg, fill=(0,0,0))
    draw.text((50, 60), "জাতীয় পরিচয়পত্র", font=font_lg, fill=(0,0,0))
    draw.text((50, 120), "নাম: মোঃ রহিম উদ্দিন", font=font_md, fill=(0,0,0))
    draw.text((50, 160), "পিতার নাম: মোঃ করিম উদ্দিন", font=font_md, fill=(0,0,0))
    draw.text((50, 200), "মাতার নাম: মোছাঃ রহিমা বেগম", font=font_md, fill=(0,0,0))
    draw.text((50, 240), "জন্ম তারিখ: ১৫ মার্চ ১৯৮৫", font=font_md, fill=(0,0,0))
    draw.text((50, 280), "আইডি নং: 1234567890123", font=font_md, fill=(0,0,0))
    draw.text((50, 320), "ঠিকানা: ঢাকা, বাংলাদেশ", font=font_sm, fill=(100,100,100))
    draw.text((50, 420), "Old NID - Test Image", font=font_sm, fill=(200,0,0))

    path = os.path.join(OUTPUT_DIR, "test_old_nid_with_parents.jpg")
    img.save(path, quality=95)
    print(f"Saved: {path}")
    return path

def create_new_nid_front():
    img = Image.new('RGB', (800, 500), (245, 245, 250))
    draw = ImageDraw.Draw(img)
    font_xl = ImageFont.truetype(FONT_PATH, 32)
    font_lg = ImageFont.truetype(FONT_PATH, 26)
    font_md = ImageFont.truetype(FONT_PATH, 22)
    font_sm = ImageFont.truetype(FONT_PATH, 18)

    draw.text((50, 20), "গণপ্রজাতন্ত্রী বাংলাদেশ সরকার", font=font_xl, fill=(0,0,100))
    draw.rectangle([30, 60, 770, 65], fill=(0,100,0))
    draw.text((50, 80), "বাংলাদেশ স্মার্ট কার্ড", font=font_lg, fill=(0,0,100))
    draw.text((50, 130), "নাম", font=font_sm, fill=(100,100,100))
    draw.text((50, 155), "শাহীন আলম", font=font_lg, fill=(0,0,0))
    draw.text((50, 200), "পিতা", font=font_sm, fill=(100,100,100))
    draw.text((50, 225), "আব্দুল জলিল", font=font_lg, fill=(0,0,0))
    draw.text((50, 270), "মাতা", font=font_sm, fill=(100,100,100))
    draw.text((50, 295), "জাহানারা বেগম", font=font_lg, fill=(0,0,0))
    draw.text((50, 340), "জন্ম", font=font_sm, fill=(100,100,100))
    draw.text((50, 365), "১০-০৫-১৯९২", font=font_lg, fill=(0,0,0))
    draw.text((50, 410), "আইডি নং", font=font_sm, fill=(100,100,100))
    draw.text((50, 435), "9876543210123", font=font_lg, fill=(0,0,0))
    draw.text((500, 130), "নাম", font=font_sm, fill=(100,100,100))
    draw.text((500, 155), "SHAHEEN ALAM", font=font_lg, fill=(0,0,0))
    draw.text((500, 200), "পিতা", font=font_sm, fill=(100,100,100))
    draw.text((500, 225), "ABDUL JALIL", font=font_lg, fill=(0,0,0))
    draw.text((500, 270), "মাতা", font=font_sm, fill=(100,100,100))
    draw.text((500, 295), "JAHANARA BEGUM", font=font_lg, fill=(0,0,0))
    draw.text((500, 340), "DOB", font=font_sm, fill=(100,100,100))
    draw.text((500, 365), "10-05-1992", font=font_lg, fill=(0,0,0))
    draw.text((500, 410), "ID NO", font=font_sm, fill=(100,100,100))
    draw.text((500, 435), "9876543210123", font=font_lg, fill=(0,0,0))
    draw.text((50, 470), "New Smart NID - Test Image", font=font_sm, fill=(200,0,0))

    path = os.path.join(OUTPUT_DIR, "test_new_nid_front_with_parents.jpg")
    img.save(path, quality=95)
    print(f"Saved: {path}")
    return path

if __name__ == "__main__":
    create_old_nid()
    create_new_nid_front()
