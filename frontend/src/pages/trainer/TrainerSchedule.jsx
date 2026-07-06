import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import batchService from '../../services/batchService';
import { formatDate } from '../../utils/dateFormatter';
import { convertToBanglaDigits } from '../../utils/numberFormatter';

export default function TrainerSchedule() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    batchService.myBatches({ page_size: 50 })
      .then(res => setBatches(res.data.results || res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
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
                      <h6 className="fw-bold mb-0">{b.batch_name_bn || b.batch_name_en || `ব্যাচ #${convertToBanglaDigits(b.batch_no)}`}</h6>
                      <span className={`badge ${b.status === 'running' ? 'bg-success' : b.status === 'completed' ? 'bg-secondary' : 'bg-warning'} ms-2 flex-shrink-0`}>
                        {b.status === 'running' ? 'চলমান' : b.status === 'completed' ? 'সমাপ্ত' : 'নির্ধারিত'}
                      </span>
                    </div>
                    <table className="table table-sm table-bordered mb-2" style={{ fontSize: 12 }}>
                      <tbody>
                        <tr><td className="fw-semibold" style={{ width: 100 }}>কোর্স</td><td>{b.course_name || '-'}</td></tr>
                        <tr><td className="fw-semibold">কেন্দ্র</td><td>{b.center_name || '-'}</td></tr>
                        <tr><td className="fw-semibold">শুরুর তারিখ</td><td>{b.start_date ? formatDate(b.start_date) : '-'}</td></tr>
                        <tr><td className="fw-semibold">শেষ তারিখ</td><td>{b.end_date ? formatDate(b.end_date) : '-'}</td></tr>
                      </tbody>
                    </table>
                    <Link to={`/center-admin/batches/${b.id}`} className="btn btn-sm btn-outline-primary w-100">
                      <i className="bi bi-eye me-1"></i>বিবরণ
                    </Link>
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
