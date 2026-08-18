import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import hoService from '../../services/hoService';
import { useTranslation } from '../../hooks/useTranslation';
import { formatDate, formatDateTime } from '../../utils/dateFormatter';
import { convertToBanglaDigits, formatNumber } from '../../utils/numberFormatter';

const COLORS = ['#4361ee', '#059669', '#d97706', '#dc2626', '#0ea5e9', '#8b5cf6', '#f97316', '#14b8a6'];

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
        <div className="spinner-border text-primary" role="status" style={{ width: 28, height: 28 }} />
        <p className="mt-2 text-muted small">{t('hoDashboard.loading', 'ড্যাশবোর্ড লোড হচ্ছে...')}</p>
      </div>
    );
  }

  const attRate = summary?.today_attendance_rate ?? 0;
  const attColor = attRate >= 80 ? 'success' : attRate >= 60 ? 'warning' : 'danger';

  return (
    <div className="px-3 py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-heading)', fontSize: '1.1rem' }}>{t('hoDashboard.title', 'হেড অফিস ড্যাশবোর্ড')}</h5>
          <small className="text-muted">{formatDate(new Date())}</small>
        </div>
        <button className="btn btn-sm btn-outline-primary" onClick={handleRefresh} disabled={refreshing}>
          <i className={`bi ${refreshing ? 'bi-arrow-repeat' : 'bi-arrow-clockwise'} me-1`}></i>
          {t('site.refresh', 'রিফ্রেশ')}
        </button>
      </div>

      {/* Summary stats */}
      <div className="row g-3 mb-4">
        {[
          { label: t('hoDashboard.totalCenters', 'মোট কেন্দ্র'), value: summary?.total_centers || 0, icon: 'bi-building', color: '#4361ee', to: '/ho/centers' },
          { label: t('hoDashboard.activeCenters', 'সক্রিয় কেন্দ্র'), value: summary?.active_centers || 0, icon: 'bi-building-check', color: '#059669', to: '/ho/centers' },
          { label: t('hoDashboard.totalCourses', 'মোট কোর্স'), value: summary?.total_courses || 0, icon: 'bi-book', color: '#0ea5e9' },
          { label: t('hoDashboard.activeCirculars', 'সক্রিয় সার্কুলার'), value: summary?.active_circulars || 0, icon: 'bi-megaphone', color: '#d97706' },
          { label: t('hoDashboard.totalTrainees', 'মোট প্রশিক্ষণার্থী'), value: summary?.total_trainees || 0, icon: 'bi-people', color: '#4361ee' },
          { label: t('hoDashboard.enrolled', 'নথিভুক্ত'), value: summary?.enrolled_trainees || 0, icon: 'bi-person-check', color: '#059669' },
          { label: t('hoDashboard.completed', 'সমাপ্ত'), value: summary?.completed_trainees || 0, icon: 'bi-person-check-fill', color: '#0ea5e9' },
          { label: t('hoDashboard.runningBatches', 'চলমান ব্যাচ'), value: summary?.running_batches || 0, icon: 'bi-layers', color: '#d97706' },
          { label: t('hoDashboard.pending', 'পেন্ডিং'), value: summary?.total_pending || 0, icon: 'bi-hourglass-split', color: '#dc2626', to: '/ho/approvals' },
        ].map((card) => {
          const inner = (
            <div className="card h-100">
              <div className="card-body d-flex align-items-center gap-3 py-3 px-3">
                <div className="d-flex align-items-center justify-content-center rounded"
                  style={{ width: 40, height: 40, background: `${card.color}10`, color: card.color, flexShrink: 0 }}>
                  <i className={`bi ${card.icon}`}></i>
                </div>
                <div className="min-w-0">
                  <div className="text-muted" style={{ fontSize: 11 }}>{card.label}</div>
                  <div className="fw-bold" style={{ fontSize: 18, color: 'var(--text-heading)' }}>{formatNumber(card.value)}</div>
                </div>
              </div>
            </div>
          );
          return (
            <div className="col-lg-4 col-md-6" key={card.label}>
              {card.to ? <Link to={card.to} className="text-decoration-none">{inner}</Link> : inner}
            </div>
          );
        })}
      </div>

      {/* Charts row 1 */}
      <div className="row g-3 mb-3">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex align-items-center gap-2">
              <i className="bi bi-bar-chart text-muted"></i>
              <span>{t('hoDashboard.chartCenterEnrollment', 'কেন্দ্রভিত্তিক নথিভুক্তি')}</span>
            </div>
            <div className="card-body" style={{ maxHeight: 350, overflowY: 'auto' }}>
              {centerChart.map((c, i) => {
                const max = Math.max(...centerChart.map((x) => x.trainee_count), 1);
                const pct = (c.trainee_count / max) * 100;
                return (
                  <div key={c.center_code} className="mb-3">
                    <div className="d-flex justify-content-between mb-1" style={{ fontSize: 12 }}>
                      <span className="fw-semibold">{c.center_name}</span>
                      <span className="fw-bold" style={{ color: 'var(--primary)' }}>{formatNumber(c.trainee_count)}</span>
                    </div>
                    <div className="progress" style={{ height: 8, borderRadius: 4 }}>
                      <div className="progress-bar" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length], borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="row g-3 mb-3">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex align-items-center gap-2">
              <i className="bi bi-graph-up text-muted"></i>
              <span>{t('hoDashboard.chartMonthlyTrend', 'মাসিক নিবন্ধন')}</span>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-end gap-2" style={{ height: 200 }}>
                {monthlyReg.map((m) => {
                  const max = Math.max(...monthlyReg.map((x) => x.count), 1);
                  const pct = (m.count / max) * 100;
                  return (
                    <div key={m.month} className="d-flex flex-column align-items-center flex-fill">
                      <small className="mb-1 fw-bold" style={{ fontSize: 10, color: 'var(--primary)' }}>{formatNumber(m.count)}</small>
                      <div className="rounded-top" style={{ width: '100%', height: `${Math.max(pct, 2)}%`, background: 'var(--primary)' }} title={m.month} />
                      <small className="mt-1 text-muted" style={{ fontSize: 9 }}>{convertToBanglaDigits(m.month.slice(5))}</small>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 3 */}
      <div className="row g-3 mb-3">
        {/* Completion rate */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header d-flex align-items-center gap-2">
              <i className="bi bi-pie-chart text-muted"></i>
              <span>{t('hoDashboard.chartCompletionRate', 'সমাপ্তির হার')}</span>
            </div>
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-5 text-center">
                  <div style={{ position: 'relative', width: 130, height: 130, margin: '0 auto' }}>
                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--success)" strokeWidth="3" strokeDasharray={`${completion?.completion_rate || 0}, 100`} />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                      <div className="fw-bold" style={{ fontSize: 20 }}>{formatNumber(completion?.completion_rate || 0)}%</div>
                      <small className="text-muted" style={{ fontSize: 9 }}>{t('hoDashboard.completed', 'সমাপ্ত')}</small>
                    </div>
                  </div>
                </div>
                <div className="col-md-7">
                  <div className="d-grid gap-2">
                    <div className="d-flex justify-content-between p-2 rounded" style={{ background: '#f9fafb', borderLeft: '3px solid var(--success)', fontSize: 13 }}>
                      <span>{t('hoDashboard.completed', 'সমাপ্ত')}</span><span className="fw-bold text-success">{formatNumber(completion?.completed || 0)}</span>
                    </div>
                    <div className="d-flex justify-content-between p-2 rounded" style={{ background: '#f9fafb', borderLeft: '3px solid var(--primary)', fontSize: 13 }}>
                      <span>{t('hoDashboard.enrolled', 'নথিভুক্ত')}</span><span className="fw-bold" style={{ color: 'var(--primary)' }}>{formatNumber(completion?.enrolled || 0)}</span>
                    </div>
                    <div className="d-flex justify-content-between p-2 rounded" style={{ background: '#f9fafb', borderLeft: '3px solid var(--danger)', fontSize: 13 }}>
                      <span>{t('hoDashboard.failed', 'ব্যর্থ')}</span><span className="fw-bold text-danger">{formatNumber(completion?.failed || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Batch status */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header d-flex align-items-center gap-2">
              <i className="bi bi-layers text-muted"></i>
              <span>{t('hoDashboard.chartBatchStatus', 'ব্যাচের অবস্থা')}</span>
            </div>
            <div className="card-body">
              {batchStatus.map((b) => (
                <div key={b.status} className="mb-3">
                  <div className="d-flex justify-content-between mb-1" style={{ fontSize: 12 }}>
                    <span className="fw-medium">{b.label}</span>
                    <span className="fw-bold">{formatNumber(b.count)}</span>
                  </div>
                  <div className="progress" style={{ height: 6, borderRadius: 3 }}>
                    <div className={`progress-bar ${b.status === 'running' ? 'bg-success' : b.status === 'completed' ? 'bg-primary' : b.status === 'scheduled' ? 'bg-secondary' : 'bg-danger'}`}
                      style={{ width: `${summary?.total_batches ? (b.count / summary.total_batches) * 100 : 0}%`, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="row g-3 mb-3">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex align-items-center gap-2">
              <i className="bi bi-activity text-muted"></i>
              <span>{t('hoDashboard.chartRecentActivity', 'সাম্প্রতিক কার্যক্রম')}</span>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {activity && (
                  <>
                    <div className="col-md-3">
                      <div className="p-3 rounded text-center" style={{ background: '#f9fafb' }}>
                        <div className="mb-1" style={{ color: 'var(--primary)' }}><i className="bi bi-file-earmark-text fs-4"></i></div>
                        <div className="fw-bold" style={{ fontSize: 20 }}>{formatNumber(activity.new_applications)}</div>
                        <small className="text-muted" style={{ fontSize: 11 }}>{t('hoDashboard.recentApplications', 'নতুন আবেদন')}</small>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="p-3 rounded text-center" style={{ background: '#f9fafb' }}>
                        <div className="text-success mb-1"><i className="bi bi-person-plus fs-4"></i></div>
                        <div className="fw-bold" style={{ fontSize: 20 }}>{formatNumber(activity.new_enrollments)}</div>
                        <small className="text-muted" style={{ fontSize: 11 }}>{t('hoDashboard.recentEnrollments', 'নতুন নথিভুক্তি')}</small>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="p-3 rounded text-center" style={{ background: '#f9fafb' }}>
                        <div className="text-info mb-1"><i className="bi bi-award fs-4"></i></div>
                        <div className="fw-bold" style={{ fontSize: 20 }}>{formatNumber(activity.new_certificates)}</div>
                        <small className="text-muted" style={{ fontSize: 11 }}>{t('hoDashboard.recentCertificates', 'নতুন সার্টিফিকেট')}</small>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="p-3 rounded text-center" style={{ background: '#f9fafb' }}>
                        <div className="text-warning mb-1"><i className="bi bi-briefcase fs-4"></i></div>
                        <div className="fw-bold" style={{ fontSize: 20 }}>{formatNumber(activity.new_placements)}</div>
                        <small className="text-muted" style={{ fontSize: 11 }}>{t('hoDashboard.recentJobs', 'নতুন চাকরি')}</small>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Placement chart */}
      <div className="row g-3 mb-3">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex align-items-center gap-2">
              <i className="bi bi-briefcase text-muted"></i>
              <span>{t('hoDashboard.chartPlacementRate', 'চাকরি স্থাপনের হার')}</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="b-form-table align-middle">
                  <thead>
                    <tr>
                      <th>{t('batch.list.colBatchNo', 'ব্যাচ')}</th>
                      <th className="text-center">{t('job.summary.total', 'মোট')}</th>
                      <th className="text-center">{t('job.summary.placed', 'স্থাপিত')}</th>
                      <th className="text-center">{t('job.summary.rate', 'হার')}</th>
                      <th>{t('dashboard.charts.progress', 'অগ্রগতি')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {placement.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-muted">{t('hoDashboard.noData', 'কোন তথ্য নেই')}</td></tr>
                    ) : (
                      placement.map((p) => (
                        <tr key={p.batch_id}>
                          <td>{p.batch_name}</td>
                          <td className="text-center">{formatNumber(p.total_trainees)}</td>
                          <td className="text-center">{formatNumber(p.placed_count)}</td>
                          <td className="text-center">
                            <span className={`status-dot ${p.placement_rate >= 60 ? 'dot-success' : p.placement_rate >= 40 ? 'dot-warning' : 'dot-danger'}`} />
                              {formatNumber(p.placement_rate)}%
                          </td>
                          <td>
                            <div className="progress" style={{ height: 6 }}>
                              <div className={`progress-bar ${p.placement_rate >= 60 ? 'bg-success' : p.placement_rate >= 40 ? 'bg-warning' : 'bg-danger'}`}
                                style={{ width: `${Math.min(p.placement_rate, 100)}%` }} />
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
      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <Link to="/ho/centers" className="btn btn-outline-primary w-100 py-2">
            <i className="bi bi-building me-2"></i>{t('hoDashboard.quickLinks.centerManagement', 'কেন্দ্র ব্যবস্থাপনা')}
          </Link>
        </div>
        <div className="col-md-3">
          <Link to="/ho/approvals" className="btn btn-outline-warning w-100 py-2">
            <i className="bi bi-check2-circle me-2"></i>{t('hoDashboard.quickLinks.approvals', 'অনুমোদন')}
          </Link>
        </div>
        <div className="col-md-3">
          <Link to="/ho/reports" className="btn btn-outline-info w-100 py-2">
            <i className="bi bi-file-earmark-bar-graph me-2"></i>{t('hoDashboard.quickLinks.reports', 'প্রতিবেদন')}
          </Link>
        </div>
        <div className="col-md-3">
          <Link to="/center-admin/applications" className="btn btn-outline-secondary w-100 py-2">
            <i className="bi bi-file-earmark-text me-2"></i>{t('hoDashboard.quickLinks.applications', 'আবেদন')}
          </Link>
        </div>
      </div>

      {/* Pending + System Health */}
      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-hourglass-split text-muted"></i>
                <span>{t('hoDashboard.pendingApprovals', 'পেন্ডিং অনুমোদন')}</span>
              </div>
              <Link to="/ho/approvals" className="btn btn-sm btn-outline-primary">{t('site.viewAll', 'সব দেখুন')}</Link>
            </div>
            <div className="card-body">
              {[
                { label: t('hoDashboard.pendingTrainers', 'প্রশিক্ষক'), count: summary?.pending_trainers || 0, color: 'warning', to: '/ho/approvals' },
                { label: t('hoDashboard.pendingAssessors', 'অ্যাসেসর'), count: summary?.pending_assessors || 0, color: 'warning', to: '/ho/approvals' },
                { label: t('hoDashboard.pendingApplications', 'আবেদন'), count: summary?.pending_applications || 0, color: 'danger', to: '/ho/approvals' },
                { label: t('hoDashboard.attendanceWarning', 'কম উপস্থিতি'), count: summary?.attendance_warning_count || 0, color: attRate < 80 ? 'danger' : 'success', to: '/ho/reports' },
              ].map((item) => (
                <div key={item.label} className="d-flex justify-content-between align-items-center mb-2 p-2 rounded" style={{ background: '#f9fafb', fontSize: 13 }}>
                  <span><span className={`status-dot dot-${item.color}`} /> {formatNumber(item.count)}</span>
                  <Link to={item.to} className="btn btn-sm btn-outline-secondary">{t('site.view', 'দেখুন')}</Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header d-flex align-items-center gap-2">
              <i className="bi bi-heart-pulse text-muted"></i>
              <span>{t('hoDashboard.systemHealth', 'সিস্টেম স্বাস্থ্য')}</span>
            </div>
            <div className="card-body">
              {[
                { label: t('hoDashboard.apiStatus', 'API স্ট্যাটাস'), icon: 'bi-upc-scan', color: 'primary', status: t('hoDashboard.online', 'অনলাইন'), statusColor: 'success' },
                { label: t('hoDashboard.dbStatus', 'ডাটাবেস'), icon: 'bi-database', color: 'success', status: t('hoDashboard.online', 'অনলাইন'), statusColor: 'success' },
                { label: t('hoDashboard.attendanceRate', 'আজকের উপস্থিতি'), icon: 'bi-speedometer2', color: 'info', status: `${formatNumber(attRate)}%`, statusColor: attColor },
                { label: t('hoDashboard.ocrStatus', 'OCR স্ট্যাটাস'), icon: 'bi-people', color: 'warning', status: t('hoDashboard.ready', 'প্রস্তুত'), statusColor: 'info' },
              ].map((item, i) => (
                <div key={i} className="d-flex justify-content-between align-items-center mb-2 p-2 rounded" style={{ background: '#f9fafb', fontSize: 13 }}>
                  <span><i className={`bi ${item.icon} me-2 text-${item.color}`}></i>{item.label}</span>
                  <span><span className={`status-dot dot-${item.statusColor}`}></span>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities table */}
      <div className="row g-3">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex align-items-center gap-2">
              <i className="bi bi-clock-history text-muted"></i>
              <span>{t('hoDashboard.recentActivities', 'সাম্প্রতিক কার্যক্রম')}</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="b-form-table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>{t('site.user', 'ব্যবহারকারী')}</th>
                      <th>{t('site.action', 'কর্ম')}</th>
                      <th>{t('site.target', 'লক্ষ্য')}</th>
                      <th>{t('site.time', 'সময়')}</th>
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
                          <td>{a.target_type ? `${a.target_type} #${convertToBanglaDigits(a.target_id)}` : '—'}</td>
                          <td>{formatDateTime(a.timestamp)}</td>
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
