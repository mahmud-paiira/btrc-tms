import React, { useState } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';

export default function TrainerApprovalModal({ trainer, onClose, onDone }) {
  const [action, setAction] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!action) return toast.warning('একটি অ্যাকশন নির্বাচন করুন');
    setSubmitting(true);
    try {
      const data = { action, remarks };
      if (action === 'approve') {
        await hoService.approveTrainer(trainer.id, data);
        toast.success('প্রশিক্ষক অনুমোদিত হয়েছে');
      } else {
        if (!remarks.trim()) return toast.warning('বাতিলের কারণ লিখুন');
        await hoService.rejectTrainer(trainer.id, data);
        toast.success('প্রশিক্ষক বাতিল করা হয়েছে');
      }
      onDone();
    } catch (e) {
      toast.error('ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h6 className="modal-title fw-semibold">প্রশিক্ষক অনুমোদন</h6>
            <button className="btn btn-sm btn-outline-light" onClick={onClose}><i className="bi bi-x-lg"></i></button>
          </div>
          <div className="modal-body">
            <div className="row mb-3">
              <div className="col-6"><strong>প্রশিক্ষক নং:</strong> {trainer.trainer_no}</div>
              <div className="col-6"><strong>এনআইডি:</strong> {trainer.nid}</div>
              <div className="col-6"><strong>ইমেইল:</strong> {trainer.user_email || '-'}</div>
              <div className="col-6"><strong>ফোন:</strong> {trainer.user_phone || '-'}</div>
              <div className="col-6"><strong>অভিজ্ঞতা:</strong> {trainer.years_of_experience} বছর</div>
              <div className="col-6"><strong>দক্ষতা:</strong> {trainer.expertise_area}</div>
            </div>
            <hr />
            <div className="mb-3">
              <label className="form-label fw-semibold">অ্যাকশন</label>
              <div className="d-flex gap-3">
                <button className={`btn ${action === 'approve' ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={() => setAction('approve')}>
                  <i className="bi bi-check-lg me-1"></i>অনুমোদন
                </button>
                <button className={`btn ${action === 'reject' ? 'btn-danger' : 'btn-outline-danger'}`}
                  onClick={() => setAction('reject')}>
                  <i className="bi bi-x-lg me-1"></i>বাতিল
                </button>
              </div>
            </div>
            {action === 'reject' && (
              <div className="mb-3">
                <label className="form-label fw-semibold">বাতিলের কারণ <span className="text-danger">*</span></label>
                <textarea className="form-control" rows={3} value={remarks}
                  onChange={e => setRemarks(e.target.value)} placeholder="বাতিলের কারণ উল্লেখ করুন..." />
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>বাতিল</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><span className="spinner-border spinner-border-sm me-1"></span>প্রক্রিয়াধীন...</> : 'নিশ্চিত করুন'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
