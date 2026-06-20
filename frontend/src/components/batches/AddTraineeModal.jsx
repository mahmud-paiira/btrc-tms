import React, { useState } from 'react';
import { toast } from 'react-toastify';
import batchService from '../../services/batchService';

export default function AddTraineeModal({ batchId, onAdded, onClose }) {
  const [regNo, setRegNo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!regNo.trim()) {
      toast.error('রেজিস্ট্রেশন নম্বর দিন।');
      return;
    }
    try {
      setLoading(true);
      await batchService.addTrainee(batchId, { registration_no: regNo.trim() });
      toast.success('প্রশিক্ষণার্থী যুক্ত করা হয়েছে।');
      onAdded();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || 'যুক্ত করতে ব্যর্থ হয়েছে।';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="modal-dialog modal-sm modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">প্রশিক্ষণার্থী যুক্ত করুন</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">রেজিস্ট্রেশন নম্বর</label>
                <input
                  className="form-control"
                  placeholder="যেমন: BRTC-KHL-2026-00001"
                  value={regNo}
                  onChange={e => setRegNo(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>বাতিল</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'প্রক্রিয়াধীন...' : 'যুক্ত করুন'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
