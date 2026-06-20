import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import batchService from '../../services/batchService';

export default function AddTraineeModal({ batchId, onAdded, onClose }) {
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data } = await batchService.availableTrainees(batchId, { page_size: 500 });
        setTrainees(data.results || data);
      } catch {
        toast.error('প্রশিক্ষণার্থী তালিকা লোড করতে ব্যর্থ।');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [batchId]);

  const toggle = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const filtered = search.trim()
    ? trainees.filter(t =>
        (t.registration_no || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.user_phone || '').includes(search)
      )
    : trainees;

  const allVisibleSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id));

  function toggleAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set([...selectedIds].filter(id => !filtered.some(t => t.id === id))));
    } else {
      const next = new Set(selectedIds);
      filtered.forEach(t => next.add(t.id));
      setSelectedIds(next);
    }
  }

  async function handleSubmit() {
    if (selectedIds.size === 0) {
      toast.error('কমপক্ষে একজন প্রশিক্ষণার্থী নির্বাচন করুন।');
      return;
    }
    try {
      setSubmitting(true);
      const { data } = await batchService.enrollTrainees(batchId, { trainee_ids: [...selectedIds] });
      toast.success(`${data.enrolled} জন যুক্ত করা হয়েছে।`);
      onAdded();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || 'যুক্ত করতে ব্যর্থ হয়েছে।';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.4)', zIndex: 1050 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">প্রশিক্ষণার্থী যুক্ত করুন</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status" />
                <p className="mt-2 text-muted">লোড হচ্ছে...</p>
              </div>
            ) : trainees.length === 0 ? (
              <p className="text-muted text-center py-4">কোনো প্রশিক্ষণার্থী পাওয়া যায়নি (সকলেই ইতিমধ্যে নথিভুক্ত)।</p>
            ) : (
              <>
                <input
                  className="form-control mb-3"
                  placeholder="রেজি. নং / নাম / মোবাইল দিয়ে খুঁজুন..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                <div className="mb-2 d-flex align-items-center gap-2">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} id="select-all" />
                  <label htmlFor="select-all" className="form-label mb-0 user-select-all">{filtered.length} জনের মধ্যে সকলকে নির্বাচন/বাতিল</label>
                </div>
                <div style={{ maxHeight: 350, overflowY: 'auto' }} className="border rounded p-1">
                  {filtered.length === 0 ? (
                    <p className="text-muted text-center py-3">কোনো ফলাফল নেই।</p>
                  ) : (
                    filtered.map(t => (
                      <label key={t.id} className="d-flex align-items-center gap-2 px-2 py-1 border-bottom" style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t.id)}
                          onChange={() => toggle(t.id)}
                        />
                        <span className="text-nowrap">{t.registration_no || '-'}</span>
                        <span className="flex-grow-1">{t.user_name || '-'}</span>
                        <span className="text-muted small">{t.user_phone || '-'}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="mt-2 mb-0 text-muted small">{selectedIds.size} জন নির্বাচিত</p>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>বাতিল</button>
            <button className="btn btn-primary" disabled={submitting || selectedIds.size === 0} onClick={handleSubmit}>
              {submitting ? 'প্রক্রিয়াধীন...' : `${selectedIds.size} জন যুক্ত করুন`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
