import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from '../../hooks/useTranslation';
import traineeService from '../../services/traineeService';

const APP_STATUS_BADGE = {
  pending: 'bg-warning text-dark', auto_rejected: 'bg-danger', selected: 'bg-success',
  rejected: 'bg-danger', waitlisted: 'bg-info text-dark', enrolled: 'bg-primary',
};

const BRAND = '#1b6b3b';

function StatCard({ icon, label, value, color }) {
  return (
    <div className="d-flex align-items-start gap-2 p-3 bg-white rounded-4 shadow-sm h-100" style={{ minWidth: 0 }}>
      <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 mt-1" style={{ width: 36, height: 36, background: `${color}15` }}>
        <i className={`bi ${icon}`} style={{ fontSize: '1rem', color }}></i>
      </div>
      <div className="min-width-0" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
        <div className="text-muted" style={{ fontSize: '0.65rem', letterSpacing: '0.3px', textTransform: 'uppercase' }}>{label}</div>
        <div className="fw-bold small">{value || '—'}</div>
      </div>
    </div>
  );
}

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

function QuickLink({ to, label, icon, bg, color }) {
  return (
    <Link to={to} className="card border-0 text-decoration-none h-100 shadow-sm transition" style={{ borderRadius: 20, overflow: 'hidden', transition: 'all 0.25s ease' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}>
      <div className="card-body text-center p-4" style={{ background: bg }}>
        <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: 60, height: 60, background: 'rgba(255,255,255,0.75)' }}>
          <i className={`bi ${icon}`} style={{ fontSize: '1.6rem', color }}></i>
        </div>
        <h6 className="mb-0 fw-bold" style={{ color, fontSize: '0.95rem' }}>{label}</h6>
      </div>
    </Link>
  );
}

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

  const { batch, attendance_percentage: attPct, full_name_bn, full_name_en, registration_no, center_name, email, phone } = data;
  const warning = attPct !== null && attPct < 80;
  const displayName = full_name_bn || full_name_en;
  const initial = (displayName || '?').charAt(0);

  return (
    <div className="px-4 px-lg-5 py-4" style={{ maxWidth: '1200px', margin: '0 auto' }}>

      {/* ──────── Header ──────── */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: BRAND }}>প্রশিক্ষণার্থী ড্যাশবোর্ড</h4>
          <p className="text-muted mb-0 small">আপনার প্রশিক্ষণ সংক্রান্ত সকল তথ্য</p>
        </div>
      </div>

      {/* ──────── Hero Profile Card ──────── */}
      <div className="card border-0 shadow-sm overflow-hidden mb-4" style={{ borderRadius: 24, background: BRAND }}>
        <div className="card-body p-4 p-md-5">
          <div className="d-flex align-items-center gap-3 gap-md-4">
            <div className="flex-shrink-0 position-relative">
              {data.profile_image ? (
                <img src={data.profile_image} alt="" className="rounded-circle shadow-lg border border-white border-3" style={{ width: 100, height: 100, objectFit: 'cover' }} />
              ) : (
                <div className="rounded-circle bg-white bg-opacity-20 text-white d-flex align-items-center justify-content-center shadow-lg border border-white border-3" style={{ width: 100, height: 100, fontSize: 40 }}>
                  {initial}
                </div>
              )}
              <div className="position-absolute bottom-0 end-0 bg-success rounded-circle border border-white border-2" style={{ width: 18, height: 18 }} />
            </div>
            <div className="flex-grow-1 min-width-0">
              <h2 className="mb-1 fw-bold text-white" style={{ fontSize: 'clamp(1.2rem, 3vw, 1.7rem)' }}>{displayName}</h2>
              <div className="d-flex flex-wrap gap-2 mt-2">
                <span className="d-inline-flex align-items-center gap-1 bg-white bg-opacity-10 rounded-pill px-3 py-1 small text-white-50">
                  <i className="bi bi-person-badge" />{registration_no}
                </span>
                {center_name && (
                  <span className="d-inline-flex align-items-center gap-1 bg-white bg-opacity-10 rounded-pill px-3 py-1 small text-white-50">
                    <i className="bi bi-building" />{center_name}
                  </span>
                )}
                {phone && (
                  <span className="d-inline-flex align-items-center gap-1 bg-white bg-opacity-10 rounded-pill px-3 py-1 small text-white-50">
                    <i className="bi bi-telephone" />{phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ──────── Stats Row ──────── */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <StatCard icon="bi-layers" label="ব্যাচ" value={batch ? batch.batch_no : 'নথিভুক্ত নন'} color={BRAND} />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard icon="bi-book" label="কোর্স" value={batch?.course_name || '—'} color="#16a34a" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard icon="bi-calendar-range" label="সময়সীমা" value={batch ? `${batch.start_date} - ${batch.end_date}` : '—'} color="#d97706" />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard icon="bi-check-circle" label="উপস্থিতি" value={attPct !== null ? `${attPct}%` : '—'} color={warning ? '#dc3545' : '#198754'} />
        </div>
      </div>

      {/* ──────── Application + Attendance Row ──────── */}
      <div className="row g-4 mb-4">
        {/* Application Status */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 20, background: 'linear-gradient(145deg, #ffffff, #f8f9fa)' }}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <i className="bi bi-file-text" style={{ color: BRAND }}></i>
                <span className="fw-bold small text-uppercase" style={{ color: BRAND, letterSpacing: '0.5px' }}>আবেদনের অবস্থা</span>
              </div>
              {application ? (
                <div className="d-flex align-items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ width: 48, height: 48, background: '#fef3c7' }}>
                      <i className="bi bi-file-earmark-text text-warning fs-5"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1 min-width-0">
                    <div className="fw-bold" style={{ wordBreak: 'break-word' }}>{application.circular_title}</div>
                    <div className="small text-muted">{application.application_no}</div>
                    <div className="mt-1">
                      <span className={`badge ${APP_STATUS_BADGE[application.status] || 'bg-secondary'} rounded-pill`}>{application.status_display}</span>
                    </div>
                  </div>
                  <Link to="/trainee/application" className="btn btn-outline-secondary btn-sm rounded-pill flex-shrink-0">বিস্তারিত</Link>
                </div>
              ) : (
                <div className="text-center py-3 text-muted">
                  <i className="bi bi-inbox fs-2 d-block mb-2"></i>
                  <span className="small">কোনো আবেদন পাওয়া যায়নি</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Attendance Card */}
        <div className="col-md-6">
          {attPct !== null ? (
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 20, background: 'linear-gradient(145deg, #ffffff, #f8f9fa)' }}>
              <div className="card-body p-4 d-flex align-items-center gap-4">
                <div className="flex-shrink-0">
                  <AttendanceRing pct={attPct} />
                </div>
                <div className="flex-grow-1 min-width-0">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className={`bi ${warning ? 'bi-exclamation-triangle text-danger' : 'bi-check-circle text-success'}`}></i>
                    <span className="fw-bold small text-uppercase" style={{ letterSpacing: '0.5px' }}>উপস্থিতির হার</span>
                  </div>
                  <p className={`small mb-2 ${warning ? 'text-danger' : 'text-success'} fw-medium`}>
                    {warning ? 'সতর্কতা: আপনার উপস্থিতির হার ৮০% এর নিচে' : 'আপনার উপস্থিতির হার সন্তোষজনক'}
                  </p>
                  <div className="progress" style={{ height: 6, borderRadius: 3, background: '#e9ecef' }}>
                    <div className={`progress-bar ${warning ? 'bg-danger' : 'bg-success'}`} style={{ width: `${Math.min(attPct, 100)}%`, borderRadius: 3, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 20, background: 'linear-gradient(145deg, #ffffff, #f8f9fa)' }}>
              <div className="card-body p-4 d-flex align-items-center gap-3">
                <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ width: 48, height: 48, background: '#e9ecef' }}>
                  <i className="bi bi-check-circle text-muted fs-5"></i>
                </div>
                <div>
                  <div className="fw-bold small text-uppercase" style={{ letterSpacing: '0.5px' }}>উপস্থিতি</div>
                  <div className="small text-muted">ব্যাচে নথিভুক্ত হলে উপস্থিতির তথ্য দেখা যাবে</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ──────── Quick Links ──────── */}
      <h6 className="mb-3 fw-bold" style={{ color: BRAND, letterSpacing: '0.5px' }}><i className="bi bi-grid-3x3-gap-fill me-2"></i>দ্রুত লিঙ্ক</h6>
      <div className="row g-3">
        <div className="col-6 col-md-4"><QuickLink to="/trainee/schedule" label="সময়সূচি" icon="bi-calendar-week" bg="linear-gradient(135deg, #dbeafe, #bfdbfe)" color="#2563eb" /></div>
        <div className="col-6 col-md-4"><QuickLink to="/trainee/attendance" label="উপস্থিতি" icon="bi-check-circle" bg="linear-gradient(135deg, #dcfce7, #bbf7d0)" color="#16a34a" /></div>
        <div className="col-6 col-md-4"><QuickLink to="/trainee/assessment" label="মূল্যায়ন" icon="bi-clipboard-data" bg="linear-gradient(135deg, #fef3c7, #fde68a)" color="#d97706" /></div>
        <div className="col-6 col-md-4"><QuickLink to="/trainee/certificate" label="সার্টিফিকেট" icon="bi-award" bg="linear-gradient(135deg, #e0e7ff, #c7d2fe)" color="#4f46e5" /></div>
        <div className="col-6 col-md-4"><QuickLink to="/trainee/profile" label="প্রোফাইল" icon="bi-person-gear" bg="linear-gradient(135deg, #fce7f3, #fbcfe8)" color="#db2777" /></div>
      </div>

    </div>
  );
}
