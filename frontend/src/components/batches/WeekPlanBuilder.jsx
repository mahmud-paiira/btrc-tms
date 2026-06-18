import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import batchService from '../../services/batchService';

const DAYS_OF_WEEK = [
  { value: 6, label: 'শনিবার' }, { value: 0, label: 'রবিবার' },
  { value: 1, label: 'সোমবার' }, { value: 2, label: 'মঙ্গলবার' },
  { value: 3, label: 'বুধবার' }, { value: 4, label: 'বৃহস্পতিবার' },
  { value: 5, label: 'শুক্রবার' },
];

function blank() {
  return {
    term_no: 1, term_day: 1, session_no: 1,
    class_type: 'practical', day_of_week: 6,
    start_time: '09:00', end_time: '10:00', duration_hours: 1,
    training_room_bn: '', lead_trainer: '', associate_trainer: '',
    topic_bn: '', start_date: '', end_date: '',
  };
}

export default function WeekPlanBuilder({ batchId, initialPlans = [], trainers = [], courseId, onPlansChange }) {
  const [plans, setPlans] = useState(() =>
    initialPlans.length > 0 ? initialPlans : [blank()]
  );
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState(null);

  useEffect(() => {
    if (initialPlans.length > 0) setPlans(initialPlans);
  }, [initialPlans]);

  useEffect(() => {
    if (courseId && plans.length > 0) {
      batchService.validateHours(batchId).then(({ data }) => setValidation(data)).catch(() => {});
    }
  }, [batchId, courseId, plans.length]);

  const upd = (idx, field, value) => {
    setPlans(prev => {
      const next = prev.map(p => ({ ...p }));
      next[idx][field] = value;
      if ((field === 'start_time' || field === 'end_time') && next[idx].start_time && next[idx].end_time) {
        const [sh, sm] = next[idx].start_time.split(':').map(Number);
        const [eh, em] = next[idx].end_time.split(':').map(Number);
        let diff = (eh - sh) * 60 + (em - sm);
        if (diff < 0) diff += 1440;
        next[idx].duration_hours = parseFloat((diff / 60).toFixed(2));
      }
      return next;
    });
  };

  const add = () => {
    setPlans(prev => {
      const last = prev[prev.length - 1];
      return [...prev, {
        ...blank(),
        session_no: last.session_no + 1,
        day_of_week: last.day_of_week,
        start_time: last.start_time,
        end_time: last.end_time,
      }];
    });
  };

  const remove = idx => {
    if (plans.length <= 1) { toast.warning('কমপক্ষে একটি সেশন থাকতে হবে'); return; }
    setPlans(prev => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    const invalid = plans.some(p => !p.lead_trainer || !p.topic_bn || !p.start_time || !p.end_time || !p.training_room_bn);
    if (invalid) { toast.warning('সব সেশনে প্রশিক্ষক, বিষয়, সময় ও গাড়ি/স্থান পূরণ করুন'); return; }
    setSaving(true);
    try {
      const payload = plans.map(p => ({
        ...p,
        lead_trainer: parseInt(p.lead_trainer),
        associate_trainer: p.associate_trainer ? parseInt(p.associate_trainer) : null,
        duration_hours: parseFloat(p.duration_hours),
      }));
      const { data } = await batchService.bulkAddWeekPlans(batchId, { plans: payload });
      if (data.error_count > 0) {
        const msgs = (data.errors || []).map(e => `সেশন ${e.index+1}: ${Object.values(e.errors).flat().join(', ')}`).join(' | ');
        console.warn('WeekPlan errors:', JSON.stringify(data.errors, null, 2));
        toast.warning(msgs || `${data.created_count} টি সংরক্ষিত, ${data.error_count} টি ত্রুটি`);
      } else toast.success(`${data.created_count} টি সেশন সংরক্ষিত হয়েছে`);
      onPlansChange(plans);
    } catch (err) {
      toast.error(err.response?.data?.error || 'সংরক্ষণ করতে ব্যর্থ');
    } finally { setSaving(false); }
  };

  return (
    <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
      <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center flex-wrap gap-2">
        <h6 className="mb-0"><i className="bi bi-calendar-week me-2"></i>সাপ্তাহিক ড্রাইভিং পরিকল্পনা</h6>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          {validation && (
            <small className={`me-2 ${validation.is_valid ? 'text-success' : 'text-warning'}`}>
              {validation.planned_hours}h / {validation.course_hours}h
            </small>
          )}
          <button className="btn btn-sm btn-outline-light" onClick={add}><i className="bi bi-plus-lg me-1"></i>সেশন</button>
          <button className="btn btn-sm btn-success" onClick={save} disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm" /> : <><i className="bi bi-save me-1"></i>সংরক্ষণ</>}
          </button>
        </div>
      </div>
      <div className="card-body p-3">
        <div className="row g-2">
          {plans.map((p, i) => (
            <div key={i} className="col-12">
              <div className="border rounded-3 p-3" style={{ background: '#f8f9fa' }}>
                <div className="row g-2 align-items-end">
                  <div className="col-3 col-md-1">
                    <label className="form-label mb-0" style={{ fontSize: 11, color: '#888' }}>সেশন</label>
                    <input type="number" className="form-control form-control-sm" value={p.session_no} min={1}
                      onChange={e => upd(i, 'session_no', parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="col-4 col-md-2">
                    <label className="form-label mb-0" style={{ fontSize: 11, color: '#888' }}>বার</label>
                    <select className="form-select form-select-sm" value={p.day_of_week}
                      onChange={e => upd(i, 'day_of_week', parseInt(e.target.value))}>
                      {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div className="col-4 col-md-2">
                    <label className="form-label mb-0" style={{ fontSize: 11, color: '#888' }}>শুরু</label>
                    <input type="time" className="form-control form-control-sm" value={p.start_time}
                      onChange={e => upd(i, 'start_time', e.target.value)} />
                  </div>
                  <div className="col-4 col-md-2">
                    <label className="form-label mb-0" style={{ fontSize: 11, color: '#888' }}>শেষ</label>
                    <input type="time" className="form-control form-control-sm" value={p.end_time}
                      onChange={e => upd(i, 'end_time', e.target.value)} />
                  </div>
                  <div className="col-4 col-md-1">
                    <label className="form-label mb-0" style={{ fontSize: 11, color: '#888' }}>ঘন্টা</label>
                    <input className="form-control form-control-sm bg-light" value={p.duration_hours} readOnly />
                  </div>
                  <div className="col-5 col-md-2">
                    <label className="form-label mb-0" style={{ fontSize: 11, color: '#888' }}>প্রশিক্ষক</label>
                    <select className="form-select form-select-sm" value={p.lead_trainer}
                      onChange={e => upd(i, 'lead_trainer', e.target.value)}>
                      <option value="">-- বাছাই --</option>
                      {trainers.filter(t => String(t.id) !== String(p.associate_trainer)).map(t => (
                        <option key={t.id} value={t.id}>{t.user_full_name_bn || t.user_phone || `প্রশিক্ষক #${t.id}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-4 col-md-1">
                    <label className="form-label mb-0" style={{ fontSize: 11, color: '#888' }}>গাড়ি</label>
                    <input className="form-control form-control-sm" value={p.training_room_bn}
                      onChange={e => upd(i, 'training_room_bn', e.target.value)} placeholder="নং" />
                  </div>
                  <div className="col-5 col-md-1">
                    <label className="form-label mb-0" style={{ fontSize: 11, color: '#888' }}>বিষয়</label>
                    <input className="form-control form-control-sm" value={p.topic_bn}
                      onChange={e => upd(i, 'topic_bn', e.target.value)} placeholder="কী শেখাবেন" />
                  </div>
                  <div className="col-3 col-md-auto d-flex gap-1">
                    <button className="btn btn-sm btn-outline-danger mt-3" onClick={() => remove(i)} title="সরান">
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card-footer bg-white d-flex justify-content-between small text-muted py-2">
        <span>সেশন: {plans.length}টি</span>
        <span>মোট: {plans.reduce((s, p) => s + parseFloat(p.duration_hours || 0), 0).toFixed(1)} ঘন্টা</span>
      </div>
    </div>
  );
}
