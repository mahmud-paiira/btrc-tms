import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import batchService from '../../services/batchService';
import circularService from '../../services/circularService';
import { useTranslation } from '../../hooks/useTranslation';
import { formatDate } from '../../utils/dateFormatter';

const STATUS_STYLE = {
  scheduled: { bg: '#f3f4f6', color: '#6b7280', label: 'নির্ধারित', icon: 'bi-clock' },
  running: { bg: '#ecfdf5', color: '#059669', label: 'চলমান', icon: 'bi-play-circle' },
  completed: { bg: '#eff6ff', color: '#2563eb', label: 'সমাপ্ত', icon: 'bi-check-circle' },
  cancelled: { bg: '#fef2f2', color: '#dc2626', label: 'বাতিল', icon: 'bi-x-circle' },
};

export default function BatchList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef(null);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [circulars, setCirculars] = useState([]);
  const [selectedCircular, setSelectedCircular] = useState('');
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await batchService.list(params);
      if (data.results) {
        setBatches(data.results);
        setTotal(data.count);
      } else {
        setBatches(data);
        setTotal(data.length || 0);
      }
    } catch {
      toast.error(t('batch.list.loadFailed', 'ব্যাচ তালিকা লোড করতে ব্যর্থ'));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, t]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleStatusChange = async (id, action) => {
    setActionLoading(`${id}-${action}`);
    try {
      if (action === 'start') await batchService.start(id);
      else if (action === 'complete') await batchService.complete(id);
      else if (action === 'cancel') await batchService.cancel(id);
      toast.success(t('batch.list.updateSuccess', 'স্ট্যাটাস আপডেট করা হয়েছে'));
      fetchBatches();
    } catch (err) {
      toast.error(err.response?.data?.error || t('batch.list.updateFailed', 'স্ট্যাটাস পরিবর্তন ব্যর্থ'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}"-কে মুছে ফেলবেন?`)) return;
    try {
      await api.delete(`/batches/${id}/`);
      toast.success('মুছে ফেলা হয়েছে');
      fetchBatches();
    } catch {
      toast.error('মুছতে ব্যর্থ');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const handleImportSubmit = async () => {
    if (!importFile) { toast.warning('ফাইল নির্বাচন করুন'); return; }
    setImportLoading(true);
    setImportResults(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await api.post('/batches/import_list/', formData);
      setImportResults(res.data);
      if (res.data.updated > 0) {
        toast.success(`${res.data.updated} টি আপডেট`);
        fetchBatches();
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'ইম্পোর্ট ব্যর্থ';
      toast.error(msg);
    } finally { setImportLoading(false); }
  };

  const openGenerateModal = async () => {
    setShowGenerate(true);
    setSelectedCircular('');
    try {
      const { data } = await circularService.list({ page_size: 100 });
      setCirculars(data.results || []);
    } catch { setCirculars([]); }
  };

  const handleGenerate = async () => {
    if (!selectedCircular) { toast.warning('সার্কুলার নির্বাচন করুন'); return; }
    setGenerating(true);
    try {
      const { data } = await batchService.generate({ circular_id: selectedCircular });
      toast.success(`${data.count} টি ব্যাচ তৈরি করা হয়েছে`);
      setShowGenerate(false);
      fetchBatches();
    } catch (e) {
      toast.error(e.response?.data?.error || 'ব্যাচ তৈরি ব্যর্থ');
    }
    setGenerating(false);
  };

  const shiftLabel = (s) =>
    s === 'shift_1' ? 'শিফট-১ (সকাল)' : s === 'shift_2' ? 'শিফট-২ (বিকাল)' : '—';

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h4 className="fw-bold mb-0">
          <i className="bi bi-layers me-2"></i>{t('batch.list.title', 'ব্যাচ তালিকা')}
        </h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-success btn-sm" onClick={openGenerateModal}>
            <i className="bi bi-gear me-1"></i>ব্যাচ জেনারেট
          </button>
          <button className="btn btn-outline-info btn-sm" onClick={() => { setImportFile(null); setImportResults(null); setShowImport(true); }}>
            <i className="bi bi-upload me-1"></i>{t('batch.list.import', 'ইম্পোর্ট')}
          </button>
          <Link to="/center-admin/batches/create" className="btn btn-primary btn-sm">
            <i className="bi bi-plus-lg me-1"></i>{t('batch.list.newBatch', 'নতুন ব্যাচ')}
          </Link>
        </div>
      </div>

      <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body py-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-5">
              <input className="form-control form-control-sm"
                placeholder={t('batch.list.searchPlaceholder', 'অনুসন্ধান (ব্যাচ নং, নাম)...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">{t('batch.list.allStatus', 'সব স্ট্যাটাস')}</option>
                {Object.entries(STATUS_STYLE).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4 text-md-end">
              <span className="text-secondary" style={{ fontSize: 13 }}>মোট: {total} টি</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 mb-0 text-muted">{t('batch.list.loading', 'লোড হচ্ছে...')}</p>
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-inbox fs-1"></i>
          <p className="mt-2 mb-0">{t('batch.list.empty', 'কোন ব্যাচ পাওয়া যায়নি')}</p>
        </div>
      ) : (
        <>
          <div className="row g-3">
            {batches.map((b) => {
              const st = STATUS_STYLE[b.status] || STATUS_STYLE.scheduled;
              const isLoading = actionLoading === `${b.id}-start` || actionLoading === `${b.id}-complete` || actionLoading === `${b.id}-cancel`;
              return (
                <div className="col-12 col-md-6 col-xl-4" key={b.id}>
                  <div className="card shadow-sm h-100" style={{ borderRadius: 12, border: 'none' }}>
                    <div className="card-body d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <Link to={`/center-admin/batches/${b.id}`} className="text-decoration-none">
                            <h6 className="fw-bold mb-1 text-dark">{b.batch_name_bn || b.batch_name_en || b.batch_no}</h6>
                          </Link>
                          <small className="text-secondary">{b.batch_no}</small>
                        </div>
                        <span className="badge rounded-pill" style={{
                          background: st.bg, color: st.color, fontSize: 11,
                        }}>
                          <i className={`bi ${st.icon} me-1`}></i>{st.label}
                        </span>
                      </div>

                      <div className="mb-2" style={{ fontSize: 12, lineHeight: 1.8 }}>
                        <div><i className="bi bi-book me-1 text-secondary"></i>{b.course_name || '—'}</div>
                        <div><i className="bi bi-clock me-1 text-secondary"></i>{shiftLabel(b.shift)}</div>
                        <div className="d-flex gap-3 flex-wrap">
                          <span><i className="bi bi-calendar me-1 text-secondary"></i>শুরু: {b.start_date || '—'}</span>
                          <span><i className="bi bi-calendar-check me-1 text-secondary"></i>শেষ: {b.end_date || '—'}</span>
                        </div>
                        <div>
                          <i className="bi bi-people me-1 text-secondary"></i>আসন: <strong>{b.filled_seats || 0}</strong>/{b.total_seats || 0}
                        </div>
                      </div>

                      <div className="mt-auto pt-2 border-top d-flex flex-wrap gap-1">
                        {b.status === 'scheduled' && (
                          <>
                            <Link to={`/center-admin/batches/${b.id}/edit`} className="btn btn-sm btn-outline-secondary flex-fill">
                              <i className="bi bi-pencil me-1"></i>সম্পাদনা
                            </Link>
                            <button className="btn btn-sm btn-success flex-fill" onClick={() => handleStatusChange(b.id, 'start')} disabled={isLoading}>
                              {isLoading ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-play-fill me-1"></i>শুরু</>}
                            </button>
                            <button className="btn btn-sm btn-outline-primary flex-fill" onClick={() => handleStatusChange(b.id, 'complete')} disabled={isLoading}>
                              {isLoading ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-check-lg me-1"></i>সমাপ্ত</>}
                            </button>
                          </>
                        )}
                        {b.status === 'running' && (
                          <>
                            <button className="btn btn-sm btn-outline-success flex-fill" onClick={() => navigate(`/center-admin/attendance/batch/${b.id}`)}>
                              <i className="bi bi-calendar-check me-1"></i>উপস্থিতি
                            </button>
                            <button className="btn btn-sm btn-outline-warning flex-fill" onClick={() => navigate(`/assessor/assessment/batch/${b.id}`)}>
                              <i className="bi bi-clipboard-data me-1"></i>মূল্যায়ন
                            </button>
                            <button className="btn btn-sm btn-primary flex-fill" onClick={() => handleStatusChange(b.id, 'complete')} disabled={isLoading}>
                              {isLoading ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-check-lg me-1"></i>সমাপ্ত</>}
                            </button>
                          </>
                        )}
                        {b.status === 'completed' && (
                          <>
                            <button className="btn btn-sm btn-outline-info flex-fill" onClick={() => navigate(`/center-admin/certificates/issue?batch=${b.id}`)}>
                              <i className="bi bi-award me-1"></i>সার্টিফিকেট
                            </button>
                            <button className="btn btn-sm btn-outline-secondary flex-fill" onClick={() => navigate(`/center-admin/jobs/add?batch=${b.id}`)}>
                              <i className="bi bi-briefcase me-1"></i>চাকরি
                            </button>
                            <button className="btn btn-sm btn-outline-secondary flex-fill" onClick={() => navigate(`/center-admin/jobs/tracking?batch=${b.id}`)}>
                              <i className="bi bi-graph-up me-1"></i>ট্র্যাকিং
                            </button>
                          </>
                        )}
                        {b.status !== 'completed' && b.status !== 'scheduled' && b.status !== 'running' && (
                          <span className="text-muted small py-1">কোন কর্ম উপলব্ধ নেই</span>
                        )}
                        <div className="dropdown">
                          <button className="btn btn-sm btn-outline-secondary border-0" data-bs-toggle="dropdown" data-bs-strategy="fixed" type="button">
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end" style={{ fontSize: 13 }}>
                            {b.status === 'scheduled' && <li><button className="dropdown-item" onClick={() => navigate(`/center-admin/batches/${b.id}/edit`)}><i className="bi bi-pencil me-2"></i>সম্পাদনা</button></li>}
                            {b.status === 'running' && <li><button className="dropdown-item text-danger" onClick={() => handleStatusChange(b.id, 'complete')}><i className="bi bi-check-lg me-2"></i>সমাপ্ত করুন</button></li>}
                            <li><hr className="dropdown-divider" /></li>
                            <li><button className="dropdown-item text-danger" onClick={() => handleDelete(b.id, b.batch_no)}><i className="bi bi-trash me-2"></i>মুছুন</button></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3 py-2 px-3 bg-white rounded shadow-sm">
              <small className="text-secondary">মোট: {total} টি</small>
              <div className="d-flex gap-1">
                <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <i className="bi bi-chevron-left"></i>
                </button>
                <span className="px-2 d-flex align-items-center small">{page} / {totalPages}</span>
                <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showImport && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-upload me-2"></i>ব্যাচ বাল্ক ইম্পোর্ট</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowImport(false)} />
              </div>
              <div className="modal-body">
                <div className="border rounded-3 p-4 bg-light mb-3">
                  <div className="mb-3">
                    <input ref={fileRef} type="file" className="form-control"
                      accept=".csv,.xlsx" onChange={e => setImportFile(e.target.files[0] || null)} />
                    <small className="text-secondary">Excel (.xlsx) বা CSV ফাইল আপলোড করুন</small>
                  </div>
                  <div className="d-flex gap-2 mt-2">
                    <button className="btn btn-outline-success flex-shrink-0" onClick={async () => {
                      try { const res = await api.get('/batches/download_template/', { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([res.data])); const a = document.createElement('a'); a.href = url; a.download = 'batch_import_template.xlsx'; a.click(); a.remove(); window.URL.revokeObjectURL(url); } catch { toast.error('টেমপ্লেট ডাউনলোড ব্যর্থ'); }
                    }} type="button">
                      <i className="bi bi-download me-1"></i>টেমপ্লেট
                    </button>
                    <button className="btn btn-primary flex-grow-1" onClick={handleImportSubmit} disabled={importLoading || !importFile}>
                      {importLoading ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-cloud-upload me-1"></i>}
                      ইম্পোর্ট
                    </button>
                  </div>
                </div>
                {importResults && (
                  <div>
                    <h6 className="fw-bold">ইম্পোর্ট ফলাফল</h6>
                    <div className="d-flex gap-3 mb-2">
                      <div className="badge bg-info fs-6">আপডেট: {importResults.updated}</div>
                    </div>
                    {importResults.errors && importResults.errors.length > 0 && (
                      <div className="border rounded p-2 bg-danger bg-opacity-10" style={{ maxHeight: 200, overflowY: 'auto' }}>
                        <small className="text-danger fw-bold">ত্রুটি:</small>
                        {importResults.errors.map((err, i) => (
                          <div key={i} style={{ fontSize: 11 }} className="text-danger">{err}</div>
                        ))}
                      </div>
                    )}
                    <button className="btn btn-outline-secondary btn-sm w-100 mt-2" onClick={() => { setImportFile(null); setImportResults(null); if (fileRef.current) fileRef.current.value = ''; }}>
                      <i className="bi bi-arrow-counterclockwise me-1"></i>রিসেট
                    </button>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowImport(false)}>বন্ধ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGenerate && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">ব্যাচ জেনারেট</h5>
                <button className="btn-close" onClick={() => setShowGenerate(false)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted small">সার্কুলার নির্বাচন করুন। কেন্দ্রের বরাদ্দকৃত আসন অনুযায়ী স্বয়ংক্রিয়ভাবে ব্যাচ তৈরি হবে (২৫ আসন/ব্যাচ)।</p>
                <div className="mb-3">
                  <label className="form-label">সার্কুলার</label>
                  <select className="form-select" value={selectedCircular} onChange={e => setSelectedCircular(e.target.value)}>
                    <option value="">সার্কুলার নির্বাচন করুন</option>
                    {circulars.map(c => (
                      <option key={c.id} value={c.id}>{c.title_bn}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowGenerate(false)}>বাতিল</button>
                <button className="btn btn-success" onClick={handleGenerate} disabled={generating || !selectedCircular}>
                  {generating ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-gear me-1"></i>}
                  জেনারেট
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
