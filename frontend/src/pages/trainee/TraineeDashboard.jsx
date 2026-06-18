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
    <div className="container-lg py-4" style={{ maxWidth: '800px' }}>
      {/* Welcome */}
      <div className="card bg-dark text-white shadow-lg mb-5 border-0 overflow-hidden" style={{ borderRadius: 24 }}>
        <div className="card-body p-5 position-relative">
          <div className="d-flex align-items-center gap-4 z-index-1">
            {data.profile_image ? (
              <img src={data.profile_image} alt="" className="rounded-circle shadow-sm border border-white border-4" style={{ width: 100, height: 100, objectFit: 'cover' }} />
            ) : (
              <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center shadow-sm" style={{ width: 100, height: 100, fontSize: 44 }}>
                <i className="bi bi-person-fill"></i>
              </div>
            )}
            <div>
              <h2 className="mb-1 fw-bold">{data.full_name_bn || data.full_name_en}</h2>
              <div className="d-flex flex-wrap gap-3 opacity-75">
                <span><i className="bi bi-person-badge me-1"></i>{data.registration_no}</span>
                {data.center_name && <span><i className="bi bi-building me-1"></i>{data.center_name}</span>}
              </div>
            </div>
          </div>
          {/* Decorative background element */}
          <div className="position-absolute end-0 bottom-0 opacity-10" style={{ transform: 'translate(20%, 20%)' }}>
            <i className="bi bi-mortarboard-fill" style={{ fontSize: '12rem' }}></i>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="row g-4 mb-5">
        {batch && (
          <>
            <div className="col-md-6">
              <div className="card shadow-sm border-0 h-100 bg-white">
                <div className="card-body p-4 d-flex align-items-center gap-3">
                  <div className="bg-primary bg-opacity-10 p-3 rounded-4"><i className="bi bi-layers text-primary fs-3"></i></div>
                  <div>
                    <div className="text-muted small mb-1">{t('trainee.dashboard.batchNo', 'ব্যাচ নম্বর')}</div>
                    <h4 className="mb-0 fw-bold">{batch.batch_no}</h4>
                    <div className="small text-primary">{batch.name_bn}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card shadow-sm border-0 h-100 bg-white">
                <div className="card-body p-4 d-flex align-items-center gap-3">
                  <div className="bg-success bg-opacity-10 p-3 rounded-4"><i className="bi bi-check2-circle text-success fs-3"></i></div>
                  <div>
                    <div className="text-muted small mb-1">{t('trainee.dashboard.status', 'স্ট্যাটাস')}</div>
                    <h4 className="mb-0 fw-bold">{t(`batch.status.${batch.status}`, STATUS_MAP[batch.status] || batch.status)}</h4>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Attendance progress */}
      {attPct !== null && (
        <div className="card shadow-sm mb-5 border-0 bg-white" style={{ borderRadius: 20 }}>
          <div className="card-header bg-transparent border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-bold"><i className="bi bi-calendar-check me-2 text-primary"></i>{t('trainee.dashboard.attendanceRate', 'উপস্থিতির হার')}</h6>
            <span className={`badge px-3 py-2 rounded-pill ${warning ? 'bg-danger' : 'bg-success'}`}>{attPct}%</span>
          </div>
          <div className="card-body p-4">
            <div className="progress" style={{ height: 12, borderRadius: 6 }}>
              <div
                className={`progress-bar progress-bar-striped progress-bar-animated ${warning ? 'bg-danger' : 'bg-success'}`}
                style={{ width: `${Math.min(attPct, 100)}%` }}
              />
            </div>
            {warning && (
              <div className="d-flex align-items-start gap-2 mt-3 text-danger small">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <div>{t('trainee.dashboard.warningBelow80', 'সতর্কতা: আপনার উপস্থিতির হার ৮০% এর নিচে।')}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick links Grid */}
      <h6 className="mb-3 fw-bold text-muted text-uppercase small letter-spacing-1">{t('trainee.dashboard.quickLinks', 'দ্রুত লিঙ্ক')}</h6>
      <div className="row g-3">
        {[
          { to: '/trainee/schedule', label: t('trainee.dashboard.schedule', 'সময়সূচি'), icon: 'bi-calendar-week', color: 'primary' },
          { to: '/trainee/attendance', label: t('nav.attendance', 'উপস্থিতি'), icon: 'bi-check-circle', color: 'success' },
          { to: '/trainee/assessment', label: t('trainee.dashboard.assessment', 'মূল্যায়ন'), icon: 'bi-clipboard-data', color: 'warning' },
          { to: '/trainee/certificate', label: t('trainee.dashboard.certificate', 'সার্টিফিকেট'), icon: 'bi-award', color: 'info' },
          { to: '/trainee/profile', label: t('nav.profile', 'প্রোফাইল'), icon: 'bi-person-gear', color: 'secondary' },
        ].map((link) => (
          <div className="col-6 col-md-4" key={link.to}>
            <Link to={link.to} className="card shadow-sm text-decoration-none h-100 hover-translate-y border-0 transition" style={{ borderRadius: 16 }}>
              <div className="card-body text-center py-4">
                <div className={`text-${link.color} mb-2`}><i className={`bi ${link.icon} fs-1`}></i></div>
                <h6 className="mb-0 fw-bold text-heading">{link.label}</h6>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
