import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { formatDate } from '../../utils/dateFormatter';

const STATUS_BG = { active: 'success', inactive: 'secondary', draft: 'warning' };
const TYPE_BG = { vocational: 'primary', technical: 'info', short_course: 'success' };

export default function CourseList() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef(null);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const navigate = useNavigate();

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/courses/', { params });
      setCourses(res.data.results || res.data || []);
      setTotal(res.data.count || (res.data.results || []).length);
    } catch {
      toast.error('কোর্স তালিকা লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const totalPages = Math.ceil(total / pageSize);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}"-কে মুছে ফেলবেন?`)) return;
    try {
      await api.delete(`/courses/${id}/`);
      toast.success('মুছে ফেলা হয়েছে');
      fetchCourses();
    } catch {
      toast.error('মুছতে ব্যর্থ');
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const res = await api.post('/courses/bulk_delete/', { ids: [...selectedIds] });
      if (res.data.success !== false) {
        toast.success('নির্বাচিত কোর্স মুছে ফেলা হয়েছে');
      } else {
        toast.error(res.data.error || 'মুছতে ব্যর্থ');
      }
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      fetchCourses();
    } catch {
      toast.error('মুছতে ব্যর্থ');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(courses.map((c) => c.id)));
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
      if (selectedIds.size > 0) {
        params.ids = [...selectedIds].join(',');
      } else if (search) {
        params.search = search;
      }
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/courses/export-list/', { params, responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `courses_${new Date().toISOString().slice(0, 10)}.${fmt}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('এক্সপোর্ট সম্পন্ন');
    } catch {
      toast.error('এক্সপোর্ট ব্যর্থ');
    }
  };

  const handlePrint = () => {
    const items = selectedIds.size > 0
      ? courses.filter((c) => selectedIds.has(c.id))
      : courses;
    const w = window.open('', '_blank');
    if (!w) { toast.error('পপ-আপ ব্লকার অক্ষম করুন'); return; }
    w.document.write(`
      <html><head><title>কোর্স তালিকা</title>
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
        <h1>কোর্স তালিকা</h1>
        <p>প্রশিক্ষণ ব্যবস্থাপনা সিস্টেম</p>
      </div>
      <div class="report-info">
        <span>মোট: ${items.length} টি</span>
        <span>প্রিন্টের তারিখ: ${formatDate(new Date())}</span>
      </div>
      <table>
        <tr><th>ক্রমিক</th><th>কোড</th><th>নাম (বাংলা)</th><th>নাম (ইংরেজি)</th><th>ধরণ</th><th>মেয়াদ</th><th>ফি</th></tr>
        ${items.map((c, i) => {
          return `<tr>
            <td style="text-align:center;width:40px;">${i + 1}</td>
            <td><strong>${c.code || '—'}</strong></td>
            <td>${c.name_bn || '—'}</td>
            <td>${c.name_en || '—'}</td>
            <td>${c.course_type_display || c.course_type || '—'}</td>
            <td style="text-align:center;">${c.duration_months ? c.duration_months + ' মাস' : '—'}</td>
            <td style="text-align:right;">${c.fee ? '৳' + c.fee.toLocaleString('bn-BD') : '—'}</td>
          </tr>`;
        }).join('')}
      </table>
      <div class="footer">কোর্স তালিকা - ${formatDate(new Date())}</div>
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
      const res = await api.post('/courses/import_list/', formData);
      setImportResults(res.data);
      if (res.data.updated > 0) {
        toast.success(`${res.data.updated} টি আপডেট`);
        fetchCourses();
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'ইম্পোর্ট ব্যর্থ';
      toast.error(msg);
    } finally { setImportLoading(false); }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h4 className="fw-bold mb-0"><i className="bi bi-book me-2"></i>কোর্সসমূহ</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-info btn-sm" onClick={() => { setImportFile(null); setImportResults(null); setShowImport(true); }}>
            <i className="bi bi-upload me-1"></i>ইম্পোর্ট
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => toast.info('কোর্স তৈরির ফর্ম শীঘ্রই আসছে')}>
            <i className="bi bi-plus-lg me-1"></i>নতুন কোর্স
          </button>
        </div>
      </div>

      <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-5">
              <input className="form-control form-control-sm" placeholder="কোর্স কোড, নাম..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}>
                <option value="">সকল অবস্থা</option>
                <option value="active">সক্রিয়</option>
                <option value="inactive">নিষ্ক্রিয়</option>
                <option value="draft">খসড়া</option>
              </select>
            </div>
            <div className="col-md-4 text-md-end">
              <span className="text-secondary" style={{ fontSize: 13 }}>মোট: {total}টি কোর্স</span>
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
            <button className="btn btn-sm btn-secondary" onClick={handlePrint}>
              <i className="bi bi-printer me-1"></i>প্রিন্ট
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => setShowBulkDelete(true)}>
              <i className="bi bi-trash"></i> নির্বাচিত মুছুন
            </button>
            <button className="btn btn-sm btn-outline-danger" onClick={() => setSelectedIds(new Set())}>
              নির্বাচন বাতিল
            </button>
          </div>
        </div>
      )}

      <div className="card shadow-sm table-card" style={{ borderRadius: 12, border: 'none' }}>
        <div className="table-responsive">
          <table className="b-table w-100">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" className="form-check-input" onChange={handleSelectAll}
                    checked={courses.length > 0 && selectedIds.size === courses.length} />
                </th>
                <th>কোড</th>
                <th>নাম (বাংলা)</th>
                <th className="d-none d-xl-table-cell">নাম (ইংরেজি)</th>
                <th>ধরণ</th>
                <th className="d-none d-md-table-cell">মেয়াদ</th>
                <th className="d-none d-md-table-cell">ফি</th>
                <th>অবস্থা</th>
                <th className="text-center" style={{ width: 50 }}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-4"><div className="spinner-border spinner-border-sm me-2" />লোড হচ্ছে...</td></tr>
              ) : courses.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-secondary py-4">কোনো কোর্স পাওয়া যায়নি</td></tr>
              ) : (
                courses.map(c => (
                  <tr key={c.id}>
                    <td><input type="checkbox" className="form-check-input" checked={selectedIds.has(c.id)} onChange={() => handleSelectOne(c.id)} /></td>
                    <td className="fw-semibold">{c.code || '-'}</td>
                    <td>{c.name_bn}</td>
                    <td className="d-none d-xl-table-cell">{c.name_en}</td>
                    <td><span className={`badge bg-${TYPE_BG[c.course_type] || 'secondary'}`}>{c.course_type_display || c.course_type}</span></td>
                    <td className="d-none d-md-table-cell">{c.duration_months ? `${c.duration_months} মাস` : '-'}</td>
                    <td className="d-none d-md-table-cell">{c.fee ? `৳${c.fee.toLocaleString('bn-BD')}` : '-'}</td>
                    <td><span className={`status-dot dot-${c.status}`}></span> <span style={{fontSize:13,color:'#334155'}}>{c.status_display || c.status}</span></td>
                    <td className="act-col">
                      <div className="dropdown act-dropdown">
                        <button className="dropdown-toggle" data-bs-toggle="dropdown" type="button" data-bs-strategy="fixed">
                          <i className="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                          <li><button className="dropdown-item" onClick={() => navigate(`/courses/${c.id}/edit`)}><i className="bi bi-pencil me-2"></i>সম্পাদনা</button></li>
                          <li><hr className="dropdown-divider my-1" /></li>
                          <li><button className="dropdown-item text-danger" onClick={() => handleDelete(c.id, c.code)}><i className="bi bi-trash me-2"></i>মুছুন</button></li>
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
          <div className="b-pagination">
            <span className="page-info">দেখানো হচ্ছে {Math.min((page-1)*pageSize+1, total)}-{Math.min(page*pageSize, total)} এর {total}</span>
            <div className="d-flex gap-1">
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <i className="bi bi-chevron-left"></i>
              </button>
              <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {showBulkDelete && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title"><i className="bi bi-exclamation-triangle me-2"></i>নিশ্চিত করুন</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowBulkDelete(false)} />
              </div>
              <div className="modal-body">
                <p className="mb-0">আপনি কি {selectedIds.size} টি কোর্স মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBulkDelete(false)} disabled={bulkDeleting}>বাতিল</button>
                <button type="button" className="btn btn-danger" onClick={handleBulkDelete} disabled={bulkDeleting}>
                  {bulkDeleting ? <><span className="spinner-border spinner-border-sm me-1" />মুছে ফেলা হচ্ছে...</> : <><i className="bi bi-trash me-1"></i>মুছে ফেলুন</>}
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
                <h5 className="modal-title"><i className="bi bi-upload me-2"></i>কোর্স বাল্ক ইম্পোর্ট</h5>
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
                      try { const res = await api.get('/courses/download_template/', { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([res.data])); const a = document.createElement('a'); a.href = url; a.download = 'course_import_template.xlsx'; a.click(); a.remove(); window.URL.revokeObjectURL(url); } catch { toast.error('টেমপ্লেট ডাউনলোড ব্যর্থ'); }
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
