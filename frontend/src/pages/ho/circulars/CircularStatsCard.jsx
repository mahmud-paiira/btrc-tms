import React, { useState, useEffect } from 'react';
import hoService from '../../../services/hoService';

export default function CircularStatsCard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hoService.getCircularStats().then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="card shadow-sm">
      <div className="card-body text-center py-3"><div className="spinner-border spinner-border-sm"></div></div>
    </div>
  );
  if (!stats) return null;

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-dark text-white py-2">
        <span className="fw-semibold" style={{ fontSize: 14 }}><i className="bi bi-bar-chart me-1"></i>সার্কুলার পরিসংখ্যান</span>
      </div>
      <div className="card-body p-2">
        <div className="row g-1">
          <div className="col-6">
            <div className="p-2 bg-light rounded text-center">
              <div className="fw-bold text-primary">{stats.total_circulars}</div>
              <small style={{ fontSize: 11 }}>মোট সার্কুলার</small>
            </div>
          </div>
          <div className="col-6">
            <div className="p-2 bg-light rounded text-center">
              <div className="fw-bold text-success">{stats.published}</div>
              <small style={{ fontSize: 11 }}>প্রকাশিত</small>
            </div>
          </div>
          <div className="col-6">
            <div className="p-2 bg-light rounded text-center">
              <div className="fw-bold text-warning">{stats.draft}</div>
              <small style={{ fontSize: 11 }}>খসড়া</small>
            </div>
          </div>
          <div className="col-6">
            <div className="p-2 bg-light rounded text-center">
              <div className="fw-bold text-danger">{stats.closed}</div>
              <small style={{ fontSize: 11 }}>বন্ধ</small>
            </div>
          </div>
        </div>
        <hr className="my-2" />
        <div className="d-flex justify-content-between" style={{ fontSize: 12 }}>
          <span>মোট আবেদন: <strong>{stats.total_applications}</strong></span>
          <span>সক্রিয়: <strong>{stats.active_applications}</strong></span>
          <span>মোট আসন: <strong>{stats.total_seats}</strong></span>
        </div>
      </div>
    </div>
  );
}
