import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import batchService from '../../services/batchService';
import circularService from '../../services/circularService';
import { useTranslation } from '../../hooks/useTranslation';
import { formatDate } from '../../utils/dateFormatter';

const STATUS_BADGE = {
  scheduled: 'secondary',
  running: 'success',
  completed: 'primary',
  cancelled: 'danger',
};

export default function BatchList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const STATUS_MAP = {
    scheduled: t('batch.status.scheduled', 'নির্ধারিত'),
    running: t('batch.status.running', 'চলমান'),
    completed: t('batch.status.completed', 'সমাপ্ত'),
    cancelled: t('batch.status.cancelled', 'বাতিল'),
  };

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef(null);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [circulars, setCirculars] = useState([]);
  const [selectedCircular, setSelectedCircular] = useState('');
  const [generating, setGenerating] = useState(false);

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
    } catch (err) {
      toast.error(t('batch.list.loadFailed', 'ব্যাচ তালিকা লোড করতে ব্যর্থ'));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, t]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleStatusChange = async (id, action) => {
    try {
      if (action === 'start') await batchService.start(id);
      else if (action === 'complete') await batchService.complete(id);
      else if (action === 'cancel') await batchService.cancel(id);
      toast.success(t('batch.list.updateSuccess', 'স্ট্যাটাস আপডেট করা হয়েছে'));
      fetchBatches();
    } catch (err) {
      toast.error(err.response?.data?.error || t('batch.list.updateFailed', 'স্ট্যাটাস পরিবর্তন ব্যর্থ'));
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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(batches.map((b) => b.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = async (fmt = 'xlsx') => {
    try {
      const params = { page_size: 9999, file_format: fmt };
      if (selectedIds.size > 0) params.ids = [...selectedIds].join(',');
      else if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/batches/export-list/', { params, responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batches_${new Date().toISOString().slice(0, 10)}.${fmt}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('এক্সপোর্ট সম্পন্ন');
    } catch {
      toast.error('এক্সপোর্ট ব্যর্থ');
    }
  };

  const handlePrint = () => {
    const items = selectedIds.size > 0
      ? batches.filter((b) => selectedIds.has(b.id))
      : batches;
    const w = window.open('', '_blank');
    if (!w) { toast.error('পপ-আপ ব্লকার অক্ষম করুন'); return; }
    w.document.write(`
      <html><head><title>ব্যাচ তালিকা</title>
      <style>
        body { font-family: 'NikoshBAN', 'SolaimanLipi', Arial, sans-serif; padding: 30px; color: #222; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a56db; padding-bottom: 15px; }
        .header h1 { font-size: 22px; margin: 0 0 5px; color: #1a56db; }
        .header p { font-size: 13px; color: #666; margin: 0; }
        .report-info { display: flex; justify-content: space-between; font-size: 12px; color: #888; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #1a56db; color: #fff; padding: 10px 8px; text-align: left; font-weight: bold; }
        td { border: 1px solid #ddd; padding: 8px; }
        tr:nth-child(even) { background: #f8fafc; }
        tr:nth-child(odd) { background: #fff; }
        .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 15px; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="header">
        <h1>ব্যাচ তালিকা</h1>
        <p>প্রশিক্ষণ ব্যবস্থাপনা সিস্টেম</p>
      </div>
      <div class="report-info">
        <span>মোট: ${items.length} টি</span>
        <span>প্রিন্টের তারিখ: ${new Date().toLocaleDateString('bn-BD')}</span>
      </div>
      <table>
        <tr><th>ক্রমিক</th><th>ব্যাচ নং</th><th>নাম</th><th>শিফট</th><th>কোর্স</th><th>শুরুর তারিখ</th><th>সমাপ্তির তারিখ</th><th>আসন</th><th>স্ট্যাটাস</th></tr>
        ${items.map((b, i) => {
          const shiftLabel = b.shift === 'shift_1' ? 'শিফট-১' : b.shift === 'shift_2' ? 'শিফট-২' : '—';
          return `<tr>
            <td style="text-align:center;width:40px;">${i + 1}</td>
            <td><strong>${b.batch_no || '—'}</strong></td>
            <td>${b.batch_name_bn || b.batch_name_en || '—'}</td>
            <td>${shiftLabel}</td>
            <td>${b.course_name || '—'}</td>
            <td>${b.start_date || '—'}</td>
            <td>${b.end_date || '—'}</td>
            <td style="text-align:center;">${b.filled_seats || 0}/${b.total_seats || 0}</td>
            <td>${STATUS_MAP[b.status] || b.status || '—'}</td>
          </tr>`;
        }).join('')}
      </table>
      <div class="footer">ব্যাচ তালিকা - ${new Date().toLocaleDateString('bn-BD')}</div>
      <script>window.print();</script>
      </body></html>
    `);
    w.document.close();
  };

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
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-6">
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
                {Object.entries(STATUS_MAP).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3 text-md-end">
              <span className="text-secondary" style={{ fontSize: 13 }}>মোট: {total} টি</span>
            </div>
          </div>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="alert alert-info py-2 d-flex justify-content-between align-items-center mb-3">
          <span><i className="bi bi-check-square me-1"></i>{selectedIds.size} টি নির্বাচিত</span>
          <div className="d-flex gap-2">
            <div className="btn-group btn-group-sm">
              <button className="btn btn-sm btn-success" onClick={() => handleExport('xlsx')}>
                <i className="bi bi-download me-1"></i>{t('batch.list.exportSelected', 'নির্বাচিত এক্সপোর্ট')}
              </button>
              <button className="btn btn-sm btn-success dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                <span className="visually-hidden">Toggle</span>
              </button>
              <ul className="dropdown-menu">
                <li><button className="dropdown-item" onClick={() => handleExport('xlsx')}><i className="bi bi-file-earmark-excel me-2"></i>Excel (.xlsx)</button></li>
                <li><button className="dropdown-item" onClick={() => handleExport('csv')}><i className="bi bi-filetype-csv me-2"></i>CSV</button></li>
              </ul>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={handlePrint}>
              <i className="bi bi-printer me-1"></i>{t('batch.list.print', 'প্রিন্ট')}
            </button>
            <button className="btn btn-sm btn-outline-danger" onClick={() => setSelectedIds(new Set())}>
              {t('batch.list.clear', 'নির্বাচন বাতিল')}
            </button>
          </div>
        </div>
      )}

      <div className="card shadow-sm table-card" style={{ borderRadius: 12, border: 'none' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
            <thead className="table-light">
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" className="form-check-input" onChange={handleSelectAll}
                    checked={batches.length > 0 && selectedIds.size === batches.length} />
                </th>
                <th>{t('batch.list.colBatchNo', 'ব্যাচ নং')}</th>
                <th>{t('batch.list.colName', 'নাম')}</th>
                <th className="d-none d-lg-table-cell">শিফট</th>
                <th className="d-none d-xl-table-cell">{t('batch.list.colCourse', 'কোর্স')}</th>
                <th className="d-none d-md-table-cell">{t('batch.list.colStartDate', 'শুরুর তারিখ')}</th>
                <th className="d-none d-md-table-cell">{t('batch.list.colEndDate', 'সমাপ্তির তারিখ')}</th>
                <th className="d-none d-lg-table-cell">{t('batch.list.colSeats', 'আসন')}</th>
                <th>{t('batch.list.colStatus', 'স্ট্যাটাস')}</th>
                <th className="text-center" style={{ width: 50 }}>{t('batch.list.colActions', 'কার্যক্রম')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-5">
                  <div className="spinner-border text-primary" role="status" />
                  <p className="mt-2 mb-0 text-muted">{t('batch.list.loading', 'লোড হচ্ছে...')}</p>
                </td></tr>
              ) : batches.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-5 text-muted">
                  <i className="bi bi-inbox fs-1"></i>
                  <p className="mt-2 mb-0">{t('batch.list.empty', 'কোন ব্যাচ পাওয়া যায়নি')}</p>
                </td></tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className={selectedIds.has(b.id) ? 'table-active' : ''}>
                    <td><input type="checkbox" className="form-check-input" checked={selectedIds.has(b.id)} onChange={() => handleSelectOne(b.id)} /></td>
                    <td>
              <Link to={`/center-admin/batches/${b.id}`} className="text-decoration-none">
                <strong>{b.batch_no}</strong>
              </Link>
            </td>
                    <td style={{ whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 120 }}>{b.batch_name_bn || b.batch_name_en}</td>
                    <td className="d-none d-lg-table-cell" style={{ whiteSpace: 'nowrap' }}>
                      {b.shift === 'shift_1' ? 'শিফট-১' : b.shift === 'shift_2' ? 'শিফট-২' : '-'}
                    </td>
                    <td className="d-none d-xl-table-cell" style={{ whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 100 }}>{b.course_name}</td>
                    <td className="d-none d-md-table-cell" style={{ whiteSpace: 'nowrap' }}>{b.start_date ? formatDate(b.start_date) : '-'}</td>
                    <td className="d-none d-md-table-cell" style={{ whiteSpace: 'nowrap' }}>{b.end_date ? formatDate(b.end_date) : '-'}</td>
                    <td className="d-none d-lg-table-cell" style={{ whiteSpace: 'nowrap' }}>{b.filled_seats || 0}/{b.total_seats || 0}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className={`badge bg-${STATUS_BADGE[b.status]}`}>
                        {STATUS_MAP[b.status] || b.status}
                      </span>
                    </td>
                    <td className="text-center" style={{ width: 50 }}>
                      <div className="dropdown">
                        <button className="btn btn-sm btn-outline-secondary border-0" data-bs-toggle="dropdown" type="button">
                          <i className="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end" style={{ fontSize: 13 }}>
                          {b.status === 'scheduled' && <li><button className="dropdown-item" onClick={() => navigate(`/center-admin/batches/${b.id}/edit`)}><i className="bi bi-pencil me-2"></i>{t('batch.list.btnEdit', 'সম্পাদনা')}</button></li>}
                          {b.status === 'scheduled' && <li><button className="dropdown-item text-success" onClick={() => handleStatusChange(b.id, 'start')}><i className="bi bi-play-fill me-2"></i>{t('batch.list.btnStart', 'শুরু করুন')}</button></li>}
                          {(b.status === 'scheduled' || b.status === 'running') && <li><hr className="dropdown-divider" /></li>}
                          {b.status === 'running' && <li><button className="dropdown-item" onClick={() => navigate(`/center-admin/attendance/batch/${b.id}`)}><i className="bi bi-calendar-check me-2"></i>{t('batch.list.btnAttendance', 'উপস্থিতি')}</button></li>}
                          {b.status === 'running' && <li><button className="dropdown-item" onClick={() => navigate(`/assessor/assessment/batch/${b.id}`)}><i className="bi bi-clipboard-data me-2"></i>{t('batch.list.btnAssessment', 'মূল্যায়ন')}</button></li>}
                          {b.status === 'running' && <li><button className="dropdown-item text-primary" onClick={() => handleStatusChange(b.id, 'complete')}><i className="bi bi-check-lg me-2"></i>{t('batch.list.btnComplete', 'সমাপ্ত করুন')}</button></li>}
                          {b.status === 'running' && <li><hr className="dropdown-divider" /></li>}
                          {b.status === 'completed' && <li><button className="dropdown-item" onClick={() => navigate(`/center-admin/certificates/issue?batch=${b.id}`)}><i className="bi bi-award me-2"></i>{t('batch.list.btnCertificate', 'সার্টিফিকেট')}</button></li>}
                          {b.status === 'completed' && <li><button className="dropdown-item" onClick={() => navigate(`/center-admin/jobs/add?batch=${b.id}`)}><i className="bi bi-briefcase me-2"></i>{t('batch.list.btnJob', 'চাকরি স্থাপন')}</button></li>}
                          {b.status === 'completed' && <li><button className="dropdown-item" onClick={() => navigate(`/center-admin/jobs/tracking?batch=${b.id}`)}><i className="bi bi-graph-up me-2"></i>{t('batch.list.btnTracking', 'ট্র্যাকিং')}</button></li>}
                          {b.status === 'completed' && <li><hr className="dropdown-divider" /></li>}
                          {b.status !== 'scheduled' && b.status !== 'running' && b.status !== 'completed' && <li><hr className="dropdown-divider" /></li>}
                          {b.status !== 'scheduled' && <li><button className="dropdown-item text-danger" onClick={() => handleStatusChange(b.id, 'cancel')}><i className="bi bi-x-lg me-2"></i>{t('batch.list.btnCancel', 'বাতিল')}</button></li>}
                          <li><hr className="dropdown-divider" /></li>
                          <li><button className="dropdown-item text-danger" onClick={() => handleDelete(b.id, b.batch_no)}><i className="bi bi-trash me-2"></i>মুছুন</button></li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="card-footer bg-white d-flex justify-content-between align-items-center py-2 px-3"
            style={{ borderRadius: '0 0 12px 12px' }}>
            <small className="text-secondary">মোট: {total}</small>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <i className="bi bi-chevron-left"></i>
              </button>
              <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

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

      {/* Generate Batches Modal */}
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
