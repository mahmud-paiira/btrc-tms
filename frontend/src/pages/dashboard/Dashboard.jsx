import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';
import centerDashboardService from '../../services/centerDashboardService';
import { formatDate } from '../../utils/dateFormatter';
import { formatNumber, formatPercentage } from '../../utils/numberFormatter';

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
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1">{center_name}</h4>
          <p className="text-muted mb-0">{t('dashboard.centerCode', 'কেন্দ্র কোড:')} {center_code}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="row g-3 mb-4">
        {[
          { label: t('dashboard.stats.activeBatches', 'চলমান ব্যাচ'), value: formatNumber(summary.active_batches, 'bn'), color: 'primary', icon: 'bi-layers' },
          { label: t('dashboard.stats.totalTrainees', 'মোট প্রশিক্ষণার্থী'), value: formatNumber(summary.total_trainees, 'bn'), color: 'success', icon: 'bi-people' },
          { label: t('dashboard.stats.enrolled', 'নথিভুক্ত'), value: formatNumber(summary.enrolled_trainees, 'bn'), color: 'info', icon: 'bi-person-check' },
          { label: t('dashboard.stats.todayAttendance', 'আজকের উপস্থিতি'), value: formatNumber(summary.today_attendance?.total || 0, 'bn'), color: 'warning', icon: 'bi-calendar-check',
            extra: summary.today_attendance?.total > 0 ? formatPercentage(summary.today_attendance.percentage, 'bn') : t('dashboard.stats.notMarked', 'চিহ্নিত হয়নি') },
          { label: t('dashboard.stats.placementRate', 'চাকরি স্থাপনের হার'), value: formatPercentage(summary.placement_rate, 'bn'), color: summary.placement_rate >= 60 ? 'success' : 'warning', icon: 'bi-briefcase' },
          { label: t('dashboard.stats.pendingApplications', 'বিচারাধীন আবেদন'), value: formatNumber(summary.applications?.pending || 0, 'bn'), color: 'danger', icon: 'bi-file-earmark-text' },
        ].map((card) => (
          <div className="col-md-4 col-6" key={card.label}>
            <div className={`card text-bg-${card.color} shadow-sm h-100`}>
              <div className="card-body d-flex align-items-center gap-3">
                <i className={`bi ${card.icon} fs-1`}></i>
                <div>
                  <h3 className="mb-0">{card.value}</h3>
                  <small>{card.label}</small>
                  {card.extra && <div className="small opacity-75">{card.extra}</div>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        {/* Charts column */}
        <div className="col-lg-8">
          {/* Attendance trend */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-light"><h6 className="mb-0"><i className="bi bi-graph-up me-2"></i>{t('dashboard.charts.attendanceTrend', 'ব্যাচভিত্তিক উপস্থিতির প্রবণতা')}</h6></div>
            <div className="card-body">
              {charts?.attendance_trend?.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-bordered">
                    <thead className="table-light">
                      <tr><th>{t('dashboard.charts.batch', 'ব্যাচ')}</th><th className="text-center">{t('dashboard.charts.trainees', 'প্রশিক্ষণার্থী')}</th><th className="text-center">{t('dashboard.charts.avgAttendance', 'গড় উপস্থিতি')}</th><th style={{ width: '40%' }}>{t('dashboard.charts.progress', 'প্রগ্রেস')}</th></tr>
                    </thead>
                    <tbody>
                      {charts.attendance_trend.map((b) => (
                        <tr key={b.batch_id}>
                          <td>{b.batch_name}</td>
                          <td className="text-center">{b.total_trainees}</td>
                          <td className="text-center">
                            <span className={`badge ${b.avg_attendance >= 80 ? 'bg-success' : 'bg-danger'}`}>
                              {formatPercentage(b.avg_attendance, 'bn')}
                            </span>
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
                  <table className="table table-sm table-bordered">
                    <thead className="table-light">
                      <tr><th>{t('dashboard.charts.batch', 'ব্যাচ')}</th><th className="text-center text-success">{t('dashboard.charts.competent', 'দক্ষ')}</th><th className="text-center text-danger">{t('dashboard.charts.notCompetent', 'অদক্ষ')}</th><th className="text-center text-secondary">{t('dashboard.charts.absent', 'অনুপস্থিত')}</th><th className="text-center">{t('dashboard.charts.passRate', 'পাসের হার')}</th><th style={{ width: '30%' }}>{t('dashboard.charts.progress', 'প্রগ্রেস')}</th></tr>
                    </thead>
                    <tbody>
                      {charts.assessment_ratio.map((b) => (
                        <tr key={b.batch_id}>
                          <td>{b.batch_name}</td>
                          <td className="text-center fw-bold text-success">{b.competent}</td>
                          <td className="text-center fw-bold text-danger">{b.not_competent}</td>
                          <td className="text-center text-secondary">{b.absent}</td>
                          <td className="text-center">
                            <span className={`badge ${b.pass_rate >= 80 ? 'bg-success' : b.pass_rate >= 60 ? 'bg-warning' : 'bg-danger'}`}>
                              {formatPercentage(b.pass_rate, 'bn')}
                            </span>
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
            <div className="card-header bg-light"><h6 className="mb-0"><i className="bi bi-person-plus me-2"></i>{t('dashboard.charts.monthlyEnrollment', 'মাসিক নথিভুক্তি')}</h6></div>
            <div className="card-body">
              {charts?.monthly_enrollment?.length > 0 ? (
                <div className="d-flex align-items-end gap-2" style={{ height: 150 }}>
                  {charts.monthly_enrollment.map((m) => {
                    const max = Math.max(...charts.monthly_enrollment.map((x) => x.count), 1);
                    const pct = (m.count / max) * 100;
                    return (
                      <div key={m.month} className="d-flex flex-column align-items-center flex-fill">
                        <small className="fw-bold mb-1">{m.count}</small>
                        <div className="bg-primary rounded" style={{ width: '100%', height: `${Math.max(pct, 3)}%` }} title={m.month} />
                        <small className="mt-1" style={{ fontSize: 9 }}>{m.month.slice(5)}</small>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-muted py-3"><i className="bi bi-inbox"></i><p className="mb-0 mt-1">{t('dashboard.charts.noEnrollmentData', 'কোন নথিভুক্তি ডাটা নেই')}</p></div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar column */}
        <div className="col-lg-4">
          {/* Quick actions */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white"><h6 className="mb-0"><i className="bi bi-lightning-charge me-2"></i>{t('dashboard.quickActions.title', 'দ্রুত কর্ম')}</h6></div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                <Link to="/center-admin/batches/create" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                  <span><i className="bi bi-megaphone me-2 text-primary"></i>{t('dashboard.quickActions.newCircular', 'নতুন সার্কুলার')}</span>
                  {actions?.can_publish_circular && <span className="badge bg-primary rounded-pill">{t('dashboard.quickActions.hasDraft', 'খসড়া আছে')}</span>}
                </Link>
                <Link to="/center-admin/applications" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                  <span><i className="bi bi-file-earmark-text me-2 text-warning"></i>{t('dashboard.quickActions.reviewApplications', 'আবেদন পর্যালোচনা')}</span>
                  {actions?.pending_applications > 0 && (
                    <span className="badge bg-danger rounded-pill">{actions.pending_applications}</span>
                  )}
                </Link>
                <Link
                  to={actions?.running_batches > 0 ? `/center-admin/attendance/batch/${summary.active_batches > 0 ? charts?.attendance_trend?.[0]?.batch_id || '' : ''}` : '#'}
                  className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${actions?.needs_attendance_today ? 'list-group-item-warning' : ''}`}
                >
                  <span><i className="bi bi-calendar-check me-2 text-success"></i>{t('dashboard.quickActions.todayAttendance', 'আজকের উপস্থিতি')}</span>
                  {actions?.needs_attendance_today && <span className="badge bg-warning rounded-pill">{t('dashboard.quickActions.markNow', 'চিহ্নিত করুন')}</span>}
                </Link>
                <Link to="/center-admin/certificates/issue" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                  <span><i className="bi bi-award me-2 text-info"></i>{t('dashboard.quickActions.issueCertificate', 'সার্টিফিকেট ইস্যু')}</span>
                  {actions?.eligible_certificates > 0 && <span className="badge bg-success rounded-pill">{actions.eligible_certificates}</span>}
                </Link>
                <Link to="/center-admin/batches" className="list-group-item list-group-item-action">
                  <i className="bi bi-layers me-2 text-secondary"></i>{t('dashboard.quickActions.batchList', 'ব্যাচ তালিকা')}
                </Link>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-danger text-white"><h6 className="mb-0"><i className="bi bi-exclamation-triangle me-2"></i>{t('dashboard.alerts.title', 'সতর্কতা ও বিজ্ঞপ্তি')}</h6></div>
            <div className="card-body p-0">
              {alerts.length === 0 ? (
                <div className="text-center text-muted py-4"><i className="bi bi-check-circle fs-3 text-success"></i><p className="mt-2 mb-0">{t('dashboard.alerts.none', 'কোন সতর্কতা নেই')}</p></div>
              ) : (
                <div className="list-group list-group-flush">
                  {alerts.map((alert, i) => (
                    <div key={i} className={`list-group-item list-group-item-${SEVERITY_BADGE[alert.severity] || 'light'} border-start border-${SEVERITY_BADGE[alert.severity] || 'secondary'} border-start-4`}>
                      <div className="d-flex w-100 justify-content-between">
                        <h6 className="mb-1">{alert.title}</h6>
                        <small>{alert.data?.length || alert.data?.count || ''}</small>
                      </div>
                      <p className="mb-1 small">{alert.message}</p>
                      {alert.type === 'low_attendance' && alert.data?.length > 0 && (
                        <div className="mt-1">
                          {alert.data.map((b) => (
                            <Link key={b.batch_id} to={`/center-admin/attendance/batch/${b.batch_id}`}
                              className="badge bg-danger text-decoration-none me-1">
                              {b.batch_name}: {b.low_attendance_count}/{b.total_trainees}
                            </Link>
                          ))}
                        </div>
                      )}
                      {alert.type === 'upcoming_batches' && alert.data?.length > 0 && (
                        <div className="mt-1">
                          {alert.data.map((b) => (
                            <span key={b.batch_id} className="badge bg-primary me-1">{b.batch_name}: {b.start_date}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-info text-white"><h6 className="mb-0"><i className="bi bi-activity me-2"></i>{t('dashboard.activity.title', 'সাম্প্রতিক কার্যক্রম')}</h6></div>
            <div className="card-body p-0">
              {activity ? (
                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between align-items-center">
                    <span><i className="bi bi-person-badge me-2 text-warning"></i>{t('dashboard.activity.pendingTrainers', 'বিচারাধীন প্রশিক্ষক')}</span>
                    <span className="badge bg-warning rounded-pill">{activity.pending_trainers}</span>
                  </div>
                  <div className="list-group-item d-flex justify-content-between align-items-center">
                    <span><i className="bi bi-person-check me-2 text-warning"></i>{t('dashboard.activity.pendingAssessors', 'বিচারাধীন মূল্যায়নকারী')}</span>
                    <span className="badge bg-warning rounded-pill">{activity.pending_assessors}</span>
                  </div>
                  <div className="list-group-item">
                    <h6 className="mb-2"><i className="bi bi-file-earmark-text me-2"></i>{t('dashboard.activity.recentApplications', 'সাম্প্রতিক আবেদন')}</h6>
                    {activity.recent_applications?.length > 0 ? (
                      activity.recent_applications.slice(0, 3).map((a) => (
                        <div key={a.id} className="d-flex justify-content-between align-items-start mb-1 small">
                          <span>{a.name}</span>
                          <span className="text-muted" style={{ fontSize: 10 }}>
                            {formatDate(a.applied_at, 'bn')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted small">{t('dashboard.activity.noApplications', 'কোন আবেদন নেই')}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted py-4"><i className="bi bi-inbox"></i><p className="mt-2 mb-0">{t('dashboard.activity.noActivity', 'কোন কার্যক্রম নেই')}</p></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
