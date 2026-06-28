import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from '../../hooks/useTranslation';
import traineeService from '../../services/traineeService';

const STATUS_MAP = { scheduled: 'নির্ধারিত', running: 'চলমান', completed: 'সমাপ্ত', cancelled: 'বাতিল' };

function AttendanceRing({ pct }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  const warning = pct < 80;
  const color = warning ? '#dc3545' : '#198754';
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e9ecef" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x="50" y="50" textAnchor="middle" dy="5" fill={color} fontSize="18" fontWeight="bold" transform="rotate(90 50 50)">{pct}%</text>
    </svg>
  );
}

const STATUS_BADGE = {
  pending: 'bg-warning text-dark', auto_rejected: 'bg-danger', selected: 'bg-success',
  rejected: 'bg-danger', waitlisted: 'bg-info text-dark', enrolled: 'bg-primary',
};

export default function TraineeDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      traineeService.getMe(),
      traineeService.getMyApplication().catch(() => null),
    ])
      .then(([meRes, appRes]) => {
        if (cancelled) return;
        setData(meRes.data);
        if (appRes?.data?.has_application) setApplication(appRes.data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 401) {
          navigate('/trainee/login');
          return;
        }
        setErrorMsg(err.response?.data?.detail || t('trainee.dashboard.loadFailed', 'ড্যাশবোর্ড লোড করতে ব্যর্থ'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [navigate, t]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">{t('site.loading', 'লোড হচ্ছে...')}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="bi bi-exclamation-triangle fs-1" />
        <p className="mt-2">{errorMsg || t('trainee.dashboard.loadFailed', 'ড্যাশবোর্ড লোড করতে ব্যর্থ')}</p>
      </div>
    );
  }
  const { batch, attendance_percentage: attPct } = data;
  const warning = attPct !== null && attPct < 80;

  return (
    <div className="px-4 px-lg-5 py-4" style={{ maxWidth: '1200px', margin: '0 auto' }}>

      {/* ──────── Hero Profile Card ──────── */}
      <div className="card border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: 28, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
        <div className="card-body p-4 p-md-5 position-relative" style={{ minHeight: 140 }}>
          <div className="position-absolute top-0 end-0 w-50 h-100 opacity-15" style={{ background: 'radial-gradient(circle at 100% 50%, rgba(255,255,255,0.8) 0%, transparent 70%)' }} />
          <div className="d-flex align-items-center gap-3 gap-md-4 position-relative h-100">
            <div className="flex-shrink-0">
              {data.profile_image ? (
                <img src={data.profile_image} alt="" className="rounded-circle shadow-lg border border-white border-3" style={{ width: 110, height: 110, objectFit: 'cover' }} />
              ) : (
                <div className="rounded-circle bg-white bg-opacity-20 text-white d-flex align-items-center justify-content-center shadow-lg border border-white border-3" style={{ width: 110, height: 110, fontSize: 44 }}>
                  <i className="bi bi-person-fill"></i>
                </div>
              )}
            </div>
            <div className="flex-grow-1 min-width-0">
              <h2 className="mb-1 fw-bold text-white" style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)' }}>{data.full_name_bn || data.full_name_en}</h2>
              <div className="d-flex flex-wrap gap-2 mt-2 text-white text-opacity-75">
                <span className="d-inline-flex align-items-center gap-1 bg-white bg-opacity-10 rounded-pill px-3 py-1 small">
                  <i className="bi bi-person-badge" />{data.registration_no}
                </span>
                {data.center_name && (
                  <span className="d-inline-flex align-items-center gap-1 bg-white bg-opacity-10 rounded-pill px-3 py-1 small">
                    <i className="bi bi-building" />{data.center_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ──────── Batch Status Cards ──────── */}
      {batch && (
        <div className="row g-3 g-md-4 mb-4">
          <div className="col-6">
            <div className="card border-0 h-100 shadow-sm" style={{ borderRadius: 20, background: 'linear-gradient(145deg, #ffffff, #f8f9fa)' }}>
              <div className="card-body p-3 p-md-4 d-flex flex-column align-items-center text-center gap-2">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2" style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #e8f0fe, #d2e3fc)' }}>
                  <i className="bi bi-layers text-primary fs-3"></i>
                </div>
                <div className="text-muted small fw-medium text-uppercase tracking-wide" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>{t('trainee.dashboard.batchNo', 'ব্যাচ নম্বর')}</div>
                <h4 className="mb-0 fw-bold">{batch.batch_no}</h4>
                <div className="small text-primary fw-medium">{batch.name_bn}</div>
              </div>
            </div>
          </div>
          <div className="col-6">
            <div className="card border-0 h-100 shadow-sm" style={{ borderRadius: 20, background: 'linear-gradient(145deg, #ffffff, #f8f9fa)' }}>
              <div className="card-body p-3 p-md-4 d-flex flex-column align-items-center text-center gap-2">
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2" style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #e6f9ed, #c8f0d5)' }}>
                  <i className="bi bi-check2-circle text-success fs-3"></i>
                </div>
                <div className="text-muted small fw-medium text-uppercase tracking-wide" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>{t('trainee.dashboard.status', 'স্ট্যাটাস')}</div>
                <h4 className="mb-0 fw-bold">{t(`batch.status.${batch.status}`, STATUS_MAP[batch.status] || batch.status)}</h4>
                <div className="small text-success fw-medium">{batch.start_date} - {batch.end_date}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────── Attendance Card ──────── */}
      {attPct !== null && (
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 20, background: 'linear-gradient(145deg, #ffffff, #f8f9fa)' }}>
          <div className="card-body p-4 p-md-5">
            <div className="d-flex flex-wrap align-items-center gap-4 gap-md-5">
              <div className="flex-shrink-0 mx-auto">
                <AttendanceRing pct={attPct} />
              </div>
              <div className="flex-grow-1 text-center text-md-start">
                <h5 className="fw-bold mb-1">{t('trainee.dashboard.attendanceRate', 'উপস্থিতির হার')}</h5>
                <p className="text-muted small mb-3">
                  {warning
                    ? t('trainee.dashboard.warningBelow80', 'সতর্কতা: আপনার উপস্থিতির হার ৮০% এর নিচে।')
                    : t('trainee.dashboard.attendanceGood', 'আপনার উপস্থিতির হার সন্তোষজনক।')}
                </p>
                <div className="progress" style={{ height: 8, borderRadius: 4, background: '#e9ecef' }}>
                  <div
                    className={`progress-bar ${warning ? 'bg-danger' : 'bg-success'}`}
                    style={{ width: `${Math.min(attPct, 100)}%`, transition: 'width 0.8s ease' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────── Application Status ──────── */}
      {application && (
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 20, background: 'linear-gradient(145deg, #ffffff, #f8f9fa)' }}>
          <div className="card-body p-4">
            <div className="d-flex flex-wrap align-items-center gap-3">
              <div className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
                <i className="bi bi-file-text text-warning fs-4"></i>
              </div>
              <div className="flex-grow-1 min-width-0">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                  <span className="fw-bold">{application.circular_title}</span>
                  <span className={`badge ${STATUS_BADGE[application.status] || 'bg-secondary'}`}>{application.status_display}</span>
                </div>
                <div className="small text-muted">
                  {application.application_no} &middot; {application.chosen_center || 'কেন্দ্র বাছাই করা হয়নি'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────── Quick Links ──────── */}
      <h6 className="mb-3 fw-bold text-muted text-uppercase small" style={{ letterSpacing: '1px' }}>{t('trainee.dashboard.quickLinks', 'দ্রুত লিঙ্ক')}</h6>
      <div className="row g-3">
        {[
          { to: '/trainee/schedule', label: t('trainee.dashboard.schedule', 'সময়সূচি'), icon: 'bi-calendar-week', bg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', color: '#2563eb' },
          { to: '/trainee/attendance', label: t('nav.attendance', 'উপস্থিতি'), icon: 'bi-check-circle', bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', color: '#16a34a' },
          { to: '/trainee/assessment', label: t('trainee.dashboard.assessment', 'মূল্যায়ন'), icon: 'bi-clipboard-data', bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#d97706' },
          { to: '/trainee/certificate', label: t('trainee.dashboard.certificate', 'সার্টিফিকেট'), icon: 'bi-award', bg: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', color: '#4f46e5' },
          { to: '/trainee/profile', label: t('nav.profile', 'প্রোফাইল'), icon: 'bi-person-gear', bg: 'linear-gradient(135deg, #fce7f3, #fbcfe8)', color: '#db2777' },
        ].map((link) => (
          <div className="col-6 col-md-4" key={link.to}>
            <Link to={link.to} className="card border-0 text-decoration-none h-100 shadow-sm transition" style={{ borderRadius: 20, overflow: 'hidden', transition: 'all 0.25s ease' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div className="card-body text-center p-4" style={{ background: link.bg }}>
                <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: 60, height: 60, background: 'rgba(255,255,255,0.7)' }}>
                  <i className={`bi ${link.icon}`} style={{ fontSize: '1.6rem', color: link.color }}></i>
                </div>
                <h6 className="mb-0 fw-bold" style={{ color: link.color, fontSize: '0.95rem' }}>{link.label}</h6>
              </div>
            </Link>
          </div>
        ))}
      </div>

    </div>
  );
}
