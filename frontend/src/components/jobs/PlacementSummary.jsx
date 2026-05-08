import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import jobService from '../../services/jobService';
import { formatCurrency, formatNumber } from '../../utils/numberFormatter';

export default function PlacementSummary() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchBatches = useCallback(async () => {
    try {
      const { data } = await jobService.getBatches({ status: 'completed', page_size: 50 });
      setBatches(data.results || data || []);
    } catch {
      toast.error('ব্যাচ তালিকা লোড করতে ব্যর্থ');
    }
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const fetchSummary = useCallback(async () => {
    if (!selectedBatch) {
      setSummary(null);
      return;
    }
    setLoading(true);
    try {
      const { data } = await jobService.getBatchSummary(selectedBatch);
      setSummary(data);
    } catch (err) {
      toast.error('সারাংশ লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [selectedBatch]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const handleExport = async () => {
    if (!selectedBatch) return;
    setExporting(true);
    try {
      const response = await jobService.exportBatchSummary(selectedBatch);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `placement_summary_batch_${selectedBatch}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel ডাউনলোড শুরু হয়েছে');
    } catch {
      toast.error('এক্সপোর্ট করতে ব্যর্থ');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h6 className="mb-0"><i className="bi bi-bar-chart-line me-2"></i>ব্যাচভিত্তিক চাকরি স্থাপন</h6>
          {summary && (
            <button className="btn btn-sm btn-light" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <span className="spinner-border spinner-border-sm"></span>
              ) : (
                <><i className="bi bi-download me-1"></i>Excel</>
              )}
            </button>
          )}
        </div>
        <div className="card-body">
          <div className="mb-3">
            <select className="form-select" value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
              <option value="">-- ব্যাচ নির্বাচন করুন --</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_name_bn || b.batch_no}
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-primary"></div></div>
          )}

          {summary && !loading && (
            <>
              {/* Stats row */}
              <div className="row g-2 mb-3">
                <div className="col-4">
                  <div className="card text-bg-success text-center py-2">
                    <div className="card-body py-1">
                      <h4 className="mb-0">{formatNumber(summary.placed_count, 'bn')}</h4>
                      <small>স্থাপিত</small>
                    </div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="card text-bg-info text-center py-2">
                    <div className="card-body py-1">
                      <h4 className="mb-0">{formatNumber(summary.total_trainees, 'bn')}</h4>
                      <small>মোট</small>
                    </div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="card text-bg-warning text-center py-2">
                    <div className="card-body py-1">
                      <h4 className="mb-0">{formatPercentage(summary.placement_rate, 'bn')}</h4>
                      <small>স্থাপনের হার</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="progress mb-3" style={{ height: 22 }}>
                <div
                  className={`progress-bar ${summary.placement_rate >= 60 ? 'bg-success' : summary.placement_rate >= 40 ? 'bg-warning' : 'bg-danger'}`}
                  style={{ width: `${Math.min(summary.placement_rate, 100)}%` }}
                >
                  {formatPercentage(summary.placement_rate, 'bn')}
                </div>
              </div>

              {/* Placement by type */}
              <div className="mb-3">
                <h6 className="fw-bold mb-2">কর্মসংস্থানের ধরণ</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-bordered mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>ধরণ</th>
                        <th className="text-center">সংখ্যা</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>স্ব-কর্মসংস্থান</td>
                        <td className="text-center">{summary.by_type?.self_employment || 0}</td>
                      </tr>
                      <tr>
                        <td>মজুরি-কর্মসংস্থান</td>
                        <td className="text-center">{summary.by_type?.wages_employment || 0}</td>
                      </tr>
                      <tr>
                        <td>আপ-স্কিল কর্মসংস্থান</td>
                        <td className="text-center">{summary.by_type?.up_skill_employment || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Currently employed & avg salary */}
              <div className="row g-2">
                <div className="col-6">
                  <div className="p-2 bg-light rounded text-center">
                    <h5 className="mb-0 text-success">{summary.currently_employed}</h5>
                    <small className="text-muted">বর্তমানে কর্মরত</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-2 bg-light rounded text-center">
                    <h5 className="mb-0 text-primary">{formatCurrency(summary.avg_salary, 'bn')}</h5>
                    <small className="text-muted">গড় বেতন</small>
                  </div>
                </div>
              </div>
            </>
          )}

          {!selectedBatch && !loading && (
            <div className="text-center text-muted py-3">
              <i className="bi bi-arrow-up me-1"></i>উপরে একটি ব্যাচ নির্বাচন করুন
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
