import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import hoService from '../../services/hoService';
import { useTranslation } from '../../hooks/useTranslation';

const COLORS = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#0dcaf0', '#6610f2', '#fd7e14', '#20c997'];

export default function HoDashboard() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [centerChart, setCenterChart] = useState([]);
  const [monthlyReg, setMonthlyReg] = useState([]);
  const [completion, setCompletion] = useState(null);
  const [placement, setPlacement] = useState([]);
  const [batchStatus, setBatchStatus] = useState([]);
  const [activity, setActivity] = useState(null);
  const [recentActions, setRecentActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, cc, mr, cr, pl, bs, ra, ract] = await Promise.all([
        hoService.getSummary(),
        hoService.getCenterEnrollmentChart(),
        hoService.getMonthlyRegistrations(),
        hoService.getCompletionRate(),
        hoService.getPlacementChart(),
        hoService.getBatchStatusCounts(),
        hoService.getRecentActivity(),
        hoService.getRecentActivities().catch(() => []),
      ]);
      setSummary(s.data);
      setCenterChart(cc.data);
      setMonthlyReg(mr.data);
      setCompletion(cr.data);
      setPlacement(pl.data);
      setBatchStatus(bs.data);
      setActivity(ra.data);
      setRecentActions(Array.isArray(ract) ? ract : ract?.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">{t('hoDashboard.loading', 'ড্যাশবোর্ড লোড হচ্ছে...')}</p>
      </div>
    );
  }

  const attRate = summary?.today_attendance_rate ?? 0;
  const attColor = attRate >= 80 ? 'success' : attRate >= 60 ? 'warning' : 'danger';

  return (
    <div style={{ fontFamily: 'NikoshBAN, sans-serif' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">{t('hoDashboard.title', 'হেড অফিস ড্যাশবোর্ড')}</h4>
        <button className="btn btn-outline-primary btn-sm" onClick={handleRefresh} disabled={refreshing}>
          <i className={`bi ${refreshing ? 'bi-arrow-repeat spin' : 'bi-arrow-clockwise'} me-1`}></i>
          {refreshing ? t('site.refreshing', 'রিফ্রেশ হচ্ছে...') : t('site.refresh', 'রিফ্রেশ')}
        </button>
      </div>

      {/* Summary cards */}
      <div className="row g-3 mb-4">
        {[
          { label: t('hoDashboard.totalCenters', 'মোট কেন্দ্র'), value: summary?.total_centers || 0, color: 'primary', icon: 'bi-building', to: '/ho/centers' },
          { label: t('hoDashboard.activeCenters', 'সক্রিয় কেন্দ্র'), value: summary?.active_centers || 0, color: 'success', icon: 'bi-building-check', to: '/ho/centers' },
          { label: t('hoDashboard.totalCourses', 'মোট কোর্স'), value: summary?.total_courses || 0, color: 'info', icon: 'bi-book' },
          { label: t('hoDashboard.activeCirculars', 'সক্রিয় সার্কুলার'), value: summary?.active_circulars || 0, color: 'warning', icon: 'bi-megaphone' },
          { label: t('hoDashboard.totalTrainees', 'মোট প্রশিক্ষণার্থী'), value: summary?.total_trainees || 0, color: 'primary', icon: 'bi-people' },
          { label: t('hoDashboard.enrolled', 'নথিভুক্ত'), value: summary?.enrolled_trainees || 0, color: 'success', icon: 'bi-person-check' },
          { label: t('hoDashboard.completed', 'সমাপ্ত'), value: summary?.completed_trainees || 0, color: 'info', icon: 'bi-person-check-fill' },
          { label: t('hoDashboard.runningBatches', 'চলমান ব্যাচ'), value: summary?.running_batches || 0, color: 'warning', icon: 'bi-layers' },
          { label: t('hoDashboard.pending', 'বিচারাধীন'), value: summary?.total_pending || 0, color: 'danger', icon: 'bi-hourglass-split', to: '/ho/approvals' },
        ].map((card) => {
          const inner = (
            <div className={`card text-bg-${card.color} shadow-sm h-100${card.to ? ' cursor-pointer' : ''}`}>
              <div className="card-body d-flex align-items-center gap-3">
                <i className={`bi ${card.icon} fs-1`}></i>
                <div>
                  <h3 className="mb-0">{card.value}</h3>
                  <small>{card.label}</small>
                </div>
              </div>
            </div>
          );
          return (
            <div className="col-md-4 col-6" key={card.label}>
              {card.to ? <Link to={card.to} className="text-decoration-none">{inner}</Link> : inner}
            </div>
          );
        })}
      </div>

      {/* Charts row 1 */}
      <div className="row g-4 mb-4">
        {/* Center enrollment bar chart */}
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-light"><h6 className="mb-0"><i className="bi bi-bar-chart me-2"></i>{t('hoDashboard.chartCenterEnrollment', 'কেন্দ্রভিত্তিক নথিভুক্তি')}</h6></div>
            <div className="card-body" style={{ maxHeight: 300, overflowY: 'auto' }}>
              {centerChart.map((c, i) => {
                const max = Math.max(...centerChart.map((x) => x.trainee_count), 1);
                const pct = (c.trainee_count / max) * 100;
                return (
                  <div key={c.center_code} className="mb-2">
                    <div className="d-flex justify-content-between small">
                      <span>{c.center_name}</span>
                      <span className="fw-bold">{c.trainee_count}</span>
                    </div>
                    <div className="progress" style={{ height: 8 }}>
                      <div
                        className="progress-bar"
                        style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Monthly registrations */}
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-light"><h6 className="mb-0"><i className="bi bi-graph-up me-2"></i>{t('hoDashboard.chartMonthlyTrend', 'মাসিক নিবন্ধন')}</h6></div>
            <div className="card-body">
              <div className="d-flex align-items-end gap-1" style={{ height: 200 }}>
                {monthlyReg.map((m) => {
                  const max = Math.max(...monthlyReg.map((x) => x.count), 1);
                  const pct = (m.count / max) * 100;
                  return (
                    <div key={m.month} className="d-flex flex-column align-items-center flex-fill">
                      <small className="mb-1 fw-bold">{m.count}</small>
                      <div className="bg-primary rounded" style={{ width: '100%', height: `${Math.max(pct, 2)}%` }} title={m.month} />
                      <small className="mt-1" style={{ fontSize: 9 }}>{m.month.slice(5)}</small>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="row g-4 mb-4">
        {/* Completion rate pie */}
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-light"><h6 className="mb-0"><i className="bi bi-pie-chart me-2"></i>{t('hoDashboard.chartCompletionRate', 'সমাপ্তির হার')}</h6></div>
            <div className="card-body text-center">
              <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto' }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e9ecef" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#198754" strokeWidth="3" strokeDasharray={`${completion?.completion_rate || 0}, 100`} />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                  <h3 className="mb-0">{completion?.completion_rate || 0}%</h3>
                  <small className="text-muted">{t('hoDashboard.completed', 'সমাপ্ত')}</small>
                </div>
              </div>
              <div className="mt-3">
                <div className="d-flex justify-content-between mb-1">
                  <span>{t('hoDashboard.completed', 'সমাপ্ত')}</span><span className="fw-bold text-success">{completion?.completed || 0}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span>{t('hoDashboard.enrolled', 'নথিভুক্ত')}</span><span className="fw-bold text-primary">{completion?.enrolled || 0}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span>{t('hoDashboard.failed', 'ব্যর্থ')}</span><span className="fw-bold text-danger">{completion?.failed || 0}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>{t('hoDashboard.dropped', 'ঝরে পড়া')}</span><span className="fw-bold text-warning">{completion?.dropped || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Batch status */}
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-light"><h6 className="mb-0"><i className="bi bi-circle-fill me-2"></i>{t('hoDashboard.chartBatchStatus', 'ব্যাচের অবস্থা')}</h6></div>
            <div className="card-body">
              {batchStatus.map((b) => (
                <div key={b.status} className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span>{b.label}</span>
                    <span className="fw-bold">{b.count}</span>
                  </div>
                  <div className="progress" style={{ height: 8 }}>
                    <div
                      className={`progress-bar ${b.status === 'running' ? 'bg-success' : b.status === 'completed' ? 'bg-primary' : b.status === 'scheduled' ? 'bg-secondary' : 'bg-danger'}`}
                      style={{ width: `${summary?.total_batches ? (b.count / summary.total_batches) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-light"><h6 className="mb-0"><i className="bi bi-activity me-2"></i>{t('hoDashboard.chartRecentActivity', 'সাম্প্রতিক কার্যক্রম')}</h6></div>
            <div className="card-body">
              {activity && (
                <>
                  <div className="d-flex justify-content-between mb-3 p-2 bg-light rounded">
                    <span><i className="bi bi-file-earmark-text me-1 text-primary"></i>{t('hoDashboard.recentApplications', 'নতুন আবেদন')}</span>
                    <span className="fw-bold">{activity.new_applications}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3 p-2 bg-light rounded">
                    <span><i className="bi bi-person-plus me-1 text-success"></i>{t('hoDashboard.recentEnrollments', 'নতুন নথিভুক্তি')}</span>
                    <span className="fw-bold">{activity.new_enrollments}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3 p-2 bg-light rounded">
                    <span><i className="bi bi-award me-1 text-info"></i>{t('hoDashboard.recentCertificates', 'নতুন সার্টিফিকেট')}</span>
                    <span className="fw-bold">{activity.new_certificates}</span>
                  </div>
                  <div className="d-flex justify-content-between p-2 bg-light rounded">
                    <span><i className="bi bi-briefcase me-1 text-warning"></i>{t('hoDashboard.recentJobs', 'নতুন চাকরি')}</span>
                    <span className="fw-bold">{activity.new_placements}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Placement chart */}
      <div className="row g-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header bg-light"><h6 className="mb-0"><i className="bi bi-briefcase me-2"></i>{t('hoDashboard.chartPlacementRate', 'চাকরি স্থাপনের হার')}</h6></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-sm table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>{t('batch.list.colBatchNo', 'ব্যাচ')}</th>
                      <th className="text-center">{t('job.summary.total', 'মোট')}</th>
                      <th className="text-center">{t('job.summary.placed', 'স্থাপিত')}</th>
                      <th className="text-center">{t('job.summary.rate', 'হার')}</th>
                      <th style={{ width: '40%' }}>{t('dashboard.charts.progress', 'অগ্রগতি')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {placement.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-muted">{t('hoDashboard.noData', 'কোন তথ্য নেই')}</td></tr>
                    ) : (
                      placement.map((p) => (
                        <tr key={p.batch_id}>
                          <td>{p.batch_name}</td>
                          <td className="text-center">{p.total_trainees}</td>
                          <td className="text-center">{p.placed_count}</td>
                          <td className="text-center">
                            <span className={`badge ${p.placement_rate >= 60 ? 'bg-success' : p.placement_rate >= 40 ? 'bg-warning' : 'bg-danger'}`}>
                              {p.placement_rate}%
                            </span>
                          </td>
                          <td>
                            <div className="progress" style={{ height: 8 }}>
                              <div
                                className={`progress-bar ${p.placement_rate >= 60 ? 'bg-success' : p.placement_rate >= 40 ? 'bg-warning' : 'bg-danger'}`}
                                style={{ width: `${Math.min(p.placement_rate, 100)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="row g-3 mt-2">
        <div className="col-md-3">
          <Link to="/ho/centers" className="btn btn-outline-primary w-100 py-3">
            <i className="bi bi-building me-2"></i>{t('hoDashboard.quickLinks.centerManagement', 'কেন্দ্র ব্যবস্থাপনা')}
          </Link>
        </div>
        <div className="col-md-3">
          <Link to="/ho/approvals" className="btn btn-outline-warning w-100 py-3">
            <i className="bi bi-check2-circle me-2"></i>{t('hoDashboard.quickLinks.approvals', 'অনুমোদন')}
          </Link>
        </div>
        <div className="col-md-3">
          <Link to="/ho/reports" className="btn btn-outline-info w-100 py-3">
            <i className="bi bi-file-earmark-bar-graph me-2"></i>{t('hoDashboard.quickLinks.reports', 'প্রতিবেদন')}
          </Link>
        </div>
        <div className="col-md-3">
          <Link to="/center-admin/applications" className="btn btn-outline-secondary w-100 py-3">
            <i className="bi bi-file-earmark-text me-2"></i>{t('hoDashboard.quickLinks.applications', 'আবেদন')}
          </Link>
        </div>
      </div>

      {/* Pending Approvals Widget */}
      <div className="row g-4 mt-3">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h6 className="mb-0"><i className="bi bi-hourglass-split me-2"></i>{t('hoDashboard.pendingApprovals', 'বিচারাধীন অনুমোদন')}</h6>
              <Link to="/ho/approvals" className="btn btn-sm btn-outline-primary">{t('site.viewAll', 'সব দেখুন')}</Link>
            </div>
            <div className="card-body">
              {[
                { label: t('hoDashboard.pendingTrainers', 'প্রশিক্ষক'), count: summary?.pending_trainers || 0, color: 'warning', to: '/ho/approvals' },
                { label: t('hoDashboard.pendingAssessors', 'অ্যাসেসর'), count: summary?.pending_assessors || 0, color: 'warning', to: '/ho/approvals' },
                { label: t('hoDashboard.pendingApplications', 'আবেদন'), count: summary?.pending_applications || 0, color: 'danger', to: '/ho/approvals' },
                { label: t('hoDashboard.attendanceWarning', 'কম উপস্থিতি'), count: summary?.attendance_warning_count || 0, color: attRate < 80 ? 'danger' : 'success', to: '/ho/reports' },
              ].map((item) => (
                <div key={item.label} className="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded">
                  <span><span className={`badge bg-${item.color} me-2`}>{item.count}</span>{item.label}</span>
                  <Link to={item.to} className="btn btn-sm btn-outline-secondary">{t('site.view', 'দেখুন')}</Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-light">
              <h6 className="mb-0"><i className="bi bi-heart-pulse me-2"></i>{t('hoDashboard.systemHealth', 'সিস্টেম স্বাস্থ্য')}</h6>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded">
                <span><i className="bi bi-upc-scan me-2 text-primary"></i>{t('hoDashboard.apiStatus', 'API স্ট্যাটাস')}</span>
                <span className="badge bg-success">{t('hoDashboard.online', 'অনলাইন')}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded">
                <span><i className="bi bi-database me-2 text-success"></i>{t('hoDashboard.dbStatus', 'ডাটাবেস')}</span>
                <span className="badge bg-success">{t('hoDashboard.online', 'অনলাইন')}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded">
                <span><i className="bi bi bi-speedometer2 me-2 text-info"></i>{t('hoDashboard.attendanceRate', 'আজকের উপস্থিতি')}</span>
                <span className={`badge bg-${attColor}`}>{attRate}%</span>
              </div>
              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                <span><i className="bi bi-people me-2 text-warning"></i>{t('hoDashboard.ocrStatus', 'OCR স্ট্যাটাস')}</span>
                <span className="badge bg-info">{t('hoDashboard.ready', 'প্রস্তুত')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="row g-4 mt-3">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header bg-light">
              <h6 className="mb-0"><i className="bi bi-activity me-2"></i>{t('hoDashboard.recentActivities', 'সাম্প্রতিক কার্যক্রম')}</h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm table-bordered mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>{t('site.user', 'ব্যবহারকারী')}</th>
                      <th>{t('site.action', 'কর্ম')}</th>
                      <th>{t('site.target', 'লক্ষ্য')}</th>
                      <th>{t('site.time', 'সময়')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActions.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-muted py-3">{t('hoDashboard.noRecentActivity', 'কোনো সাম্প্রতিক কার্যক্রম নেই')}</td></tr>
                    ) : (
                      recentActions.map((a, i) => (
                        <tr key={i}>
                          <td>{a.user}</td>
                          <td>{a.action}</td>
                          <td>{a.target_type ? `${a.target_type} #${a.target_id}` : '—'}</td>
                          <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{a.timestamp ? new Date(a.timestamp).toLocaleString('bn-BD') : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
