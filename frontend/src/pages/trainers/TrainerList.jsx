import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

const STATUS_BG = { pending: 'warning', active: 'success', suspended: 'danger', inactive: 'secondary' };
const APPROVAL_BG = { pending: 'warning', approved: 'success', rejected: 'danger' };

export default function TrainerList() {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  const fetchTrainers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/trainers/', { params });
      setTrainers(res.data.results || res.data || []);
      setTotal(res.data.count || (res.data.results || []).length);
    } catch {
      toast.error('প্রশিক্ষক তালিকা লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { fetchTrainers(); }, [fetchTrainers]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h4 className="mb-3 fw-bold"><i className="bi bi-person-badge me-2"></i>প্রশিক্ষক তালিকা</h4>

      <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-5">
              <input className="form-control form-control-sm" placeholder="প্রশিক্ষক নং, নাম, এনআইডি, ফোন..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
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

      <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
            <thead className="table-light">
              <tr>
                <th>প্রশিক্ষক নং</th>
                <th>ইমেইল</th>
                <th>ফোন</th>
                <th>এনআইডি</th>
                <th>দক্ষতা</th>
                <th>অভিজ্ঞতা</th>
                <th>অবস্থা</th>
                <th>অনুমোদন</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-4"><div className="spinner-border spinner-border-sm me-2" />লোড হচ্ছে...</td></tr>
              ) : trainers.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-secondary py-4">কোনো প্রশিক্ষক পাওয়া যায়নি</td></tr>
              ) : (
                trainers.map(t => (
                  <tr key={t.id}>
                    <td className="fw-semibold">{t.trainer_no || '-'}</td>
                    <td>{t.user_email || '-'}</td>
                    <td>{t.user_phone || '-'}</td>
                    <td>{t.nid || '-'}</td>
                    <td>{t.expertise_area || '-'}</td>
                    <td>{t.years_of_experience ? `${t.years_of_experience} বছর` : '-'}</td>
                    <td><span className={`badge bg-${STATUS_BG[t.status] || 'secondary'}`}>{t.status_display || t.status}</span></td>
                    <td><span className={`badge bg-${APPROVAL_BG[t.approval_status] || 'secondary'}`}>{t.approval_display || t.approval_status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="card-footer bg-white d-flex justify-content-between align-items-center py-2">
            <small className="text-secondary">দেখানো হচ্ছে {Math.min((page-1)*pageSize+1, total)}-{Math.min(page*pageSize, total)} এর {total}</small>
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
    </div>
  );
}
