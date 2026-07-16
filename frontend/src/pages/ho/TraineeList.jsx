import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import hoService from '../../services/hoService';
import { formatDate } from '../../utils/dateFormatter';
import { formatNumber } from '../../utils/numberFormatter';

const STATUS_BG = { enrolled: 'success', completed: 'primary', withdrawn: 'danger', suspended: 'warning' };

export default function TraineeList() {
  const navigate = useNavigate();
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef(null);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchTrainees = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await hoService.listTrainees(params);
      setTrainees(res.data.results || res.data || []);
      setTotal(res.data.count || (res.data.results || []).length);
    } catch {
      toast.error('প্রশিক্ষণার্থী তালিকা লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { fetchTrainees(); }, [fetchTrainees]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const totalPages = Math.ceil(total / pageSize);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}"-কে মুছে ফেলবেন?`)) return;
    try {
      await hoService.deleteTrainee(id);
      setSelectedIds(new Set());
      toast.success('মুছে ফেলা হয়েছে');
      fetchTrainees();
    } catch {
      toast.error('মুছতে ব্যর্থ');
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const ids = [...selectedIds];
      const { data } = await hoService.bulkDeleteTrainees(ids);
      if (data.errors?.length) toast.error(data.errors.join('\n'));
      if (data.deleted > 0) toast.success(`${data.deleted} টি মুছে ফেলা হয়েছে`);
      else if (!data.errors?.length) toast.warning('কিছু মুছে ফেলা যায়নি');
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      fetchTrainees();
    } catch (e) {
      toast.error('মুছতে ব্যর্থ');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(trainees.map((t) => t.id)));
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
      const params = { file_format: fmt, page_size: 9999 };
      if (selectedIds.size > 0) params.ids = [...selectedIds].join(',');
      else if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await hoService.exportTrainees(params);
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trainees_${new Date().toISOString().slice(0, 10)}.${fmt}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('এক্সপোর্ট সম্পন্ন');
    } catch {
      toast.error('এক্সপোর্ট ব্যর্থ');
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) { toast.warning('ফাইল নির্বাচন করুন'); return; }
    setImportLoading(true);
    setImportResults(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await hoService.importTrainees(formData);
      setImportResults(res.data);
      if (res.data.updated > 0) {
        toast.success(`${res.data.updated} টি আপডেট`);
        fetchTrainees();
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'ইম্পোর্ট ব্যর্থ';
      toast.error(msg);
    } finally { setImportLoading(false); }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h4 className="fw-bold mb-0"><i className="bi bi-people me-2"></i>প্রশিক্ষণার্থী ব্যবস্থাপনা</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-info btn-sm" onClick={() => { setImportFile(null); setImportResults(null); setShowImport(true); }}>
            <i className="bi bi-upload me-1"></i>ইম্পোর্ট
          </button>
        </div>
      </div>

      <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-md-5">
              <input className="form-control form-control-sm" placeholder="নাম, রেজি. নং, ফোনে সার্চ..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">সকল অবস্থা</option>
                <option value="enrolled">নথিভুক্ত</option>
                <option value="completed">সমাপ্ত</option>
                <option value="withdrawn">প্রত্যাহার</option>
                <option value="suspended">স্থগিত</option>
              </select>
            </div>
            <div className="col text-md-end">
              <span className="text-secondary" style={{ fontSize: 13 }}>মোট: {formatNumber(total)} জন</span>
            </div>
          </div>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="alert alert-info py-2 d-flex justify-content-between align-items-center mb-3">
          <span><i className="bi bi-check-square me-1"></i>{formatNumber(selectedIds.size)} টি নির্বাচিত</span>
          <div className="d-flex gap-2">
            <div className="btn-group btn-group-sm">
              <button className="btn btn-sm btn-success" onClick={() => handleExport('xlsx')}>
                <i className="bi bi-download me-1"></i>নির্বাচিত এক্সপোর্ট
              </button>
              <button className="btn btn-sm btn-success dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                <span className="visually-hidden">Toggle</span>
              </button>
              <ul className="dropdown-menu">
                <li><button className="dropdown-item" onClick={() => handleExport('xlsx')}><i className="bi bi-file-earmark-excel me-2"></i>Excel (.xlsx)</button></li>
                <li><button className="dropdown-item" onClick={() => handleExport('csv')}><i className="bi bi-filetype-csv me-2"></i>CSV</button></li>
              </ul>
            </div>
            <button className="btn btn-sm btn-danger" onClick={() => setShowBulkDelete(true)}>
              <i className="bi bi-trash me-1"></i>নির্বাচিত মুছুন
            </button>
            <button className="btn btn-sm btn-outline-danger" onClick={() => setSelectedIds(new Set())}>
              নির্বাচন বাতিল
            </button>
          </div>
        </div>
      )}

      <div className="card shadow-sm table-card" style={{ borderRadius: 12, border: 'none' }}>
          <table className="b-table w-100">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" className="form-check-input" onChange={handleSelectAll}
                    checked={trainees.length > 0 && selectedIds.size === trainees.length} />
                </th>
                <th>ক্রমিক</th>
                <th>রেজি. নং</th>
                <th>নাম (বাংলা)</th>
                <th className="d-none d-md-table-cell">এনআইডি</th>
                <th className="d-none d-md-table-cell">ফোন</th>
                <th className="d-none d-lg-table-cell">কেন্দ্র</th>
                <th className="d-none d-lg-table-cell">ব্যাচ</th>
                <th>অবস্থা</th>
                <th className="text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-4"><div className="spinner-border spinner-border-sm me-2" />লোড হচ্ছে...</td></tr>
              ) : trainees.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-secondary py-4">কোনো প্রশিক্ষণার্থী পাওয়া যায়নি</td></tr>
              ) : (
                trainees.map((t, idx) => (
                  <tr key={t.id}>
                    <td><input type="checkbox" className="form-check-input" checked={selectedIds.has(t.id)} onChange={() => handleSelectOne(t.id)} /></td>
                    <td className="text-secondary">{(page - 1) * pageSize + idx + 1}</td>
                    <td className="fw-semibold">{t.registration_no || '-'}</td>
                    <td>{t.user_full_name_bn || t.user_email || '-'}</td>
                    <td className="d-none d-md-table-cell">{t.user_nid || '-'}</td>
                    <td className="d-none d-md-table-cell">{t.user_phone || '-'}</td>
                    <td className="d-none d-lg-table-cell">{t.center_name || t.center_name_bn || '-'}</td>
                    <td className="d-none d-lg-table-cell">{t.batch_name_bn || '-'}</td>
                    <td>
                      <span className={`badge bg-${STATUS_BG[t.status] || 'secondary'} bg-opacity-10 text-${STATUS_BG[t.status] || 'secondary'} px-2 py-1`}>
                        {t.status_display || t.status}
                      </span>
                    </td>
                    <td className="act-col">
                      <div className="dropdown act-dropdown">
                        <button className="dropdown-toggle" data-bs-toggle="dropdown" type="button" data-bs-strategy="fixed">
                          <i className="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                          <li><button className="dropdown-item text-primary" onClick={() => navigate(`/ho/trainees/${t.id}`)}><i className="bi bi-eye me-2"></i>বিস্তারিত</button></li>
                          <li><button className="dropdown-item text-danger" onClick={() => handleDelete(t.id, t.registration_no)}><i className="bi bi-trash me-2"></i>মুছুন</button></li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        {totalPages > 1 && (
          <div className="b-pagination">
            <span className="page-info">মোট: {formatNumber(total)} জন প্রশিক্ষণার্থী</span>
            <div className="page-nav">
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>পূর্ববর্তী</button>
              <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>পরবর্তী</button>
            </div>
          </div>
        )}
      </div>

      {showBulkDelete && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title"><i className="bi bi-exclamation-triangle me-2"></i>নিশ্চিতকরণ</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowBulkDelete(false)} />
              </div>
              <div className="modal-body">
                <p className="mb-0">আপনি কি {formatNumber(selectedIds.size)} টি প্রশিক্ষণার্থীকে মুছে ফেলতে চান?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowBulkDelete(false)}>বাতিল</button>
                <button className="btn btn-danger" onClick={handleBulkDelete} disabled={bulkDeleting}>
                  {bulkDeleting ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-trash me-1"></i>}
                  মুছুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-upload me-2"></i>প্রশিক্ষণার্থী বাল্ক ইম্পোর্ট</h5>
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
                      try { const res = await hoService.downloadTraineeTemplate(); const url = window.URL.createObjectURL(new Blob([res.data])); const a = document.createElement('a'); a.href = url; a.download = 'trainee_import_template.xlsx'; a.click(); a.remove(); window.URL.revokeObjectURL(url); } catch { toast.error('টেমপ্লেট ডাউনলোড ব্যর্থ'); }
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
    </div>
  );
}
