import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';

export default function TrainerMapForm({ centers, onClose, onDone }) {
  const [trainerNo, setTrainerNo] = useState('');
  const [trainerId, setTrainerId] = useState(null);
  const [centerId, setCenterId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [courses, setCourses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [trainers, setTrainers] = useState([]);
  const [trainerSearch, setTrainerSearch] = useState('');

  useEffect(() => {
    hoService.listTrainers({}).then(r => setTrainers(r.data.results || r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (centerId) {
      hoService.getTrainerCourses(centerId).then(r => setCourses(r.data)).catch(() => setCourses([]));
    } else {
      setCourses([]);
    }
    setCourseId('');
  }, [centerId]);

  const selectedTrainer = trainerId ? trainers.find(t => t.id === parseInt(trainerId)) : null;

  const handleSubmit = async () => {
    if (!trainerId || !centerId || !courseId) return toast.warning('সব ফিল্ড পূরণ করুন');
    setSubmitting(true);
    try {
      await hoService.mapTrainer({
        trainer: parseInt(trainerId),
        center: parseInt(centerId),
        course: parseInt(courseId),
        is_primary: isPrimary,
      });
      toast.success('প্রশিক্ষক ম্যাপ করা হয়েছে');
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.message || 'ম্যাপিং ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h6 className="modal-title fw-semibold">প্রশিক্ষক ম্যাপিং</h6>
            <button className="btn btn-sm btn-outline-light" onClick={onClose}><i className="bi bi-x-lg"></i></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label fw-semibold">প্রশিক্ষক <span className="text-danger">*</span></label>
              {trainers.length > 30 && (
                <input className="form-control form-control-sm mb-2" placeholder="প্রশিক্ষক সার্চ..."
                  value={trainerSearch} onChange={e => setTrainerSearch(e.target.value)} />
              )}
              <select className="form-select" size={5} value={trainerId} onChange={e => setTrainerId(e.target.value)}>
                {trainers
                  .filter(t => !trainerSearch || t.trainer_no.includes(trainerSearch) || (t.user_email || '').toLowerCase().includes(trainerSearch.toLowerCase()))
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.trainer_no} - {t.user_email || ''}</option>
                  ))}
              </select>
              {selectedTrainer && (
                <div className="mt-1 small text-muted">
                  এনআইডি: {selectedTrainer.nid} | ফোন: {selectedTrainer.user_phone || '-'} | অভিজ্ঞতা: {selectedTrainer.years_of_experience} বছর
                </div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">কেন্দ্র <span className="text-danger">*</span></label>
              <select className="form-select" value={centerId} onChange={e => setCenterId(e.target.value)}>
                <option value="">কেন্দ্র নির্বাচন করুন</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name_bn} ({c.code})</option>)}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">কোর্স <span className="text-danger">*</span></label>
              <select className="form-select" value={courseId} onChange={e => setCourseId(e.target.value)} disabled={!centerId}>
                <option value="">কোর্স নির্বাচন করুন</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name_bn} ({c.code})</option>)}
              </select>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="isPrimary" checked={isPrimary}
                onChange={e => setIsPrimary(e.target.checked)} />
              <label className="form-check-label" htmlFor="isPrimary">প্রাথমিক হিসেবে সেট করুন</label>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>বাতিল</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><span className="spinner-border spinner-border-sm me-1"></span>প্রক্রিয়াধীন...</> : 'ম্যাপ করুন'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
