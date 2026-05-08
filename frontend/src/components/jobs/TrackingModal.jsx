import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const TRACKING_MONTHS = [
  { value: 3, label: '৩ মাস' },
  { value: 6, label: '৬ মাস' },
  { value: 12, label: '১২ মাস' },
];

export default function TrackingModal({ placement, onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({
    tracking_month: '',
    tracking_date: new Date().toISOString().split('T')[0],
    is_still_employed: true,
    salary_changed: false,
    new_salary: '',
    promoted: false,
    new_designation: '',
    comments: '',
  });

  const existingMonths = (placement.trackings || []).map((t) => t.tracking_month);
  const availableMonths = TRACKING_MONTHS.filter((m) => !existingMonths.includes(m.value));

  const dueMonths = (() => {
    const start = new Date(placement.start_date);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
    return availableMonths.filter((m) => m.value <= monthsDiff);
  })();

  useEffect(() => {
    if (dueMonths.length > 0 && !form.tracking_month) {
      setForm((prev) => ({ ...prev, tracking_month: dueMonths[0].value }));
    }
  }, [dueMonths]);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.tracking_month) {
      toast.warning('ট্র্যাকিং মাস নির্বাচন করুন');
      return;
    }
    onSubmit(placement.id, form);
  };

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-warning text-dark">
            <h5 className="modal-title"><i className="bi bi-clipboard-data me-2"></i>ট্র্যাকিং তথ্য</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="fw-bold d-block">{placement.trainee_name}</label>
                <small className="text-muted">{placement.employer_name} - {placement.designation_bn}</small>
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">ট্র্যাকিং মাস</label>
                <select className="form-select" name="tracking_month" value={form.tracking_month} onChange={handleChange} required>
                  <option value="">-- নির্বাচন করুন --</option>
                  {dueMonths.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                  {dueMonths.length === 0 && availableMonths.map((m) => (
                    <option key={m.value} value={m.value}>{m.label} (শীঘ্রই)</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">ট্র্যাকিংয়ের তারিখ</label>
                <input type="date" className="form-control" name="tracking_date" value={form.tracking_date} onChange={handleChange} required />
              </div>

              <div className="mb-3">
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" name="is_still_employed" id="stillEmp" checked={form.is_still_employed} onChange={handleChange} />
                  <label className="form-check-label fw-bold" htmlFor="stillEmp">এখনো কর্মরত?</label>
                </div>
              </div>

              <div className="mb-3">
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" name="salary_changed" id="salChanged" checked={form.salary_changed} onChange={handleChange} />
                  <label className="form-check-label fw-bold" htmlFor="salChanged">বেতন পরিবর্তিত?</label>
                </div>
                {form.salary_changed && (
                  <div className="mt-2">
                    <label className="form-label">নতুন বেতন</label>
                    <div className="input-group">
                      <span className="input-group-text">৳</span>
                      <input type="number" className="form-control" name="new_salary" value={form.new_salary} onChange={handleChange} min={0} required={form.salary_changed} />
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-3">
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" name="promoted" id="promoted" checked={form.promoted} onChange={handleChange} />
                  <label className="form-check-label fw-bold" htmlFor="promoted">পদোন্নতি?</label>
                </div>
                {form.promoted && (
                  <div className="mt-2">
                    <label className="form-label">নতুন পদবী</label>
                    <input type="text" className="form-control" name="new_designation" value={form.new_designation} onChange={handleChange} required={form.promoted} placeholder="নতুন পদবী লিখুন" />
                  </div>
                )}
              </div>

              <div className="mb-0">
                <label className="form-label fw-bold">মন্তব্য</label>
                <textarea className="form-control" name="comments" value={form.comments} onChange={handleChange} rows={2} placeholder="ঐচ্ছিক মন্তব্য"></textarea>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>বাতিল</button>
              <button type="submit" className="btn btn-warning" disabled={submitting}>
                {submitting ? (
                  <><span className="spinner-border spinner-border-sm me-1"></span>সংরক্ষণ হচ্ছে...</>
                ) : (
                  <><i className="bi bi-save me-1"></i>সংরক্ষণ</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
