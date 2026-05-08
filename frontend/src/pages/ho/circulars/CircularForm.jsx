import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';

const STEPS = [
  { key: 'center', label: 'কেন্দ্র নির্বাচন' },
  { key: 'course', label: 'কোর্স নির্বাচন' },
  { key: 'title', label: 'শিরোনাম ও বিবরণ' },
  { key: 'dates', label: 'তারিখ নির্ধারণ' },
  { key: 'seats', label: 'আসন ও ফি' },
];

export default function CircularForm({ editData, onClose, onDone }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [centers, setCenters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    center: editData?.center || '',
    course: editData?.course || '',
    title_bn: editData?.title_bn || '',
    title_en: editData?.title_en || '',
    description: editData?.description || '',
    application_start_date: editData?.application_start_date || '',
    application_end_date: editData?.application_end_date || '',
    training_start_date: editData?.training_start_date || '',
    training_end_date: editData?.training_end_date || '',
    total_seats: editData?.total_seats || '',
    fee: editData?.fee || '',
  });

  useEffect(() => {
    hoService.listCenters({ status: 'active' }).then(r => {
      setCenters(r.data.results || r.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    hoService.listCourses({ status: 'active' }).then(r => {
      setCourses(r.data.results || r.data || []);
    }).catch(() => setCourses([]));
  }, []);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const validate = () => {
    const { application_start_date, application_end_date, training_start_date, training_end_date,
      total_seats, center, course, title_bn } = form;
    if (!center) { toast.error('কেন্দ্র নির্বাচন করুন'); return false; }
    if (!course) { toast.error('কোর্স নির্বাচন করুন'); return false; }
    if (!title_bn.trim()) { toast.error('বাংলা শিরোনাম দিন'); return false; }
    if (!application_start_date || !application_end_date) { toast.error('আবেদনের তারিখ নির্ধারণ করুন'); return false; }
    if (!training_start_date || !training_end_date) { toast.error('প্রশিক্ষণের তারিখ নির্ধারণ করুন'); return false; }
    if (application_end_date < application_start_date) { toast.error('আবেদনের শেষ তারিখ শুরুর তারিখের পরে হতে হবে'); return false; }
    if (training_end_date < training_start_date) { toast.error('প্রশিক্ষণ শেষের তারিখ শুরুর তারিখের পরে হতে হবে'); return false; }
    if (!total_seats || total_seats < 1) { toast.error('বৈধ আসন সংখ্যা দিন'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        center: Number(form.center),
        course: Number(form.course),
        title_bn: form.title_bn,
        title_en: form.title_en || form.title_bn,
        description: form.description || form.title_bn,
        application_start_date: form.application_start_date,
        application_end_date: form.application_end_date,
        training_start_date: form.training_start_date,
        training_end_date: form.training_end_date,
        total_seats: Number(form.total_seats),
      };
      if (form.fee) payload.fee = Number(form.fee);

      if (editData) {
        await hoService.updateCircular(editData.id, payload);
        toast.success('সার্কুলার হালনাগাদ করা হয়েছে');
      } else {
        await hoService.createCircular(payload);
        toast.success('সার্কুলার তৈরি হয়েছে');
      }
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'সংরক্ষণ করতে ব্যর্থ');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white py-2">
            <span className="fw-semibold">{editData ? 'সার্কুলার সম্পাদনা' : 'নতুন সার্কুলার'}</span>
            <button className="btn btn-sm btn-outline-light" onClick={onClose}><i className="bi bi-x-lg"></i></button>
          </div>
          <div className="modal-body p-3">
            <div className="d-flex justify-content-between mb-3" style={{ fontSize: 12 }}>
              {STEPS.map((s, i) => (
                <div key={s.key} className={`text-center ${i <= step ? 'text-primary fw-semibold' : 'text-muted'}`}
                  style={{ flex: 1, cursor: i < step ? 'pointer' : 'default' }}
                  onClick={() => i < step && setStep(i)}>
                  <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-1
                    ${i <= step ? 'bg-primary text-white' : 'bg-light text-muted'}`}
                    style={{ width: 28, height: 28, fontSize: 12 }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 11 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ minHeight: 300 }}>
              {step === 0 && (
                <div>
                  <h6 className="fw-semibold mb-3">প্রশিক্ষণ কেন্দ্র নির্বাচন করুন</h6>
                  <select className="form-select" value={form.center} onChange={e => { update('center', e.target.value); update('course', ''); }}>
                    <option value="">-- কেন্দ্র নির্বাচন করুন --</option>
                    {centers.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name_bn}</option>)}
                  </select>
                </div>
              )}
              {step === 1 && (
                <div>
                  <h6 className="fw-semibold mb-3">কোর্স নির্বাচন করুন</h6>
                  {!form.center ? (
                    <p className="text-muted">প্রথমে একটি কেন্দ্র নির্বাচন করুন</p>
                  ) : courses.length === 0 ? (
                    <p className="text-muted">এই কেন্দ্রের জন্য কোনো কোর্স পাওয়া যায়নি</p>
                  ) : (
                    <select className="form-select" value={form.course} onChange={e => update('course', e.target.value)}>
                      <option value="">-- কোর্স নির্বাচন করুন --</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name_bn}</option>)}
                    </select>
                  )}
                </div>
              )}
              {step === 2 && (
                <div>
                  <h6 className="fw-semibold mb-3">শিরোনাম ও বিবরণ</h6>
                  <div className="mb-2">
                    <label className="form-label small">শিরোনাম (বাংলায়)</label>
                    <input className="form-control form-control-sm" value={form.title_bn}
                      onChange={e => update('title_bn', e.target.value)} placeholder="বাংলায় শিরোনাম লিখুন" />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small">শিরোনাম (ইংরেজিতে)</label>
                    <input className="form-control form-control-sm" value={form.title_en}
                      onChange={e => update('title_en', e.target.value)} placeholder="ইংরেজিতে শিরোনাম লিখুন (ঐচ্ছিক)" />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small">বিবরণ</label>
                    <textarea className="form-control form-control-sm" rows={4} value={form.description}
                      onChange={e => update('description', e.target.value)} placeholder="সার্কুলারের বিস্তারিত বিবরণ লিখুন" />
                  </div>
                </div>
              )}
              {step === 3 && (
                <div>
                  <h6 className="fw-semibold mb-3">তারিখ নির্ধারণ</h6>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label small">আবেদন শুরুর তারিখ</label>
                      <input type="date" className="form-control form-control-sm" value={form.application_start_date}
                        onChange={e => update('application_start_date', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small">আবেদনের শেষ তারিখ</label>
                      <input type="date" className="form-control form-control-sm" value={form.application_end_date}
                        onChange={e => update('application_end_date', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small">প্রশিক্ষণ শুরুর তারিখ</label>
                      <input type="date" className="form-control form-control-sm" value={form.training_start_date}
                        onChange={e => update('training_start_date', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small">প্রশিক্ষণ শেষের তারিখ</label>
                      <input type="date" className="form-control form-control-sm" value={form.training_end_date}
                        onChange={e => update('training_end_date', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
              {step === 4 && (
                <div>
                  <h6 className="fw-semibold mb-3">আসন ও ফি</h6>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label small">মোট আসন সংখ্যা</label>
                      <input type="number" className="form-control form-control-sm" min={1} value={form.total_seats}
                        onChange={e => update('total_seats', e.target.value)} placeholder="যেমন: 30" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small">কোর্স ফি (ঐচ্ছিক)</label>
                      <input type="number" className="form-control form-control-sm" min={0} value={form.fee}
                        onChange={e => update('fee', e.target.value)} placeholder="খালি রাখলে কোর্সের ডিফল্ট ফি" />
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-light rounded small">
                    <strong>সারসংক্ষেপ:</strong><br />
                    কেন্দ্র: {centers.find(c => c.id === Number(form.center))?.name_bn || '-'}<br />
                    কোর্স: {courses.find(c => c.id === Number(form.course))?.name_bn || '-'}<br />
                    শিরোনাম: {form.title_bn || '-'}<br />
                    আবেদন: {form.application_start_date || '?'} → {form.application_end_date || '?'}<br />
                    প্রশিক্ষণ: {form.training_start_date || '?'} → {form.training_end_date || '?'}<br />
                    আসন: {form.total_seats || '?'}
                  </div>
                </div>
              )}
            </div>

            <div className="d-flex justify-content-between mt-3">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={step === 0}>
                <i className="bi bi-chevron-left me-1"></i>পূর্ববর্তী
              </button>
              {step < STEPS.length - 1 ? (
                <button className="btn btn-primary btn-sm" onClick={() => setStep(s => s + 1)}>
                  পরবর্তী<i className="bi bi-chevron-right ms-1"></i>
                </button>
              ) : (
                <button className="btn btn-success btn-sm" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <><span className="spinner-border spinner-border-sm me-1"></span>সংরক্ষণ...</> : (editData ? 'হালনাগাদ' : 'তৈরি করুন')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
