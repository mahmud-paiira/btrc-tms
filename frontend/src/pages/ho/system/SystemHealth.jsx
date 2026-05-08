import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';

export default function SystemHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hoService.getSystemHealth();
      setHealth(res.data);
    } catch { toast.error('হেলথ চেক ব্যর্থ'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  const handleBackup = async () => {
    try {
      const res = await hoService.triggerBackup();
      toast.success(`ব্যাকআপ সম্পন্ন (${(res.data.size_bytes / 1024).toFixed(1)} KB)`);
      fetchHealth();
    } catch { toast.error('ব্যাকআপ ব্যর্থ'); }
  };

  const handleClearCache = async () => {
    try {
      await hoService.clearCache();
      toast.success('ক্যাশ ক্লিয়ার করা হয়েছে');
    } catch { toast.error('ক্যাশ ক্লিয়ার ব্যর্থ'); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border" /></div>;
  if (!health) return <p className="text-secondary text-center">হেলথ ডাটা লোড ব্যর্থ</p>;

  const cards = [
    { label: 'ডেটাবেস', icon: 'bi-database', status: health.database?.status, detail: health.database ? `${health.database.user_count} users · ${health.database.response_time_ms}ms` : '-' },
    { label: 'ক্যাশ', icon: 'bi-speedometer2', status: health.cache?.status, detail: health.cache?.backend || '-' },
    { label: 'সেলেরি', icon: 'bi-arrow-repeat', status: health.celery?.status, detail: health.celery?.workers?.join(', ') || health.celery?.broker || '-' },
    { label: 'স্টোরেজ', icon: 'bi-hdd', status: health.storage?.status, detail: health.storage ? `${health.storage.used_gb}GB / ${health.storage.total_gb}GB (${health.storage.used_percent}%)` : '-' },
    { label: 'API', icon: 'bi-globe', status: health.api?.status, detail: 'প্রতিক্রিয়াশীল' },
    { label: 'ব্যাকআপ', icon: 'bi-cloud-arrow-up', status: health.backup?.is_active ? 'active' : 'inactive', detail: health.backup?.last_backup ? new Date(health.backup.last_backup).toLocaleString('bn-BD') : 'কখনো হয়নি' },
  ];

  const overall = health.status === 'ok' ? 'সব ঠিক আছে' : 'কিছু সমস্যা আছে';
  const overallColor = health.status === 'ok' ? 'success' : 'warning';

  return (
    <div>
      <h5 className="fw-bold mb-3"><i className="bi bi-heart-pulse me-2"></i>সিস্টেম হেলথ</h5>

      <div className={`alert alert-${overallColor} d-flex align-items-center gap-2`}>
        <i className={`bi ${health.status === 'ok' ? 'bi-check-circle' : 'bi-exclamation-triangle'} fs-5`}></i>
        {overall}
      </div>

      <div className="row g-3 mb-3">
        {cards.map(card => (
          <div key={card.label} className="col-md-4">
            <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
              <div className="card-body">
                <div className="d-flex align-items-center gap-3">
                  <div className={`rounded-circle d-flex align-items-center justify-content-center ${card.status === 'connected' || card.status === 'ok' || card.status === 'running' || card.status === 'active' ? 'bg-success bg-opacity-10' : 'bg-warning bg-opacity-10'}`} style={{ width: 40, height: 40 }}>
                    <i className={`bi ${card.icon} ${card.status === 'connected' || card.status === 'ok' || card.status === 'running' || card.status === 'active' ? 'text-success' : 'text-warning'}`}></i>
                  </div>
                  <div>
                    <div className="fw-semibold" style={{ fontSize: 13 }}>{card.label}</div>
                    <div className="d-flex align-items-center gap-1">
                      <span className={`badge ${card.status === 'connected' || card.status === 'ok' || card.status === 'running' || card.status === 'active' ? 'bg-success' : 'bg-warning'}`} style={{ fontSize: 10 }}>
                        {card.status || 'unknown'}
                      </span>
                      <small className="text-secondary" style={{ fontSize: 11 }}>{card.detail}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="d-flex gap-2 mb-3">
        <button className="btn btn-primary btn-sm" onClick={handleBackup}>
          <i className="bi bi-cloud-arrow-up me-1"></i>এখনই ব্যাকআপ নিন
        </button>
        <button className="btn btn-outline-secondary btn-sm" onClick={handleClearCache}>
          <i className="bi bi-trash me-1"></i>ক্যাশ ক্লিয়ার
        </button>
        <button className="btn btn-outline-info btn-sm" onClick={fetchHealth}>
          <i className="bi bi-arrow-clockwise me-1"></i>রিফ্রেশ
        </button>
      </div>
    </div>
  );
}
