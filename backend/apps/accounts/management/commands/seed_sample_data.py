from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from apps.accounts.models import User, Role
from apps.centers.models import Center, Infrastructure, Employee
from apps.courses.models import Course
from apps.trainers.models import Trainer, TrainerMapping
from apps.assessors.models import Assessor, AssessorMapping
from apps.circulars.models import Circular
from apps.applications.models import Application
from apps.batches.models import Batch
from apps.trainees.models import Trainee
from apps.finance.models import Budget


def seed_centers():
    centers = [
        Center(code='DHAKA_TCU', name_bn='ঢাকা প্রশিক্ষণ কেন্দ্র', name_en='Dhaka Training Center', address='১০৮, পুরানা পল্টন, ঢাকা-১০০০', phone='০২-৯৫১৩৯৪০', email='dhaka_tcu@brtc.gov.bd'),
        Center(code='CTG_TCU', name_bn='চট্টগ্রাম প্রশিক্ষণ কেন্দ্র', name_en='Chattogram Training Center', address='আগ্রাবাদ, চট্টগ্রাম', phone='০৩১-২৫১২৩৪', email='ctg_tcu@brtc.gov.bd'),
        Center(code='KHL_TCU', name_bn='খুলনা প্রশিক্ষণ কেন্দ্র', name_en='Khulna Training Center', address='বয়রা, খুলনা', phone='০৪১-৭৬১২৩৪', email='khl_tcu@brtc.gov.bd'),
        Center(code='RSH_TCU', name_bn='রাজশাহী প্রশিক্ষণ কেন্দ্র', name_en='Rajshahi Training Center', address='সপুরা, রাজশাহী', phone='০৭২১-৭৭১২৩৪', email='rsh_tcu@brtc.gov.bd'),
    ]
    created = []
    for c in centers:
        obj, _ = Center.objects.get_or_create(code=c.code, defaults=dict(name_bn=c.name_bn, name_en=c.name_en, address=c.address, phone=c.phone, email=c.email))
        created.append(obj)
    return created


def seed_infrastructure(centers):
    rooms = []
    for ci, center in enumerate(centers):
        for ri in range(1, 4):
            obj, _ = Infrastructure.objects.get_or_create(
                center=center, room_no=f'{center.code}-RM-{ri:02d}',
                defaults=dict(location_bn=f'ভবন-{ci+1}, তলা-{ri}', location_en=f'Building-{ci+1}, Floor-{ri}', capacity=30 + ri * 10, status='available'),
            )
            rooms.append(obj)
    return rooms


def seed_courses():
    courses = [
        Course(code='DRV-FND-MRN-001', name_bn='ড্রাইভিং ফাউন্ডেশন (মর্নিং)', name_en='Driving Foundation (Morning)', course_type='driver', term='foundation', session='morning', duration_months=3, duration_hours=240, total_training_days=60, fee=15000, status='active'),
        Course(code='DRV-ADV-DAY-002', name_bn='ড্রাইভিং অ্যাডভান্সড (ডে)', name_en='Driving Advanced (Day)', course_type='driver', term='advanced', session='day', duration_months=3, duration_hours=240, total_training_days=60, fee=20000, status='active'),
        Course(code='MEC-FND-EVN-003', name_bn='মেকানিক ফাউন্ডেশন (ইভিনিং)', name_en='Mechanic Foundation (Evening)', course_type='mechanic', term='foundation', session='evening', duration_months=6, duration_hours=480, total_training_days=120, fee=25000, status='active'),
        Course(code='MEC-ADV-MRN-004', name_bn='মেকানিক অ্যাডভান্সড (মর্নিং)', name_en='Mechanic Advanced (Morning)', course_type='mechanic', term='advanced', session='morning', duration_months=6, duration_hours=480, total_training_days=120, fee=30000, status='active'),
        Course(code='SPV-FND-DAY-005', name_bn='সুপারভাইজার ফাউন্ডেশন (ডে)', name_en='Supervisor Foundation (Day)', course_type='supervisor', term='foundation', session='day', duration_months=3, duration_hours=200, total_training_days=50, fee=18000, status='active'),
    ]
    created = []
    for c in courses:
        obj, _ = Course.objects.get_or_create(code=c.code, defaults=dict(name_bn=c.name_bn, name_en=c.name_en, course_type=c.course_type, term=c.term, session=c.session, duration_months=c.duration_months, duration_hours=c.duration_hours, total_training_days=c.total_training_days, fee=c.fee, status=c.status))
        created.append(obj)
    return created


def seed_users():
    users_data = [
        dict(email='ctgadmin@brtc.gov.bd', password='ctg123', user_type='center_admin', full_name_bn='চট্টগ্রাম প্রশাসক', full_name_en='CTG Center Admin', phone='01710000001', nid='2234567891', is_staff=True),
        dict(email='khladmin@brtc.gov.bd', password='khl123', user_type='center_admin', full_name_bn='খুলনা প্রশাসক', full_name_en='KHL Center Admin', phone='01710000002', nid='2234567892', is_staff=True),
        dict(email='rshadmin@brtc.gov.bd', password='rsh123', user_type='center_admin', full_name_bn='রাজশাহী প্রশাসক', full_name_en='RSH Center Admin', phone='01710000003', nid='2234567893', is_staff=True),
        dict(email='trainer2@brtc.gov.bd', password='trainer123', user_type='trainer', full_name_bn='প্রশিক্ষক হাসান', full_name_en='Trainer Hasan', phone='01710000004', nid='2234567894'),
        dict(email='trainer3@brtc.gov.bd', password='trainer123', user_type='trainer', full_name_bn='প্রশিক্ষক ফাতেমা', full_name_en='Trainer Fatema', phone='01710000005', nid='2234567895'),
        dict(email='trainer4@brtc.gov.bd', password='trainer123', user_type='trainer', full_name_bn='প্রশিক্ষক জাহাঙ্গীর', full_name_en='Trainer Jahangir', phone='01710000006', nid='2234567896'),
        dict(email='assessor2@brtc.gov.bd', password='assessor123', user_type='assessor', full_name_bn='মূল্যায়নকারী নাসরিন', full_name_en='Assessor Nasrin', phone='01710000007', nid='2234567897'),
        dict(email='assessor3@brtc.gov.bd', password='assessor123', user_type='assessor', full_name_bn='মূল্যায়নকারী কামাল', full_name_en='Assessor Kamal', phone='01710000008', nid='2234567898'),
    ]
    users = []
    for data in users_data:
        password = data.pop('password')
        user, _ = User.objects.get_or_create(email=data['email'], defaults=data)
        user.set_password(password)
        user.save(update_fields=['password'])
        users.append(user)
    return users


def seed_trainers(users_map, centers):
    trainer_configs = [
        ('trainer@brtc.gov.bd', 'TNR-MRN-001', '1234567892', date(1985, 3, 15), 'রহিম মিয়া', 'সফিয়া বেগম', 'বিএসসি ইঞ্জিনিয়ারিং', 'ড্রাইভিং প্রশিক্ষণ'),
        ('trainer2@brtc.gov.bd', 'TNR-MRN-002', '2234567894', date(1990, 7, 20), 'হাসান আলী', 'জরিনা খাতুন', 'ডিপ্লোমা ইঞ্জিনিয়ারিং', 'মেকানিক প্রশিক্ষণ'),
        ('trainer3@brtc.gov.bd', 'TNR-MRN-003', '2234567895', date(1988, 11, 5), 'ফাতেমা বেগম', 'মঞ্জুরা খাতুন', 'এমএ', 'সুপারভাইজার প্রশিক্ষণ'),
        ('trainer4@brtc.gov.bd', 'TNR-MRN-004', '2234567896', date(1992, 1, 10), 'জাহাঙ্গীর আলম', 'আমেনা বেগম', 'বিএসসি', 'ড্রাইভিং প্রশিক্ষণ'),
    ]
    trainers = []
    for email, tno, nid, dob, father, mother, edu, exp in trainer_configs:
        user = users_map[email]
        tr, _ = Trainer.objects.get_or_create(user=user, defaults=dict(trainer_no=tno, nid=nid, date_of_birth=dob, father_name_bn=father, mother_name_bn=mother, education_qualification=edu, expertise_area=exp, years_of_experience=8, bank_account_no='12345678901', bank_name='সোনালী ব্যাংক', status='active', approval_status='approved'))
        trainers.append(tr)
    return trainers


def seed_assessors(users_map, centers):
    assessor_configs = [
        ('assessor@brtc.gov.bd', 'ASS-MRN-001', '1234567893', date(1980, 5, 10), 'করিম হোসেন', 'রশিদা বেগম', 'এমএসসি ইঞ্জিনিয়ারিং', 'ড্রাইভিং মূল্যায়ন'),
        ('assessor2@brtc.gov.bd', 'ASS-MRN-002', '2234567897', date(1985, 9, 15), 'নাসরিন আক্তার', 'মরিয়ম বেগম', 'বিএসসি', 'মেকানিক মূল্যায়ন'),
        ('assessor3@brtc.gov.bd', 'ASS-MRN-003', '2234567898', date(1982, 2, 20), 'কামাল উদ্দিন', 'নুরজাহান বেগম', 'এমএসসি', 'সুপারভাইজার মূল্যায়ন'),
    ]
    assessors = []
    for email, ano, nid, dob, father, mother, edu, exp in assessor_configs:
        user = users_map[email]
        a, _ = Assessor.objects.get_or_create(user=user, defaults=dict(assessor_no=ano, nid=nid, date_of_birth=dob, father_name_bn=father, mother_name_bn=mother, education_qualification=edu, expertise_area=exp, years_of_experience=10, bank_account_no='98765432101', bank_name='জনতা ব্যাংক', status='active', approval_status='approved', certification='সার্টিফাইড অ্যাসেসর'))
        assessors.append(a)
    return assessors


def seed_mappings(trainers, assessors, centers, courses):
    mapping_configs = [
        # trainer index, center index, course index
        (0, 0, 0), (0, 0, 1), (1, 1, 2), (1, 1, 3), (2, 0, 4), (2, 2, 4), (3, 0, 0), (3, 3, 0), (1, 2, 2),
    ]
    for ti, ci, coi in mapping_configs:
        t = trainers[ti]; center = centers[ci]; course = courses[coi]
        TrainerMapping.objects.get_or_create(trainer=t, center=center, course=course, defaults=dict(is_primary=True, status='active'))
    for ai, ci, coi in [(0, 0, 0), (1, 1, 2), (2, 0, 4), (0, 2, 0), (1, 3, 3)]:
        a = assessors[ai]; center = centers[ci]; course = courses[coi]
        AssessorMapping.objects.get_or_create(assessor=a, center=center, course=course, defaults=dict(status='active'))


def seed_employees(users_map, centers):
    emp_configs = [
        ('center@brtc.gov.bd', 'DHAKA_TCU', 'EMP-DHK-001', 'কেন্দ্র ব্যবস্থাপক', 'Center Manager', date(2022, 1, 1)),
        ('ctgadmin@brtc.gov.bd', 'CTG_TCU', 'EMP-CTG-001', 'কেন্দ্র ব্যবস্থাপক', 'Center Manager', date(2022, 6, 1)),
        ('khladmin@brtc.gov.bd', 'KHL_TCU', 'EMP-KHL-001', 'কেন্দ্র ব্যবস্থাপক', 'Center Manager', date(2023, 1, 1)),
        ('rshadmin@brtc.gov.bd', 'RSH_TCU', 'EMP-RSH-001', 'কেন্দ্র ব্যবস্থাপক', 'Center Manager', date(2023, 6, 1)),
    ]
    for email, ccode, empno, des_bn, des_en, join_date in emp_configs:
        user = users_map[email]
        center = next(c for c in centers if c.code == ccode)
        Employee.objects.get_or_create(user=user, defaults=dict(employee_no=empno, center=center, designation_bn=des_bn, designation_en=des_en, joining_date=join_date, status='active'))


def seed_circulars(centers, courses, users_map):
    today = date.today()
    circulars = []
    configs = [
        (0, 0, 'ড্রাইভিং ফাউন্ডেশন কোর্সে ভর্তি বিজ্ঞপ্তি', 'Driving Foundation Admission Circular', today - timedelta(days=30), today + timedelta(days=15), today + timedelta(days=45), today + timedelta(days=135), 50),
        (0, 1, 'ড্রাইভিং অ্যাডভান্সড কোর্সে ভর্তি বিজ্ঞপ্তি', 'Driving Advanced Admission Circular', today - timedelta(days=15), today + timedelta(days=30), today + timedelta(days=60), today + timedelta(days=150), 40),
        (1, 2, 'মেকানিক ফাউন্ডেশন কোর্সে ভর্তি বিজ্ঞপ্তি', 'Mechanic Foundation Admission Circular', today - timedelta(days=20), today + timedelta(days=20), today + timedelta(days=50), today + timedelta(days=230), 30),
        (2, 4, 'সুপারভাইজার ফাউন্ডেশন কোর্সে ভর্তি বিজ্ঞপ্তি', 'Supervisor Foundation Admission Circular', today - timedelta(days=10), today + timedelta(days=25), today + timedelta(days=55), today + timedelta(days=145), 35),
        (3, 0, 'রাজশাহীতে ড্রাইভিং ফাউন্ডেশন কোর্সে ভর্তি বিজ্ঞপ্তি', 'Rajshahi Driving Foundation Admission', today - timedelta(days=5), today + timedelta(days=35), today + timedelta(days=65), today + timedelta(days=155), 45),
    ]
    for ci, coi, title_bn, title_en, app_start, app_end, train_start, train_end, seats in configs:
        circ, _ = Circular.objects.get_or_create(
            public_url=f'{centers[ci].code}-{courses[coi].code}'.lower(),
            defaults=dict(center=centers[ci], course=courses[coi], title_bn=title_bn, title_en=title_en, description=f'{title_bn} - বিস্তারিত তথ্যের জন্য কেন্দ্রে যোগাযোগ করুন।', application_start_date=app_start, application_end_date=app_end, training_start_date=train_start, training_end_date=train_end, total_seats=seats, remaining_seats=seats, fee=courses[coi].fee, status='published'),
        )
        circulars.append(circ)
    return circulars


def seed_applications_and_trainees(centers, courses, circulars, users_map):
    trainee_configs = [
        ('trainee@brtc.gov.bd', 'trainee123', 0, 0, 'প্রশিক্ষণার্থী সুমন', 'Trainee Sumon', '01700000005', '1234567894', 'রফিক মিয়া', 'সাফিয়া বেগম', date(1998, 5, 15), '১২৩৪৫৬৭৮৯০১২৩', 'ঢাকা', 'ঢাকা', 'এসএসসি'),
        ('trainee2@brtc.gov.bd', 'trainee123', 0, 0, 'প্রশিক্ষণার্থী করিম', 'Trainee Karim', '01720000001', '3234567891', 'আব্দুল করিম', 'জরিনা বেগম', date(1997, 3, 10), '৩২৩৪৫৬৭৮৯০১২', 'ঢাকা', 'ঢাকা', 'এইচএসসি'),
        ('trainee3@brtc.gov.bd', 'trainee123', 0, 1, 'প্রশিক্ষণার্থী রিনা', 'Trainee Rina', '01720000002', '3234567892', 'আব্দুল জলিল', 'রোমেনা বেগম', date(1999, 7, 22), '৩২৩৪৫৬৭৮৯০২৩', 'নারায়ণগঞ্জ', 'নারায়ণগঞ্জ', 'এসএসসি'),
        ('trainee4@brtc.gov.bd', 'trainee123', 1, 2, 'প্রশিক্ষণার্থী জসিম', 'Trainee Jasim', '01720000003', '3234567893', 'মোতালেব মিয়া', 'ছবি বেগম', date(1996, 11, 5), '৩২৩৪৫৬৭৮৯০৩৪', 'চট্টগ্রাম', 'চট্টগ্রাম', 'এইচএসসি'),
        ('trainee5@brtc.gov.bd', 'trainee123', 1, 2, 'প্রশিক্ষণার্থী নওশাদ', 'Trainee Nowshad', '01720000004', '3234567894', 'ইউসুফ মিয়া', 'আছিয়া বেগম', date(1995, 2, 18), '৩২৩৪৫৬৭৮৯০৪৫', 'কক্সবাজার', 'কক্সবাজার', 'ডিগ্রি'),
        ('trainee6@brtc.gov.bd', 'trainee123', 2, 4, 'প্রশিক্ষণার্থী শাহিন', 'Trainee Shahin', '01720000005', '3234567895', 'শাহজাহান', 'নূরজাহান', date(1998, 9, 30), '৩২৩৪৫৬৭৮৯০৫৬', 'খুলনা', 'খুলনা', 'এইচএসসি'),
        ('trainee7@brtc.gov.bd', 'trainee123', 2, 4, 'প্রশিক্ষণার্থী সাবিনা', 'Trainee Sabina', '01720000006', '3234567896', 'হাশেম মিয়া', 'রাবেয়া বেগম', date(2000, 1, 12), '৩২৩৪৫৬৭৮৯০৬৭', 'বাগেরহাট', 'বাগেরহাট', 'এসএসসি'),
        ('trainee8@brtc.gov.bd', 'trainee123', 3, 0, 'প্রশিক্ষণার্থী রাশেদ', 'Trainee Rashed', '01720000007', '3234567897', 'মঞ্জুর মিয়া', 'সখিনা বেগম', date(1997, 6, 25), '৩২৩৪৫৬৭৮৯০৭৮', 'রাজশাহী', 'রাজশাহী', 'এইচএসসি'),
        ('trainee9@brtc.gov.bd', 'trainee123', 3, 0, 'প্রশিক্ষণার্থী নাজমা', 'Trainee Nazma', '01720000008', '3234567898', 'আজিজ মিয়া', 'আমেনা বেগম', date(1999, 4, 8), '৩২৩৪৫৬৭৮৯০৮৯', 'নওগাঁ', 'নওগাঁ', 'ডিগ্রি'),
        ('trainee10@brtc.gov.bd', 'trainee123', 0, 0, 'প্রশিক্ষণার্থী ফরহাদ', 'Trainee Farhad', '01720000009', '3234567899', 'আনোয়ার মিয়া', 'শাহানারা', date(1996, 8, 14), '৩২৩৪৫৬৭৮৯০৯০', 'গাজীপুর', 'গাজীপুর', 'এইচএসসি'),
        ('trainee11@brtc.gov.bd', 'trainee123', 0, 1, 'প্রশিক্ষণার্থী মিতু', 'Trainee Mitu', '01720000010', '3234567800', 'জাফর মিয়া', 'রেহানা বেগম', date(1998, 12, 3), '৩২৩৪৫৬৭৮০৯১', 'কিশোরগঞ্জ', 'কিশোরগঞ্জ', 'এইচএসসি'),
        ('trainee12@brtc.gov.bd', 'trainee123', 1, 3, 'প্রশিক্ষণার্থী ইমন', 'Trainee Emon', '01720000011', '3234567801', 'সিরাজ মিয়া', 'তাহমিনা', date(1997, 10, 19), '৩২৩৪৫৬৭৮০৯২', 'চট্টগ্রাম', 'চট্টগ্রাম', 'এসএসসি'),
    ]
    trainees = []
    for email, pw, ci, coi, name_bn, name_en, phone, nid, father, mother, dob, nid_val, pres, perm, edu in trainee_configs:
        center = centers[ci]
        course = courses[coi]
        circ = None
        for c in circulars:
            if c.center_id == center.id and c.course_id == course.id:
                circ = c
                break
        if not circ:
            circ = circulars[0] if circulars else None

        user, _ = User.objects.get_or_create(email=email, defaults=dict(user_type='trainee', full_name_bn=name_bn, full_name_en=name_en, phone=phone, nid=nid, center=center))
        user.set_password(pw)
        user.save(update_fields=['password'])

        app, _ = Application.objects.get_or_create(user=user, circular=circ, defaults=dict(name_bn=name_bn, name_en=name_en, father_name_bn=father, mother_name_bn=mother, date_of_birth=dob, nid=nid_val, phone=phone, present_address=pres, permanent_address=perm, education_qualification=edu, status='selected'))

        batch, _ = Batch.objects.get_or_create(circular=circ, center=center, course=course, start_date=circ.training_start_date, end_date=circ.training_end_date, defaults=dict(batch_name_bn=f'{course.name_bn} - {center.short_name_bn or center.name_bn}', batch_name_en=f'{course.name_en} - {center.name_en}', total_seats=circ.total_seats, filled_seats=0, status='running'))

        trainee, _ = Trainee.objects.get_or_create(user=user, defaults=dict(application=app, center=center, batch=batch, status='enrolled'))
        trainees.append(trainee)

        batch.filled_seats = Trainee.objects.filter(batch=batch, status='enrolled').count()
        batch.save(update_fields=['filled_seats'])
    return trainees


def seed_budgets(centers, courses, users_map):
    fiscal_year = '২০২৪-২০২৫'
    admin_user = users_map.get('admin@brtc.gov.bd')
    budgets = []
    for ci, center in enumerate(centers):
        b, _ = Budget.objects.get_or_create(center=center, fiscal_year=fiscal_year, course=None, defaults=dict(allocated_amount=5000000 + ci * 500000, notes=f'{center.name_bn} এর বার্ষিক বাজেট', created_by=admin_user))
        budgets.append(b)
    for ci, center in enumerate(centers[:2]):
        for coi, course in enumerate(courses[:2]):
            b, _ = Budget.objects.get_or_create(center=center, fiscal_year=fiscal_year, course=course, defaults=dict(allocated_amount=1000000 + ci * 100000 + coi * 50000, notes=f'{center.name_bn} - {course.name_bn}', created_by=admin_user))
            budgets.append(b)
    return budgets


def seed_roles():
    roles_data = [
        {
            'name': 'হেড অফিস প্রশাসক',
            'description': 'সম্পূর্ণ সিস্টেমে পূর্ণ প্রশাসনিক অধিকার',
            'user_type': 'head_office',
            'is_system': True,
            'permissions': [
                'centers.view', 'centers.create', 'centers.edit', 'centers.delete',
                'courses.view', 'courses.create', 'courses.edit', 'courses.delete',
                'trainers.view', 'trainers.approve', 'trainers.suspend', 'trainers.map',
                'assessors.view', 'assessors.approve', 'assessors.convert',
                'trainees.view', 'trainees.edit', 'trainees.enroll',
                'financial.view_budget', 'financial.edit_budget', 'financial.create_voucher', 'financial.verify_voucher', 'financial.approve_voucher',
                'reports.view', 'reports.export', 'reports.schedule',
                'users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_roles',
            ],
        },
        {
            'name': 'কেন্দ্র প্রশাসক',
            'description': 'কেন্দ্র পর্যায়ের কার্যক্রম পরিচালনার অধিকার',
            'user_type': 'center_admin',
            'is_system': True,
            'permissions': [
                'centers.view',
                'courses.view', 'courses.create', 'courses.edit',
                'trainers.view',
                'trainees.view', 'trainees.edit', 'trainees.enroll',
                'financial.view_budget',
                'reports.view', 'reports.export',
            ],
        },
        {
            'name': 'প্রশিক্ষক',
            'description': 'প্রশিক্ষণ কার্যক্রম পরিচালনার অধিকার',
            'user_type': 'trainer',
            'is_system': True,
            'permissions': [
                'courses.view',
                'trainers.view',
                'trainees.view',
                'reports.view',
            ],
        },
        {
            'name': 'মূল্যায়নকারী',
            'description': 'মূল্যায়ন ও রেটিং প্রদানের অধিকার',
            'user_type': 'assessor',
            'is_system': True,
            'permissions': [
                'assessors.view', 'assessors.approve',
                'courses.view',
                'reports.view', 'reports.export',
            ],
        },
        {
            'name': 'প্রশিক্ষণার্থী',
            'description': 'প্রশিক্ষণার্থীর জন্য সীমিত প্রবেশাধিকার',
            'user_type': 'trainee',
            'is_system': True,
            'permissions': [
                'courses.view',
                'trainees.view',
            ],
        },
        {
            'name': 'আর্থিক ব্যবস্থাপক',
            'description': 'বাজেট ও ভাউচার ব্যবস্থাপনার অধিকার',
            'user_type': 'head_office',
            'is_system': True,
            'permissions': [
                'financial.view_budget', 'financial.edit_budget', 'financial.create_voucher', 'financial.verify_voucher', 'financial.approve_voucher',
                'reports.view', 'reports.export',
            ],
        },
        {
            'name': 'প্রতিবেদন বিশ্লেষক',
            'description': 'প্রতিবেদন তৈরি ও রপ্তানির অধিকার',
            'user_type': 'head_office',
            'is_system': True,
            'permissions': [
                'reports.view', 'reports.export', 'reports.schedule',
                'financial.view_budget',
            ],
        },
    ]
    roles = []
    for rd in roles_data:
        role, created = Role.objects.get_or_create(name=rd['name'], defaults=rd)
        if not created:
            for key, val in rd.items():
                setattr(role, key, val)
            role.save()
        roles.append(role)
    return roles


class Command(BaseCommand):
    help = 'Seed comprehensive sample data for development/testing'

    def handle(self, *args, **options):
        self.stdout.write('Seeding comprehensive sample data...\n')

        self.stdout.write('  ── Centers ──')
        centers = seed_centers()
        for c in centers:
            self.stdout.write(f'    ✓ {c.code}: {c.name_bn}')

        self.stdout.write('  ── Infrastructure ──')
        seed_infrastructure(centers)
        self.stdout.write(f'    ✓ 3 rooms per center')

        self.stdout.write('  ── Courses ──')
        courses = seed_courses()
        for c in courses:
            self.stdout.write(f'    ✓ {c.code}: {c.name_bn}')

        self.stdout.write('  ── Users (trainers, assessors, center admins) ──')
        users_list = seed_users()
        users_map = {}
        for u in users_list:
            users_map[u.email] = u
        existing = User.objects.filter(email__in=['admin@brtc.gov.bd', 'center@brtc.gov.bd', 'trainer@brtc.gov.bd', 'assessor@brtc.gov.bd', 'trainee@brtc.gov.bd', 'rshadmin@brtc.gov.bd', 'ctgadmin@brtc.gov.bd', 'khladmin@brtc.gov.bd'])
        for u in existing:
            users_map[u.email] = u
            # force correct password for all seeded users on every run
            pw_map = {
                'admin@brtc.gov.bd': 'admin123',
                'center@brtc.gov.bd': 'center123',
                'trainer@brtc.gov.bd': 'trainer123',
                'assessor@brtc.gov.bd': 'assessor123',
                'trainee@brtc.gov.bd': 'trainee123',
                'rshadmin@brtc.gov.bd': 'rsh123',
                'ctgadmin@brtc.gov.bd': 'ctg123',
                'khladmin@brtc.gov.bd': 'khl123',
            }
            if u.email in pw_map and not u.check_password(pw_map[u.email]):
                u.set_password(pw_map[u.email])
                u.save(update_fields=['password'])
        # assign centers for center admins
        for email, center in [('center@brtc.gov.bd', centers[0]), ('ctgadmin@brtc.gov.bd', centers[1]), ('khladmin@brtc.gov.bd', centers[2]), ('rshadmin@brtc.gov.bd', centers[3])]:
            if email in users_map:
                u = users_map[email]
                if not u.center:
                    u.center = center
                    u.save(update_fields=['center'])
        self.stdout.write(f'    ✓ {len(users_map)} users')

        self.stdout.write('  ── Employees ──')
        seed_employees(users_map, centers)
        self.stdout.write('    ✓ Employee records')

        self.stdout.write('  ── Trainers ──')
        trainers = seed_trainers(users_map, centers)
        self.stdout.write(f'    ✓ {len(trainers)} trainers')

        self.stdout.write('  ── Assessors ──')
        assessors = seed_assessors(users_map, centers)
        self.stdout.write(f'    ✓ {len(assessors)} assessors')

        self.stdout.write('  ── Mappings ──')
        seed_mappings(trainers, assessors, centers, courses)
        self.stdout.write('    ✓ Trainer & Assessor mappings')

        self.stdout.write('  ── Circulars ──')
        circulars = seed_circulars(centers, courses, users_map)
        self.stdout.write(f'    ✓ {len(circulars)} circulars')

        self.stdout.write('  ── Applications, Batches & Trainees ──')
        trainees = seed_applications_and_trainees(centers, courses, circulars, users_map)
        self.stdout.write(f'    ✓ {len(trainees)} trainees with applications & batches')

        self.stdout.write('  ── Budgets ──')
        budgets = seed_budgets(centers, courses, users_map)
        self.stdout.write(f'    ✓ {len(budgets)} budget entries')

        self.stdout.write('  ── Roles ──')
        roles = seed_roles()
        self.stdout.write(f'    ✓ {len(roles)} roles created/updated')

        self.stdout.write('\n' + self.style.SUCCESS('Comprehensive seed complete!'))
        self.stdout.write('  ─────────────────────────────────────────────────────────')
        self.stdout.write('  admin@brtc.gov.bd     / admin123     (Head Office)')
        self.stdout.write('  center@brtc.gov.bd    / center123    (Dhaka Center Admin)')
        self.stdout.write('  ctgadmin@brtc.gov.bd  / ctg123       (CTG Center Admin)')
        self.stdout.write('  khladmin@brtc.gov.bd  / khl123       (KHL Center Admin)')
        self.stdout.write('  rshadmin@brtc.gov.bd  / rsh123       (RSH Center Admin)')
        self.stdout.write('  trainer@brtc.gov.bd   / trainer123   (Trainer Rahim)')
        self.stdout.write('  trainee@brtc.gov.bd   / trainee123   (Trainee Sumon)')
        self.stdout.write('  (11 more trainees: trainee2@brtc.gov.bd .. trainee12@brtc.gov.bd / trainee123)')
        self.stdout.write('  ─────────────────────────────────────────────────────────')
