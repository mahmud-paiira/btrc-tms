import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import batchService from '../../services/batchService';
import { useTranslation } from '../../hooks/useTranslation';

const STATUS_BADGE = {
  scheduled: 'secondary',
  running: 'success',
  completed: 'primary',
  cancelled: 'danger',
};

export default function BatchList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const STATUS_MAP = {
    scheduled: t('batch.status.scheduled', 'নির্ধারিত'),
    running: t('batch.status.running', 'চলমান'),
    completed: t('batch.status.completed', 'সমাপ্ত'),
    cancelled: t('batch.status.cancelled', 'বাতিল'),
  };

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await batchService.list(params);
      if (data.results) {
        setBatches(data.results);
        setTotal(data.count);
      } else {
        setBatches(data);
        setTotal(data.length || 0);
      }
    } catch (err) {
      toast.error(t('batch.list.loadFailed', 'ব্যাচ তালিকা লোড করতে ব্যর্থ'));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, t]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const handleStatusChange = async (id, action) => {
    try {
      if (action === 'start') await batchService.start(id);
      else if (action === 'complete') await batchService.complete(id);
      else if (action === 'cancel') await batchService.cancel(id);
      toast.success(t('batch.list.updateSuccess', 'স্ট্যাটাস আপডেট করা হয়েছে'));
      fetchBatches();
    } catch (err) {
      toast.error(err.response?.data?.error || t('batch.list.updateFailed', 'স্ট্যাটাস পরিবর্তন ব্যর্থ'));
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">{t('batch.list.title', 'ব্যাচ তালিকা')}</h4>
        <Link to="/center-admin/batches/create" className="btn btn-primary">
          <i className="bi bi-plus-lg me-1"></i>{t('batch.list.newBatch', 'নতুন ব্যাচ')}
        </Link>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder={t('batch.list.searchPlaceholder', 'অনুসন্ধান (ব্যাচ নং, নাম)...')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">{t('batch.list.allStatus', 'সব স্ট্যাটাস')}</option>
                {Object.entries(STATUS_MAP).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted">{t('batch.list.loading', 'লোড হচ্ছে...')}</p>
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-inbox fs-1"></i>
          <p className="mt-2">{t('batch.list.empty', 'কোন ব্যাচ পাওয়া যায়নি')}</p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>{t('batch.list.colBatchNo', 'ব্যাচ নং')}</th>
                  <th>{t('batch.list.colName', 'নাম')}</th>
                  <th>{t('batch.list.colCourse', 'কোর্স')}</th>
                  <th>{t('batch.list.colStartDate', 'শুরুর তারিখ')}</th>
                  <th>{t('batch.list.colEndDate', 'সমাপ্তির তারিখ')}</th>
                  <th>{t('batch.list.colSeats', 'আসন')}</th>
                  <th>{t('batch.list.colStatus', 'স্ট্যাটাস')}</th>
                  <th className="text-center">{t('batch.list.colActions', 'কার্যক্রম')}</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.batch_no}</strong></td>
                    <td>{b.batch_name_bn || b.batch_name_en}</td>
                    <td>{b.course_name}</td>
                    <td>{b.start_date}</td>
                    <td>{b.end_date}</td>
                    <td>{b.filled_seats}/{b.total_seats}</td>
                    <td>
                      <span className={`badge bg-${STATUS_BADGE[b.status]}`}>
                        {STATUS_MAP[b.status] || b.status}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1 justify-content-center flex-wrap">
                        {b.status === 'scheduled' && (
                          <>
                            <Link to={`/center-admin/batches/${b.id}/edit`} className="btn btn-sm btn-outline-secondary" title={t('batch.list.btnEdit', 'সম্পাদনা')}>
                              <i className="bi bi-pencil"></i>
                            </Link>
                            <button className="btn btn-sm btn-outline-success" onClick={() => handleStatusChange(b.id, 'start')} title={t('batch.list.btnStart', 'শুরু করুন')}>
                              <i className="bi bi-play-fill"></i>
                            </button>
                          </>
                        )}
                        {b.status === 'running' && (
                          <>
                            <Link to={`/center-admin/attendance/batch/${b.id}`} className="btn btn-sm btn-outline-info" title={t('batch.list.btnAttendance', 'উপস্থিতি')}>
                              <i className="bi bi-calendar-check"></i>
                            </Link>
                            <Link to={`/assessor/assessment/batch/${b.id}`} className="btn btn-sm btn-outline-warning" title={t('batch.list.btnAssessment', 'মূল্যায়ন')}>
                              <i className="bi bi-clipboard-data"></i>
                            </Link>
                            <button className="btn btn-sm btn-outline-primary" onClick={() => handleStatusChange(b.id, 'complete')} title={t('batch.list.btnComplete', 'সমাপ্ত করুন')}>
                              <i className="bi bi-check-lg"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleStatusChange(b.id, 'cancel')} title={t('batch.list.btnCancel', 'বাতিল')}>
                              <i className="bi bi-x-lg"></i>
                            </button>
                          </>
                        )}
                        {b.status === 'completed' && (
                          <>
                            <Link to={`/center-admin/certificates/issue?batch=${b.id}`} className="btn btn-sm btn-outline-success" title={t('batch.list.btnCertificate', 'সার্টিফিকেট')}>
                              <i className="bi bi-award"></i>
                            </Link>
                            <Link to={`/center-admin/jobs/add?batch=${b.id}`} className="btn btn-sm btn-outline-primary" title={t('batch.list.btnJob', 'চাকরি স্থাপন')}>
                              <i className="bi bi-briefcase"></i>
                            </Link>
                            <Link to={`/center-admin/jobs/tracking?batch=${b.id}`} className="btn btn-sm btn-outline-info" title={t('batch.list.btnTracking', 'ট্র্যাকিং')}>
                              <i className="bi bi-graph-up"></i>
                            </Link>
                          </>
                        )}
                        {b.status !== 'scheduled' && b.status !== 'completed' && (
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleStatusChange(b.id, 'cancel')} title={t('batch.list.btnCancel', 'বাতিল')}>
                            <i className="bi bi-x-lg"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav>
              <ul className="pagination justify-content-center">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => Math.max(1, p - 1))}>{t('batch.list.prev', 'পূর্ববর্তী')}</button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => {
                  const p = i + 1;
                  if (p === 1 || p === totalPages || Math.abs(p - page) <= 2) {
                    return (
                      <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                      </li>
                    );
                  }
                  if (p === 2 || p === totalPages - 1) {
                    return <li key={p} className="page-item disabled"><span className="page-link">...</span></li>;
                  }
                  return null;
                })}
                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p => Math.min(totalPages, p + 1))}>{t('batch.list.next', 'পরবর্তী')}</button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
