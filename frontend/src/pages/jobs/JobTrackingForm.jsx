import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import jobService from '../../services/jobService';
import { useTranslation } from '../../hooks/useTranslation';
import TrackingModal from '../../components/jobs/TrackingModal';
import { formatCurrency } from '../../utils/numberFormatter';
import './JobPlacement.css';

export default function JobTrackingForm() {
  const { t } = useTranslation();
  const [placements, setPlacements] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [loading, setLoading] = useState(false);
  const [trackingModal, setTrackingModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const TRACKING_MONTHS = [
    { value: 3, label: t('job.tracking.months3', '৩ মাস') },
    { value: 6, label: t('job.tracking.months6', '৬ মাস') },
    { value: 12, label: t('job.tracking.months12', '১২ মাস') },
  ];

  const fetchBatches = useCallback(async () => {
    try {
      const { data } = await jobService.getBatches({ status: 'completed' });
      setBatches(data.results || data || []);
    } catch {
      toast.error(t('job.tracking.batchLoadFailed', 'ব্যাচ তালিকা লোড করতে ব্যর্থ'));
    }
  }, [t]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const fetchPlacements = useCallback(async () => {
    if (!selectedBatch) return;
    setLoading(true);
    try {
      const { data } = await jobService.listJobs({
        batch: selectedBatch,
        page_size: 100,
      });
      setPlacements(data.results || []);
    } catch {
      toast.error(t('job.tracking.dataLoadFailed', 'তথ্য লোড করতে ব্যর্থ'));
    } finally {
      setLoading(false);
    }
  }, [selectedBatch, t]);

  useEffect(() => { fetchPlacements(); }, [fetchPlacements]);

  const getDueTrackingMonths = (placement) => {
    const start = new Date(placement.start_date);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
    const existingMonths = (placement.trackings || []).map((tm) => tm.tracking_month);
    return TRACKING_MONTHS.filter((tm) => tm.value <= monthsDiff && !existingMonths.includes(tm.value));
  };

  const handleOpenTracking = (placement) => {
    placement.trackings = [];
    jobService.getPlacementTrackings(placement.id).then(({ data }) => {
      placement.trackings = data;
      setTrackingModal(placement);
    }).catch(() => {
      setTrackingModal(placement);
    });
  };

  const handleTrackingSubmit = async (placementId, data) => {
    setSubmitting(true);
    try {
      await jobService.addTracking({
        job_placement_id: placementId,
        ...data,
      });
      toast.success(t('job.tracking.saveSuccess', 'ট্র্যাকিং সফলভাবে সংরক্ষিত হয়েছে'));
      setTrackingModal(null);
      fetchPlacements();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.non_field_errors?.[0] || t('job.tracking.saveFailed', 'সংরক্ষণ করতে ব্যর্থ');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="job-placement-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0"><i className="bi bi-graph-up me-2"></i>{t('job.tracking.title', 'চাকরি ট্র্যাকিং')}</h4>
        </div>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <label className="form-label fw-bold">{t('job.tracking.selectBatch', 'ব্যাচ নির্বাচন করুন')}</label>
              <select className="form-select" value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
                <option value="">{t('site.select', '-- নির্বাচন করুন --')}</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.batch_name_bn || b.batch_no}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <div className="card bg-primary text-white text-center py-2">
                <div className="card-body py-1">
                  <h5 className="mb-0">{placements.length}</h5>
                  <small>{t('job.tracking.placed', 'স্থাপিত')}</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-warning text-dark text-center py-2">
                <div className="card-body py-1">
                  <h5 className="mb-0">
                    {placements.filter((p) => getDueTrackingMonths(p).length > 0).length}
                  </h5>
                  <small>{t('job.tracking.trackingDue', 'ট্র্যাকিং বাকি')}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : selectedBatch && (
        <div className="card shadow-sm">
          <div className="card-header bg-primary text-white d-flex justify-content-between">
            <h6 className="mb-0"><i className="bi bi-people me-2"></i>{t('job.tracking.placedTrainees', 'স্থাপিত প্রশিক্ষণার্থী')}</h6>
          </div>
          <div className="table-responsive">
            <table className="table table-hover table-bordered mb-0 align-middle">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>{t('job.tracking.colTrainee', 'প্রশিক্ষণার্থী')}</th>
                  <th>{t('job.tracking.colEmployer', 'নিয়োগকর্তা')}</th>
                  <th>{t('job.tracking.colDesignation', 'পদবী')}</th>
                  <th className="text-center">{t('job.tracking.colStartDate', 'শুরুর তারিখ')}</th>
                  <th className="text-end">{t('job.tracking.colSalary', 'বেতন')}</th>
                  <th className="text-center">{t('job.tracking.colTracking', 'ট্র্যাকিং')}</th>
                  <th className="text-center">{t('job.tracking.colActions', 'ক্রিয়া')}</th>
                </tr>
              </thead>
              <tbody>
                {placements.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-4 text-muted">{t('job.tracking.empty', 'কোনো তথ্য নেই')}</td></tr>
                ) : placements.map((p, idx) => {
                  const dueMonths = getDueTrackingMonths(p);
                  return (
                    <tr key={p.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <strong>{p.trainee_name}</strong>
                        <br /><small className="text-muted">{p.trainee_reg_no}</small>
                      </td>
                      <td>{p.employer_name}</td>
                      <td>{p.designation_bn}</td>
                      <td className="text-center">{p.start_date}</td>
                      <td className="text-end">{formatCurrency(p.salary, 'bn')}</td>
                      <td className="text-center">
                        {dueMonths.length > 0 ? (
                          dueMonths.map((dm) => (
                            <span key={dm.value} className="badge bg-warning text-dark me-1">{dm.label}</span>
                          ))
                        ) : (
                          <span className="badge bg-success">{t('job.tracking.complete', 'সম্পূর্ণ')}</span>
                        )}
                      </td>
                      <td className="text-center">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => handleOpenTracking(p)}>
                          <i className="bi bi-plus-circle me-1"></i>{t('job.tracking.btnTracking', 'ট্র্যাকিং')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!selectedBatch && (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-arrow-up fs-2 d-block mb-2"></i>{t('job.tracking.selectPrompt', 'উপরে একটি ব্যাচ নির্বাচন করুন')}
        </div>
      )}

      {/* Tracking Modal */}
      {trackingModal && (
        <TrackingModal
          placement={trackingModal}
          onClose={() => setTrackingModal(null)}
          onSubmit={handleTrackingSubmit}
          submitting={submitting}
        />
      )}
    </div>
  );
}
