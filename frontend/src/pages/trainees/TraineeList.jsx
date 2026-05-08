import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { formatDate } from '../../utils/dateFormatter';

const STATUS_BG = { enrolled: 'success', completed: 'primary', withdrawn: 'danger', suspended: 'warning' };

export default function TraineeList() {
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  const fetchTrainees = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/trainees/', { params });
      setTrainees(res.data.results || res.data || []);
      setTotal(res.data.count || (res.data.results || []).length);
    } catch {
      toast.error('প্রশিক্ষণার্থী তালিকা লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => { fetchTrainees(); }, [fetchTrainees]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h4 className="mb-3 fw-bold"><i className="bi bi-people me-2"></i>প্রশিক্ষণার্থী তালিকা</h4>

      <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-5">
              <input className="form-control form-control-sm" placeholder="নাম, ইমেইল, ফোন, রেজি. নং দিয়ে সার্চ..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">সকল অবস্থা</option>
                <option value="enrolled">নথিভুক্ত</option>
                <option value="completed">সমাপ্ত</option>
                <option value="withdrawn">প্রত্যাহার</option>
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
                <th>রেজি. নং</th>
                <th>নাম</th>
                <th>ইমেইল</th>
                <th>ফোন</th>
                <th>কেন্দ্র</th>
                <th>ব্যাচ</th>
                <th>অবস্থা</th>
                <th>নথিভুক্তির তারিখ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-4"><div className="spinner-border spinner-border-sm me-2" />লোড হচ্ছে...</td></tr>
              ) : trainees.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-secondary py-4">কোনো প্রশিক্ষণার্থী পাওয়া যায়নি</td></tr>
              ) : (
                trainees.map(t => (
                  <tr key={t.id}>
                    <td className="fw-semibold">{t.registration_no || '-'}</td>
                    <td>{t.user_name || '-'}</td>
                    <td>{t.user_email || '-'}</td>
                    <td>{t.user_phone || '-'}</td>
                    <td>{t.center_name || '-'}</td>
                    <td>{t.batch_name || '-'}</td>
                    <td>
                      <span className={`badge bg-${STATUS_BG[t.status] || 'secondary'}`}>
                        {t.status === 'enrolled' ? 'নথিভুক্ত' :
                         t.status === 'completed' ? 'সমাপ্ত' :
                         t.status === 'withdrawn' ? 'প্রত্যাহার' :
                         t.status === 'suspended' ? 'স্থগিত' : t.status}
                      </span>
                    </td>
                    <td>{t.enrollment_date ? formatDate(t.enrollment_date) : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="card-footer bg-white d-flex justify-content-between align-items-center py-2">
            <small className="text-secondary">
              দেখানো হচ্ছে {Math.min((page - 1) * pageSize + 1, total)}-{Math.min(page * pageSize, total)} এর {total}
            </small>
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
