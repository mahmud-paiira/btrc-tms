import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import applicationService from '../../services/applicationService';
import ApplicationDetailModal from '../../components/applications/ApplicationDetailModal';
import { useTranslation } from '../../hooks/useTranslation';
import { formatDate } from '../../utils/dateFormatter';
import './ApplicationReview.css';

export default function ApplicationReview() {
  const { t } = useTranslation();

  const STATUS_OPTIONS = [
    { value: '', label: t('application.status.all', 'সবগুলো') },
    { value: 'pending', label: t('application.status.pending', 'বিচারাধীন') },
    { value: 'selected', label: t('application.status.selected', 'নির্বাচিত') },
    { value: 'rejected', label: t('application.status.rejected', 'বাতিল') },
    { value: 'waitlisted', label: t('application.status.waitlisted', 'অপেক্ষমাণ') },
  ];

  const [applications, setApplications] = useState([]);
  const [circulars, setCirculars] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    circular: '',
    status: '',
    name: '',
    date_from: '',
    date_to: '',
  });

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Detail modal
  const [selectedApp, setSelectedApp] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchCirculars = useCallback(async () => {
    try {
      const { data } = await applicationService.getCirculars();
      setCirculars(data);
    } catch {
      toast.error(t('application.review.circularLoadFailed', 'সার্কুলার তালিকা লোড করতে ব্যর্থ'));
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await applicationService.getStats();
      setStats(data);
    } catch {
      toast.error(t('application.review.statsLoadFailed', 'স্ট্যাটাস তথ্য লোড করতে ব্যর্থ'));
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

      const { data } = await applicationService.list(params);
      setApplications(data.results || data);
      setTotal(data.count || data.length || 0);
    } catch {
      toast.error(t('application.review.listLoadFailed', 'আবেদন তালিকা লোড করতে ব্যর্থ'));
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchCirculars();
    fetchStats();
  }, [fetchCirculars, fetchStats]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    setSelectAll(false);
    setSelectedIds([]);
  }, [applications]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectAll = (e) => {
    const checked = e.target.checked;
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(applications.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkReview = async (status) => {
    if (selectedIds.length === 0) {
      toast.warning(t('application.review.selectOne', 'কমপক্ষে একটি আবেদন নির্বাচন করুন'));
      return;
    }
    try {
      await applicationService.bulkReview({ ids: selectedIds, status });
      const statusLabel = status === 'selected'
        ? t('application.status.selected', 'নির্বাচিত')
        : status === 'rejected'
          ? t('application.status.rejected', 'বাতিল')
          : t('application.status.waitlisted', 'অপেক্ষমাণ');
      toast.success(t('application.review.bulkReviewSuccess', `${selectedIds.length} টি আবেদন ${statusLabel} করা হয়েছে`));
      setSelectedIds([]);
      setSelectAll(false);
      fetchApplications();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || t('application.review.reviewFailed', 'ব্যাচ অপারেশন ব্যর্থ'));
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
      toast.success(t('application.review.downloadReady', 'রিপোর্ট ডাউনলোড করা হয়েছে'));
    } catch {
      toast.error(t('application.review.exportFailed', 'এক্সপোর্ট ব্যর্থ হয়েছে'));
    }
  };

  const handleReviewed = () => {
    setSelectedApp(null);
    fetchApplications();
    fetchStats();
  };

  const statusBadge = (status) => {
    const map = {
      pending: { cls: 'bg-warning text-dark', label: t('application.status.pending', 'বিচারাধীন') },
      selected: { cls: 'bg-success', label: t('application.status.selected', 'নির্বাচিত') },
      rejected: { cls: 'bg-danger', label: t('application.status.rejected', 'বাতিল') },
      waitlisted: { cls: 'bg-info text-dark', label: t('application.status.waitlisted', 'অপেক্ষমাণ') },
    };
    const s = map[status] || { cls: 'bg-secondary', label: status };
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="application-review">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">
          <i className="bi bi-file-earmark-text me-2"></i>
          {t('application.review.title', 'আবেদন পর্যালোচনা')}
        </h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-success btn-sm" onClick={() => handleExport('excel')}>
            <i className="bi bi-file-earmark-excel me-1"></i>Excel
          </button>
          <button className="btn btn-outline-danger btn-sm" onClick={() => handleExport('pdf')}>
            <i className="bi bi-file-earmark-pdf me-1"></i>PDF
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="row g-2 mb-3">
          {[
            { label: t('dashboard.stats.totalApplications', 'মোট'), count: stats.total, cls: 'bg-primary' },
            { label: t('application.status.pending', 'বিচারাধীন'), count: stats.pending, cls: 'bg-warning text-dark' },
            { label: t('application.status.selected', 'নির্বাচিত'), count: stats.selected, cls: 'bg-success' },
            { label: t('application.status.rejected', 'বাতিল'), count: stats.rejected, cls: 'bg-danger' },
            { label: t('application.status.waitlisted', 'অপেক্ষমাণ'), count: stats.waitlisted, cls: 'bg-info text-dark' },
          ].map(({ label, count, cls }) => (
            <div className="col" key={label}>
              <div className={`card ${cls} text-white`}>
                <div className="card-body py-2 px-3 text-center">
                  <h5 className="mb-0">{count}</h5>
                  <small>{label}</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small mb-0">{t('application.review.filterCircular', 'সার্কুলার')}</label>
              <select className="form-select form-select-sm" name="circular" value={filters.circular} onChange={handleFilterChange}>
                <option value="">{t('application.review.filterAllCirculars', 'সব সার্কুলার')}</option>
                {circulars.map((c) => (
                  <option key={c.id} value={c.id}>{c.title_bn} ({c.code})</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-0">{t('application.review.filterStatus', 'অবস্থা')}</label>
              <select className="form-select form-select-sm" name="status" value={filters.status} onChange={handleFilterChange}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small mb-0">{t('application.review.filterName', 'নাম/এনআইডি/ফোন')}</label>
              <input
                className="form-control form-control-sm"
                name="name"
                value={filters.name}
                onChange={handleFilterChange}
                placeholder={t('application.review.filterSearchPlaceholder', 'লিখুন...')}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-0">{t('application.review.filterDateFrom', 'শুরুর তারিখ')}</label>
              <input
                className="form-control form-control-sm"
                type="date"
                name="date_from"
                value={filters.date_from}
                onChange={handleFilterChange}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-0">{t('application.review.filterDateTo', 'শেষ তারিখ')}</label>
              <input
                className="form-control form-control-sm"
                type="date"
                name="date_to"
                value={filters.date_to}
                onChange={handleFilterChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="alert alert-info py-2 d-flex align-items-center justify-content-between">
          <span><strong>{selectedIds.length}</strong> {t('application.review.selectedCount', 'টি আবেদন নির্বাচিত')}</span>
          <div className="d-flex gap-2">
            <button className="btn btn-success btn-sm" onClick={() => handleBulkReview('selected')}>
              <i className="bi bi-check-all me-1"></i>{t('application.review.selectAll', 'সব নির্বাচিত')}
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => handleBulkReview('rejected')}>
              <i className="bi bi-x-lg me-1"></i>{t('application.review.deselectAll', 'সব বাতিল')}
            </button>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => { setSelectedIds([]); setSelectAll(false); }}>
              {t('application.review.cancel', 'বাতিল')}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox display-4"></i>
              <p className="mt-2">{t('application.review.empty', 'কোন আবেদন পাওয়া যায়নি')}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0">
                <thead className="table-dark">
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectAll}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>{t('application.review.colAppNo', 'আবেদন নম্বর')}</th>
                    <th>{t('application.review.colName', 'নাম')}</th>
                    <th>{t('application.review.colNid', 'এনআইডি')}</th>
                    <th>{t('application.review.colMobile', 'মোবাইল')}</th>
                    <th>{t('application.review.colDate', 'আবেদনের তারিখ')}</th>
                    <th>{t('application.review.colStatus', 'অবস্থা')}</th>
                    <th style={{ width: 200 }}>{t('application.review.colActions', 'কার্যক্রম')}</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id} className={selectedIds.includes(app.id) ? 'table-active' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedIds.includes(app.id)}
                          onChange={() => handleSelectOne(app.id)}
                        />
                      </td>
                      <td className="fw-bold">{app.application_no}</td>
                      <td>{app.name_bn}</td>
                      <td>{app.nid}</td>
                      <td>{app.phone}</td>
                      <td className="small">{formatDate(app.applied_at, 'bn')}</td>
                      <td>{statusBadge(app.status)}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setSelectedApp(app)}
                          >
                            <i className="bi bi-eye me-1"></i>{t('application.review.btnDetails', 'বিস্তারিত')}
                          </button>
                          {app.status === 'pending' && (
                            <>
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() => {
                                  setSelectedApp(app);
                                }}
                              >
                                <i className="bi bi-check-circle"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => {
                                  setSelectedApp(app);
                                }}
                              >
                                <i className="bi bi-x-circle"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-3 d-flex justify-content-center">
          <ul className="pagination pagination-sm">
            <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <i className="bi bi-chevron-left"></i>
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => {
              const p = i + 1;
              if (p === 1 || p === totalPages || Math.abs(p - page) <= 2) {
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
              <button className="page-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                <i className="bi bi-chevron-right"></i>
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* Detail Modal */}
      {selectedApp && (
        <ApplicationDetailModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onReviewed={handleReviewed}
        />
      )}
    </div>
  );
}
