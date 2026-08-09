import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { convertToBanglaDigits } from '../../../utils/numberFormatter';
import { formatDateTime } from '../../../utils/dateFormatter';

const ACTIONS = [
  { value: 'check_nid', label: 'এনআইডি চেক' },
  { value: 'verify_nid', label: 'এনআইডি যাচাই' },
  { value: 'apply', label: 'আবেদন' },
];

const RESULTS = [
  { value: 'success', label: 'সফল' },
  { value: 'failed', label: 'ব্যর্থ' },
];

export default function NidAccessLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', action: '', result: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (filters.search) params.search = filters.search;
      if (filters.action) params.action = filters.action;
      if (filters.result) params.result = filters.result;
      const res = await hoService.listNidAccessLogs(params);
      setLogs(res.data.results || res.data || []);
      setTotal(res.data.count || (res.data.results || []).length);
    } catch {
      toast.error('লগ লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const goToPage = (p) => { if (p >= 1) setPage(p); };
  const totalPages = Math.ceil(total / pageSize);

  const actionLabel = (a) => (ACTIONS.find(x => x.value === a) || {}).label || a;
  const resultBadge = (r) => r === 'success'
    ? <span className="badge bg-success bg-opacity-10 text-success border border-success">{RESULTS[0].label}</span>
    : <span className="badge bg-danger bg-opacity-10 text-danger border border-danger">{RESULTS[1].label}</span>;

  return (
    <div className="px-4 py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0"><i className="bi bi-shield-check me-2 text-primary"></i>এনআইডি অ্যাক্সেস লগ</h4>
      </div>

      <div className="card shadow-sm border-0 mb-4 p-3 bg-white">
        <div className="row g-2">
          <div className="col-md-4">
            <label className="form-label small fw-bold">এনআইডি / নাম / ফোন / আইপি</label>
            <input className="form-control" placeholder="অনুসন্ধান..."
              value={filters.search} onChange={e => { setFilters({ ...filters, search: e.target.value }); setPage(1); }} />
          </div>
          <div className="col-md-2">
            <label className="form-label small fw-bold">অ্যাকশন</label>
            <select className="form-select" value={filters.action}
              onChange={e => { setFilters({ ...filters, action: e.target.value }); setPage(1); }}>
              <option value="">সব</option>
              {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label small fw-bold">ফলাফল</label>
            <select className="form-select" value={filters.result}
              onChange={e => { setFilters({ ...filters, result: e.target.value }); setPage(1); }}>
              <option value="">সব</option>
              {RESULTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 table-card">
        <table className="b-table w-100">
          <thead>
            <tr>
              <th className="ps-4">#</th>
              <th>অ্যাকশন</th>
              <th>এনআইডি</th>
              <th>নাম</th>
              <th>অনুরোধকারী</th>
              <th>আইপি</th>
              <th>ফলাফল</th>
              <th>সময়</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="text-center py-5"><div className="spinner-border text-primary" /></td></tr>
            )}
            {!loading && logs.length === 0 && (
              <tr><td colSpan={8} className="text-center text-secondary py-5">কোন তথ্য নেই</td></tr>
            )}
            {!loading && logs.map((l, i) => (
              <tr key={l.id}>
                <td className="ps-4">{convertToBanglaDigits(l.id)}</td>
                <td><span className="badge bg-primary bg-opacity-10 text-primary border border-primary">{actionLabel(l.action)}</span></td>
                <td>{convertToBanglaDigits(l.target_nid || '-')}</td>
                <td>{l.target_name || '-'}</td>
                <td>
                  <div className="fw-semibold text-heading">{l.requester_name || '-'}</div>
                  <small className="text-muted">{convertToBanglaDigits(l.requester_phone) || ''}</small>
                </td>
                <td><code className="text-danger">{l.ip_address || '-'}</code></td>
                <td>{resultBadge(l.result)}</td>
                <td><small className="text-secondary">{formatDateTime(l.created_at)}</small></td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="card-footer bg-white d-flex justify-content-between align-items-center py-3 ps-4 pe-4 b-pagination">
            <small className="text-secondary page-info">
              দেখানো হচ্ছে {Math.min((page - 1) * pageSize + 1, total)}-{Math.min(page * pageSize, total)} এর {total}
            </small>
            <nav className="page-nav">
              <button className="page-btn" disabled={page <= 1} onClick={() => goToPage(page - 1)}>পূর্ববর্তী</button>
              <button className="page-btn" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>পরবর্তী</button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
