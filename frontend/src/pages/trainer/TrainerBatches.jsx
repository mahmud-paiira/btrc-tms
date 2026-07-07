import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import batchService from '../../services/batchService';
import { formatDate } from '../../utils/dateFormatter';
import { convertToBanglaDigits, formatNumber } from '../../utils/numberFormatter';

const STATUS_LABELS = {
  scheduled: 'নির্ধারিত', running: 'চলমান', completed: 'সমাপ্ত', cancelled: 'বাতিল',
};
const STATUS_BG = {
  scheduled: 'warning', running: 'success', completed: 'secondary', cancelled: 'danger',
};

export default function TrainerBatches() {
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
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h4 className="fw-bold mb-0"><i className="bi bi-layers me-2"></i>আমার ব্যাচ</h4>
        <span className="text-secondary" style={{ fontSize: 13 }}>
          মোট: {formatNumber(batches.length)} টি ব্যাচ
        </span>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border spinner-border-sm me-2" />লোড হচ্ছে...</div>
      ) : batches.length === 0 ? (
        <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
          <div className="card-body text-center py-5 text-secondary">
            <i className="bi bi-inbox fs-1 d-block mb-2"></i>
            আপনাকে কোনো ব্যাচে নিয়োগ দেওয়া হয়নি
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {batches.map(b => (
            <div key={b.id} className="col-md-6 col-lg-4">
              <div className="card shadow-sm h-100" style={{ borderRadius: 12, border: 'none' }}>
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="fw-bold mb-0" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {b.batch_name_bn || b.batch_name_en || `ব্যাচ #${convertToBanglaDigits(b.batch_no)}`}
                    </h6>
                    <span className={`badge bg-${STATUS_BG[b.status] || 'secondary'} ms-2 flex-shrink-0`}>
                      {STATUS_LABELS[b.status] || b.status}
                    </span>
                  </div>

                  <table className="table table-sm table-borderless mb-2" style={{ fontSize: 12 }}>
                    <tbody>
                      <tr><td className="text-secondary" style={{ width: 80 }}>কোর্স</td><td className="fw-semibold">{b.course_name || '-'}</td></tr>
                      <tr><td className="text-secondary">কেন্দ্র</td><td className="fw-semibold">{b.center_name || '-'}</td></tr>
                      <tr><td className="text-secondary">শুরুর তারিখ</td><td>{b.start_date ? formatDate(b.start_date) : '-'}</td></tr>
                      <tr><td className="text-secondary">শেষ তারিখ</td><td>{b.end_date ? formatDate(b.end_date) : '-'}</td></tr>
                      <tr><td className="text-secondary">আসন</td><td>{formatNumber(b.filled_seats || 0)}/{formatNumber(b.total_seats || 0)}</td></tr>
                    </tbody>
                  </table>

                  <div className="mt-auto d-flex gap-2 flex-wrap">
                    <Link to={`/center-admin/batches/${b.id}`} className="btn btn-sm btn-outline-primary flex-fill">
                      <i className="bi bi-eye me-1"></i>বিবরণ
                    </Link>
                    <Link to={`/center-admin/attendance/batch/${b.id}`} className="btn btn-sm btn-outline-success flex-fill">
                      <i className="bi bi-calendar-check me-1"></i>উপস্থিতি
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
