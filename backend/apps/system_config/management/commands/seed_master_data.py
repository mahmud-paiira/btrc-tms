from django.core.management.base import BaseCommand
from apps.system_config.models import Gender, Education, Demography


GENDERS = [
    ('পুরুষ', 'Male', 1),
    ('মহিলা', 'Female', 2),
    ('উভয়', 'Other', 3),
]

EDUCATIONS = [
    ('প্রাথমিক (পঞ্চম শ্রেণী)', 'Primary (Class 5)', 5, 1),
    ('প্রাথমিক (অষ্টম শ্রেণী)', 'Junior (Class 8)', 8, 2),
    ('এসএসসি / সমমান', 'SSC / Equivalent', 10, 3),
    ('এইচএসসি / সমমান', 'HSC / Equivalent', 12, 4),
    ('স্নাতক (পাস)', 'Bachelor (Pass)', 14, 5),
    ('স্নাতক (সম্মান)', 'Bachelor (Honours)', 15, 6),
    ('স্নাতকোত্তর', 'Masters', 16, 7),
    ('এমফিল', 'MPhil', 18, 8),
    ('পিএইচডি', 'PhD', 20, 9),
    ('কারিগরি ডিপ্লোমা', 'Technical Diploma', 13, 10),
    ('কারিগরি সার্টিফিকেট', 'Technical Certificate', 11, 11),
    ('ধর্মীয় শিক্ষা', 'Religious Education', 9, 12),
]

DIVISIONS = [
    ('ঢাকা', 'Dhaka', '30'),
    ('চট্টগ্রাম', 'Chattogram', '20'),
    ('রাজশাহী', 'Rajshahi', '50'),
    ('খুলনা', 'Khulna', '40'),
    ('বরিশাল', 'Barisal', '10'),
    ('সিলেট', 'Sylhet', '60'),
    ('রংপুর', 'Rangpur', '55'),
    ('ময়মনসিংহ', 'Mymensingh', '35'),
]

DISTRICTS = {
    'ঢাকা': [
        ('ঢাকা', 'Dhaka', '30'),
        ('নারায়ণগঞ্জ', 'Narayanganj', '67'),
        ('গাজীপুর', 'Gazipur', '33'),
        ('টাঙ্গাইল', 'Tangail', '93'),
        ('কিশোরগঞ্জ', 'Kishoreganj', '48'),
        ('মানিকগঞ্জ', 'Manikganj', '54'),
        ('মুন্সিগঞ্জ', 'Munshiganj', '59'),
        ('নরসিংদী', 'Narsingdi', '68'),
        ('ফরিদপুর', 'Faridpur', '29'),
        ('গোপালগঞ্জ', 'Gopalganj', '35'),
        ('মাদারীপুর', 'Madaripur', '54'),
        ('রাজবাড়ী', 'Rajbari', '82'),
        ('শরীয়তপুর', 'Shariatpur', '86'),
    ],
    'চট্টগ্রাম': [
        ('চট্টগ্রাম', 'Chattogram', '20'),
        ('কক্সবাজার', "Cox's Bazar", '22'),
        ('বান্দরবান', 'Bandarban', '12'),
        ('রাঙ্গামাটি', 'Rangamati', '84'),
        ('খাগড়াছড়ি', 'Khagrachari', '47'),
        ('নোয়াখালী', 'Noakhali', '75'),
        ('লক্ষ্মীপুর', 'Lakshmipur', '51'),
        ('ফেনী', 'Feni', '30'),
        ('ব্রাহ্মণবাড়িয়া', 'Brahmanbaria', '13'),
        ('কুমিল্লা', 'Comilla', '25'),
        ('চাঁদপুর', 'Chandpur', '16'),
    ],
    'রাজশাহী': [
        ('রাজশাহী', 'Rajshahi', '50'),
        ('বগুড়া', 'Bogura', '10'),
        ('নওগাঁ', 'Naogaon', '65'),
        ('নাটোর', 'Natore', '69'),
        ('চাঁপাইনবাবগঞ্জ', 'Chapainawabganj', '17'),
        ('পাবনা', 'Pabna', '76'),
        ('সিরাজগঞ্জ', 'Sirajganj', '88'),
        ('জয়পুরহাট', 'Joypurhat', '38'),
    ],
    'খুলনা': [
        ('খুলনা', 'Khulna', '40'),
        ('সাতক্ষীরা', 'Satkhira', '87'),
        ('বাগেরহাট', 'Bagerhat', '08'),
        ('যশোর', 'Jashore', '41'),
        ('ঝিনাইদহ', 'Jhenaidah', '44'),
        ('মাগুরা', 'Magura', '53'),
        ('নড়াইল', 'Narail', '66'),
        ('কুষ্টিয়া', 'Kushtia', '50'),
        ('চুয়াডাঙ্গা', 'Chuadanga', '19'),
        ('মেহেরপুর', 'Meherpur', '57'),
    ],
    'বরিশাল': [
        ('বরিশাল', 'Barisal', '10'),
        ('ভোলা', 'Bhola', '09'),
        ('পটুয়াখালী', 'Patuakhali', '78'),
        ('বরগুনা', 'Barguna', '07'),
        ('ঝালকাঠি', 'Jhalokathi', '42'),
        ('পিরোজপুর', 'Pirojpur', '80'),
    ],
    'সিলেট': [
        ('সিলেট', 'Sylhet', '60'),
        ('মৌলভীবাজার', 'Moulvibazar', '58'),
        ('হবিগঞ্জ', 'Habiganj', '36'),
        ('সুনামগঞ্জ', 'Sunamganj', '90'),
    ],
    'রংপুর': [
        ('রংপুর', 'Rangpur', '55'),
        ('দিনাজপুর', 'Dinajpur', '27'),
        ('কুড়িগ্রাম', 'Kurigram', '50'),
        ('গাইবান্ধা', 'Gaibandha', '32'),
        ('লালমনিরহাট', 'Lalmonirhat', '52'),
        ('নীলফামারী', 'Nilphamari', '73'),
        ('পঞ্চগড়', 'Panchagarh', '77'),
        ('ঠাকুরগাঁও', 'Thakurgaon', '94'),
    ],
    'ময়মনসিংহ': [
        ('ময়মনসিংহ', 'Mymensingh', '35'),
        ('জামালপুর', 'Jamalpur', '39'),
        ('শেরপুর', 'Sherpur', '89'),
        ('নেত্রকোণা', 'Netrokona', '72'),
    ],
}


class Command(BaseCommand):
    help = 'Seed comprehensive master data (Gender, Education, Demography)'

    def handle(self, *args, **options):
        self.stdout.write('Seeding master data...')

        for name_bn, name_en, order in GENDERS:
            Gender.objects.get_or_create(
                name_en=name_en,
                defaults={'name_bn': name_bn, 'order': order}
            )
        self.stdout.write(f'  [OK] {Gender.objects.count()} genders')

        for name_bn, name_en, rank, order in EDUCATIONS:
            edu, created = Education.objects.get_or_create(
                name_bn=name_bn,
                defaults={'name_en': name_en, 'rank': rank, 'order': order}
            )
            if not created:
                edu.name_en = name_en
                edu.rank = rank
                edu.order = order
                edu.save(update_fields=['name_en', 'rank', 'order'])
        self.stdout.write(f'  [OK] {Education.objects.count()} educations')

        for name_bn, name_en, code in DIVISIONS:
            div, created = Demography.objects.get_or_create(
                name_bn=name_bn, type='division',
                defaults={'name_en': name_en, 'bbs_code': code}
            )
            if not created:
                div.name_en = name_en
                div.bbs_code = code
                div.save(update_fields=['name_en', 'bbs_code'])
        self.stdout.write(f'  [OK] {Demography.objects.filter(type="division").count()} divisions')

        div_map = {}
        for name_bn, name_en, code in DIVISIONS:
            div = Demography.objects.get(name_bn=name_bn, type='division')
            div_map[name_bn] = div

        district_count = 0
        for div_name, districts in DISTRICTS.items():
            parent = div_map[div_name]
            for name_bn, name_en, code in districts:
                dist, created = Demography.objects.get_or_create(
                    name_bn=name_bn, type='district',
                    defaults={'name_en': name_en, 'parent': parent, 'bbs_code': code}
                )
                if not created:
                    dist.name_en = name_en
                    dist.parent = parent
                    dist.bbs_code = code
                    dist.save(update_fields=['name_en', 'parent', 'bbs_code'])
                    district_count += 1
                else:
                    district_count += 1
        self.stdout.write(f'  [OK] {district_count} districts (total {Demography.objects.filter(type="district").count()})')

        self.stdout.write(self.style.SUCCESS('Master data seed complete!'))
