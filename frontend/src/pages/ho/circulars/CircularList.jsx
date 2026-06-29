import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../../services/api';
import hoService from '../../../services/hoService';
import CircularForm from './CircularForm';

export default function CircularList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [centerFilter, setCenterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [centers, setCenters] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showImport, setShowImport] = useState(false);
  const fileRef = React.useRef(null);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search: search || undefined, page, page_size: pageSize };
      if (centerFilter) params.eligible_centers = centerFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await hoService.listCirculars(params);
      const data = res.data;
      setItems(data.results || data);
      setTotalCount(data.count ?? data.length ?? 0);
    } catch { toast.error('সার্কুলার তালিকা লোড করতে ব্যর্থ');
    } finally { setLoading(false); }
  }, [search, centerFilter, statusFilter, page]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [search, centerFilter, statusFilter]);

  useEffect(() => {
    hoService.listCenters({ status: 'active' }).then(r => {
      setCenters(r.data.results || r.data || []);
    }).catch(() => {});
  }, []);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(items.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => {
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
      const res = await api.get('/ho/circulars/export_list/', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = `circulars.${fmt}`;
      a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch { toast.error('এক্সপোর্ট ব্যর্থ'); }
  };

  const handlePrint = () => {
    const ids = selectedIds.size > 0 ? [...selectedIds] : items.map(c => c.id);
    const token = localStorage.getItem('access_token');
    ids.forEach(id => {
      window.open(`/api/ho/circulars/${id}/print_circular/?token=${token}`, '_blank');
    });
  };

  const handleImportSubmit = async () => {
    if (!importFile) { toast.warning('ফাইল নির্বাচন করুন'); return; }
    setImportLoading(true);
    setImportResults(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await api.post('/ho/circulars/import_list/', formData);
      setImportResults(res.data);
      if (res.data.updated > 0) { toast.success(`${res.data.updated} টি আপডেট`); fetchItems(); }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'ইম্পোর্ট ব্যর্থ';
      toast.error(msg);
    } finally { setImportLoading(false); }
  };

  const handlePublish = async (id) => {
    try {
      await hoService.publishCircular(id);
      toast.success('সার্কুলার প্রকাশিত হয়েছে');
      fetchItems();
    } catch (e) {
      toast.error(e.response?.data?.error || 'প্রকাশ করতে ব্যর্থ');
    }
  };

  const handleClose = async (id) => {
    try {
      await hoService.closeCircular(id);
      toast.success('সার্কুলার বন্ধ করা হয়েছে');
      fetchItems();
    } catch (e) {
      toast.error(e.response?.data?.error || 'বন্ধ করতে ব্যর্থ');
    }
  };

  const handleUnpublish = async (id) => {
    if (!window.confirm('সার্কুলারটি কি খসড়া অবস্থায় ফেরত নিতে চান?')) return;
    try {
      await hoService.unpublishCircular(id);
      toast.success('সার্কুলার খসড়ায় ফেরত নেওয়া হয়েছে');
      fetchItems();
    } catch (e) {
      toast.error(e.response?.data?.error || 'খসড়ায় ফেরত নিতে ব্যর্থ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('সার্কুলারটি মুছে ফেলবেন? এটি অপরিবর্তনীয়।')) return;
    try {
      await hoService.deleteCircular(id);
      toast.success('সার্কুলার মুছে ফেলা হয়েছে');
      fetchItems();
    } catch { toast.error('মুছতে ব্যর্থ'); }
  };

  const openEdit = (item) => {
    setEditing(item);
    setShowForm(true);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h4 className="fw-bold mb-0"><i className="bi bi-megaphone me-2"></i>সার্কুলার ব্যবস্থাপনা</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-info btn-sm" onClick={() => { setImportFile(null); setImportResults(null); setShowImport(true); }}>
            <i className="bi bi-upload me-1"></i>ইম্পোর্ট
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <i className="bi bi-plus-lg me-1"></i>নতুন সার্কুলার
          </button>
        </div>
      </div>

      <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-4">
              <input className="form-control form-control-sm" placeholder="শিরোনাম অনুসারে সার্চ..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={centerFilter} onChange={e => setCenterFilter(e.target.value)}>
                <option value="">সব কেন্দ্র</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name_bn}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <select className="form-select form-select-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">সব অবস্থা</option>
                <option value="draft">খসড়া</option>
                <option value="published">প্রকাশিত</option>
                <option value="closed">বন্ধ</option>
                <option value="completed">সমাপ্ত</option>
              </select>
            </div>
            <div className="col text-md-end">
              <span className="text-secondary" style={{ fontSize: 13 }}>মোট: {totalCount}টি সার্কুলার</span>
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

      <div className="card shadow-sm table-card" style={{ borderRadius: 12, border: 'none' }}>
        <div className="table-responsive">
          <table className="b-table w-100">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" className="form-check-input" onChange={handleSelectAll}
                    checked={items.length > 0 && selectedIds.size === items.length} />
                </th>
                <th>শিরোনাম</th>
                <th className="d-none d-lg-table-cell">কেন্দ্র</th>
                <th className="text-center">আসন</th>
                <th className="d-none d-md-table-cell">আবেদনের তারিখ</th>
                <th className="d-none d-xl-table-cell">প্রশিক্ষণ শুরুর তারিখ</th>
                <th>অবস্থা</th>
                <th className="text-center" style={{ width: 50 }}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-4"><div className="spinner-border spinner-border-sm me-2" />লোড হচ্ছে...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-secondary py-4">কোনো সার্কুলার পাওয়া যায়নি</td></tr>
              ) : (
                items.map(c => (
                  <tr key={c.id}>
                    <td><input type="checkbox" className="form-check-input" checked={selectedIds.has(c.id)} onChange={() => handleSelectOne(c.id)} /></td>
                    <td className="fw-semibold">{c.title_bn}</td>
                    <td className="d-none d-lg-table-cell">
                      {c.all_centers ? 'সব কেন্দ্র' : (c.eligible_centers || []).map(ec => ec.code).join(', ')}
                    </td>
                    <td className="text-center">
                      <span className="fw-bold">{c.remaining_seats}</span><small className="text-muted">/{c.total_seats}</small>
                    </td>
                    <td className="d-none d-md-table-cell">
                      {c.application_start_date} → {c.application_end_date}
                    </td>
                    <td className="d-none d-xl-table-cell">
                      {c.training_start_date || '-'}
                    </td>
                    <td>
                      <span className={`status-dot dot-${c.status}`}></span>
                      <span style={{fontSize:13,color:'#334155'}}>{c.status_display || c.status}</span>
                    </td>
                    <td className="act-col">
                      <div className="dropdown act-dropdown">
                        <button className="dropdown-toggle" data-bs-toggle="dropdown" type="button" data-bs-strategy="fixed">
                          <i className="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                          <li><button className="dropdown-item text-primary" onClick={() => { const t = localStorage.getItem('access_token'); window.open(`/api/ho/circulars/${c.id}/print_circular/?token=${t}`, '_blank'); }}><i className="bi bi-filetype-pdf me-2"></i>পিডিএফ প্রিন্ট</button></li>
                          <li><button className="dropdown-item text-primary" onClick={() => navigate(`/ho/circulars/${c.id}`)}><i className="bi bi-eye me-2"></i>বিস্তারিত</button></li>
                          {c.status === 'draft' && (
                            <>
                              <li><hr className="dropdown-divider my-1" /></li>
                              <li><button className="dropdown-item text-primary" onClick={() => openEdit(c)}><i className="bi bi-pencil me-2"></i>সম্পাদনা</button></li>
                              <li><button className="dropdown-item text-success" onClick={() => handlePublish(c.id)}><i className="bi bi-send me-2"></i>প্রকাশ</button></li>
                              <li><button className="dropdown-item text-danger" onClick={() => handleDelete(c.id)}><i className="bi bi-trash me-2"></i>মুছুন</button></li>
                            </>
                          )}
                          {c.status === 'published' && (
                            <>
                              <li><hr className="dropdown-divider my-1" /></li>
                              <li><button className="dropdown-item text-warning" onClick={() => handleClose(c.id)}><i className="bi bi-stop me-2"></i>বন্ধ করুন</button></li>
                              <li><button className="dropdown-item text-secondary" onClick={() => handleUnpublish(c.id)}><i className="bi bi-arrow-return-left me-2"></i>খসড়ায় ফেরত</button></li>
                            </>
                          )}
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
            <span className="page-info">দেখানো হচ্ছে {Math.min((page-1)*pageSize+1, totalCount)}-{Math.min(page*pageSize, totalCount)} এর {totalCount}</span>
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

      {showForm && (
        <CircularForm
          editData={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onDone={() => { setShowForm(false); setEditing(null); fetchItems(); }}
        />
      )}

      {showImport && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-upload me-2"></i>সার্কুলার বাল্ক ইম্পোর্ট</h5>
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
                      try { const res = await api.get('/ho/circulars/download_template/', { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([res.data])); const a = document.createElement('a'); a.href = url; a.download = 'circular_import_template.xlsx'; a.click(); a.remove(); window.URL.revokeObjectURL(url); } catch { toast.error('টেমপ্লেট ডাউনলোড ব্যর্থ'); }
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
