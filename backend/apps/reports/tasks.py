import csv
import io
from datetime import date

from celery import shared_task
from django.db.models import Count, Q, Avg, Max, Min, Sum
from django.utils import timezone


@shared_task(bind=True)
def generate_report(self, report_id):
    from .models import Report
    try:
        report = Report.objects.get(id=report_id)
        report.task_id = self.request.id
        report.save(update_fields=['task_id'])

        fmt = report.parameters.get('format', 'csv')

        if report.report_type == Report.ReportType.ATTENDANCE:
            output = _build_attendance_report(report.parameters)
        elif report.report_type == Report.ReportType.ASSESSMENT:
            output = _build_assessment_report(report.parameters)
        elif report.report_type == Report.ReportType.CERTIFICATE:
            output = _build_certificate_report(report.parameters)
        elif report.report_type == Report.ReportType.PLACEMENT:
            output = _build_placement_report(report.parameters)
        elif report.report_type == Report.ReportType.PLACEMENT_TRACKING:
            output = _build_placement_tracking_report(report.parameters)
        elif report.report_type == Report.ReportType.FINANCIAL:
            output = _build_financial_report(report.parameters)
        elif report.report_type == Report.ReportType.CENTER_WISE:
            output = _build_center_wise_report(report.parameters)
        elif report.report_type == Report.ReportType.COURSE_WISE:
            output = _build_course_wise_report(report.parameters)
        elif report.report_type == Report.ReportType.SUMMARY:
            output = _build_summary_report(report.parameters)
        else:
            raise ValueError(f'Unknown report type: {report.report_type}')

        ext = 'xlsx' if fmt == 'excel' else 'csv'
        from django.core.files.base import ContentFile
        report.file.save(
            f'report_{report.id}_{date.today().isoformat()}.{ext}',
            ContentFile(output.getvalue()),
            save=False,
        )
        report.is_ready = True
        report.generated_at = timezone.now()
        report.save(update_fields=['file', 'is_ready', 'generated_at'])

    except Exception as e:
        report = Report.objects.get(id=report_id)
        report.error_message = str(e)
        report.is_ready = True
        report.save(update_fields=['error_message', 'is_ready'])
        raise e


def _make_csv(headers, rows):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)
    return output


def _build_attendance_report(params):
    from apps.attendance.models import Attendance
    qs = Attendance.objects.select_related(
        'trainee__user', 'batch', 'lead_trainer__user',
    ).all()
    center_id = params.get('center')
    batch_id = params.get('batch')
    start_date = params.get('start_date')
    end_date = params.get('end_date')
    if center_id:
        qs = qs.filter(batch__center_id=center_id)
    if batch_id:
        qs = qs.filter(batch_id=batch_id)
    if start_date:
        qs = qs.filter(session_date__gte=start_date)
    if end_date:
        qs = qs.filter(session_date__lte=end_date)

    rows = []
    for a in qs:
        rows.append([
            a.trainee.registration_no,
            a.trainee.user.full_name_bn,
            str(a.batch.batch_name_bn or a.batch.batch_no),
            a.session_date.isoformat(),
            a.get_status_display(),
            a.lead_trainer.user.full_name_bn if a.lead_trainer else '',
            a.remarks or '',
        ])
    return _make_csv(
        ['রেজি নং', 'প্রশিক্ষণার্থীর নাম', 'ব্যাচ', 'তারিখ', 'স্ট্যাটাস', 'প্রশিক্ষক', 'মন্তব্য'],
        rows,
    )


def _build_assessment_report(params):
    from apps.assessments.models import Assessment
    qs = Assessment.objects.select_related(
        'trainee__user', 'batch', 'assessed_by',
    ).all()
    center_id = params.get('center')
    batch_id = params.get('batch')
    if center_id:
        qs = qs.filter(batch__center_id=center_id)
    if batch_id:
        qs = qs.filter(batch_id=batch_id)

    rows = []
    for a in qs:
        rows.append([
            a.trainee.registration_no,
            a.trainee.user.full_name_bn,
            str(a.batch.batch_name_bn or a.batch.batch_no),
            a.get_assessment_type_display(),
            a.assessment_date.isoformat() if a.assessment_date else '',
            a.get_competency_status_display(),
            a.marks_obtained if a.marks_obtained is not None else '',
            a.total_marks if a.total_marks is not None else '',
            f'{a.percentage:.1f}%' if a.percentage is not None else '',
            'হ্যাঁ' if a.is_reassessment else 'না',
        ])
    return _make_csv(
        ['রেজি নং', 'নাম', 'ব্যাচ', 'মূল্যায়নের ধরণ', 'তারিখ', 'ফলাফল', 'প্রাপ্ত নম্বর', 'মোট নম্বর', 'শতাংশ', 'পুনঃমূল্যায়ন'],
        rows,
    )


def _build_certificate_report(params):
    from apps.certificates.models import Certificate
    qs = Certificate.objects.select_related(
        'trainee__user', 'batch',
    ).all()
    center_id = params.get('center')
    batch_id = params.get('batch')
    if center_id:
        qs = qs.filter(trainee__center_id=center_id)
    if batch_id:
        qs = qs.filter(batch_id=batch_id)

    rows = []
    for c in qs:
        rows.append([
            c.certificate_no,
            c.trainee.user.full_name_bn,
            c.trainee.registration_no,
            str(c.batch.batch_name_bn or c.batch.batch_no),
            c.issue_date.isoformat(),
            'হ্যাঁ' if c.is_verified else 'না',
            c.verified_count,
        ])
    return _make_csv(
        ['সার্টিফিকেট নং', 'প্রশিক্ষণার্থীর নাম', 'রেজি নং', 'ব্যাচ', 'ইস্যুর তারিখ', 'যাচাইকৃত', 'যাচাইকরণ সংখ্যা'],
        rows,
    )


def _build_placement_report(params):
    from apps.jobplacement.models import JobPlacement
    qs = JobPlacement.objects.select_related(
        'trainee__user', 'batch',
    ).all()
    center_id = params.get('center')
    batch_id = params.get('batch')
    if center_id:
        qs = qs.filter(batch__center_id=center_id)
    if batch_id:
        qs = qs.filter(batch_id=batch_id)

    rows = []
    for p in qs:
        rows.append([
            p.trainee.registration_no,
            p.trainee.user.full_name_bn,
            str(p.batch.batch_name_bn or p.batch.batch_no),
            p.get_employment_type_display(),
            p.employer_name,
            p.designation_bn or '',
            p.designation_en or '',
            p.start_date.isoformat() if p.start_date else '',
            p.release_date.isoformat() if p.release_date else '',
            str(p.salary) if p.salary else '',
            'হ্যাঁ' if p.is_current else 'না',
        ])
    return _make_csv(
        ['রেজি নং', 'নাম', 'ব্যাচ', 'কর্মসংস্থানের ধরণ', 'নিয়োগকর্তা',
         'পদবী (বাংলা)', 'পদবী (ইংরেজি)', 'শুরুর তারিখ', 'শেষের তারিখ', 'বেতন', 'বর্তমান চাকরি'],
        rows,
    )


def _build_placement_tracking_report(params):
    from apps.jobplacement.models import JobTracking, JobPlacement
    qs = JobTracking.objects.select_related(
        'placement__trainee__user', 'placement__batch', 'tracked_by',
    ).all()
    center_id = params.get('center')
    batch_id = params.get('batch')
    if center_id:
        qs = qs.filter(placement__batch__center_id=center_id)
    if batch_id:
        qs = qs.filter(placement__batch_id=batch_id)

    rows = []
    for t in qs:
        rows.append([
            t.placement.trainee.registration_no,
            t.placement.trainee.user.full_name_bn,
            str(t.placement.batch.batch_name_bn or t.placement.batch.batch_no),
            f'{t.tracking_month} মাস',
            'হ্যাঁ' if t.is_still_employed else 'না',
            'হ্যাঁ' if t.salary_changed else 'না',
            str(t.new_salary) if t.new_salary else '',
            'হ্যাঁ' if t.promoted else 'না',
            t.new_designation or '',
            t.comments or '',
            t.tracked_by.full_name_bn if t.tracked_by else '',
        ])
    return _make_csv(
        ['রেজি নং', 'নাম', 'ব্যাচ', 'ট্র্যাকিং মাস', 'এখনো কর্মরত',
         'বেতন পরিবর্তন', 'নতুন বেতন', 'পদোন্নতি', 'নতুন পদবী', 'মন্তব্য', 'ট্র্যাককারী'],
        rows,
    )


def _build_financial_report(params):
    from apps.centers.models import Center
    from apps.batches.models import Batch
    from apps.courses.models import CourseBill
    from apps.trainees.models import Trainee

    center_id = params.get('center')
    start_date = params.get('start_date')
    end_date = params.get('end_date')

    centers = Center.objects.all()
    if center_id:
        centers = centers.filter(id=center_id)

    rows = []
    for c in centers:
        batches = Batch.objects.filter(center=c)
        if start_date:
            batches = batches.filter(start_date__gte=start_date)
        if end_date:
            batches = batches.filter(end_date__lte=end_date)

        batch_count = batches.count()
        t_count = Trainee.objects.filter(center=c).count()
        bills = CourseBill.objects.filter(course__in=batches.values('course'))
        total_fees = bills.aggregate(s=Sum('fee_amount'))['s'] or 0

        rows.append([
            c.name_bn, c.code,
            batch_count, t_count,
            f'৳{total_fees:,}' if total_fees else '০',
        ])
    return _make_csv(
        ['কেন্দ্র', 'কোড', 'মোট ব্যাচ', 'মোট প্রশিক্ষণার্থী', 'মোট ফি'],
        rows,
    )


def _build_center_wise_report(params):
    from apps.centers.models import Center
    from apps.trainees.models import Trainee
    from apps.batches.models import Batch

    rows = []
    centers = Center.objects.all()
    for c in centers:
        batch_count = Batch.objects.filter(center=c).count()
        trainees = Trainee.objects.filter(center=c)
        total = trainees.count()
        active = trainees.filter(status=Trainee.TraineeStatus.ENROLLED).count()
        completed = trainees.filter(status=Trainee.TraineeStatus.COMPLETED).count()
        dropped = trainees.filter(status=Trainee.TraineeStatus.DROPPED).count()
        rows.append([c.name_bn, c.code, batch_count, total, active, completed, dropped])
    return _make_csv(
        ['কেন্দ্র', 'কোড', 'মোট ব্যাচ', 'মোট প্রশিক্ষণার্থী', 'সক্রিয়', 'সমাপ্ত', 'বহিষ্কৃত'],
        rows,
    )


def _build_course_wise_report(params):
    from apps.courses.models import Course
    from apps.batches.models import Batch
    from apps.assessments.models import Assessment

    rows = []
    courses = Course.objects.all()
    for c in courses:
        batches = Batch.objects.filter(course=c)
        batch_count = batches.count()
        total_seats = sum(b.total_seats or 0 for b in batches)
        filled = sum(b.filled_seats or 0 for b in batches)
        rows.append([
            c.name_bn, c.code, c.get_course_type_display(),
            c.get_term_display(), c.duration_months,
            batch_count, total_seats, filled,
        ])
    return _make_csv(
        ['কোর্স', 'কোড', 'ধরণ', 'টার্ম', 'মেয়াদ (মাস)', 'মোট ব্যাচ', 'মোট আসন', 'পূরণকৃত'],
        rows,
    )


def _build_summary_report(params):
    from apps.centers.models import Center
    from apps.trainees.models import Trainee
    from apps.batches.models import Batch
    from apps.applications.models import Application

    rows = [
        ['মোট কেন্দ্র', Center.objects.count()],
        ['মোট প্রশিক্ষণার্থী', Trainee.objects.count()],
        ['মোট ব্যাচ', Batch.objects.count()],
        ['মোট আবেদন', Application.objects.count()],
        ['সক্রিয় প্রশিক্ষণার্থী', Trainee.objects.filter(status=Trainee.TraineeStatus.ENROLLED).count()],
        ['সমাপ্ত প্রশিক্ষণার্থী', Trainee.objects.filter(status=Trainee.TraineeStatus.COMPLETED).count()],
        ['বহিষ্কৃত প্রশিক্ষণার্থী', Trainee.objects.filter(status=Trainee.TraineeStatus.DROPPED).count()],
        ['ব্যর্থ প্রশিক্ষণার্থী', Trainee.objects.filter(status=Trainee.TraineeStatus.FAILED).count()],
        ['চলমান ব্যাচ', Batch.objects.filter(status='running').count()],
        ['সমাপ্ত ব্যাচ', Batch.objects.filter(status='completed').count()],
        ['নির্ধারিত ব্যাচ', Batch.objects.filter(status='scheduled').count()],
    ]
    return _make_csv(['মেট্রিক', 'মান'], rows)
