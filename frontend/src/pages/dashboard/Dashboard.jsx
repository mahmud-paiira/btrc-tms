import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';
import centerDashboardService from '../../services/centerDashboardService';
import { formatDate } from '../../utils/dateFormatter';
import { formatNumber, formatPercentage, convertToBanglaDigits } from '../../utils/numberFormatter';

const SEVERITY_BADGE = {
  danger: 'danger', warning: 'warning', info: 'info', primary: 'primary', success: 'success',
};

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
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">{t('dashboard.loading', 'ড্যাশবোর্ড লোড হচ্ছে...')}</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="bi bi-exclamation-triangle fs-1"></i>
        <p className="mt-2">{t('dashboard.loading', 'ড্যাশবোর্ড লোড হচ্ছে...')}</p>
      </div>
    );
  }

  if (summary.error) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="bi bi-exclamation-triangle fs-1"></i>
        <p className="mt-2">
          {summary.status === 403
            ? t('dashboard.noAccess', 'এই পৃষ্ঠায় আপনার প্রবেশাধিকার নেই।')
            : t('dashboard.noCenter', 'কোন কেন্দ্র নির্ধারিত নেই। অনুগ্রহ করে হেড অফিসের সাথে যোগাযোগ করুন।')}
        </p>
      </div>
    );
  }

  const { center_name, center_code } = summary;

  return (
    <div className="container-xl py-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-4 shadow-sm mb-5 border-start border-primary border-5">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h2 className="mb-1 fw-bold text-heading">{center_name}</h2>
            <div className="d-flex align-items-center gap-2 text-muted">
              <i className="bi bi-geo-alt"></i>
              <span>{t('dashboard.centerCode', 'কেন্দ্র কোড:')} <strong>{convertToBanglaDigits(center_code)}</strong></span>
            </div>
          </div>
          <div className="d-none d-md-block">
            <div className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-bold">
              <i className="bi bi-calendar3 me-2"></i>
              {formatDate(new Date())}
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="row g-4 mb-5">
        {[
          { label: t('dashboard.stats.activeBatches', 'চলমান ব্যাচ'), value: formatNumber(summary.active_batches, 'bn'), color: 'primary', icon: 'bi-layers' },
          { label: t('dashboard.stats.totalTrainees', 'মোট প্রশিক্ষণার্থী'), value: formatNumber(summary.total_trainees, 'bn'), color: 'success', icon: 'bi-people' },
          { label: t('dashboard.stats.enrolled', 'নথিভুক্ত'), value: formatNumber(summary.enrolled_trainees, 'bn'), color: 'info', icon: 'bi-person-check' },
          { label: t('dashboard.stats.todayAttendance', 'আজকের উপস্থিতি'), value: formatNumber(summary.today_attendance?.total || 0, 'bn'), color: 'warning', icon: 'bi-calendar-check',
            extra: summary.today_attendance?.total > 0 ? formatPercentage(summary.today_attendance.percentage, 'bn') : t('dashboard.stats.notMarked', 'চিহ্নিত হয়নি') },
          { label: t('dashboard.stats.placementRate', 'চাকরি স্থাপনের হার'), value: formatPercentage(summary.placement_rate, 'bn'), color: summary.placement_rate >= 60 ? 'success' : 'warning', icon: 'bi-briefcase' },
          { label: t('dashboard.stats.pendingApplications', 'পেন্ডিং আবেদন'), value: formatNumber(summary.applications?.pending || 0, 'bn'), color: 'danger', icon: 'bi-file-earmark-text' },
        ].map((card) => (
          <div className="col-lg-4 col-md-6" key={card.label}>
            <div className={`card shadow-sm border-0 h-100 position-relative overflow-hidden`} style={{ background: `var(--bs-${card.color})`, color: '#fff', borderRadius: 16 }}>
              <div className="card-body d-flex align-items-center justify-content-between p-4 z-index-1">
                <div>
                  <div className="text-white-50 small mb-1">{card.label}</div>
                  <h2 className="mb-0 fw-bold">{card.value}</h2>
                  {card.extra && <div className="mt-1 badge bg-white bg-opacity-20 text-white rounded-pill small" style={{ fontSize: 10 }}>{card.extra}</div>}
                </div>
                <div className="bg-white bg-opacity-20 rounded-circle d-flex align-items-center justify-content-center" style={{ width: 60, height: 60 }}>
                  <i className={`bi ${card.icon} fs-2`}></i>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        {/* Main Single Column */}
        <div className="col-12">
          {/* Attendance trend */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-light"><h6 className="mb-0"><i className="bi bi-graph-up me-2"></i>{t('dashboard.charts.attendanceTrend', 'ব্যাচভিত্তিক উপস্থিতির প্রবণতা')}</h6></div>
            <div className="card-body">
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
                            <div className="progress" style={{ height: 8 }}>
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
                <div className="text-center text-muted py-3"><i className="bi bi-inbox"></i><p className="mb-0 mt-1">{t('dashboard.charts.noRunningBatch', 'কোন চলমান ব্যাচ নেই')}</p></div>
              )}
            </div>
          </div>

          {/* Assessment pass/fail */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-light"><h6 className="mb-0"><i className="bi bi-clipboard-check me-2"></i>{t('dashboard.charts.assessmentRatio', 'মূল্যায়ন পাস/ফেল অনুপাত')}</h6></div>
            <div className="card-body">
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
                            <div className="progress" style={{ height: 8 }}>
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
                <div className="text-center text-muted py-3"><i className="bi bi-inbox"></i><p className="mb-0 mt-1">{t('dashboard.charts.noData', 'কোন ডাটা নেই')}</p></div>
              )}
            </div>
          </div>

          {/* Monthly enrollment bar */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-light"><h6 className="mb-0 fw-bold text-heading"><i className="bi bi-person-plus me-2 text-primary"></i>{t('dashboard.charts.monthlyEnrollment', 'মাসিক নথিভুক্তি')}</h6></div>
            <div className="card-body p-4">
              {charts?.monthly_enrollment?.length > 0 ? (
                <div className="d-flex align-items-end gap-3" style={{ height: 250, paddingBottom: 30 }}>
                  {charts.monthly_enrollment.map((m) => {
                    const max = Math.max(...charts.monthly_enrollment.map((x) => x.count), 1);
                    const pct = (m.count / max) * 100;
                    return (
                      <div key={m.month} className="d-flex flex-column align-items-center flex-fill">
                        <small className="fw-bold mb-2 text-primary">{formatNumber(m.count)}</small>
                        <div className="rounded-top" style={{ width: '100%', height: `${Math.max(pct, 3)}%`, background: 'linear-gradient(to top, var(--bs-primary), #818cf8)' }} title={m.month} />
                        <small className="mt-2 text-muted" style={{ fontSize: 10, transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{convertToBanglaDigits(m.month.slice(5))}</small>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-muted py-5"><i className="bi bi-inbox fs-2"></i><p className="mb-0 mt-2">{t('dashboard.charts.noEnrollmentData', 'কোন নথিভুক্তি ডাটা নেই')}</p></div>
              )}
            </div>
          </div>

          {/* Quick actions & Widgets in Single Column */}
          <div className="row g-4">
            {/* Quick actions */}
            <div className="col-md-6">
              <div className="card shadow-sm h-100 border-0 overflow-hidden" style={{ borderRadius: 20 }}>
                <div className="card-header bg-primary text-white py-3 border-0"><h6 className="mb-0 fw-bold"><i className="bi bi-lightning-charge me-2"></i>{t('dashboard.quickActions.title', 'দ্রুত কর্ম')}</h6></div>
                <div className="card-body p-0">
                  <div className="list-group list-group-flush">
                    <Link to="/center-admin/batches/create" className="list-group-item list-group-item-action py-3 d-flex justify-content-between align-items-center">
                      <span><i className="bi bi-plus-circle me-2 text-primary"></i>{t('dashboard.quickActions.newBatch', 'নতুন ব্যাচ তৈরি')}</span>
                      <i className="bi bi-chevron-right text-muted small"></i>
                    </Link>
                    <Link to="/center-admin/applications" className="list-group-item list-group-item-action py-3 d-flex justify-content-between align-items-center">
                      <span><i className="bi bi-file-earmark-text me-2 text-warning"></i>{t('dashboard.quickActions.reviewApplications', 'আবেদন পর্যালোচনা')}</span>
                      {actions?.pending_applications > 0 && (
                        <span><span className="status-dot dot-danger"></span>{formatNumber(actions.pending_applications)}</span>
                      )}
                    </Link>
                    <Link to="/center-admin/certificates/issue" className="list-group-item list-group-item-action py-3 d-flex justify-content-between align-items-center">
                      <span><i className="bi bi-award me-2 text-info"></i>{t('dashboard.quickActions.issueCertificate', 'সার্টিফিকেট ইস্যু')}</span>
                      {actions?.eligible_certificates > 0 && <span className="status-dot dot-success"></span>}{formatNumber(actions.eligible_certificates)}
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent activity summary */}
            <div className="col-md-6">
              <div className="card shadow-sm h-100 border-0 overflow-hidden" style={{ borderRadius: 20 }}>
                <div className="card-header bg-dark text-white py-3 border-0"><h6 className="mb-0 fw-bold"><i className="bi bi-activity me-2"></i>{t('dashboard.activity.title', 'সাম্প্রতিক কার্যক্রম')}</h6></div>
                <div className="card-body p-4">
                  {activity ? (
                    <div className="d-grid gap-3">
                      <div className="d-flex justify-content-between align-items-center p-2 rounded bg-light">
                        <span className="small"><i className="bi bi-person-badge me-2 text-primary"></i>{t('dashboard.activity.pendingTrainers', 'পেন্ডিং প্রশিক্ষক')}</span>
                        <span><span className="status-dot dot-primary"></span>{formatNumber(activity.pending_trainers)}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center p-2 rounded bg-light">
                        <span className="small"><i className="bi bi-person-check me-2 text-success"></i>{t('dashboard.activity.pendingAssessors', 'পেন্ডিং মূল্যায়নকারী')}</span>
                        <span><span className="status-dot dot-success"></span>{formatNumber(activity.pending_assessors)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted py-3"><i className="bi bi-inbox"></i><p className="mt-2 mb-0">{t('dashboard.activity.noActivity', 'কোন কার্যক্রম নেই')}</p></div>
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

