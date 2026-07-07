import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { formatDate } from '../../../utils/dateFormatter';
import { convertToBanglaDigits, formatNumber } from '../../../utils/numberFormatter';

const STATUS_BG = { draft: 'secondary', published: 'success', closed: 'danger', completed: 'info' };
const APP_STATUS_BG = { pending: 'warning', selected: 'success', rejected: 'danger', waitlisted: 'info' };

const TABS = [
  { key: 'overview', label: 'বিবরণ' },
  { key: 'applications', label: 'আবেদন' },
  { key: 'analytics', label: 'বিশ্লেষণ' },
];

export default function CircularDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
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
    if (!id) return;
    setLoading(true);
    hoService.getCircular(id)
      .then(r => setCircular(r.data))
      .catch(() => { toast.error('তথ্য লোড করতে ব্যর্থ'); navigate('/ho/circulars'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const loadApplications = useCallback(() => {
    setAppsLoading(true);
    const params = {};
    if (appSearch) params.search = appSearch;
    if (appStatusFilter) params.status = appStatusFilter;
    hoService.getCircularApplications(id, params)
      .then(r => setApplications(r.data?.results || r.data || []))
      .catch(() => toast.error('আবেদন তালিকা লোড করতে ব্যর্থ'))
      .finally(() => setAppsLoading(false));
  }, [id, appSearch, appStatusFilter]);

  const loadAnalytics = useCallback(() => {
    setAnalyticsLoading(true);
    hoService.getCircularAnalytics(id)
      .then(r => setAnalytics(r.data))
      .catch(() => toast.error('বিশ্লেষণ লোড করতে ব্যর্থ'))
      .finally(() => setAnalyticsLoading(false));
  }, [id]);

  useEffect(() => {
    if (activeTab === 'applications') loadApplications();
    if (activeTab === 'analytics') loadAnalytics();
  }, [activeTab, loadApplications, loadAnalytics]);

  const handleApprove = async (appId) => {
    try {
      await hoService.approveApplication(id, appId);
      toast.success('আবেদন অনুমোদিত হয়েছে');
      loadApplications();
    } catch { toast.error('অনুমোদন ব্যর্থ'); }
  };

  const handleReject = async (appId) => {
    const remarks = prompt('বাতিলের কারণ (ঐচ্ছিক):');
    try {
      await hoService.rejectApplication(id, appId, remarks || '');
      toast.success('আবেদন বাতিল করা হয়েছে');
      loadApplications();
    } catch { toast.error('বাতিল করতে ব্যর্থ'); }
  };

  const handleExtend = async () => {
    try {
      await hoService.extendCircular(id, extendDays);
      toast.success(`সার্কুলারের মেয়াদ ${extendDays} দিন বাড়ানো হয়েছে`);
      hoService.getCircular(id).then(r => setCircular(r.data));
    } catch { toast.error('মেয়াদ বাড়ানো ব্যর্থ'); }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">লোড হচ্ছে...</p>
      </div>
    );
  }
  if (!circular) return null;

  return (
    <div className="px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4 bg-white p-3 rounded shadow-sm">
        <button className="btn btn-outline-secondary btn-sm rounded-circle p-2"
          onClick={() => navigate('/ho/circulars')} style={{ width: 36, height: 36 }}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <div>
          <h4 className="mb-0 fw-bold">{circular.title_bn}</h4>
          <div className="text-muted small">{convertToBanglaDigits(circular.course_code)} - {circular.course_name}</div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-danger btn-sm" title="পিডিএফ প্রিন্ট"
            onClick={() => {
              const token = localStorage.getItem('access_token');
              window.open(`/api/ho/circulars/${circular.id}/print_circular/?token=${token}`, '_blank');
            }}>
            <i className="bi bi-filetype-pdf me-1"></i>পিডিএফ
          </button>
<span className={`status-dot dot-${STATUS_BG[circular.status]}`} />
            {circular.status_display}
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white pt-3 border-0">
          <ul className="nav nav-tabs card-header-tabs">
            {TABS.map(t => (
              <li className="nav-item" key={t.key}>
                <button className={`nav-link ${activeTab === t.key ? 'active fw-bold' : ''}`}
                  onClick={() => setActiveTab(t.key)}>{t.label}</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body p-4">
          {activeTab === 'overview' && (
            <div className="row g-4">
              <div className="col-md-6">
                <h6 className="fw-bold mb-3 text-muted text-uppercase small">সার্কুলার তথ্য</h6>
                <table className="b-detail-table align-middle">
                  <tbody>
                    <tr><th>শিরোনাম (বাংলা)</th><td>{circular.title_bn}</td></tr>
                    <tr><th>শিরোনাম (ইংরেজি)</th><td>{circular.title_en}</td></tr>
                    <tr><th>সার্কুলার নম্বর</th><td>{convertToBanglaDigits(circular.circular_no) || '-'}</td></tr>
                    <tr><th>সংস্করণ</th><td>{convertToBanglaDigits(circular.edition)}</td></tr>
                    <tr><th>কোর্স</th><td>{convertToBanglaDigits(circular.course_code)} - {circular.course_name}</td></tr>
                    <tr><th>কোর্সের ধরণ</th><td>{circular.course_type || '-'}</td></tr>
                    <tr><th>মেয়াদ</th><td>{circular.course_duration ? `${formatNumber(circular.course_duration)} মাস` : '-'}</td></tr>
                    <tr><th>মোট আসন</th><td>{formatNumber(circular.total_seats)}</td></tr>
                    <tr><th>অবশিষ্ট আসন</th><td>{formatNumber(circular.remaining_seats)}</td></tr>
                    <tr><th>কোর্স ফি</th><td>{circular.fee ? `৳${formatNumber(circular.fee)}` : 'ডিফল্ট'}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="col-md-6">
                <h6 className="fw-bold mb-3 text-muted text-uppercase small">সময়সীমা</h6>
                <table className="b-detail-table align-middle">
                  <tbody>
                    <tr><th>আবেদন শুরুর তারিখ</th><td>{formatDate(circular.application_start_date)}</td></tr>
                    <tr><th>আবেদনের শেষ তারিখ</th><td>{formatDate(circular.application_end_date)}</td></tr>
                    <tr><th>প্রশিক্ষণ শুরুর তারিখ</th><td>{formatDate(circular.training_start_date)}</td></tr>
                    <tr><th>প্রশিক্ষণ শেষের তারিখ</th><td>{formatDate(circular.training_end_date)}</td></tr>
                    <tr><th>উপযুক্ত কেন্দ্র</th><td>{circular.all_centers ? 'সব কেন্দ্র' : (circular.eligible_centers || []).map(c => `${convertToBanglaDigits(c.code)} - ${c.name_bn}`).join(', ')}</td></tr>
                    <tr><th>তৈরি করেছেন</th><td>{circular.created_by_name || '-'}</td></tr>
                    <tr><th>প্রকাশের তারিখ</th><td>{circular.published_at ? formatDate(circular.published_at) : '-'}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="col-12">
                <h6 className="fw-bold mb-3 text-muted text-uppercase small">বিবরণ</h6>
                <div className="p-3 bg-light rounded description-content" dangerouslySetInnerHTML={{ __html: circular.description }} />
              </div>
              {circular.status === 'published' && (
                <div className="col-12">
                  <div className="p-3 bg-light rounded d-flex align-items-center gap-2">
                    <span className="small fw-semibold">মেয়াদ বাড়ান:</span>
                    <input type="number" className="form-control form-control-sm" style={{ width: 80 }}
                      value={extendDays} onChange={e => setExtendDays(e.target.value)} min={1} />
                    <button className="btn btn-primary btn-sm" onClick={handleExtend}>দিন বাড়ান</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'applications' && (
            <div>
              <div className="row g-2 mb-3 align-items-center">
                <div className="col-md-5">
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input className="form-control border-start-0 ps-0" placeholder="নাম, এনআইডি, ফোনে সার্চ..."
                      value={appSearch} onChange={e => setAppSearch(e.target.value)} />
                  </div>
                </div>
                <div className="col-md-2">
                  <select className="form-select" value={appStatusFilter} onChange={e => setAppStatusFilter(e.target.value)}>
                    <option value="">সব অবস্থা</option>
                    <option value="pending">পেন্ডিং</option>
                    <option value="selected">নির্বাচিত</option>
                    <option value="rejected">বাতিল</option>
                    <option value="waitlisted">অপেক্ষমাণ</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <button className="btn btn-outline-primary" onClick={loadApplications}>
                    <i className="bi bi-search me-1"></i>অনুসন্ধান
                  </button>
                </div>
              </div>
              <div className="table-responsive" style={{ maxHeight: 500, overflowY: 'auto' }}>
              <table className="b-table align-middle">
                  <thead className="sticky-top">
                    <tr>
                      <th>আবেদন নং</th><th>নাম</th><th>এনআইডি</th><th>ফোন</th><th>তারিখ</th><th>অবস্থা</th><th>অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appsLoading ? (
                      <tr><td colSpan={7} className="text-center py-4"><div className="spinner-border spinner-border-sm me-2"></div>লোড হচ্ছে...</td></tr>
                    ) : applications.length === 0 ? (
                      <tr><td colSpan={7} className="text-center text-muted py-4">কোনো আবেদন পাওয়া যায়নি</td></tr>
                    ) : applications.map(a => (
                      <tr key={a.id}>
                        <td className="fw-semibold">{convertToBanglaDigits(a.application_no)}</td>
                        <td>{a.name_bn}</td>
                        <td>{convertToBanglaDigits(a.nid)}</td>
                        <td>{convertToBanglaDigits(a.phone) || '-'}</td>
                        <td>{formatDate(a.applied_at)}</td>
                        <td><span className={`status-dot dot-${APP_STATUS_BG[a.status]}`} />{a.status_display || a.status}</td>
                        <td>
                          {a.status === 'pending' && (
                            <div className="d-flex gap-1">
                              <button className="btn btn-sm btn-outline-success" title="নির্বাচিত"
                                onClick={() => handleApprove(a.id)}><i className="bi bi-check-lg"></i></button>
                              <button className="btn btn-sm btn-outline-danger" title="বাতিল"
                                onClick={() => handleReject(a.id)}><i className="bi bi-x-lg"></i></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'analytics' && (
            <div>
              {analyticsLoading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary mb-2" /><p className="text-muted small">বিশ্লেষণ লোড হচ্ছে...</p></div>
              ) : analytics ? (
                <div>
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <div className="card bg-primary bg-opacity-10 border-0 text-center py-3">
                        <div className="fw-bold fs-4 text-primary">{formatNumber(analytics.applications_received)}</div>
                        <small className="text-muted">মোট আবেদন</small>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card bg-success bg-opacity-10 border-0 text-center py-3">
                        <div className="fw-bold fs-4 text-success">{formatNumber(analytics.selection_rate)}%</div>
                        <small className="text-muted">নির্বাচনের হার</small>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card bg-info bg-opacity-10 border-0 text-center py-3">
                        <div className="fw-bold fs-4 text-info">{analytics.average_response_time_hours != null ? formatNumber(analytics.average_response_time_hours) : '-'}</div>
                        <small className="text-muted">গড় প্রতিক্রিয়া (ঘন্টা)</small>
                      </div>
                    </div>
                  </div>

                  {analytics.status_breakdown && (
                    <div className="mb-4">
                      <h6 className="fw-bold mb-2">আবেদনের অবস্থা</h6>
                      <div className="d-flex flex-wrap gap-2">
                        {Object.entries(analytics.status_breakdown).map(([k, v]) => (
                          <span key={k}><span className={`status-dot dot-${APP_STATUS_BG[k] || 'secondary'}`}></span>{k === 'pending' ? 'পেন্ডিং' : k === 'selected' ? 'নির্বাচিত' : k === 'rejected' ? 'বাতিল' : k === 'waitlisted' ? 'অপেক্ষমাণ' : k}: {formatNumber(v)}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="row g-4">
                    {analytics.applications_by_gender && Object.keys(analytics.applications_by_gender).length > 0 && (
                      <div className="col-md-4">
                        <h6 className="fw-bold mb-2">লিঙ্গ অনুযায়ী</h6>
                        <div className="d-flex flex-wrap gap-2">
                          {Object.entries(analytics.applications_by_gender).map(([k, v]) => (
                            <span key={k}><span className="status-dot dot-info"></span>{k === 'male' ? 'পুরুষ' : k === 'female' ? 'মহিলা' : k}: {formatNumber(v)}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {analytics.applications_by_age_group && (
                      <div className="col-md-4">
                        <h6 className="fw-bold mb-2">বয়স গ্রুপ</h6>
                        <table className="b-detail-table align-middle">
                          <thead><tr><th>গ্রুপ</th><th>সংখ্যা</th></tr></thead>
                          <tbody>
                            {Object.entries(analytics.applications_by_age_group).map(([k, v]) => (
                              <tr key={k}><td>{convertToBanglaDigits(k)}</td><td className="fw-bold">{formatNumber(v)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {analytics.applications_by_district && Object.keys(analytics.applications_by_district).length > 0 && (
                      <div className="col-md-4">
                        <h6 className="fw-bold mb-2">জেলা অনুযায়ী (শীর্ষ)</h6>
                        <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                          {Object.entries(analytics.applications_by_district).map(([k, v]) => (
                            <div key={k} className="d-flex justify-content-between align-items-center mb-1 p-1 rounded">
                              <span style={{ fontSize: 13 }}>{k}</span>
                              <div className="d-flex align-items-center gap-2" style={{ flex: 1, maxWidth: 150 }}>
                                <div className="bg-primary rounded" style={{ height: 8, width: `${Math.min(100, (v / Math.max(...Object.values(analytics.applications_by_district)) * 100))}%` }}></div>
                                <span className="small fw-bold">{formatNumber(v)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted text-center py-4">বিশ্লেষণ লোড করতে ব্যর্থ</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

