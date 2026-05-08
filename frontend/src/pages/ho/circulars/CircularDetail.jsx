import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';

const STATUS_BG = { draft: 'secondary', published: 'success', closed: 'danger', completed: 'info' };
const APP_STATUS_BG = { pending: 'warning', selected: 'success', rejected: 'danger', waitlisted: 'info' };

const TABS = [
  { key: 'overview', label: 'বিবরণ' },
  { key: 'applications', label: 'আবেদন' },
  { key: 'analytics', label: 'বিশ্লেষণ' },
];

export default function CircularDetail({ circularId, onClose, onRefresh }) {
  const [circular, setCircular] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [appSearch, setAppSearch] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState('');
  const [extendDays, setExtendDays] = useState(7);

  useEffect(() => {
    if (!circularId) return;
    setLoading(true);
    hoService.getCircular(circularId)
      .then(r => setCircular(r.data))
      .catch(() => toast.error('তথ্য লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  }, [circularId]);

  const loadApplications = useCallback(() => {
    setAppsLoading(true);
    const params = {};
    if (appSearch) params.search = appSearch;
    if (appStatusFilter) params.status = appStatusFilter;
    hoService.getCircularApplications(circularId, params)
      .then(r => setApplications(r.data?.results || r.data || []))
      .catch(() => toast.error('আবেদন তালিকা লোড করতে ব্যর্থ'))
      .finally(() => setAppsLoading(false));
  }, [circularId, appSearch, appStatusFilter]);

  const loadAnalytics = useCallback(() => {
    setAnalyticsLoading(true);
    hoService.getCircularAnalytics(circularId)
      .then(r => setAnalytics(r.data))
      .catch(() => toast.error('বিশ্লেষণ লোড করতে ব্যর্থ'))
      .finally(() => setAnalyticsLoading(false));
  }, [circularId]);

  useEffect(() => {
    if (activeTab === 'applications') loadApplications();
    if (activeTab === 'analytics') loadAnalytics();
  }, [activeTab, loadApplications, loadAnalytics]);

  const handleApprove = async (appId) => {
    try {
      await hoService.approveApplication(circularId, appId);
      toast.success('আবেদন অনুমোদিত হয়েছে');
      loadApplications();
      onRefresh();
    } catch { toast.error('অনুমোদন ব্যর্থ'); }
  };

  const handleReject = async (appId) => {
    const remarks = prompt('বাতিলের কারণ (ঐচ্ছিক):');
    try {
      await hoService.rejectApplication(circularId, appId, remarks || '');
      toast.success('আবেদন বাতিল করা হয়েছে');
      loadApplications();
      onRefresh();
    } catch { toast.error('বাতিল করতে ব্যর্থ'); }
  };

  const handleExtend = async () => {
    try {
      await hoService.extendCircular(circularId, extendDays);
      toast.success(`সার্কুলারের মেয়াদ ${extendDays} দিন বাড়ানো হয়েছে`);
      hoService.getCircular(circularId).then(r => setCircular(r.data));
    } catch { toast.error('মেয়াদ বাড়ানো ব্যর্থ'); }
  };

  if (loading) return <div className="text-center py-4"><div className="spinner-border spinner-border-sm me-2"></div>লোড হচ্ছে...</div>;
  if (!circular) return null;

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2">
        <span className="fw-semibold" style={{ fontSize: 14 }}>{circular.title_bn}</span>
        <button className="btn btn-sm btn-outline-light" onClick={onClose}><i className="bi bi-x-lg"></i></button>
      </div>
      <div className="card-body p-0">
        <ul className="nav nav-tabs">
          {TABS.map(t => (
            <li className="nav-item" key={t.key}>
              <button className={`nav-link py-2 ${activeTab === t.key ? 'active fw-semibold' : ''}`}
                style={{ fontSize: 12 }} onClick={() => setActiveTab(t.key)}>{t.label}</button>
            </li>
          ))}
        </ul>
        <div className="p-3" style={{ fontSize: 13 }}>
          {activeTab === 'overview' && (
            <div>
              <InfoRow label="শিরোনাম (বাংলা)" value={circular.title_bn} />
              <InfoRow label="শিরোনাম (ইংরেজি)" value={circular.title_en} />
              <InfoRow label="কেন্দ্র" value={`${circular.center_code} - ${circular.center_name}`} />
              <InfoRow label="ঠিকানা" value={circular.center_address || '-'} />
              <InfoRow label="ফোন" value={circular.center_phone || '-'} />
              <InfoRow label="কোর্স" value={`${circular.course_code} - ${circular.course_name}`} />
              <InfoRow label="কোর্সের ধরণ" value={circular.course_type || '-'} />
              <InfoRow label="মেয়াদ" value={circular.course_duration ? `${circular.course_duration} মাস` : '-'} />
              <InfoRow label="আবেদন শুরুর তারিখ" value={circular.application_start_date} />
              <InfoRow label="আবেদনের শেষ তারিখ" value={circular.application_end_date} />
              <InfoRow label="প্রশিক্ষণ শুরুর তারিখ" value={circular.training_start_date} />
              <InfoRow label="প্রশিক্ষণ শেষের তারিখ" value={circular.training_end_date} />
              <InfoRow label="মোট আসন" value={circular.total_seats} />
              <InfoRow label="অবশিষ্ট আসন" value={circular.remaining_seats} />
              <InfoRow label="কোর্স ফি" value={circular.fee ? `৳${circular.fee}` : 'ডিফল্ট'} />
              <InfoRow label="অবস্থা" value={<span className={`badge bg-${STATUS_BG[circular.status]}`}>{circular.status_display}</span>} />
              <InfoRow label="তৈরি করেছেন" value={circular.created_by_name || '-'} />
              <InfoRow label="প্রকাশের তারিখ" value={circular.published_at || '-'} />
              {circular.status === 'published' && (
                <div className="mt-2 p-2 bg-light rounded d-flex align-items-center gap-2">
                  <label className="small mb-0">মেয়াদ বাড়ান:</label>
                  <input type="number" className="form-control form-control-sm" style={{ width: 70 }}
                    value={extendDays} onChange={e => setExtendDays(e.target.value)} min={1} />
                  <button className="btn btn-outline-primary btn-sm" onClick={handleExtend}>দিন বাড়ান</button>
                </div>
              )}
              <div className="mt-2">
                <h6 className="fw-semibold">বিবরণ</h6>
                <div className="p-2 bg-light rounded small" dangerouslySetInnerHTML={{ __html: circular.description }} />
              </div>
            </div>
          )}
          {activeTab === 'applications' && (
            <div>
              <div className="d-flex gap-2 mb-2">
                <input className="form-control form-control-sm" placeholder="নাম, এনআইডি, ফোনে সার্চ..."
                  value={appSearch} onChange={e => setAppSearch(e.target.value)} style={{ flex: 1 }} />
                <select className="form-select form-select-sm" style={{ width: 150 }}
                  value={appStatusFilter} onChange={e => setAppStatusFilter(e.target.value)}>
                  <option value="">সব অবস্থা</option>
                  <option value="pending">বিচারাধীন</option>
                  <option value="selected">নির্বাচিত</option>
                  <option value="rejected">বাতিল</option>
                  <option value="waitlisted">অপেক্ষমাণ</option>
                </select>
                <button className="btn btn-outline-secondary btn-sm" onClick={loadApplications}>
                  <i className="bi bi-search"></i>
                </button>
              </div>
              {appsLoading ? (
                <div className="text-center py-3"><div className="spinner-border spinner-border-sm me-2"></div>লোড হচ্ছে...</div>
              ) : applications.length === 0 ? (
                <p className="text-muted">কোনো আবেদন পাওয়া যায়নি</p>
              ) : (
                <div className="table-responsive" style={{ maxHeight: 400, overflowY: 'auto' }}>
                  <table className="table table-sm table-bordered" style={{ fontSize: 12 }}>
                    <thead><tr>
                      <th>আবেদন নং</th><th>নাম</th><th>এনআইডি</th><th>ফোন</th><th>তারিখ</th><th>অবস্থা</th><th>অ্যাকশন</th>
                    </tr></thead>
                    <tbody>
                      {applications.map(a => (
                        <tr key={a.id}>
                          <td className="fw-semibold">{a.application_no}</td>
                          <td>{a.name_bn}</td>
                          <td>{a.nid}</td>
                          <td>{a.phone}</td>
                          <td style={{ fontSize: 11 }}>{a.applied_at?.slice(0, 10)}</td>
                          <td><span className={`badge bg-${APP_STATUS_BG[a.status]}`}>{a.status}</span></td>
                          <td>
                            {a.status === 'pending' && (
                              <div className="btn-group btn-group-sm">
                                <button className="btn btn-outline-success btn-sm" title="নির্বাচিত"
                                  onClick={() => handleApprove(a.id)}><i className="bi bi-check-lg"></i></button>
                                <button className="btn btn-outline-danger btn-sm" title="বাতিল"
                                  onClick={() => handleReject(a.id)}><i className="bi bi-x-lg"></i></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {activeTab === 'analytics' && (
            <div>
              {analyticsLoading ? (
                <div className="text-center py-3"><div className="spinner-border spinner-border-sm me-2"></div>লোড হচ্ছে...</div>
              ) : analytics ? (
                <div>
                  <div className="row g-2 mb-3">
                    <div className="col-4"><div className="p-2 bg-light rounded text-center"><strong>{analytics.applications_received}</strong><br /><small>মোট আবেদন</small></div></div>
                    <div className="col-4"><div className="p-2 bg-light rounded text-center"><strong>{analytics.selection_rate}%</strong><br /><small>নির্বাচনের হার</small></div></div>
                    <div className="col-4"><div className="p-2 bg-light rounded text-center"><strong>{analytics.average_response_time_hours ?? '-'}</strong><br /><small>গড় প্রতিক্রিয়া (ঘন্টা)</small></div></div>
                  </div>

                  {analytics.status_breakdown && (
                    <div className="mb-3">
                      <h6 className="fw-semibold small">আবেদনের অবস্থা</h6>
                      <div className="d-flex gap-2">
                        {Object.entries(analytics.status_breakdown).map(([k, v]) => (
                          <span key={k} className={`badge bg-${APP_STATUS_BG[k] || 'secondary'}`}>
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analytics.applications_by_gender && Object.keys(analytics.applications_by_gender).length > 0 && (
                    <div className="mb-3">
                      <h6 className="fw-semibold small">লিঙ্গ অনুযায়ী</h6>
                      <div className="d-flex gap-2">
                        {Object.entries(analytics.applications_by_gender).map(([k, v]) => (
                          <span key={k} className="badge bg-info">{k === 'male' ? 'পুরুষ' : k === 'female' ? 'মহিলা' : k}: {v}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analytics.applications_by_age_group && (
                    <div className="mb-3">
                      <h6 className="fw-semibold small">বয়স গ্রুপ</h6>
                      <table className="table table-sm table-bordered" style={{ fontSize: 12 }}>
                        <thead><tr><th>গ্রুপ</th><th>সংখ্যা</th></tr></thead>
                        <tbody>
                          {Object.entries(analytics.applications_by_age_group).map(([k, v]) => (
                            <tr key={k}><td>{k}</td><td>{v}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {analytics.applications_by_district && Object.keys(analytics.applications_by_district).length > 0 && (
                    <div>
                      <h6 className="fw-semibold small">জেলা অনুযায়ী (শীর্ষ ১৫)</h6>
                      <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                        {Object.entries(analytics.applications_by_district).map(([k, v]) => (
                          <div key={k} className="d-flex justify-content-between align-items-center mb-1">
                            <span style={{ fontSize: 12 }}>{k}</span>
                            <div className="d-flex align-items-center gap-2" style={{ flex: 1, maxWidth: 200 }}>
                              <div className="bg-primary" style={{ height: 8, width: `${Math.min(100, (v / Math.max(...Object.values(analytics.applications_by_district)) * 100))}%`, borderRadius: 4 }}></div>
                              <span className="small fw-bold">{v}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted">বিশ্লেষণ লোড করতে ব্যর্থ</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="row mb-1">
      <div className="col-5 text-muted">{label}</div>
      <div className="col-7 fw-semibold">{value}</div>
    </div>
  );
}
