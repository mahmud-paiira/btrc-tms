import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import batchService from '../../services/batchService';

export default function AssignTrainerModal({ batchId, onAssigned, onClose }) {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [trainerId, setTrainerId] = useState('');
  const [associateId, setAssociateId] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/trainers/', {
          params: { approval_status: 'approved', page_size: 200 },
        });
        setTrainers(data.results || data || []);
      } catch {
        toast.error('প্রশিক্ষক তালিকা লোড করতে ব্যর্থ।');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!trainerId) {
      toast.error('প্রধান প্রশিক্ষক নির্বাচন করুন।');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { trainer_id: parseInt(trainerId) };
      if (associateId && String(associateId) !== String(trainerId)) {
        payload.associate_trainer_id = parseInt(associateId);
      }
      const { data } = await batchService.assignTrainer(batchId, payload);
      toast.success(`প্রধান: ${data.lead_trainer_name}` + (data.associate_trainer_name ? `, সহকারী: ${data.associate_trainer_name}` : '') + ` — ${data.updated_plans}টি সেশন আপডেট হয়েছে।`);
      onAssigned(data);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'নিয়োগ করতে ব্যর্থ।';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const filteredAssociate = trainers.filter(t => String(t.id) !== String(trainerId));

  return (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.4)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">প্রশিক্ষক নিয়োগ</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {loading ? (
                <div className="text-center py-3">
                  <div className="spinner-border text-primary" role="status" />
                  <p className="mt-2 text-muted">লোড হচ্ছে...</p>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="form-label">প্রধান প্রশিক্ষক <span className="text-danger">*</span></label>
                    <select className="form-select" value={trainerId} onChange={e => setTrainerId(e.target.value)} required>
                      <option value="">-- নির্বাচন করুন --</option>
                      {trainers.map(t => (
                        <option key={t.id} value={t.id}>{t.user_full_name_bn || t.user_full_name_en || t.user_phone || `প্রশিক্ষক #${t.id}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">সহকারী প্রশিক্ষক (ঐচ্ছিক)</label>
                    <select className="form-select" value={associateId} onChange={e => setAssociateId(e.target.value)}>
                      <option value="">-- নেই --</option>
                      {filteredAssociate.map(t => (
                        <option key={t.id} value={t.id}>{t.user_full_name_bn || t.user_full_name_en || t.user_phone || `প্রশিক্ষক #${t.id}`}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-muted small mb-0">কোনো সাপ্তাহিক পরিকল্পনা না থাকলে স্বয়ংক্রিয়ভাবে ৮টি সেশন তৈরি হবে।</p>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>বাতিল</button>
              <button type="submit" className="btn btn-primary" disabled={submitting || !trainerId}>
                {submitting ? 'প্রক্রিয়াধীন...' : 'নিয়োগ দিন'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
