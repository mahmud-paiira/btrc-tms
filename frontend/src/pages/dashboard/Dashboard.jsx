import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';
import centerDashboardService from '../../services/centerDashboardService';
import { formatDate } from '../../utils/dateFormatter';
import { formatNumber, formatPercentage, convertToBanglaDigits } from '../../utils/numberFormatter';

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const fetched = useRef(false);
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [actions, setActions] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    const load = async () => {
      try {
        const [s, c, a, q, r] = await Promise.all([
          centerDashboardService.getSummary(),
          centerDashboardService.getCharts(),
          centerDashboardService.getAlerts(),
          centerDashboardService.getQuickActions(),
          centerDashboardService.getRecentActivity(),
        ]);
        setSummary(s.data);
        setCharts(c.data);
        setAlerts(a.data);
        setActions(q.data);
        setActivity(r.data);
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/login');
          return;
        }
        setSummary({ error: true, status: err.response?.status });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate, t]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" style={{ width: 28, height: 28 }} />
        <p className="mt-2 text-muted small">{t('dashboard.loading', 'ড্যাশবোর্ড লোড হচ্ছে...')}</p>
      </div>
    );
  }

  if (!summary || summary.error) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="bi bi-exclamation-circle fs-2"></i>
        <p className="mt-2 small">
          {summary?.status === 403
            ? t('dashboard.noAccess', 'এই পৃষ্ঠায় আপনার প্রবেশাধিকার নেই।')
            : t('dashboard.noCenter', 'কোন কেন্দ্র নির্ধারিত নেই। অনুগ্রহ করে হেড অফিসের সাথে যোগাযোগ করুন।')}
        </p>
      </div>
    );
  }

  const { center_name, center_code } = summary;

  return (
    <div className="container-xl py-3">
      {/* Header */}
      <div className="bg-white p-3 rounded border mb-4" style={{ borderColor: 'var(--border-light)' }}>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-heading)', fontSize: '1.1rem' }}>{center_name}</h5>
            <div className="d-flex align-items-center gap-2 text-muted mt-1">
              <small>{t('dashboard.centerCode', 'কেন্দ্র কোড:')} <strong>{convertToBanglaDigits(center_code)}</strong></small>
              <span className="text-muted">|</span>
              <small>{formatDate(new Date())}</small>
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="row g-3 mb-4">
        {[
          { label: t('dashboard.stats.activeBatches', 'চলমান ব্যাচ'), value: formatNumber(summary.active_batches, 'bn'), icon: 'bi-layers', color: '#4361ee' },
          { label: t('dashboard.stats.totalTrainees', 'মোট প্রশিক্ষণার্থী'), value: formatNumber(summary.total_trainees, 'bn'), icon: 'bi-people', color: '#059669' },
          { label: t('dashboard.stats.enrolled', 'নথিভুক্ত'), value: formatNumber(summary.enrolled_trainees, 'bn'), icon: 'bi-person-check', color: '#0ea5e9' },
          { label: t('dashboard.stats.todayAttendance', 'আজকের উপস্থিতি'), value: formatNumber(summary.today_attendance?.total || 0, 'bn'), icon: 'bi-calendar-check', color: '#d97706',
            extra: summary.today_attendance?.total > 0 ? formatPercentage(summary.today_attendance.percentage, 'bn') : null },
          { label: t('dashboard.stats.placementRate', 'চাকরি স্থাপনের হার'), value: formatPercentage(summary.placement_rate, 'bn'), icon: 'bi-briefcase', color: '#059669' },
          { label: t('dashboard.stats.pendingApplications', 'পেন্ডিং আবেদন'), value: formatNumber(summary.applications?.pending || 0, 'bn'), icon: 'bi-file-earmark-text', color: '#dc2626' },
        ].map((card) => (
          <div className="col-lg-4 col-md-6" key={card.label}>
            <div className="card h-100">
              <div className="card-body d-flex align-items-center gap-3 py-3 px-3">
                <div className="d-flex align-items-center justify-content-center rounded"
                  style={{ width: 40, height: 40, background: `${card.color}10`, color: card.color, flexShrink: 0 }}>
                  <i className={`bi ${card.icon}`}></i>
                </div>
                <div className="min-w-0">
                  <div className="text-muted" style={{ fontSize: 11 }}>{card.label}</div>
                  <div className="fw-bold" style={{ fontSize: 18, color: 'var(--text-heading)' }}>{card.value}</div>
                  {card.extra && <small className="text-muted">{card.extra}</small>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12">
          {/* Attendance trend */}
          <div className="card mb-3">
            <div className="card-header d-flex align-items-center gap-2">
              <i className="bi bi-graph-up text-muted"></i>
              <span>{t('dashboard.charts.attendanceTrend', 'ব্যাচভিত্তিক উপস্থিতির প্রবণতা')}</span>
            </div>
            <div className="card-body p-0">
              {charts?.attendance_trend?.length > 0 ? (
                <div className="table-responsive">
                  <table className="b-form-table align-middle">
                    <thead>
                      <tr><th>{t('dashboard.charts.batch', 'ব্যাচ')}</th><th className="text-center">{t('dashboard.charts.trainees', 'প্রশিক্ষণার্থী')}</th><th className="text-center">{t('dashboard.charts.avgAttendance', 'গড় উপস্থিতি')}</th><th>{t('dashboard.charts.progress', 'প্রগ্রেস')}</th></tr>
                    </thead>
                    <tbody>
                      {charts.attendance_trend.map((b) => (
                        <tr key={b.batch_id}>
                          <td>{b.batch_name}</td>
                          <td className="text-center">{formatNumber(b.total_trainees)}</td>
                          <td className="text-center">
                            <span className={`status-dot ${b.avg_attendance >= 80 ? 'dot-success' : 'dot-danger'}`} />
                              {formatPercentage(b.avg_attendance, 'bn')}
                          </td>
                          <td>
                            <div className="progress" style={{ height: 6 }}>
                              <div className={`progress-bar ${b.avg_attendance >= 80 ? 'bg-success' : 'bg-danger'}`}
                                style={{ width: `${Math.min(b.avg_attendance, 100)}%` }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-inbox"></i>
                  <p className="mb-0 mt-1 small">{t('dashboard.charts.noRunningBatch', 'কোন চলমান ব্যাচ নেই')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Assessment pass/fail */}
          <div className="card mb-3">
            <div className="card-header d-flex align-items-center gap-2">
              <i className="bi bi-clipboard-check text-muted"></i>
              <span>{t('dashboard.charts.assessmentRatio', 'মূল্যায়ন পাস/ফেল অনুপাত')}</span>
            </div>
            <div className="card-body p-0">
              {charts?.assessment_ratio?.length > 0 ? (
                <div className="table-responsive">
                  <table className="b-form-table align-middle">
                    <thead>
                      <tr><th>{t('dashboard.charts.batch', 'ব্যাচ')}</th><th className="text-center text-success">{t('dashboard.charts.competent', 'দক্ষ')}</th><th className="text-center text-danger">{t('dashboard.charts.notCompetent', 'অদক্ষ')}</th><th className="text-center text-secondary">{t('dashboard.charts.absent', 'অনুপস্থিত')}</th><th className="text-center">{t('dashboard.charts.passRate', 'পাসের হার')}</th><th>{t('dashboard.charts.progress', 'প্রগ্রেস')}</th></tr>
                    </thead>
                    <tbody>
                      {charts.assessment_ratio.map((b) => (
                        <tr key={b.batch_id}>
                          <td>{b.batch_name}</td>
                          <td className="text-center fw-bold text-success">{formatNumber(b.competent)}</td>
                          <td className="text-center fw-bold text-danger">{formatNumber(b.not_competent)}</td>
                          <td className="text-center text-secondary">{formatNumber(b.absent)}</td>
                          <td className="text-center">
                            <span className={`status-dot ${b.pass_rate >= 80 ? 'dot-success' : b.pass_rate >= 60 ? 'dot-warning' : 'dot-danger'}`} />
                              {formatPercentage(b.pass_rate, 'bn')}
                          </td>
                          <td>
                            <div className="progress" style={{ height: 6 }}>
                              <div className={`progress-bar ${b.pass_rate >= 80 ? 'bg-success' : b.pass_rate >= 60 ? 'bg-warning' : 'bg-danger'}`}
                                style={{ width: `${Math.min(b.pass_rate, 100)}%` }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-inbox"></i>
                  <p className="mb-0 mt-1 small">{t('dashboard.charts.noData', 'কোন ডাটা নেই')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Monthly enrollment */}
          <div className="card mb-3">
            <div className="card-header d-flex align-items-center gap-2">
              <i className="bi bi-person-plus text-muted"></i>
              <span>{t('dashboard.charts.monthlyEnrollment', 'মাসিক নথিভুক্তি')}</span>
            </div>
            <div className="card-body">
              {charts?.monthly_enrollment?.length > 0 ? (
                <div className="d-flex align-items-end gap-2" style={{ height: 180 }}>
                  {charts.monthly_enrollment.map((m) => {
                    const max = Math.max(...charts.monthly_enrollment.map((x) => x.count), 1);
                    const pct = (m.count / max) * 100;
                    return (
                      <div key={m.month} className="d-flex flex-column align-items-center flex-fill">
                        <small className="fw-bold mb-1" style={{ fontSize: 10, color: 'var(--primary)' }}>{formatNumber(m.count)}</small>
                        <div className="rounded-top" style={{ width: '100%', height: `${Math.max(pct, 3)}%`, background: 'var(--primary)' }} title={m.month} />
                        <small className="mt-1 text-muted" style={{ fontSize: 9 }}>{convertToBanglaDigits(m.month.slice(5))}</small>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-inbox fs-2"></i>
                  <p className="mb-0 mt-2 small">{t('dashboard.charts.noEnrollmentData', 'কোন নথিভুক্তি ডাটা নেই')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions & Activity */}
          <div className="row g-3">
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header d-flex align-items-center gap-2">
                  <i className="bi bi-lightning-charge text-muted"></i>
                  <span>{t('dashboard.quickActions.title', 'দ্রুত কর্ম')}</span>
                </div>
                <div className="card-body p-0">
                  <div className="list-group list-group-flush">
                    <Link to="/center-admin/batches/create" className="list-group-item list-group-item-action py-2 d-flex justify-content-between align-items-center" style={{ fontSize: 13 }}>
                      <span><i className="bi bi-plus-circle me-2 text-primary"></i>{t('dashboard.quickActions.newBatch', 'নতুন ব্যাচ তৈরি')}</span>
                      <i className="bi bi-chevron-right text-muted" style={{ fontSize: 10 }}></i>
                    </Link>
                    <Link to="/center-admin/applications" className="list-group-item list-group-item-action py-2 d-flex justify-content-between align-items-center" style={{ fontSize: 13 }}>
                      <span><i className="bi bi-file-earmark-text me-2 text-warning"></i>{t('dashboard.quickActions.reviewApplications', 'আবেদন পর্যালোচনা')}</span>
                      {actions?.pending_applications > 0 && (
                        <span className="text-muted small">{formatNumber(actions.pending_applications)}</span>
                      )}
                    </Link>
                    <Link to="/center-admin/certificates/issue" className="list-group-item list-group-item-action py-2 d-flex justify-content-between align-items-center" style={{ fontSize: 13 }}>
                      <span><i className="bi bi-award me-2 text-info"></i>{t('dashboard.quickActions.issueCertificate', 'সার্টিফিকেট ইস্যু')}</span>
                      {actions?.eligible_certificates > 0 && <span className="text-muted small">{formatNumber(actions.eligible_certificates)}</span>}
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header d-flex align-items-center gap-2">
                  <i className="bi bi-activity text-muted"></i>
                  <span>{t('dashboard.activity.title', 'সাম্প্রতিক কার্যক্রম')}</span>
                </div>
                <div className="card-body">
                  {activity ? (
                    <div className="d-grid gap-2">
                      <div className="d-flex justify-content-between align-items-center p-2 rounded" style={{ background: '#f9fafb', fontSize: 13 }}>
                        <span className="d-flex align-items-center gap-2">
                          <i className="bi bi-person-badge text-primary"></i>
                          {t('dashboard.activity.pendingTrainers', 'পেন্ডিং প্রশিক্ষক')}
                        </span>
                        <span className="fw-semibold">{formatNumber(activity.pending_trainers)}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center p-2 rounded" style={{ background: '#f9fafb', fontSize: 13 }}>
                        <span className="d-flex align-items-center gap-2">
                          <i className="bi bi-person-check text-success"></i>
                          {t('dashboard.activity.pendingAssessors', 'পেন্ডিং মূল্যায়নকারী')}
                        </span>
                        <span className="fw-semibold">{formatNumber(activity.pending_assessors)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted py-3">
                      <i className="bi bi-inbox"></i>
                      <p className="mt-1 mb-0 small">{t('dashboard.activity.noActivity', 'কোন কার্যক্রম নেই')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
