import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import hoService from '../../services/hoService';
import TrainerApprovalModal from './TrainerApprovalModal';
import TrainerMapForm from './TrainerMapForm';
import { formatDate } from '../../utils/dateFormatter';
import { formatNumber } from '../../utils/numberFormatter';

const TABS = [
  { key: 'all', label: 'সকল প্রশিক্ষক' },
  { key: 'pending', label: 'অনুমোদন অপেক্ষা' },
  { key: 'active', label: 'সক্রিয়' },
  { key: 'suspended', label: 'স্থগিত' },
];

export default function TrainerList() {
  const navigate = useNavigate();
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showMapForm, setShowMapForm] = useState(false);
  const [centers, setCenters] = useState([]);
  const [centerFilter, setCenterFilter] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef(null);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search: search || undefined, page, page_size: pageSize };
      if (tab === 'pending') params.approval_status = 'pending';
      else if (tab === 'active') params.status = 'active';
      else if (tab === 'suspended') params.status = 'suspended';
      if (centerFilter) params.mapping_center = centerFilter;
      const res = await hoService.listTrainers(params);
      setTrainers(res.data.results || res.data);
      setTotalCount(res.data.count ?? res.data.length ?? 0);
    } catch (e) {
      toast.error('প্রশিক্ষক তালিকা লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [search, tab, centerFilter, page]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [search, tab, centerFilter]);

  useEffect(() => {
    hoService.getTrainerCenters().then(r => setCenters(r.data)).catch(() => {});
  }, []);

  const handleAction = async (id, action) => {
    try {
      if (action === 'suspend') await hoService.suspendTrainer(id);
      else if (action === 'activate') await hoService.activateTrainer(id);
      toast.success('অবস্থা পরিবর্তন করা হয়েছে');
      fetchItems();
    } catch (e) {
      toast.error('ব্যর্থ হয়েছে');
    }
  };

  const handleApproveReject = (trainer) => {
    setSelectedTrainer(trainer);
    setShowApprovalModal(true);
  };

  const onApprovalDone = () => {
    setShowApprovalModal(false);
    setSelectedTrainer(null);
    fetchItems();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`"${name}"-কে মুছে ফেলবেন?`)) return;
    try {
      await hoService.deleteTrainer(id);
      setSelectedIds(new Set());
      toast.success('মুছে ফেলা হয়েছে');
      fetchItems();
    } catch {
      toast.error('মুছতে ব্যর্থ');
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const ids = [...selectedIds];
      const { data } = await hoService.bulkDeleteTrainers(ids);
      if (data.errors?.length) toast.error(data.errors.join('\n'));
      if (data.deleted > 0) toast.success(`${data.deleted} টি মুছে ফেলা হয়েছে`);
      else if (!data.errors?.length) toast.warning('কিছু মুছে ফেলা যায়নি');
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      fetchItems();
    } catch (e) {
      toast.error('মুছতে ব্যর্থ');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(trainers.map((t) => t.id)));
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

  const imageUrl = (path) => {
    if (!path) return null;
    return path.startsWith('http') ? path : `/api${path}`;
  };

  const handleExport = async (fmt = 'xlsx') => {
    try {
      const params = { page_size: 9999, file_format: fmt };
      if (selectedIds.size > 0) params.ids = [...selectedIds].join(',');
      else if (search) params.search = search;
      if (centerFilter) params.mapping_center = centerFilter;
      const res = await api.get('/trainers/export-list/', { params, responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trainers_${new Date().toISOString().slice(0, 10)}.${fmt}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('এক্সপোর্ট সম্পন্ন');
    } catch {
      toast.error('এক্সপোর্ট ব্যর্থ');
    }
  };

  const handlePrint = () => {
    const items = selectedIds.size > 0
      ? trainers.filter((t) => selectedIds.has(t.id))
      : trainers;
    const w = window.open('', '_blank');
    if (!w) { toast.error('পপ-আপ ব্লকার অক্ষম করুন'); return; }
    w.document.write(`
      <html><head><title>প্রশিক্ষক তালিকা</title>
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
        <h1>প্রশিক্ষক তালিকা</h1>
        <p>প্রশিক্ষণ ব্যবস্থাপনা সিস্টেম</p>
      </div>
      <div class="report-info">
        <span>মোট: ${items.length} জন</span>
        <span>প্রিন্টের তারিখ: ${formatDate(new Date())}</span>
      </div>
      <table>
        <tr><th>ক্রমিক</th><th>নাম (বাংলা)</th><th>নাম (ইংরেজি)</th><th>ইমেইল</th><th>ফোন</th><th>অভিজ্ঞতা</th></tr>
        ${items.map((t, i) => {
          return `<tr>
            <td style="text-align:center;width:40px;">${i + 1}</td>
            <td><strong>${t.user_full_name_bn || '—'}</strong></td>
            <td>${t.user_full_name_en || '—'}</td>
            <td>${t.user_email || '—'}</td>
            <td>${t.user_phone || '—'}</td>
            <td style="text-align:center;">${t.years_of_experience ? t.years_of_experience + ' বছর' : '—'}</td>
          </tr>`;
        }).join('')}
      </table>
      <div class="footer">প্রশিক্ষক তালিকা - ${formatDate(new Date())}</div>
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
      const res = await api.post('/trainers/import_list/', formData);
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
        <h4 className="fw-bold mb-0"><i className="bi bi-person-badge me-2"></i>প্রশিক্ষক ব্যবস্থাপনা</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary btn-sm" onClick={() => setShowMapForm(true)}>
            <i className="bi bi-link-45deg me-1"></i>ম্যাপিং
          </button>
          <button className="btn btn-outline-info btn-sm" onClick={() => { setImportFile(null); setImportResults(null); setShowImport(true); }}>
            <i className="bi bi-upload me-1"></i>ইম্পোর্ট
          </button>
        </div>
      </div>

      <ul className="nav nav-pills mb-3 gap-2">
        {TABS.map(t => (
          <li className="nav-item" key={t.key}>
            <button className={`nav-link rounded-pill px-4 ${tab === t.key ? 'active shadow-sm' : 'bg-white text-muted'}`} onClick={() => { setTab(t.key); }}>
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-4">
              <input className="form-control form-control-sm" placeholder="নাম, এনআইডি, ফোনে সার্চ..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={centerFilter} onChange={e => setCenterFilter(e.target.value)}>
                <option value="">সকল কেন্দ্র</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name_bn} ({c.code})</option>)}
              </select>
            </div>
            <div className="col text-md-end">
              <span className="text-secondary" style={{ fontSize: 13 }}>মোট: {trainers.length} জন</span>
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
              <i className="bi bi-trash me-1"></i>নির্বাচিত মুছুন
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
                <th>
                  <input type="checkbox" className="form-check-input" onChange={handleSelectAll}
                    checked={trainers.length > 0 && selectedIds.size === trainers.length} />
                </th>
                <th>ক্রমিক</th>
                <th className="d-none d-lg-table-cell">ছবি</th>
                <th>নাম (বাংলা)</th>
                <th className="d-none d-xl-table-cell">নাম (ইংরেজি)</th>
                <th className="d-none d-lg-table-cell">ইমেইল</th>
                <th className="d-none d-md-table-cell">ফোন</th>
                <th className="d-none d-xl-table-cell">অভিজ্ঞতা</th>
                <th className="d-none d-lg-table-cell">কেন্দ্র</th>
                <th>স্ট্যাটাস</th>
                <th className="text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-4"><div className="spinner-border spinner-border-sm me-2" />লোড হচ্ছে...</td></tr>
              ) : trainers.length === 0 ? (
                <tr><td colSpan={11} className="text-center text-secondary py-4">কোনো প্রশিক্ষক পাওয়া যায়নি</td></tr>
              ) : (
                trainers.map((t, idx) => (
                  <tr key={t.id}>
                    <td><input type="checkbox" className="form-check-input" checked={selectedIds.has(t.id)} onChange={() => handleSelectOne(t.id)} /></td>
                    <td className="text-secondary">{(idx + 1)}</td>
                    <td className="d-none d-lg-table-cell">
                      {t.profile_image ? (
                        <img src={imageUrl(t.profile_image)} alt="ছবি" className="rounded-circle"
                          style={{ width: 36, height: 36, objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="rounded-circle bg-secondary bg-opacity-10 d-flex align-items-center justify-content-center text-secondary"
                          style={{ width: 36, height: 36, fontSize: 14 }}>
                          <i className="bi bi-person"></i>
                        </div>
                      )}
                    </td>
                    <td className="fw-semibold">{t.user_full_name_bn || t.user_email || '-'}</td>
                    <td className="d-none d-xl-table-cell">{t.user_full_name_en || '-'}</td>
                    <td className="d-none d-lg-table-cell">{t.user_email || '-'}</td>
                    <td className="d-none d-md-table-cell">{t.user_phone || '-'}</td>
                    <td className="d-none d-xl-table-cell">{t.years_of_experience ? `${formatNumber(t.years_of_experience)} বছর` : '-'}</td>
                    <td className="d-none d-lg-table-cell">{t.center_names || '-'}</td>
                    <td>
                      <span className={`status-dot dot-${t.status}`}></span>
                      <span style={{fontSize:13,color:'#334155'}}>{t.status_display || t.status}</span>
                      <br />
                      <span className={`status-dot dot-${t.approval_status}`}></span>
                      <span style={{fontSize:13,color:'#334155'}}>{t.approval_display || t.approval_status}</span>
                    </td>
                    <td className="act-col">
                      <div className="dropdown act-dropdown">
                        <button className="dropdown-toggle" data-bs-toggle="dropdown" type="button" data-bs-strategy="fixed">
                          <i className="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                          <li><button className="dropdown-item text-primary" onClick={() => navigate(`/ho/trainers/${t.id}`)}><i className="bi bi-eye me-2"></i>বিস্তারিত</button></li>
                          <li><button className="dropdown-item text-danger" onClick={() => handleDelete(t.id, t.trainer_no)}><i className="bi bi-trash me-2"></i>মুছুন</button></li>
                          {t.approval_status === 'pending' && (
                            <li><button className="dropdown-item text-primary" onClick={() => handleApproveReject(t)}><i className="bi bi-check-lg me-2"></i>অনুমোদন</button></li>
                          )}
                          {t.status === 'active' && (
                            <li><button className="dropdown-item text-warning" onClick={() => handleAction(t.id, 'suspend')}><i className="bi bi-pause me-2"></i>স্থগিত</button></li>
                          )}
                          {t.status === 'suspended' && t.approval_status === 'approved' && (
                            <li><button className="dropdown-item text-success" onClick={() => handleAction(t.id, 'activate')}><i className="bi bi-play me-2"></i>সক্রিয়</button></li>
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
        <div className="b-pagination">
          <span className="page-info">মোট: {totalCount} জন প্রশিক্ষক</span>
          {Math.ceil(totalCount / pageSize) > 1 && (
            <div>
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>পূর্ববর্তী</button>
              <button className="page-btn" disabled={page >= Math.ceil(totalCount / pageSize)} onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}>পরবর্তী</button>
            </div>
          )}
        </div>
      </div>

      {showApprovalModal && selectedTrainer && (
        <TrainerApprovalModal trainer={selectedTrainer} onClose={() => setShowApprovalModal(false)} onDone={onApprovalDone} />
      )}
      {showMapForm && (
        <TrainerMapForm centers={centers} onClose={() => setShowMapForm(false)} onDone={() => { setShowMapForm(false); fetchItems(); }} />
      )}

      {showBulkDelete && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title"><i className="bi bi-exclamation-triangle me-2"></i>নিশ্চিতকরণ</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowBulkDelete(false)} />
              </div>
              <div className="modal-body">
                <p className="mb-0">আপনি কি {selectedIds.size} টি প্রশিক্ষককে মুছে ফেলতে চান?</p>
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
                <h5 className="modal-title"><i className="bi bi-upload me-2"></i>প্রশিক্ষক বাল্ক ইম্পোর্ট</h5>
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
                      try { const res = await api.get('/trainers/download_template/', { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([res.data])); const a = document.createElement('a'); a.href = url; a.download = 'trainer_import_template.xlsx'; a.click(); a.remove(); window.URL.revokeObjectURL(url); } catch { toast.error('টেমপ্লেট ডাউনলোড ব্যর্থ'); }
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
