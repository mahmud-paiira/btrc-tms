import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/dateFormatter';

export default function CircularCard({ circular, lang, isRtl }) {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('access_token');

  const isExpired = new Date(circular.application_end_date) < new Date();
  const seatsLeft = circular.remaining_seats;
  const isFull = seatsLeft <= 0;
  const centers = circular.eligible_centers || [];

  const texts = {
    bn: {
      courseType: 'কোর্সের ধরণ',
      duration: 'মেয়াদ',
      months: 'মাস',
      deadline: 'আবেদনের শেষ তারিখ',
      seats: 'মোট আসন',
      remaining: 'অবশিষ্ট আসন',
      expired: 'মেয়াদ উত্তীর্ণ',
      full: 'আসন পূর্ণ',
      apply: 'এখনই আবেদন করুন',
      daysLeft: 'দিন বাকি',
      centers: 'উপযুক্ত কেন্দ্র',
    },
    en: {
      courseType: 'Course Type',
      duration: 'Duration',
      months: 'months',
      deadline: 'Application Deadline',
      seats: 'Total Seats',
      remaining: 'Remaining Seats',
      expired: 'Expired',
      full: 'Seats Full',
      apply: 'Apply Now',
      daysLeft: 'days left',
      centers: 'Eligible Centers',
    },
  };

  const t = texts[lang];

  const getDaysLeft = () => {
    const now = new Date();
    const end = new Date(circular.application_end_date);
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div className={`card circular-card shadow-sm h-100 ${isRtl ? 'rtl' : 'ltr'}`}>
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h5 className="card-title mb-0 circular-title">
            {lang === 'bn' ? circular.title_bn : circular.title_en}
          </h5>
          <span className={`badge ${isExpired ? 'bg-secondary' : isFull ? 'bg-danger' : 'bg-success'} ms-2`}>
            {isExpired ? t.expired : isFull ? t.full : t.remaining}
          </span>
        </div>

        <div className="circular-meta mb-3">
          <div className="meta-item">
            <i className="bi bi-book me-1"></i>
            <span>{lang === 'bn' ? circular.course_name : `${circular.course_code} - ${circular.course_name}`}</span>
          </div>
          <div className="meta-item">
            <i className="bi bi-clock me-1"></i>
            <span>{t.duration}: {circular.course_duration_months} {t.months}</span>
          </div>
          <div className="meta-item">
            <i className="bi bi-calendar me-1"></i>
            <span>{t.deadline}: {formatDate(circular.application_end_date)}</span>
          </div>
          <div className="meta-item">
            <i className="bi bi-geo-alt me-1"></i>
            <span>{t.centers}: {circular.all_centers
              ? (lang === 'bn' ? 'সব কেন্দ্র' : 'All Centers')
              : centers.map(c => lang === 'bn' ? c.name_bn : c.name_en).join(', ')}
            </span>
          </div>
          <div className="d-flex gap-3 mt-1">
            <span className="text-muted small">
              <i className="bi bi-people me-1"></i>
              {t.seats}: {circular.total_seats}
            </span>
            <span className={`small ${seatsLeft <= 5 ? 'text-danger fw-bold' : 'text-muted'}`}>
              <i className="bi bi-person-fill me-1"></i>
              {t.remaining}: {circular.remaining_seats}
            </span>
          </div>
        </div>

        {!isExpired && !isFull && (
          <div className="mt-auto">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <small className="text-success">
                {getDaysLeft()} {t.daysLeft}
              </small>
            </div>
            <button
              className="btn btn-success w-100 apply-btn"
              onClick={() => navigate(`/register-and-apply?circular=${circular.public_url}`)}
            >
              <i className="bi bi-send me-2"></i>
              রেজিস্ট্রেশন ও আবেদন
            </button>
          </div>
        )}

        {isExpired && (
          <div className="mt-auto">
            <button className="btn btn-secondary w-100" disabled>
              {t.expired}
            </button>
          </div>
        )}

        {isFull && !isExpired && (
          <div className="mt-auto">
            <button className="btn btn-danger w-100" disabled>
              {t.full}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
