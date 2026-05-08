import React, { useState, useEffect } from 'react';
import { formatDate } from '../../utils/dateFormatter';

export default function TrainerSchedule() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('../../services/hoService').then(({ default: hoService }) => {
      hoService.listBatches({ page_size: 50 }).then(res => {
        setBatches(res.data.results || res.data || []);
      }).catch(() => {}).finally(() => setLoading(false));
    });
  }, []);

  return (
    <div>
      <h4 className="mb-3 fw-bold"><i className="bi bi-calendar-week me-2"></i>সময়সূচি</h4>

      <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4"><div className="spinner-border spinner-border-sm me-2" />লোড হচ্ছে...</div>
          ) : batches.length === 0 ? (
            <p className="text-secondary text-center py-4">কোনো ব্যাচ পাওয়া যায়নি</p>
          ) : (
            <div className="row g-3">
              {batches.map(b => (
                <div key={b.id} className="col-md-6">
                  <div className="border rounded-3 p-3 h-100">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="fw-bold mb-0">{b.name || b.batch_name || `ব্যাচ #${b.id}`}</h6>
                      <span className={`badge ${b.status === 'running' ? 'bg-success' : b.status === 'completed' ? 'bg-secondary' : 'bg-warning'}`}>
                        {b.status === 'running' ? 'চলমান' : b.status === 'completed' ? 'সমাপ্ত' : 'নির্ধারিত'}
                      </span>
                    </div>
                    <table className="table table-sm table-bordered mb-0" style={{ fontSize: 12 }}>
                      <tbody>
                        <tr><td className="fw-semibold" style={{ width: 100 }}>কোর্স</td><td>{b.course_name || '-'}</td></tr>
                        <tr><td className="fw-semibold">কেন্দ্র</td><td>{b.center_name || '-'}</td></tr>
                        <tr><td className="fw-semibold">শুরুর তারিখ</td><td>{b.start_date ? formatDate(b.start_date) : '-'}</td></tr>
                        <tr><td className="fw-semibold">শেষ তারিখ</td><td>{b.end_date ? formatDate(b.end_date) : '-'}</td></tr>
                        <tr><td className="fw-semibold">ঠিকানা</td><td>{b.center_address || b.venue || '-'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
