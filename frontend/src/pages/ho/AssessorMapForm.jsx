import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';

export default function AssessorMapForm({ onClose, onDone }) {
  const [assessorId, setAssessorId] = useState('');
  const [assessors, setAssessors] = useState([]);
  const [assessorSearch, setAssessorSearch] = useState('');
  const [centerId, setCenterId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [centers, setCenters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    hoService.listAssessors({}).then(r => setAssessors(r.data.results || r.data)).catch(() => {});
    hoService.getAssessorCenters().then(r => setCenters(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (centerId) {
      hoService.getAssessorCourses(centerId).then(r => setCourses(r.data)).catch(() => setCourses([]));
    } else { setCourses([]); }
    setCourseId('');
  }, [centerId]);

  const selected = assessorId ? assessors.find(a => a.id === parseInt(assessorId)) : null;

  const handleSubmit = async () => {
    if (!assessorId || !centerId || !courseId) return toast.warning('সব ফিল্ড পূরণ করুন');
    setSubmitting(true);
    try {
      await hoService.mapAssessor({
        assessor: parseInt(assessorId),
        center: parseInt(centerId),
        course: parseInt(courseId),
        is_primary: isPrimary,
      });
      toast.success('মূল্যায়নকারী ম্যাপ করা হয়েছে');
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.message || 'ম্যাপিং ব্যর্থ হয়েছে');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h6 className="modal-title fw-semibold">মূল্যায়নকারী ম্যাপিং</h6>
            <button className="btn btn-sm btn-outline-light" onClick={onClose}><i className="bi bi-x-lg"></i></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label fw-semibold">মূল্যায়নকারী <span className="text-danger">*</span></label>
              {assessors.length > 20 && (
                <input className="form-control form-control-sm mb-2" placeholder="সার্চ..." value={assessorSearch}
                  onChange={e => setAssessorSearch(e.target.value)} />
              )}
              <select className="form-select" size={5} value={assessorId} onChange={e => setAssessorId(e.target.value)}>
                {assessors
                  .filter(a => !assessorSearch || a.assessor_no?.includes(assessorSearch) || (a.user_email || '').toLowerCase().includes(assessorSearch.toLowerCase()))
                  .map(a => (
                    <option key={a.id} value={a.id}>{a.assessor_no} - {a.user_email || ''}</option>
                  ))}
              </select>
              {selected && (
                <div className="mt-1 small text-muted">এনআইডি: {selected.nid} | ফোন: {selected.user_phone || '-'}</div>
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
