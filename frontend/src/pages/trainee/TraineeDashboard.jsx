import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from '../../hooks/useTranslation';
import traineeService from '../../services/traineeService';

const STATUS_MAP = { scheduled: 'নির্ধারিত', running: 'চলমান', completed: 'সমাপ্ত', cancelled: 'বাতিল' };

export default function TraineeDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    traineeService.getMe()
      .then(({ data }) => setData(data))
      .catch(() => { toast.error(t('trainee.dashboard.loadFailed', 'ড্যাশবোর্ড লোড করতে ব্যর্থ')); navigate('/trainee/login'); })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">{t('site.loading', 'লোড হচ্ছে...')}</p>
      </div>
    );
  }

  if (!data) return null;
  const { batch, attendance_percentage: attPct } = data;
  const warning = attPct !== null && attPct < 80;

  return (
    <div style={{ fontFamily: 'NikoshBAN, sans-serif' }}>
      {/* Welcome */}
      <div className="card bg-primary text-white shadow-sm mb-4">
        <div className="card-body d-flex align-items-center gap-3">
          {data.profile_image ? (
            <img src={data.profile_image} alt="" className="rounded-circle" style={{ width: 64, height: 64, objectFit: 'cover' }} />
          ) : (
            <div className="rounded-circle bg-white text-primary d-flex align-items-center justify-content-center" style={{ width: 64, height: 64, fontSize: 28 }}>
              <i className="bi bi-person-fill"></i>
            </div>
          )}
          <div>
            <h4 className="mb-1">{data.full_name_bn || data.full_name_en}</h4>
            <p className="mb-0 opacity-75">
              <i className="bi bi-person-badge me-1"></i>{data.registration_no}
            </p>
            {data.center_name && <small className="opacity-75"><i className="bi bi-building me-1"></i>{data.center_name}</small>}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="row g-3 mb-4">
        {batch && (
          <>
            <div className="col-md-3 col-6">
              <div className="card text-bg-info shadow-sm h-100 text-center py-3">
                <div className="card-body">
                  <i className="bi bi-layers fs-2"></i>
                  <h5 className="mt-2 mb-0">{batch.batch_no}</h5>
                  <small>{batch.name_bn}</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className={`card shadow-sm h-100 text-center py-3 text-bg-${batch.status === 'running' ? 'success' : batch.status === 'completed' ? 'primary' : 'secondary'}`}>
                <div className="card-body">
                  <i className="bi bi-circle-fill fs-2"></i>
                  <h5 className="mt-2 mb-0">{t(`batch.status.${batch.status}`, STATUS_MAP[batch.status] || batch.status)}</h5>
                  <small>{t('trainee.dashboard.status', 'স্ট্যাটাস')}</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="card text-bg-warning shadow-sm h-100 text-center py-3">
                <div className="card-body">
                  <i className="bi bi-book fs-2"></i>
                  <h5 className="mt-2 mb-0" style={{ fontSize: 16 }}>{batch.course_name}</h5>
                  <small>{t('trainee.dashboard.course', 'কোর্স')}</small>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className={`card shadow-sm h-100 text-center py-3 ${warning ? 'text-bg-danger' : 'text-bg-success'}`}>
                <div className="card-body">
                  <i className="bi bi-calendar-check fs-2"></i>
                  <h5 className="mt-2 mb-0">{attPct !== null ? `${attPct}%` : '—'}</h5>
                  <small>{t('trainee.dashboard.attendance', 'উপস্থিতি')}</small>
                </div>
              </div>
            </div>
          </>
        )}
        {!batch && (
          <div className="col-12">
            <div className="alert alert-warning mb-0">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {t('trainee.dashboard.notEnrolled', 'আপনি কোনো ব্যাচে নথিভুক্ত নন। অনুগ্রহ করে কেন্দ্র প্রশাসকের সাথে যোগাযোগ করুন।')}
            </div>
          </div>
        )}
      </div>

      {/* Attendance progress */}
      {attPct !== null && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between mb-1">
              <span>{t('trainee.dashboard.attendanceRate', 'উপস্থিতির হার')}</span>
              <span className={warning ? 'text-danger fw-bold' : 'text-success fw-bold'}>{attPct}%</span>
            </div>
            <div className="progress" style={{ height: 10 }}>
              <div
                className={`progress-bar ${warning ? 'bg-danger' : 'bg-success'}`}
                style={{ width: `${Math.min(attPct, 100)}%` }}
              />
            </div>
            {warning && (
              <div className="alert alert-danger mt-2 mb-0 py-2">
                <i className="bi bi-exclamation-triangle me-1"></i>
                {t('trainee.dashboard.warningBelow80', 'সতর্কতা: আপনার উপস্থিতির হার ৮০% এর নিচে। মূল্যায়নে অংশগ্রহণের জন্য ন্যূনতম ৮০% উপস্থিতি প্রয়োজন।')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="row g-3">
        <div className="col-md-4 col-6">
          <Link to="/trainee/schedule" className="card shadow-sm text-decoration-none text-dark h-100">
            <div className="card-body text-center py-4">
              <i className="bi bi-calendar-week fs-1 text-primary"></i>
              <h6 className="mt-2 mb-0">{t('trainee.dashboard.schedule', 'সময়সূচি')}</h6>
            </div>
          </Link>
        </div>
        <div className="col-md-4 col-6">
          <Link to="/trainee/attendance" className="card shadow-sm text-decoration-none text-dark h-100">
            <div className="card-body text-center py-4">
              <i className="bi bi-check-circle fs-1 text-success"></i>
              <h6 className="mt-2 mb-0">{t('nav.attendance', 'উপস্থিতি')}</h6>
            </div>
          </Link>
        </div>
        <div className="col-md-4 col-6">
          <Link to="/trainee/assessment" className="card shadow-sm text-decoration-none text-dark h-100">
            <div className="card-body text-center py-4">
              <i className="bi bi-clipboard-data fs-1 text-warning"></i>
              <h6 className="mt-2 mb-0">{t('trainee.dashboard.assessment', 'মূল্যায়ন')}</h6>
            </div>
          </Link>
        </div>
        <div className="col-md-4 col-6">
          <Link to="/trainee/certificate" className="card shadow-sm text-decoration-none text-dark h-100">
            <div className="card-body text-center py-4">
              <i className="bi bi-award fs-1 text-info"></i>
              <h6 className="mt-2 mb-0">{t('trainee.dashboard.certificate', 'সার্টিফিকেট')}</h6>
            </div>
          </Link>
        </div>
        <div className="col-md-4 col-6">
          <Link to="/trainee/profile" className="card shadow-sm text-decoration-none text-dark h-100">
            <div className="card-body text-center py-4">
              <i className="bi bi-person-gear fs-1 text-secondary"></i>
              <h6 className="mt-2 mb-0">{t('nav.profile', 'প্রোফাইল')}</h6>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
