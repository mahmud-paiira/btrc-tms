from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import update_session_auth_hash

from .models import Trainee
from apps.attendance.models import Attendance, AttendanceSummary
from apps.assessments.models import Assessment
from apps.certificates.models import Certificate
from apps.batches.models import BatchWeekPlan
from apps.accounts.models import UserProfile


class IsTraineeUser(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.user_type == 'trainee' or request.user.is_superuser


class TraineePortalViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsTraineeUser]

    def get_trainee(self, user):
        return Trainee.objects.select_related(
            'user', 'center', 'batch__course', 'batch__circular',
        ).get(user=user)

    def list(self, request):
        return self.me(request)

    @action(detail=False, methods=['get'])
    def me(self, request):
        trainee = self.get_trainee(request.user)
        batch = trainee.batch

        attendance_pct = None
        if batch:
            summary = AttendanceSummary.objects.filter(
                trainee=trainee, batch=batch,
            ).first()
            attendance_pct = float(summary.attendance_percentage) if summary else None

        return Response({
            'id': trainee.id,
            'registration_no': trainee.registration_no,
            'full_name_bn': request.user.full_name_bn,
            'full_name_en': request.user.full_name_en,
            'email': request.user.email,
            'phone': request.user.phone,
            'profile_image': request.user.profile_image.url if request.user.profile_image else None,
            'center_name': trainee.center.name_bn if trainee.center else None,
            'batch': {
                'id': batch.id,
                'name_bn': batch.batch_name_bn,
                'name_en': batch.batch_name_en,
                'batch_no': batch.batch_no,
                'status': batch.status,
                'start_date': batch.start_date,
                'end_date': batch.end_date,
                'course_name': batch.course.name_bn if batch.course else None,
                'center_name': batch.center.name_bn if batch.center else None,
            } if batch else None,
            'attendance_percentage': attendance_pct,
            'enrollment_status': trainee.status,
            'bank_account_no': trainee.bank_account_no,
            'bank_name': trainee.bank_name,
            'bank_branch': trainee.bank_branch,
            'nominee_name': trainee.nominee_name,
            'nominee_relation': trainee.nominee_relation,
            'nominee_phone': trainee.nominee_phone,
        })

    @action(detail=False, methods=['get'])
    def schedule(self, request):
        trainee = self.get_trainee(request.user)
        if not trainee.batch:
            return Response({'detail': 'আপনি কোনো ব্যাচে নথিভুক্ত নন।'}, status=400)

        plans = BatchWeekPlan.objects.filter(batch=trainee.batch).select_related(
            'lead_trainer__user', 'associate_trainer__user',
        ).order_by('start_date', 'session_no')

        from datetime import date
        today = date.today()

        data = []
        for p in plans:
            data.append({
                'id': p.id,
                'term_no': p.term_no,
                'term_day': p.term_day,
                'session_no': p.session_no,
                'class_type': p.class_type,
                'class_type_display': p.get_class_type_display(),
                'start_date': p.start_date,
                'end_date': p.end_date,
                'day_of_week': p.day_of_week,
                'day_of_week_display': p.get_day_of_week_display(),
                'start_time': str(p.start_time),
                'end_time': str(p.end_time),
                'duration_hours': float(p.duration_hours),
                'training_room': p.training_room_bn or p.training_room_en,
                'lead_trainer_name': p.lead_trainer.user.full_name_bn if p.lead_trainer else None,
                'associate_trainer_name': p.associate_trainer.user.full_name_bn if p.associate_trainer else None,
                'topic': p.topic_bn or p.topic_en,
                'is_past': p.end_date < today if p.end_date else False,
                'is_today': p.start_date == today if p.start_date else False,
            })

        return Response({
            'batch_name': trainee.batch.batch_name_bn,
            'batch_dates': f'{trainee.batch.start_date} - {trainee.batch.end_date}',
            'sessions': data,
        })

    @action(detail=False, methods=['get'])
    def attendance(self, request):
        trainee = self.get_trainee(request.user)
        if not trainee.batch:
            return Response({'detail': 'আপনি কোনো ব্যাচে নথিভুক্ত নন।'}, status=400)

        year = request.query_params.get('year')
        month = request.query_params.get('month')

        qs = Attendance.objects.filter(
            trainee=trainee, batch=trainee.batch,
        ).select_related('lead_trainer__user').order_by('-session_date', 'session_no')

        if year and month:
            qs = qs.filter(session_date__year=year, session_date__month=month)

        total = qs.count()
        present = qs.filter(status='present').count()
        late = qs.filter(status='late').count()
        absent = qs.filter(status='absent').count()
        leave = qs.filter(status='leave').count()

        summary = AttendanceSummary.objects.filter(
            trainee=trainee, batch=trainee.batch,
        ).first()

        records = []
        for a in qs:
            records.append({
                'id': a.id,
                'session_date': a.session_date,
                'session_no': a.session_no,
                'status': a.status,
                'status_display': a.get_status_display(),
                'marked_at': a.marked_at,
                'remarks': a.remarks,
            })

        # attendance trend by week
        trend = []
        from django.db.models import Count, Q
        weekly = qs.extra(
            select={'week': "EXTRACT(WEEK FROM session_date)"}
        ).values('week').annotate(
            total=Count('id'),
            present=Count('id', filter=Q(status='present')),
            late=Count('id', filter=Q(status='late')),
        ).order_by('week')

        for w in weekly:
            trend.append({
                'week': int(w['week']),
                'total': w['total'],
                'present': w['present'],
                'late': w['late'],
                'attended': w['present'] + w['late'],
            })

        return Response({
            'total_sessions': total,
            'present': present,
            'late': late,
            'absent': absent,
            'leave': leave,
            'attendance_percentage': float(summary.attendance_percentage) if summary else 0,
            'records': records,
            'trend': trend,
        })

    @action(detail=False, methods=['get'])
    def assessments(self, request):
        trainee = self.get_trainee(request.user)
        if not trainee.batch:
            return Response({'detail': 'আপনি কোনো ব্যাচে নথিভুক্ত নন।'}, status=400)

        assessments = Assessment.objects.filter(
            trainee=trainee, batch=trainee.batch,
        ).select_related('assessed_by').order_by('assessment_type')

        data = []
        all_competent = True
        for a in assessments:
            data.append({
                'id': a.id,
                'assessment_type': a.assessment_type,
                'assessment_type_display': a.get_assessment_type_display(),
                'assessment_date': a.assessment_date,
                'competency_status': a.competency_status,
                'competency_status_display': a.get_competency_status_display(),
                'marks_obtained': a.marks_obtained,
                'total_marks': a.total_marks,
                'percentage': float(a.percentage) if a.percentage else None,
                'remarks': a.remarks,
                'is_reassessment': a.is_reassessment,
            })
            if a.competency_status != 'competent':
                all_competent = False

        return Response({
            'batch_name': trainee.batch.batch_name_bn,
            'assessments': data,
            'all_competent': all_competent,
            'has_final': any(a['assessment_type'] == 'final' for a in data),
        })

    @action(detail=False, methods=['get'])
    def certificate(self, request):
        trainee = self.get_trainee(request.user)
        if not trainee.batch:
            return Response({'detail': 'আপনি কোনো ব্যাচে নথিভুক্ত নন।'}, status=400)

        cert = Certificate.objects.filter(
            trainee=trainee, batch=trainee.batch,
        ).first()

        if not cert:
            return Response({
                'has_certificate': False,
                'detail': 'এখনো কোনো সার্টিফিকেট ইস্যু করা হয়নি।',
            })

        return Response({
            'has_certificate': True,
            'certificate_no': cert.certificate_no,
            'issue_date': cert.issue_date,
            'qr_code_url': cert.qr_code_url,
            'qr_code_image': cert.qr_code_image.url if cert.qr_code_image else None,
            'pdf_url': cert.pdf_file.url if cert.pdf_file else None,
            'verification_url': cert.verification_url,
            'is_verified': cert.is_verified,
            'verified_count': cert.verified_count,
        })

    @action(detail=False, methods=['put', 'patch'])
    def profile(self, request):
        trainee = self.get_trainee(request.user)
        user = request.user

        allowed_user_fields = ['full_name_bn', 'full_name_en', 'phone']
        for field in allowed_user_fields:
            if field in request.data:
                setattr(user, field, request.data[field])

        profile, _ = UserProfile.objects.get_or_create(user=user)
        allowed_profile_fields = [
            'father_name_bn', 'mother_name_bn',
            'present_address', 'permanent_address',
            'blood_group', 'gender', 'date_of_birth',
            'emergency_contact',
        ]
        for field in allowed_profile_fields:
            if field in request.data:
                setattr(profile, field, request.data[field])

        if 'profile_image' in request.FILES:
            user.profile_image = request.FILES['profile_image']

        allowed_trainee_fields = [
            'bank_account_no', 'bank_name', 'bank_branch',
            'nominee_name', 'nominee_relation', 'nominee_phone',
        ]
        for field in allowed_trainee_fields:
            if field in request.data:
                setattr(trainee, field, request.data[field])

        user.save()
        profile.save()
        trainee.save()

        return Response({'detail': 'প্রোফাইল সফলভাবে আপডেট হয়েছে।'})

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not old_password or not new_password or not confirm_password:
            return Response(
                {'detail': 'পুরানো পাসওয়ার্ড, নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ প্রয়োজন।'},
                status=400,
            )

        if not user.check_password(old_password):
            return Response(
                {'detail': 'পুরানো পাসওয়ার্ড ভুল।'},
                status=400,
            )

        if new_password != confirm_password:
            return Response(
                {'detail': 'নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মিলছে না।'},
                status=400,
            )

        if len(new_password) < 6:
            return Response(
                {'detail': 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'},
                status=400,
            )

        user.set_password(new_password)
        user.save()
        update_session_auth_hash(request, user)

        return Response({'detail': 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে।'})
