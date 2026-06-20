import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import batchService from '../../services/batchService';

export default function TransferModal({ enrollmentId, currentBatchId, onTransferred, onClose }) {
  const [batches, setBatches] = useState([]);
  const [targetBatchId, setTargetBatchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await batchService.list({ page_size: 200 });
        const items = data.results || data;
        setBatches(items.filter(b => b.id !== currentBatchId && b.status !== 'completed' && b.status !== 'cancelled'));
      } catch {
        toast.error('ব্যাচ তালিকা লোড করতে ব্যর্থ।');
      } finally {
        setLoadingBatches(false);
      }
    }
    load();
  }, [currentBatchId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!targetBatchId) {
      toast.error('টার্গেট ব্যাচ নির্বাচন করুন।');
      return;
    }
    try {
      setLoading(true);
      await batchService.transferEnrollment(enrollmentId, { target_batch_id: parseInt(targetBatchId, 10) });
      toast.success('স্থানান্তর সফল হয়েছে।');
      onTransferred();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || 'স্থানান্তর ব্যর্থ হয়েছে।';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">ব্যাচ স্থানান্তর</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {loadingBatches ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status" />
                  <span className="ms-2">লোড হচ্ছে...</span>
                </div>
              ) : (
                <div className="mb-3">
                  <label className="form-label">টার্গেট ব্যাচ</label>
                  <select
                    className="form-select"
                    value={targetBatchId}
                    onChange={e => setTargetBatchId(e.target.value)}
                  >
                    <option value="">-- নির্বাচন করুন --</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.batch_name_bn || b.batch_name_en} ({b.batch_no})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>বাতিল</button>
              <button type="submit" className="btn btn-warning" disabled={loading || !targetBatchId}>
                {loading ? 'প্রক্রিয়াধীন...' : 'স্থানান্তর করুন'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
