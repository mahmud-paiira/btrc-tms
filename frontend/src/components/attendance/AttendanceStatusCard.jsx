import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { formatPercentage } from '../../utils/numberFormatter';

export default function AttendanceStatusCard({ traineeId, batchId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEligibility = useCallback(async () => {
    if (!traineeId || !batchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: res } = await api.get(
        `/attendance/trainee-eligibility/${traineeId}/${batchId}/`,
      );
      setData(res);
    } catch {
      toast.error('উপস্থিতির তথ্য লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [traineeId, batchId]);

  useEffect(() => { fetchEligibility(); }, [fetchEligibility]);

  if (loading) {
    return (
      <div className="card shadow-sm mb-3">
        <div className="card-body text-center py-3">
          <div className="spinner-border spinner-border-sm text-primary"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const isEligible = data.is_eligible;
  const percentage = data.attendance_percentage;

  return (
    <div className={`card shadow-sm mb-3 border-${isEligible ? 'success' : 'danger'}`}>
      <div className={`card-header bg-${isEligible ? 'success' : 'danger'} text-white d-flex justify-content-between align-items-center`}>
        <h6 className="mb-0">
          <i className={`bi ${isEligible ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
          উপস্থিতির অবস্থা
        </h6>
        <span className="badge bg-light text-dark fs-6">{formatPercentage(percentage, 'bn')}</span>
      </div>
      <div className="card-body">
        <div className="progress mb-3" style={{ height: 28 }}>
          <div
            className={`progress-bar ${isEligible ? 'bg-success' : 'bg-danger'}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          >
            {formatPercentage(percentage, 'bn')}
          </div>
        </div>

        <div className="row text-center g-2 mb-3">
          <div className="col-6">
            <div className="border rounded p-2">
              <div className="fw-bold fs-5">{data.total_sessions || 0}</div>
              <small className="text-muted">মোট সেশন</small>
            </div>
          </div>
          <div className="col-6">
            <div className="border rounded p-2">
              <div className="fw-bold fs-5">{data.attended_sessions || 0}</div>
              <small className="text-muted">উপস্থিত</small>
            </div>
          </div>
        </div>

        {!isEligible && (
          <div className="alert alert-danger mb-0 py-2">
            <i className="bi bi-exclamation-circle me-2"></i>
            <strong>সতর্কতা:</strong> আপনার উপস্থিতির হার {formatPercentage(percentage, 'bn')}।
            পরীক্ষায় অংশ নিতে ৮০% উপস্থিতি প্রয়োজন।
            <br />
            <small className="d-block mt-1">
              দয়া করে নিয়মিত উপস্থিত থাকুন। পরীক্ষায় অংশ নিতে ৮০% উপস্থিতি প্রয়োজন।
            </small>
          </div>
        )}

        {isEligible && percentage < 90 && (
          <div className="alert alert-warning mb-0 py-2">
            <i className="bi bi-info-circle me-2"></i>
            আপনার উপস্থিতির হার {formatPercentage(percentage, 'bn')}। পরীক্ষায় অংশ নিতে ৮০% উপস্থিতি প্রয়োজন।
          </div>
        )}

        {isEligible && percentage >= 90 && (
          <div className="alert alert-success mb-0 py-2">
            <i className="bi bi-check-circle me-2"></i>
            আপনার উপস্থিতির হার চমৎকার! আপনি মূল্যায়নের জন্য যোগ্য।
          </div>
        )}
      </div>
    </div>
  );
}
