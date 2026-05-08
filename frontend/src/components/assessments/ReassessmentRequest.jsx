import React, { useState } from 'react';
import { toast } from 'react-toastify';
import assessmentService from '../../services/assessmentService';

export default function ReassessmentRequest({ trainee, assessmentType, onClose }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!trainee) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.warning('পুনর্মূল্যায়নের কারণ লিখুন');
      return;
    }

    setSubmitting(true);
    try {
      await assessmentService.requestReassessment({
        original_assessment_id: trainee.assessment_id,
        reason: reason.trim(),
      });
      toast.success('পুনর্মূল্যায়নের অনুরোধ সফলভাবে পাঠানো হয়েছে');
      onClose(true);
    } catch (err) {
      const msg = err.response?.data?.original_assessment_id?.[0]
        || err.response?.data?.error
        || 'অনুরোধ পাঠাতে ব্যর্থ';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-warning text-dark">
            <h5 className="modal-title">
              <i className="bi bi-arrow-repeat me-2"></i>
              পুনর্মূল্যায়নের অনুরোধ
            </h5>
            <button
              className="btn-close"
              onClick={() => onClose(false)}
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label fw-bold">প্রশিক্ষণার্থী</label>
                <p className="mb-0">{trainee.trainee_name}</p>
                <small className="text-muted">{trainee.trainee_reg_no}</small>
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">মূল্যায়নের ধরণ</label>
                <p className="mb-0">
                  {assessmentType === 'pre_evaluation' && 'পূর্ব-মূল্যায়ন'}
                  {assessmentType === 'written' && 'লিখিত'}
                  {assessmentType === 'viva' && 'মৌখিক'}
                  {assessmentType === 'practical' && 'ব্যবহারিক'}
                  {assessmentType === 'final' && 'চূড়ান্ত'}
                </p>
              </div>

              <div className="mb-0">
                <label className="form-label fw-bold">
                  পুনর্মূল্যায়নের কারণ <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="পুনর্মূল্যায়নের কারণ বিস্তারিত লিখুন..."
                  required
                ></textarea>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => onClose(false)}
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="btn btn-warning"
                disabled={submitting || !reason.trim()}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1"></span>
                    পাঠানো হচ্ছে...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-1"></i>অনুরোধ পাঠান
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
