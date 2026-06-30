import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import batchService from '../../services/batchService';

export default function AssignAssessorModal({ batchId, onAssigned, onClose }) {
  const [assessors, setAssessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assessorId, setAssessorId] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/assessors/', {
          params: { approval_status: 'approved', page_size: 200 },
        });
        setAssessors(data.results || data || []);
      } catch {
        toast.error('মূল্যায়নকারী তালিকা লোড করতে ব্যর্থ।');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!assessorId) {
      toast.error('মূল্যায়নকারী নির্বাচন করুন।');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await batchService.assignAssessor(batchId, {
        assessor_id: parseInt(assessorId),
      });
      toast.success(`মূল্যায়নকারী: ${data.assessor_name} — ${data.created}টি নতুন, ${data.updated}টি আপডেট`);
      onAssigned(data);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'নিয়োগ করতে ব্যর্থ।';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.4)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">মূল্যায়নকারী নিয়োগ</h5>
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
                <div className="mb-3">
                  <label className="form-label">মূল্যায়নকারী <span className="text-danger">*</span></label>
                  <select className="form-select" value={assessorId} onChange={e => setAssessorId(e.target.value)} required>
                    <option value="">-- নির্বাচন করুন --</option>
                    {assessors.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.user_full_name_bn || a.user_email || a.assessor_no}
                      </option>
                    ))}
                  </select>
                  <p className="text-muted small mt-2 mb-0">
                    নথিভুক্ত সকল প্রশিক্ষণার্থীর জন্য 'পূর্ব-মূল্যায়ন' টাইপের Assessment রেকর্ড তৈরি হবে। মূল্যায়নকারী তার পোর্টাল থেকে ব্যাচটি দেখতে পাবেন।
                  </p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>বাতিল</button>
              <button type="submit" className="btn btn-primary" disabled={submitting || !assessorId}>
                {submitting ? 'প্রক্রিয়াধীন...' : 'নিয়োগ দিন'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
