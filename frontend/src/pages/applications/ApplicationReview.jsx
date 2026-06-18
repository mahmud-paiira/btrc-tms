import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import applicationService from '../../services/applicationService';
import api from '../../services/api';
import './ApplicationReview.css';

const STATUS_OPTIONS = [
  { value: '', label: 'সবগুলো', cls: 'secondary' },
  { value: 'pending', label: 'পেন্ডিং', cls: 'warning' },
  { value: 'selected', label: 'নির্বাচিত', cls: 'success' },
  { value: 'rejected', label: 'বাতিল', cls: 'danger' },
  { value: 'waitlisted', label: 'অপেক্ষমাণ', cls: 'info' },
];

const PAGE_SIZES = [10, 20, 50, 100];

const statusBadge = (status) => {
  const map = {
    pending: { cls: 'bg-warning text-dark', label: 'পেন্ডিং' },
    selected: { cls: 'bg-success', label: 'নির্বাচিত' },
    rejected: { cls: 'bg-danger', label: 'বাতিল' },
    waitlisted: { cls: 'bg-info text-dark', label: 'অপেক্ষমাণ' },
  };
  const s = map[status] || { cls: 'bg-secondary', label: status };
  return <span className={`badge ${s.cls} rounded-pill`}>{s.label}</span>;
};

export default function ApplicationReview() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [circulars, setCirculars] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({ circular: '', status: '', name: '', date_from: '', date_to: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState('applied_at');
  const [sortDir, setSortDir] = useState('desc');

  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [pendingStatus, setPendingStatus] = useState({});

  const fetchCirculars = useCallback(async () => {
    try {
      const { data } = await applicationService.getCirculars();
      setCirculars(data);
    } catch {
      toast.error('সার্কুলার তালিকা লোড করতে ব্যর্থ');
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await applicationService.getStats();
      setStats(data);
    } catch {
      // silent
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (filters.circular) params.circular = filters.circular;
      if (filters.status) params.status = filters.status;
      if (filters.name) params.name = filters.name;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (sortField) params.ordering = (sortDir === 'desc' ? '-' : '') + sortField;
      const { data } = await applicationService.list(params);
      setApplications(data.results || data);
      setTotal(data.count || data.length || 0);
    } catch {
      toast.error('আবেদন তালিকা লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, sortField, sortDir]);

  useEffect(() => { fetchCirculars(); fetchStats(); }, [fetchCirculars, fetchStats]);
  useEffect(() => { fetchApplications(); }, [fetchApplications]);
  useEffect(() => { setPage(1); }, [filters, pageSize]);
  useEffect(() => { setSelectAll(false); setSelectedIds([]); }, [applications]);

  const totalPages = useMemo(() => Math.ceil(total / pageSize), [total, pageSize]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ circular: '', status: '', name: '', date_from: '', date_to: '' });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <i className="bi bi-arrow-down-up text-muted opacity-25 ms-1" style={{fontSize:'0.7rem'}}></i>;
    return <i className={`bi bi-sort-${sortDir === 'asc' ? 'up' : 'down'} ms-1`} style={{fontSize:'0.7rem'}}></i>;
  };

  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    setSelectedIds(checked ? applications.map(a => a.id) : []);
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkReview = async (status) => {
    if (!selectedIds.length) { toast.warning('কমপক্ষে একটি আবেদন নির্বাচন করুন'); return; }
    try {
      await applicationService.bulkReview({ ids: selectedIds, status });
      const label = STATUS_OPTIONS.find(s => s.value === status)?.label || status;
      toast.success(`${selectedIds.length} টি আবেদন ${label} করা হয়েছে`);
      setSelectedIds([]); setSelectAll(false);
      fetchApplications(); fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'ব্যাচ অপারেশন ব্যর্থ');
    }
  };

  const handleSingleReview = async (id, status) => {
    try {
      await applicationService.review(id, { status });
      toast.success(`আবেদন #${id} এর অবস্থা পরিবর্তন করা হয়েছে`);
      fetchApplications(); fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'পর্যালোচনা ব্যর্থ');
    }
  };

  const handleDelete = async (id) => {
    try {
      await applicationService.delete(id);
      toast.success('আবেদনটি মুছে ফেলা হয়েছে');
      setShowDeleteConfirm(null);
      fetchApplications(); fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'মুছে ফেলতে ব্যর্থ');
    }
  };

  const handleExport = async (format) => {
    try {
      const params = {};
      if (filters.circular) params.circular = filters.circular;
      if (filters.status) params.status = filters.status;
      if (filters.name) params.name = filters.name;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const fn = format === 'excel' ? applicationService.exportExcel : applicationService.exportPdf;
      const { data } = await fn(params);
      const blob = new Blob([data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `applications.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('রিপোর্ট ডাউনলোড করা হয়েছে');
    } catch {
      toast.error('এক্সপোর্ট ব্যর্থ হয়েছে');
    }
  };

  const handleImport = async () => {
    if (!importFile) { toast.warning('ফাইল নির্বাচন করুন'); return; }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      await applicationService.importCsv(formData);
      toast.success('ইম্পোর্ট সফল হয়েছে');
      setShowImport(false); setImportFile(null);
      fetchApplications(); fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'ইম্পোর্ট ব্যর্থ');
    } finally {
      setImporting(false);
    }
  };

  const handlePrint = async (app) => {
    try {
      const response = await api.get(`/public/print/${app.application_no}/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch {
      toast.error('PDF ডাউনলোড ব্যর্থ হয়েছে');
    }
  };

  return (
    <div className="application-review">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h4 className="mb-0 fw-semibold">
          <i className="bi bi-file-earmark-text me-2"></i>আবেদন পর্যালোচনা
          <span className="badge bg-secondary ms-2 align-middle fs-6">{total}</span>
        </h4>
        <div className="d-flex flex-wrap gap-1">
          <button className="btn btn-outline-primary btn-sm" onClick={() => setShowImport(true)}>
            <i className="bi bi-upload me-1"></i>ইম্পোর্ট
          </button>
          <div className="btn-group btn-group-sm">
            <button className="btn btn-outline-success" onClick={() => handleExport('excel')}>
              <i className="bi bi-file-earmark-excel me-1"></i>Excel
            </button>
            <button className="btn btn-outline-danger" onClick={() => handleExport('pdf')}>
              <i className="bi bi-file-earmark-pdf me-1"></i>PDF
            </button>
          </div>
          <button className="btn btn-outline-info btn-sm" onClick={() => fetchApplications()}>
            <i className="bi bi-arrow-clockwise me-1"></i>রিফ্রেশ
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="row g-1 mb-3">
          {[
            { label: 'মোট', count: stats.total, cls: 'bg-primary' },
            { label: 'পেন্ডিং', count: stats.pending, cls: 'bg-warning text-dark' },
            { label: 'নির্বাচিত', count: stats.selected, cls: 'bg-success' },
            { label: 'বাতিল', count: stats.rejected, cls: 'bg-danger' },
            { label: 'অপেক্ষমাণ', count: stats.waitlisted, cls: 'bg-info text-dark' },
          ].map(({ label, count, cls }) => (
            <div className="col" key={label}>
              <div className={`card ${cls} text-white stats-card border-0`}>
                <div className="card-body py-2 px-3 text-center">
                  <div className="fw-bold fs-5">{count}</div>
                  <small>{label}</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-3 shadow-sm border-0">
        <div className="card-body py-2">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small mb-0 fw-medium">সার্কুলার</label>
              <select className="form-select form-select-sm" name="circular" value={filters.circular} onChange={handleFilterChange}>
                <option value="">সব সার্কুলার</option>
                {circulars.map(c => (
                  <option key={c.id} value={c.id}>{c.title_bn}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-0 fw-medium">অবস্থা</label>
              <select className="form-select form-select-sm" name="status" value={filters.status} onChange={handleFilterChange}>
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small mb-0 fw-medium">অনুসন্ধান</label>
              <input className="form-control form-control-sm" name="name" value={filters.name}
                onChange={handleFilterChange} placeholder="নাম অনুসন্ধান..." />
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-0 fw-medium">শুরুর তারিখ</label>
              <input className="form-control form-control-sm" type="date" name="date_from"
                value={filters.date_from} onChange={handleFilterChange} />
            </div>
            <div className="col-md-2">
              <div className="d-flex gap-1">
                <div className="flex-grow-1">
                  <label className="form-label small mb-0 fw-medium">শেষ তারিখ</label>
                  <input className="form-control form-control-sm" type="date" name="date_to"
                    value={filters.date_to} onChange={handleFilterChange} />
                </div>
                <button className="btn btn-sm btn-outline-secondary mt-4 px-2" onClick={clearFilters}
                  title="ফিল্টার রিসেট">
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Count + Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="d-flex align-items-center justify-content-between bg-light rounded-3 px-3 py-2 mb-3 border">
          <span className="fw-medium">
            <i className="bi bi-check-square me-1"></i>
            <strong>{selectedIds.length}</strong> টি আবেদন নির্বাচিত
          </span>
          <div className="d-flex gap-1">
            <button className="btn btn-success btn-sm" onClick={() => handleBulkReview('selected')}>
              <i className="bi bi-check-all me-1"></i>নির্বাচিত
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => handleBulkReview('rejected')}>
              <i className="bi bi-x-lg me-1"></i>বাতিল
            </button>
            <button className="btn btn-warning btn-sm text-dark" onClick={() => handleBulkReview('waitlisted')}>
              <i className="bi bi-clock me-1"></i>অপেক্ষমাণ
            </button>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => { setSelectedIds([]); setSelectAll(false); }}>
              <i className="bi bi-slash-circle me-1"></i>মুক্ত করুন
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card shadow-sm border-0 table-card">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
              <p className="text-muted mt-2 small">লোড হচ্ছে...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox fs-1"></i>
              <p className="mt-2">কোন আবেদন পাওয়া যায়নি</p>
              <button className="btn btn-sm btn-outline-primary" onClick={clearFilters}>ফিল্টার রিসেট করুন</button>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 36 }}>
                        <input type="checkbox" className="form-check-input" checked={selectAll} onChange={handleSelectAll} />
                      </th>
                      <th style={{ width: 40 }}>#</th>
                      <th className="sortable" onClick={() => handleSort('application_no')}>
                        আবেদন নং <SortIcon field="application_no" />
                      </th>
                      <th className="sortable" onClick={() => handleSort('name_bn')}>
                        নাম <SortIcon field="name_bn" />
                      </th>
                      <th className="sortable" onClick={() => handleSort('nid')}>
                        এনআইডি <SortIcon field="nid" />
                      </th>
                      <th>মোবাইল</th>
                      <th className="sortable" onClick={() => handleSort('applied_at')}>
                        তারিখ <SortIcon field="applied_at" />
                      </th>
                      <th style={{ width: 140 }}>অবস্থা</th>
                      <th style={{ width: 160 }} className="text-center">কার্যক্রম</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app, idx) => (
                      <tr key={app.id} className={selectedIds.includes(app.id) ? 'table-active' : ''}>
                        <td>
                          <input type="checkbox" className="form-check-input"
                            checked={selectedIds.includes(app.id)} onChange={() => handleSelectOne(app.id)} />
                        </td>
                        <td className="text-muted small">{idx + 1}</td>
                        <td className="fw-semibold">{app.application_no}</td>
                        <td>
                          <span className="d-inline-block text-truncate" style={{ maxWidth: 160 }} title={app.name_bn}>
                            {app.name_bn}
                          </span>
                        </td>
                        <td className="text-nowrap small">{app.nid}</td>
                        <td className="text-nowrap small">{app.phone}</td>
                        <td className="text-nowrap small">{app.applied_at ? new Date(app.applied_at).toLocaleDateString('bn-BD') : '—'}</td>
                        <td>
                          <select className={`form-select form-select-sm border-0 bg-transparent fw-semibold status-select-${app.status}`}
                            value={pendingStatus[app.id] ?? app.status}
                            onChange={e => setPendingStatus(prev => ({ ...prev, [app.id]: e.target.value }))}
                            onBlur={e => {
                              const newStatus = pendingStatus[app.id];
                              if (newStatus && newStatus !== app.status) {
                                if (window.confirm(`আবেদন #${app.id} এর অবস্থা "${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}"-এ পরিবর্তন করবেন?`)) {
                                  handleSingleReview(app.id, newStatus);
                                }
                              }
                              setPendingStatus(prev => { const p = { ...prev }; delete p[app.id]; return p; });
                            }}
                          >
                            {STATUS_OPTIONS.filter(s => s.value).map(s => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div className="d-flex gap-1 justify-content-center">
                            <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/center-admin/applications/${app.id}`)}
                              title="বিস্তারিত দেখুন / সম্পাদনা">
                              <i className="bi bi-eye"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => handlePrint(app)}
                              title="প্রিন্ট">
                              <i className="bi bi-printer"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => setShowDeleteConfirm(app)}
                              title="মুছে ফেলুন">
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination + Page Info */}
              <div className="d-flex flex-wrap justify-content-between align-items-center px-3 py-2 border-top bg-light">
                <div className="d-flex align-items-center gap-2">
                  <small className="text-muted">{totalPages > 0 ? `পাতা ${page} / ${totalPages}` : 'পাতা -'}</small>
                  <small className="text-muted">| মোট {total} টি</small>
                  <select className="form-select form-select-sm" style={{ width: 80 }}
                    value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                    {PAGE_SIZES.map(ps => <option key={ps} value={ps}>{ps}</option>)}
                  </select>
                  <small className="text-muted">/পাতা</small>
                </div>
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(1)}><i className="bi bi-chevron-double-left"></i></button>
                    </li>
                    <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(p => Math.max(1, p - 1))}><i className="bi bi-chevron-left"></i></button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => {
                      const p = i + 1;
                      if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
                        return (
                          <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                          </li>
                        );
                      }
                      if (p === 2 || p === totalPages - 1) {
                        return <li key={p} className="page-item disabled"><span className="page-link">...</span></li>;
                      }
                      return null;
                    })}
                    <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(p => Math.min(totalPages, p + 1))}><i className="bi bi-chevron-right"></i></button>
                    </li>
                    <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(totalPages)}><i className="bi bi-chevron-double-right"></i></button>
                    </li>
                  </ul>
                </nav>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h6 className="modal-title"><i className="bi bi-exclamation-triangle me-2"></i>নিশ্চিতকরণ</h6>
              </div>
              <div className="modal-body">
                <p className="mb-0">আপনি কি আবেদনটি মুছে ফেলতে চান?</p>
                <small className="text-muted">{showDeleteConfirm.application_no} - {showDeleteConfirm.name_bn}</small>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowDeleteConfirm(null)}>বাতিল</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(showDeleteConfirm.id)}>
                  <i className="bi bi-trash me-1"></i>মুছে ফেলুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h6 className="modal-title"><i className="bi bi-upload me-2"></i>CSV ইম্পোর্ট</h6>
                <button className="btn-close btn-close-white" onClick={() => setShowImport(false)}></button>
              </div>
              <div className="modal-body">
                <p className="small text-muted">CSV ফাইল নির্বাচন করুন। প্রথম লাইনে হেডার থাকতে হবে।</p>
                <input type="file" className="form-control form-control-sm" accept=".csv,.xlsx"
                  onChange={e => setImportFile(e.target.files[0])} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowImport(false)}>বাতিল</button>
                <button className="btn btn-primary btn-sm" onClick={handleImport} disabled={importing}>
                  {importing ? <><span className="spinner-border spinner-border-sm me-1"></span>ইম্পোর্ট হচ্ছে...</> : 'ইম্পোর্ট'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

