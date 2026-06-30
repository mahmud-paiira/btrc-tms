import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import AssessorFormModal from './AssessorFormModal';

const API_URL = '/api';
const STATUS_MAP = { pending: 'পেন্ডিং', active: 'সক্রিয়', suspended: 'স্থগিত', inactive: 'নিষ্ক্রিয়' };
const APPROVAL_MAP = { pending: 'পেন্ডিং', approved: 'অনুমোদিত', rejected: 'প্রত্যাখ্যাত' };

function imageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export default function AssessorList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef(null);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/assessors/', { params });
      setItems(res.data.results || res.data || []);
      setTotal(res.data.count || (res.data.results || []).length);
    } catch {
      toast.error('মূল্যায়নকারী তালিকা লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const totalPages = Math.ceil(total / pageSize);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}"-কে মুছে ফেলবেন?`)) return;
    try {
      await api.delete(`/assessors/${id}/`);
      toast.success('মুছে ফেলা হয়েছে');
      fetchItems();
    } catch {
      toast.error('মুছতে ব্যর্থ');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(items.map((a) => a.id)));
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
      const res = await api.get('/assessors/export-list/', { params, responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessors_${new Date().toISOString().slice(0, 10)}.${fmt}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('এক্সপোর্ট সম্পন্ন');
    } catch {
      toast.error('এক্সপোর্ট ব্যর্থ');
    }
  };

  const handlePrint = () => {
    const printItems = selectedIds.size > 0
      ? items.filter((a) => selectedIds.has(a.id))
      : items;
    const w = window.open('', '_blank');
    if (!w) { toast.error('পপ-আপ ব্লকার অক্ষম করুন'); return; }
    w.document.write(`
      <html><head><title>মূল্যায়নকারী তালিকা</title>
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
        <h1>মূল্যায়নকারী তালিকা</h1>
        <p>প্রশিক্ষণ ব্যবস্থাপনা সিস্টেম</p>
      </div>
      <div class="report-info">
        <span>মোট: ${printItems.length} জন</span>
        <span>প্রিন্টের তারিখ: ${new Date().toLocaleDateString('bn-BD')}</span>
      </div>
      <table>
        <tr><th>ক্রমিক</th><th>নাম (বাংলা)</th><th>নাম (ইংরেজি)</th><th>ইমেইল</th><th>ফোন</th><th>অভিজ্ঞতা</th></tr>
        ${printItems.map((a, i) => {
          return `<tr>
            <td style="text-align:center;width:40px;">${i + 1}</td>
            <td><strong>${a.user_full_name_bn || '—'}</strong></td>
            <td>${a.user_full_name_en || '—'}</td>
            <td>${a.user_email || '—'}</td>
            <td>${a.user_phone || '—'}</td>
            <td style="text-align:center;">${a.years_of_experience ? a.years_of_experience + ' বছর' : '—'}</td>
          </tr>`;
        }).join('')}
      </table>
      <div class="footer">মূল্যায়নকারী তালিকা - ${new Date().toLocaleDateString('bn-BD')}</div>
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
      const res = await api.post('/assessors/import_list/', formData);
      setImportResults(res.data);
      if (res.data.updated > 0) {
        toast.success(`${res.data.updated} টি আপডেট`);
        fetchItems();
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'ইম্পোর্ট ব্যর্থ';
      toast.error(msg);
    } finally { setImportLoading(false); }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h4 className="fw-bold mb-0"><i className="bi bi-person-check me-2"></i>মূল্যায়নকারী তালিকা</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-info btn-sm" onClick={() => { setImportFile(null); setImportResults(null); setShowImport(true); }}>
            <i className="bi bi-upload me-1"></i>ইম্পোর্ট
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditData(null); setShowForm(true); }}>
            <i className="bi bi-plus-lg me-1"></i>নতুন মূল্যায়নকারী
          </button>
        </div>
      </div>

      <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-5">
              <input className="form-control form-control-sm" placeholder="মূল্যায়নকারী নং, নাম, এনআইডি, ফোন..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}>
                <option value="">সকল অবস্থা</option>
                <option value="pending">অনুমোদন অপেক্ষা</option>
                <option value="active">সক্রিয়</option>
                <option value="suspended">স্থগিত</option>
              </select>
            </div>
            <div className="col-md-4 text-md-end">
              <span className="text-secondary" style={{ fontSize: 13 }}>মোট: {total} জন</span>
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
            <button className="btn btn-sm btn-outline-danger" onClick={() => setSelectedIds(new Set())}>
              নির্বাচন বাতিল
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'visible', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
        <div className="card-body p-0" style={{ overflowX: 'auto', overflowY: 'visible' }}>
        <table className="b-table w-100" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" className="form-check-input" onChange={handleSelectAll}
                    checked={items.length > 0 && selectedIds.size === items.length} />
                </th>
                <th className="d-none d-lg-table-cell" style={{ width: 50 }}>ছবি</th>
                <th style={{ width: 80 }}>মূল্যায়নকারী নং</th>
                <th>নাম (বাংলা)</th>
                <th className="d-none d-xl-table-cell">নাম (ইংরেজি)</th>
                <th className="d-none d-lg-table-cell">ইমেইল</th>
                <th className="d-none d-md-table-cell">ফোন</th>
                <th className="d-none d-xl-table-cell" style={{ width: 70 }}>অভিজ্ঞতা</th>
                <th style={{ width: 100 }}>স্ট্যাটাস</th>
                <th className="text-center" style={{ width: 50 }}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-4"><div className="spinner-border spinner-border-sm me-2" />লোড হচ্ছে...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={10} className="text-center text-secondary py-4">কোনো মূল্যায়নকারী পাওয়া যায়নি</td></tr>
              ) : (
                items.map(a => {
                  const seq = a.assessor_no ? a.assessor_no.split('-').pop() : '-';
                  return (
                    <tr key={a.id}>
                      <td><input type="checkbox" className="form-check-input" checked={selectedIds.has(a.id)} onChange={() => handleSelectOne(a.id)} /></td>
                      <td className="d-none d-lg-table-cell">
                        {a.profile_image ? (
                          <img src={imageUrl(a.profile_image)} alt="ছবি" className="rounded-circle"
                            style={{ width: 36, height: 36, objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <div className="rounded-circle bg-secondary bg-opacity-10 d-flex align-items-center justify-content-center text-secondary"
                            style={{ width: 36, height: 36, fontSize: 14 }}>
                            <i className="bi bi-person"></i>
                          </div>
                        )}
                      </td>
                      <td className="fw-semibold"><span className="badge bg-secondary bg-opacity-10 text-dark">{seq}</span></td>
                      <td className="fw-semibold" style={{ whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 120 }}>{a.user_full_name_bn || '-'}</td>
                      <td className="d-none d-xl-table-cell" style={{ whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 100 }}>{a.user_full_name_en || '-'}</td>
                      <td className="d-none d-lg-table-cell" style={{ whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 120 }}>{a.user_email || '-'}</td>
                      <td className="d-none d-md-table-cell" style={{ whiteSpace: 'nowrap' }}>{a.user_phone || '-'}</td>
                      <td className="d-none d-xl-table-cell" style={{ whiteSpace: 'nowrap' }}>{a.years_of_experience ? `${a.years_of_experience} বছর` : '-'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className={`status-dot dot-${a.status}`}></span>
                        <span style={{ fontSize: 13, color: '#334155' }}>{STATUS_MAP[a.status] || a.status}</span>
                        <br />
                        <span className={`status-dot dot-${a.approval_status}`}></span>
                        <span style={{ fontSize: 13, color: '#334155' }}>{APPROVAL_MAP[a.approval_status] || a.approval_status}</span>
                      </td>
                      <td className="act-col">
                        <div className="dropdown act-dropdown">
                          <button className="dropdown-toggle" data-bs-toggle="dropdown" type="button" data-bs-strategy="fixed">
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end">
                            <li><button className="dropdown-item" onClick={() => navigate(`/center-admin/assessors/${a.id}`)}><i className="bi bi-eye me-2"></i>বিস্তারিত</button></li>
                            <li><button className="dropdown-item" onClick={async () => { try { const r = await api.get(`/assessors/${a.id}/`); setEditData(r.data); setShowForm(true); } catch { toast.error('তথ্য লোড করতে ব্যর্থ'); }}}><i className="bi bi-pencil me-2"></i>সম্পাদনা</button></li>
                            <li><hr className="dropdown-divider my-1" /></li>
                            <li><button className="dropdown-item text-danger" onClick={() => handleDelete(a.id, a.assessor_no)}><i className="bi bi-trash me-2"></i>মুছুন</button></li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center px-3 py-3" style={{ borderTop: '1px solid #f1f5f9' }}>
            <small style={{ color: '#64748b' }}>মোট {total} জন মূল্যায়নকারী</small>
            <div className="d-flex gap-1 align-items-center">
              <button className="btn btn-sm" onClick={() => setPage(page - 1)} disabled={page <= 1}
                style={{ border: '1px solid #e2e8f0', borderRadius: 8, color: page <= 1 ? '#cbd5e1' : '#64748b', background: '#fff' }}>
                <i className="bi bi-chevron-left"></i>
              </button>
              <span style={{ fontSize: 13, color: '#64748b', padding: '0 8px' }}>{page} / {totalPages}</span>
              <button className="btn btn-sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}
                style={{ border: '1px solid #e2e8f0', borderRadius: 8, color: page >= totalPages ? '#cbd5e1' : '#64748b', background: '#fff' }}>
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-upload me-2"></i>মূল্যায়নকারী বাল্ক ইম্পোর্ট</h5>
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
                      try { const res = await api.get('/assessors/download_template/', { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([res.data])); const a = document.createElement('a'); a.href = url; a.download = 'assessor_import_template.xlsx'; a.click(); a.remove(); window.URL.revokeObjectURL(url); } catch { toast.error('টেমপ্লেট ডাউনলোড ব্যর্থ'); }
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

      <AssessorFormModal
        show={showForm}
        editData={editData}
        onClose={() => { setShowForm(false); setEditData(null); }}
        onSaved={fetchItems}
      />
    </div>
  );
}

