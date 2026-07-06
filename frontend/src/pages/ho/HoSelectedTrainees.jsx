import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';
import { useTranslation } from '../../hooks/useTranslation';
import { formatDate } from '../../utils/dateFormatter';
import { convertToBanglaDigits, formatNumber } from '../../utils/numberFormatter';

export default function HoSelectedTrainees() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [centerFilter, setCenterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [centers, setCenters] = useState([]);
  useEffect(() => {
    hoService.listCenters({ page_size: 9999 })
      .then(res => {
        setCenters(res.data.results || res.data || []);
      })
      .catch(() => {});
  }, []);

  const fetchTrainees = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (centerFilter) params.center = centerFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await hoService.listTrainees(params);
      setTrainees(res.data.results || res.data || []);
      setTotal(res.data.count || (res.data.results || []).length);
    } catch {
      toast.error('প্রশিক্ষণার্থী তালিকা লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [search, centerFilter, statusFilter, page]);

  useEffect(() => { fetchTrainees(); }, [fetchTrainees]);
  useEffect(() => { setPage(1); }, [search, centerFilter, statusFilter]);

  const totalPages = Math.ceil(total / pageSize);

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
      const params = { page_size: 9999, file_format: fmt };
      if (selectedIds.size > 0) params.ids = [...selectedIds].join(',');
      else if (search) params.search = search;
      if (centerFilter) params.center = centerFilter;
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

  const handlePrint = () => {
    const items = selectedIds.size > 0
      ? trainees.filter((t) => selectedIds.has(t.id))
      : trainees;
    const w = window.open('', '_blank');
    if (!w) { toast.error('পপ-আপ ব্লকার অক্ষম করুন'); return; }
    w.document.write(`
      <html><head><title>প্রশিক্ষণার্থী তালিকা</title>
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
        <h1>প্রশিক্ষণার্থী তালিকা</h1>
        <p>প্রশিক্ষণ ব্যবস্থাপনা সিস্টেম</p>
      </div>
      <div class="report-info">
        <span>মোট: ${items.length} জন</span>
        <span>প্রিন্টের তারিখ: ${formatDate(new Date())}</span>
      </div>
      <table>
        <tr><th>ক্রমিক</th><th>রেজি. নং</th><th>নাম (বাংলা)</th><th>নাম (ইংরেজি)</th><th>ইমেইল</th><th>ফোন</th><th>কেন্দ্র</th><th>ব্যাচ</th><th>অবস্থা</th><th>নথিভুক্তির তারিখ</th></tr>
        ${items.map((t, i) => {
          return `<tr>
            <td style="text-align:center;width:40px;">${i + 1}</td>
            <td><strong>${convertToBanglaDigits(t.registration_no) || '—'}</strong></td>
            <td>${t.user_name || '—'}</td>
            <td>${t.user_name_en || '—'}</td>
            <td>${t.user_email || '—'}</td>
            <td>${convertToBanglaDigits(t.user_phone) || '—'}</td>
            <td>${t.center_name || '—'}</td>
            <td>${t.batch_name || '—'}</td>
            <td>${t.status_display || t.status || '—'}</td>
            <td>${t.enrollment_date || '—'}</td>
          </tr>`;
        }).join('')}
      </table>
      <div class="footer">প্রশিক্ষণার্থী তালিকা - ${formatDate(new Date())}</div>
      <script>window.print();</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h4 className="fw-bold mb-0"><i className="bi bi-people me-2"></i>সকল প্রশিক্ষণার্থী</h4>
      </div>

      <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-4">
              <input className="form-control form-control-sm" placeholder="নাম, ইমেইল, ফোন, রেজি. নং দিয়ে সার্চ..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={centerFilter}
                onChange={e => setCenterFilter(e.target.value)}>
                <option value="">সকল কেন্দ্র</option>
                {centers.map(c => (
                  <option key={c.id} value={c.id}>{c.name_bn || c.name_en || c.name || c.center_name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <select className="form-select form-select-sm" value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}>
                <option value="">সকল অবস্থা</option>
                <option value="enrolled">নথিভুক্ত</option>
                <option value="completed">সমাপ্ত</option>
                <option value="dropped">বহিষ্কৃত</option>
                <option value="failed">ব্যর্থ</option>
              </select>
            </div>
            <div className="col-md-3 text-md-end">
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

      <div className="card shadow-sm table-card" style={{ borderRadius: 12, border: 'none' }}>
        <div className="table-responsive">
          <table className="b-table w-100">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" className="form-check-input" onChange={handleSelectAll}
                    checked={trainees.length > 0 && selectedIds.size === trainees.length} />
                </th>
                <th>রেজি. নং</th>
                <th>নাম (বাংলা)</th>
                <th className="d-none d-xl-table-cell">নাম (ইংরেজি)</th>
                <th className="d-none d-md-table-cell">ফোন</th>
                <th className="d-none d-lg-table-cell">কেন্দ্র</th>
                <th>ব্যাচ</th>
                <th>অবস্থা</th>
                <th className="d-none d-lg-table-cell">নথিভুক্তির তারিখ</th>
                <th className="text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-4"><div className="spinner-border spinner-border-sm me-2" />লোড হচ্ছে...</td></tr>
              ) : trainees.length === 0 ? (
                <tr><td colSpan={10} className="text-center text-secondary py-4">কোনো প্রশিক্ষণার্থী পাওয়া যায়নি</td></tr>
              ) : (
                trainees.map(t => (
                    <tr key={t.id} className={selectedIds.has(t.id) ? 'table-active' : ''} onClick={() => navigate(`/ho/trainees/${t.id}`)}>
                      <td onClick={e => e.stopPropagation()}><input type="checkbox" className="form-check-input" checked={selectedIds.has(t.id)} onChange={() => handleSelectOne(t.id)} /></td>
                      <td className="fw-semibold">{convertToBanglaDigits(t.registration_no) || '-'}</td>
                      <td>{t.user_name || '-'}</td>
                      <td className="d-none d-xl-table-cell">{t.user_name_en || '-'}</td>
                      <td className="d-none d-md-table-cell">{convertToBanglaDigits(t.user_phone) || '-'}</td>
                      <td className="d-none d-lg-table-cell">{t.center_name || '-'}</td>
                      <td>{t.batch_name || '-'}</td>
                      <td>
                        <span className={`status-dot dot-${t.status}`}></span>
                        <span>{t.status_display || t.status}</span>
                      </td>
                      <td className="d-none d-lg-table-cell">{t.enrollment_date ? formatDate(t.enrollment_date) : '-'}</td>
                      <td className="act-col" onClick={e => e.stopPropagation()}>
                        <div className="dropdown act-dropdown">
                          <button className="dropdown-toggle" data-bs-toggle="dropdown" type="button" data-bs-strategy="fixed">
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end">
                            <li><button className="dropdown-item text-primary" onClick={() => navigate(`/ho/trainees/${t.id}`)}><i className="bi bi-eye me-2"></i>বিস্তারিত</button></li>
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
            <small>দেখানো হচ্ছে {Math.min((page-1)*pageSize+1, total)}-{Math.min(page*pageSize, total)} এর {total}</small>
            <div className="d-flex gap-1 align-items-center">
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <i className="bi bi-chevron-left"></i>
              </button>
              <span className="page-info">{page} / {totalPages}</span>
              <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
