import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useNavigate } from 'react-router-dom';

const STATUS_BG = { draft: 'secondary', published: 'success', closed: 'danger', completed: 'info' };

export default function CircularMonitor() {
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    hoService.listCirculars({ status: 'published' }).then(r => {
      setCirculars(r.data.results || r.data || []);
    }).catch(() => toast.error('সার্কুলার তথ্য লোড করতে ব্যর্থ'))
    .finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const closingSoon = circulars.filter(c => {
    const end = new Date(c.application_end_date);
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  });

  if (loading) return <div className="text-center py-3"><div className="spinner-border spinner-border-sm"></div></div>;

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center py-2">
        <span className="fw-semibold" style={{ fontSize: 14 }}><i className="bi bi-megaphone me-1"></i>সক্রিয় সার্কুলার</span>
        <button className="btn btn-sm btn-outline-light" onClick={() => navigate('/ho/circulars')}>
          সব দেখুন
        </button>
      </div>
      <div className="card-body p-2" style={{ maxHeight: 400, overflowY: 'auto' }}>
        {circulars.length === 0 ? (
          <p className="text-muted text-center small py-3">কোনো সক্রিয় সার্কুলার নেই</p>
        ) : (
          circulars.sort((a, b) => new Date(a.application_end_date) - new Date(b.application_end_date)).map(c => {
            const end = new Date(c.application_end_date);
            const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
            const seatsPct = c.total_seats > 0 ? Math.round(((c.total_seats - c.remaining_seats) / c.total_seats) * 100) : 0;

            return (
              <div key={c.id} className={`p-2 mb-1 rounded ${daysLeft <= 3 ? 'bg-danger bg-opacity-10' : daysLeft <= 7 ? 'bg-warning bg-opacity-10' : ''}`}
                style={{ cursor: 'pointer', borderLeft: `3px solid ${daysLeft <= 3 ? '#dc3545' : daysLeft <= 7 ? '#ffc107' : '#198754'}` }}
                onClick={() => navigate('/ho/circulars')}>
                <div className="d-flex justify-content-between align-items-center">
                  <strong style={{ fontSize: 12 }}>{c.title_bn}</strong>
                  <span className={`badge bg-${STATUS_BG[c.status]}`} style={{ fontSize: 10 }}>{c.status_display}</span>
                </div>
                <div className="d-flex justify-content-between text-muted" style={{ fontSize: 11 }}>
                  <span>{c.center_code} - {c.course_code}</span>
                  <span className={daysLeft <= 3 ? 'text-danger fw-bold' : daysLeft <= 7 ? 'text-warning fw-bold' : ''}>
                    {daysLeft > 0 ? `বাকি ${daysLeft} দিন` : 'সময় শেষ'}
                  </span>
                </div>
                <div className="d-flex gap-3 mt-1" style={{ fontSize: 11 }}>
                  <span>আবেদন: {c.total_seats - c.remaining_seats}/{c.total_seats}</span>
                  <span>অবশিষ্ট: {c.remaining_seats}</span>
                </div>
                <div className="progress mt-1" style={{ height: 4 }}>
                  <div className="progress-bar" style={{ width: `${seatsPct}%` }}></div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
