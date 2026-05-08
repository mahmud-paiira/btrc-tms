import React, { useState, useEffect, useCallback } from 'react';
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

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h4 className="mb-3 fw-bold"><i className="bi bi-book me-2"></i>কোর্সসমূহ</h4>

      <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-5">
              <input className="form-control form-control-sm" placeholder="কোর্স কোড, নাম..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
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

      <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
            <thead className="table-light">
              <tr>
                <th>কোড</th>
                <th>নাম (বাংলা)</th>
                <th>নাম (ইংরেজি)</th>
                <th>ধরণ</th>
                <th>মেয়াদ</th>
                <th>ফি</th>
                <th>অবস্থা</th>
                <th>তৈরির তারিখ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-4"><div className="spinner-border spinner-border-sm me-2" />লোড হচ্ছে...</td></tr>
              ) : courses.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-secondary py-4">কোনো কোর্স পাওয়া যায়নি</td></tr>
              ) : (
                courses.map(c => (
                  <tr key={c.id}>
                    <td className="fw-semibold">{c.code || '-'}</td>
                    <td>{c.name_bn}</td>
                    <td>{c.name_en}</td>
                    <td><span className={`badge bg-${TYPE_BG[c.course_type] || 'secondary'}`}>{c.course_type_display || c.course_type}</span></td>
                    <td>{c.duration_months ? `${c.duration_months} মাস` : '-'}</td>
                    <td>{c.fee ? `৳${c.fee.toLocaleString('bn-BD')}` : '-'}</td>
                    <td><span className={`badge bg-${STATUS_BG[c.status] || 'secondary'}`}>{c.status_display || c.status}</span></td>
                    <td>{c.created_at ? formatDate(c.created_at) : '-'}</td>
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
