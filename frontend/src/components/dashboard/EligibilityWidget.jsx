import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { formatNumber, formatPercentage } from '../../utils/numberFormatter';

export default function EligibilityWidget() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchBatches = useCallback(async () => {
    try {
      const { data } = await api.get('/batches/batches/', {
        params: { status: 'running' },
      });
      setBatches(data.results || data || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const fetchEligibility = useCallback(async () => {
    if (!selectedBatch) {
      setEligibility(null);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(
        `/attendance/eligibility/batch/${selectedBatch}/`,
      );
      setEligibility(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'উপস্থিতি ডাটা লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [selectedBatch]);

  useEffect(() => { fetchEligibility(); }, [fetchEligibility]);

  const ineligibleTrainees = eligibility?.trainees?.filter(
    (t) => !t.is_eligible,
  ) || [];

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <h6 className="mb-0">
          <i className="bi bi-check2-circle me-2"></i>মূল্যায়নের যোগ্যতা (৮০% নিয়ম)
        </h6>
      </div>
      <div className="card-body">
        <div className="mb-3">
          <label className="form-label fw-bold">ব্যাচ নির্বাচন করুন</label>
          <select
            className="form-select"
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
          >
            <option value="">-- চলমান ব্যাচ --</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batch_name_bn || b.batch_no} - {b.center?.name_bn || ''}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="text-center py-3">
            <div className="spinner-border spinner-border-sm text-primary"></div>
          </div>
        )}

        {eligibility && !loading && (
          <>
            <div className="row g-3 mb-3">
              <div className="col-6">
                <div className="card text-bg-success text-center py-2">
                  <div className="card-body py-2">
                    <h3 className="mb-0">{formatNumber(eligibility.eligible_count, 'bn')}</h3>
                    <small>যোগ্য</small>
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div className="card text-bg-danger text-center py-2">
                  <div className="card-body py-2">
                    <h3 className="mb-0">{formatNumber(eligibility.ineligible_count, 'bn')}</h3>
                    <small>অযোগ্য</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="progress mb-3" style={{ height: 24 }}>
              <div
                className="progress-bar bg-success"
                style={{
                  width: eligibility.trainees.length > 0
                    ? `${(eligibility.eligible_count / eligibility.trainees.length) * 100}%`
                    : '0%',
                }}
              >
                {eligibility.trainees.length > 0
                  ? formatPercentage(Math.round((eligibility.eligible_count / eligibility.trainees.length) * 100), 'bn')
                  : '0%'}
              </div>
            </div>

            {ineligibleTrainees.length > 0 && (
              <div className="mt-3">
                <h6 className="text-danger">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  ৮০% এর নিচে ({ineligibleTrainees.length} জন)
                </h6>
                <div className="table-responsive" style={{ maxHeight: 200 }}>
                  <table className="table table-sm table-bordered mb-0">
                    <thead className="table-danger">
                      <tr>
                        <th>নাম</th>
                        <th>রেজি নং</th>
                        <th className="text-center">উপস্থিতি</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ineligibleTrainees.map((t) => (
                        <tr key={t.trainee_id}>
                          <td>{t.trainee_name}</td>
                          <td>{t.trainee_reg_no}</td>
                          <td className="text-center">
                            <span className="badge bg-danger">
                              {formatPercentage(t.attendance_percentage, 'bn')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {ineligibleTrainees.length === 0 && (
              <div className="alert alert-success mb-0">
                <i className="bi bi-check-circle me-2"></i>
                সকল প্রশিক্ষণার্থী মূল্যায়নের জন্য যোগ্য।
              </div>
            )}
          </>
        )}

        {!selectedBatch && !loading && (
          <div className="text-center text-muted py-3">
            <i className="bi bi-arrow-up me-1"></i>
            উপরে একটি ব্যাচ নির্বাচন করুন
          </div>
        )}
      </div>
    </div>
  );
}
