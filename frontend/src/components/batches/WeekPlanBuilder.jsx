import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import batchService from '../../services/batchService';
import SessionRow from './SessionRow';

const DAYS_OF_WEEK = [
  { value: 6, label: 'শনিবার' },
  { value: 0, label: 'রবিবার' },
  { value: 1, label: 'সোমবার' },
  { value: 2, label: 'মঙ্গলবার' },
  { value: 3, label: 'বুধবার' },
  { value: 4, label: 'বৃহস্পতিবার' },
  { value: 5, label: 'শুক্রবার' },
];

const CLASS_TYPES = [
  { value: 'theory', label: 'তত্ত্ব' },
  { value: 'practical', label: 'ব্যবহারিক' },
  { value: 'assessment', label: 'মূল্যায়ন' },
];

const defaultSession = {
  term_no: 1,
  term_day: 1,
  session_no: 1,
  class_type: 'theory',
  start_date: '',
  end_date: '',
  day_of_week: 6,
  start_time: '09:00',
  end_time: '10:00',
  duration_hours: 1,
  training_room_bn: '',
  training_room_en: '',
  lead_trainer: '',
  associate_trainer: '',
  topic_bn: '',
  topic_en: '',
};

export default function WeekPlanBuilder({ batchId, initialPlans = [], trainers = [], courseId, onPlansChange }) {
  const [plans, setPlans] = useState(initialPlans.length > 0 ? initialPlans : [defaultSession]);
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState(null);

  useEffect(() => {
    if (initialPlans.length > 0) setPlans(initialPlans);
  }, [initialPlans]);

  useEffect(() => {
    if (courseId && plans.length > 0) {
      batchService.validateHours(batchId).then(({ data }) => {
        setValidation(data);
      }).catch(() => {});
    }
  }, [batchId, courseId, plans.length]);

  const handleChange = (index, field, value) => {
    setPlans((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'start_time' || field === 'end_time') {
        const st = field === 'start_time' ? value : updated[index].start_time;
        const et = field === 'end_time' ? value : updated[index].end_time;
        if (st && et) {
          const [sh, sm] = st.split(':').map(Number);
          const [eh, em] = et.split(':').map(Number);
          let diff = (eh - sh) * 60 + (em - sm);
          if (diff < 0) diff += 1440;
          updated[index].duration_hours = parseFloat((diff / 60).toFixed(2));
        }
      }

      return updated;
    });
  };

  const addSession = () => {
    const last = plans[plans.length - 1];
    const newSession = {
      ...defaultSession,
      term_no: last.term_no,
      term_day: last.term_day + 1,
      session_no: last.session_no + 1,
      day_of_week: last.day_of_week,
      start_date: last.start_date,
      end_date: last.end_date,
      start_time: last.start_time,
      end_time: last.end_time,
      duration_hours: last.duration_hours,
    };
    setPlans((prev) => [...prev, newSession]);
  };

  const removeSession = (index) => {
    if (plans.length <= 1) {
      toast.warning('কমপক্ষে একটি সেশন থাকতে হবে');
      return;
    }
    setPlans((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    const invalid = plans.some(
      (p) => !p.lead_trainer || !p.topic_bn || !p.start_time || !p.end_time || !p.training_room_bn,
    );
    if (invalid) {
      toast.warning('সব সেশনে প্রধান প্রশিক্ষক, বিষয়, সময় ও কক্ষ পূরণ করুন');
      return;
    }

    setSaving(true);
    try {
      const payload = plans.map((p) => ({
        ...p,
        lead_trainer: parseInt(p.lead_trainer),
        associate_trainer: p.associate_trainer ? parseInt(p.associate_trainer) : null,
        duration_hours: parseFloat(p.duration_hours),
      }));

      const { data } = await batchService.bulkAddWeekPlans(batchId, { plans: payload });
      if (data.error_count > 0) {
        toast.warning(`${data.created_count} টি সংরক্ষিত, ${data.error_count} টি ত্রুটি`);
      } else {
        toast.success(`${data.created_count} টি সেশন সংরক্ষিত হয়েছে`);
      }
      onPlansChange(plans);
    } catch (err) {
      toast.error(err.response?.data?.error || 'সংরক্ষণ করতে ব্যর্থ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
        <h6 className="mb-0"><i className="bi bi-calendar-week me-2"></i>সাপ্তাহিক পরিকল্পনা</h6>
        <div className="d-flex gap-2 align-items-center">
          {validation && (
            <small className={`me-2 ${validation.is_valid ? 'text-success' : 'text-warning'}`}>
              পরিকল্পিত: {validation.planned_hours}h / কোর্স: {validation.course_hours}h
            </small>
          )}
          <button className="btn btn-sm btn-outline-light" onClick={addSession}>
            <i className="bi bi-plus-lg me-1"></i>সেশন যোগ
          </button>
          <button className="btn btn-sm btn-success" onClick={handleSaveAll} disabled={saving}>
            {saving ? (
              <span className="spinner-border spinner-border-sm"></span>
            ) : (
              <><i className="bi bi-save me-1"></i>সব সংরক্ষণ</>
            )}
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-hover mb-0 align-middle">
          <thead className="table-dark">
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>টার্ম</th>
              <th>দিন</th>
              <th>সেশন</th>
              <th>ধরণ</th>
              <th>বার</th>
              <th>শুরুর সময়</th>
              <th>শেষের সময়</th>
              <th>ঘন্টা</th>
              <th>কক্ষ</th>
              <th>প্রধান প্রশিক্ষক</th>
              <th>সহকারী</th>
              <th>বিষয়</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan, idx) => (
              <SessionRow
                key={idx}
                index={idx}
                plan={plan}
                trainers={trainers}
                daysOfWeek={DAYS_OF_WEEK}
                classTypes={CLASS_TYPES}
                onChange={handleChange}
                onRemove={removeSession}
              />
            ))}
          </tbody>
        </table>
      </div>

      {plans.length > 0 && (
        <div className="card-footer text-muted small d-flex justify-content-between">
          <span>মোট সেশন: {plans.length}টি</span>
          <span>মোট ঘন্টা: {plans.reduce((s, p) => s + parseFloat(p.duration_hours || 0), 0).toFixed(1)}h</span>
        </div>
      )}
    </div>
  );
}
