import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import BanglaInput from '../../../components/common/BanglaInput';

const CRITERIA_TYPES = [
  { value: 'age', label: 'বয়স', icon: 'bi-calendar' },
  { value: 'education', label: 'শিক্ষাগত যোগ্যতা', icon: 'bi-book' },
  { value: 'experience_years', label: 'অভিজ্ঞতা (বছর)', icon: 'bi-briefcase' },
  { value: 'height_cm', label: 'উচ্চতা (সেমি)', icon: 'bi-rulers' },
  { value: 'weight_kg', label: 'ওজন (কেজি)', icon: 'bi-speedometer' },
  { value: 'boolean', label: 'হ্যাঁ/না', icon: 'bi-check-lg' },
  { value: 'text_match', label: 'টেক্সট ম্যাচ', icon: 'bi-fonts' },
  { value: 'number', label: 'সংখ্যা', icon: 'bi-123' },
];

const OPERATORS = [
  { value: '>=', label: '>= (এর সমান বা বেশি)' },
  { value: '<=', label: '<= (এর সমান বা কম)' },
  { value: '==', label: '== (সমান)' },
  { value: '>', label: '> (এর বেশি)' },
  { value: '<', label: '< (এর কম)' },
  { value: 'between', label: 'এর মধ্যে' },
];

const defaultItem = {
  criteria_type: 'age',
  label_bn: '',
  label_en: '',
  operator: '>=',
  expected_value: '',
  score: '',
  required: true,
  order: 0,
};

const STEPS = [
  { key: 'centers', label: 'কেন্দ্র', icon: 'bi-geo-alt' },
  { key: 'course', label: 'কোর্স', icon: 'bi-mortarboard' },
  { key: 'title', label: 'শিরোনাম', icon: 'bi-pencil-square' },
  { key: 'dates', label: 'তারিখ', icon: 'bi-calendar-event' },
  { key: 'checklist', label: 'চেকলিস্ট', icon: 'bi-list-check' },
  { key: 'seats', label: 'আসন ও ফি', icon: 'bi-people' },
];

export default function CircularForm({ editData, onClose, onDone }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [centers, setCenters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [allCenters, setAllCenters] = useState(editData?.all_centers ?? true);
  const bodyRef = useRef(null);

  const [form, setForm] = useState({
    circular_no: editData?.circular_no || '',
    edition: editData?.edition ?? 1,
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
    default_overflow_percentage: editData?.default_overflow_percentage ?? 20,
    routing_weight_seats: editData?.routing_weight_seats ?? 0.5,
    routing_weight_distance: editData?.routing_weight_distance ?? 0.3,
    routing_weight_merit: editData?.routing_weight_merit ?? 0.2,
    waitlist_validity_days: editData?.waitlist_validity_days ?? 30,
    auto_screen_total_score: editData?.auto_screen_total_score || '',
    auto_screen_min_score: editData?.auto_screen_min_score || '',
    eligible_centers: editData?.all_centers ? [] : (editData?.eligible_centers?.map(c => c.id) || []),
  });
  const [checklistItems, setChecklistItems] = useState(editData?.checklist_items || []);

  useEffect(() => {
    hoService.listCenters({ status: 'active' }).then(r => {
      setCenters(r.data.results || r.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    hoService.listCourses().then(r => {
      setCourses(r.data.results || r.data || []);
    }).catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    const course = courses.find(c => c.id === Number(form.course));
    if (!course) return;
    setForm(prev => ({
      ...prev,
      title_bn: prev.title_bn || course.name_bn || '',
      title_en: prev.title_en || course.name_en || '',
      fee: prev.fee || course.fee || '',
    }));
  }, [form.course, courses]);

  const toggleCenter = (id) => {
    setForm(prev => ({
      ...prev,
      eligible_centers: prev.eligible_centers.includes(id)
        ? prev.eligible_centers.filter(c => c !== id)
        : [...prev.eligible_centers, id],
    }));
  };

  const addChecklistItem = () => {
    setChecklistItems(prev => [...prev, { ...defaultItem, order: prev.length }]);
  };

  const removeChecklistItem = (index) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateChecklistItem = (index, field, value) => {
    setChecklistItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const moveItem = (index, dir) => {
    const newItems = [...checklistItems];
    const target = index + dir;
    if (target < 0 || target >= newItems.length) return;
    [newItems[index], newItems[target]] = [newItems[target], newItems[index]];
    newItems.forEach((item, i) => { item.order = i; });
    setChecklistItems(newItems);
  };

  const validate = () => {
    const { application_start_date, application_end_date, training_start_date, training_end_date,
      total_seats, course, title_bn, eligible_centers } = form;
    if (!allCenters && eligible_centers.length === 0) { toast.error('কমপক্ষে একটি কেন্দ্র নির্বাচন করুন অথবা "সব কেন্দ্র" নির্বাচন করুন'); return false; }
    if (!course) { toast.error('কোর্স নির্বাচন করুন'); return false; }
    if (!title_bn.trim()) { toast.error('বাংলা শিরোনাম দিন'); return false; }
    if (!application_start_date || !application_end_date) { toast.error('আবেদনের তারিখ নির্ধারণ করুন'); return false; }
    if (!training_start_date || !training_end_date) { toast.error('প্রশিক্ষণের তারিখ নির্ধারণ করুন'); return false; }
    if (application_end_date < application_start_date) { toast.error('আবেদনের শেষ তারিখ শুরুর তারিখের পরে হতে হবে'); return false; }
    if (training_end_date < training_start_date) { toast.error('প্রশিক্ষণ শেষের তারিখ শুরুর তারিখের পরে হতে হবে'); return false; }
    if (!total_seats || total_seats < 1) { toast.error('বৈধ আসন সংখ্যা দিন'); return false; }
    for (let i = 0; i < checklistItems.length; i++) {
      const item = checklistItems[i];
      if (!item.label_bn.trim()) { toast.error(`চেকলিস্ট আইটেম ${i + 1}: লেবেল দিন`); return false; }
      if (!item.expected_value.toString().trim()) { toast.error(`চেকলিস্ট আইটেম ${i + 1}: প্রত্যাশিত মান দিন`); return false; }
      if (!item.score || Number(item.score) < 0) { toast.error(`চেকলিস্ট আইটেম ${i + 1}: বৈধ স্কোর দিন`); return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        all_centers: allCenters,
        eligible_centers: allCenters ? [] : form.eligible_centers,
        circular_no: form.circular_no || null,
        edition: Number(form.edition) || 1,
        course: Number(form.course),
        title_bn: form.title_bn,
        title_en: form.title_en || form.title_bn,
        description: form.description || form.title_bn,
        application_start_date: form.application_start_date,
        application_end_date: form.application_end_date,
        training_start_date: form.training_start_date,
        training_end_date: form.training_end_date,
        total_seats: Number(form.total_seats),
        checklist_items: checklistItems.map((item, i) => ({
          criteria_type: item.criteria_type,
          label_bn: item.label_bn,
          label_en: item.label_en || '',
          operator: item.operator,
          expected_value: item.expected_value.toString(),
          score: Number(item.score),
          required: item.required,
          order: i,
        })),
        auto_screen_total_score: checklistItems.reduce((sum, item) => sum + Number(item.score || 0), 0),
        auto_screen_min_score: form.auto_screen_min_score || checklistItems.reduce((sum, item) => sum + Number(item.score || 0), 0),
        default_overflow_percentage: Number(form.default_overflow_percentage) || 20,
        routing_weight_seats: Number(form.routing_weight_seats) || 0.5,
        routing_weight_distance: Number(form.routing_weight_distance) || 0.3,
        routing_weight_merit: Number(form.routing_weight_merit) || 0.2,
        waitlist_validity_days: Number(form.waitlist_validity_days) || 30,
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

  const progress = ((step + 1) / STEPS.length) * 100;

  const renderCenterIcon = (c) => (
    <div className={`d-inline-flex align-items-center justify-content-center rounded-circle text-white
      ${form.eligible_centers.includes(c.id) ? 'bg-primary' : 'bg-secondary bg-opacity-25'}`}
      style={{ width: 36, height: 36, fontSize: 13 }}>
      {c.code}
    </div>
  );

  return (
    <div className="modal d-block" style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered" style={{ maxWidth: 720 }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16, overflow: 'hidden' }}>
          <div className="modal-header border-0 pb-0" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' }}>
            <div className="w-100 py-2 px-1">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="text-white mb-0 fw-bold" style={{ fontSize: 17 }}>
                    <i className={`bi ${editData ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`}></i>
                    {editData ? 'সার্কুলার সম্পাদনা' : 'নতুন সার্কুলার'}
                  </h5>
                  <small className="text-white text-opacity-75">ধাপ {step + 1} / {STEPS.length}</small>
                </div>
                <button className="btn btn-sm btn-light rounded-circle" onClick={onClose}
                  style={{ width: 32, height: 32, opacity: 0.9 }}>
                  <i className="bi bi-x-lg" style={{ fontSize: 12 }}></i>
                </button>
              </div>
              <div className="progress" style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                <div className="progress-bar bg-white" style={{ width: `${progress}%`, borderRadius: 2, transition: 'width 0.3s ease' }}></div>
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 20px 0' }}>
            <div className="d-flex justify-content-between">
              {STEPS.map((s, i) => {
                const completed = i < step;
                const active = i === step;
                return (
                  <div key={s.key}
                    onClick={() => i < step && setStep(i)}
                    style={{ flex: 1, cursor: i < step ? 'pointer' : 'default' }}>
                    <div className="d-flex flex-column align-items-center">
                      <div className={`d-flex align-items-center justify-content-center rounded-circle mb-1
                        ${completed ? 'bg-success text-white' : active ? 'bg-primary text-white shadow-sm' : 'bg-light text-muted'}`}
                        style={{ width: 34, height: 34, fontSize: 14, transition: 'all 0.2s' }}>
                        {completed ? <i className="bi bi-check" style={{ fontSize: 16 }}></i> : <i className={`bi ${s.icon}`}></i>}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? '#1e40af' : completed ? '#16a34a' : '#94a3b8', whiteSpace: 'nowrap' }}>
                        {s.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div ref={bodyRef} className="modal-body px-4 py-3" style={{ minHeight: 340, maxHeight: 420, overflowY: 'auto' }}>
            {step === 0 && (
              <div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary"
                    style={{ width: 32, height: 32, fontSize: 15 }}><i className="bi bi-geo-alt"></i></div>
                  <div><h6 className="fw-bold mb-0" style={{ fontSize: 14 }}>কেন্দ্র নির্বাচন</h6><small className="text-muted">কোন কেন্দ্রের জন্য এই সার্কুলার প্রযোজ্য হবে তা নির্বাচন করুন</small></div>
                </div>
                <div className={`form-check p-3 rounded-3 mb-3 border ${allCenters ? 'border-success bg-success bg-opacity-10' : 'border'}`}
                  style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                  onClick={() => setAllCenters(!allCenters)}>
                  <input className="form-check-input" type="checkbox" style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                    checked={allCenters} onChange={() => setAllCenters(!allCenters)} id="all-centers" />
                  <label className="form-check-label ms-2 fw-semibold" htmlFor="all-centers" style={{ cursor: 'pointer' }}>
                    <i className="bi bi-globe2 me-1 text-success"></i>সব কেন্দ্র (সকল কেন্দ্রের জন্য প্রযোজ্য)
                  </label>
                </div>
                {!allCenters && (
                  <div>
                    <p className="text-muted mb-2" style={{ fontSize: 12 }}><i className="bi bi-info-circle me-1"></i>প্রযোজ্য কেন্দ্র নির্বাচন করুন</p>
                    <div className="row g-2">
                      {centers.map(c => {
                        const sel = form.eligible_centers.includes(c.id);
                        return (
                          <div key={c.id} className="col-md-6">
                            <div className={`d-flex align-items-center gap-2 p-2 rounded-3 border ${sel ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                              style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                              onClick={() => toggleCenter(c.id)}>
                              {renderCenterIcon(c)}
                              <div className="flex-grow-1" style={{ fontSize: 13 }}>
                                <div className="fw-semibold">{c.name_bn}</div>
                                <small className="text-muted">{c.address_bn || c.code}</small>
                              </div>
                              <div className={`rounded-circle d-inline-flex align-items-center justify-content-center
                                ${sel ? 'bg-primary text-white' : 'border text-muted'}`}
                                style={{ width: 20, height: 20, fontSize: 11 }}>
                                {sel ? <i className="bi bi-check"></i> : <i className="bi bi-plus"></i>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {allCenters && (
                  <div className="d-flex align-items-center gap-2 p-2 rounded-3 bg-success bg-opacity-10">
                    <i className="bi bi-check-circle-fill text-success"></i>
                    <span className="small text-success fw-semibold">সকল সক্রিয় কেন্দ্রের জন্য প্রযোজ্য হবে</span>
                  </div>
                )}
              </div>
            )}
            
            {step === 1 && (
              <div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary"
                    style={{ width: 32, height: 32, fontSize: 15 }}><i className="bi bi-mortarboard"></i></div>
                  <div><h6 className="fw-bold mb-0" style={{ fontSize: 14 }}>কোর্স নির্বাচন</h6><small className="text-muted">সার্কুলারের জন্য কোর্স নির্ধারণ করুন</small></div>
                </div>
                <div className="position-relative">
                  <i className="bi bi-search position-absolute text-muted" style={{ left: 12, top: 11, fontSize: 13, zIndex: 5 }}></i>
                  <select className="form-select ps-4 py-2 rounded-3 border-0 bg-light" style={{ fontSize: 14, fontWeight: 500 }}
                    value={form.course} onChange={e => update('course', e.target.value)}>
                    <option value="">-- কোর্স নির্বাচন করুন --</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name_bn}</option>)}
                  </select>
                </div>
                {form.course && (
                  <div className="mt-3 p-3 rounded-3 bg-primary bg-opacity-10 d-flex align-items-center gap-2">
                    <i className="bi bi-check-circle-fill text-primary"></i>
                    <span className="fw-semibold" style={{ fontSize: 13 }}>
                      {courses.find(c => c.id === Number(form.course))?.name_bn || 'নির্বাচিত'}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {step === 2 && (
              <div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary"
                    style={{ width: 32, height: 32, fontSize: 15 }}><i className="bi bi-pencil-square"></i></div>
                  <div><h6 className="fw-bold mb-0" style={{ fontSize: 14 }}>শিরোনাম ও বিবরণ</h6><small className="text-muted">সার্কুলারের মূল বিবরণ লিখুন</small></div>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" style={{ fontSize: 12 }}>সার্কুলার নম্বর</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0"><i className="bi bi-hash text-muted"></i></span>
                      <input className="form-control border-0 bg-light py-2" style={{ fontSize: 13 }}
                        value={form.circular_no}
                        onChange={e => update('circular_no', e.target.value)} placeholder="যেমন: BRTC/সার্কুলার/২০২৬/০১" />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold" style={{ fontSize: 12 }}>সংস্করণ</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0"><i className="bi bi-layers text-muted"></i></span>
                      <input type="number" className="form-control border-0 bg-light py-2" style={{ fontSize: 13 }}
                        min={1} value={form.edition} onChange={e => update('edition', e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="mb-2">
                  <label className="form-label fw-semibold" style={{ fontSize: 12 }}>শিরোনাম (বাংলায়)</label>
                  <BanglaInput className="form-control border-0 bg-light py-2" style={{ fontSize: 13 }}
                    value={form.title_bn} onChange={e => update('title_bn', e.target.value)}
                    placeholder="বাংলায় শিরোনাম লিখুন" />
                </div>
                <div className="mb-2">
                  <label className="form-label fw-semibold" style={{ fontSize: 12 }}>শিরোনাম (ইংরেজিতে)</label>
                  <input className="form-control border-0 bg-light py-2" style={{ fontSize: 13 }}
                    value={form.title_en} onChange={e => update('title_en', e.target.value)}
                    placeholder="ইংরেজিতে শিরোনাম লিখুন (ঐচ্ছিক)" />
                </div>
                <div className="mb-2">
                  <label className="form-label fw-semibold" style={{ fontSize: 12 }}>বিবরণ</label>
                  <BanglaInput as="textarea" className="form-control border-0 bg-light" style={{ fontSize: 13 }}
                    rows={3} value={form.description}
                    onChange={e => update('description', e.target.value)}
                    placeholder="সার্কুলারের বিস্তারিত বিবরণ লিখুন" />
                </div>
              </div>
            )}
            
            {step === 3 && (
              <div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary"
                    style={{ width: 32, height: 32, fontSize: 15 }}><i className="bi bi-calendar-event"></i></div>
                  <div><h6 className="fw-bold mb-0" style={{ fontSize: 14 }}>তারিখ নির্ধারণ</h6><small className="text-muted">আবেদন ও প্রশিক্ষণের সময়সীমা নির্ধারণ করুন</small></div>
                </div>
                <div className="p-3 rounded-3 bg-light mb-2">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-send text-primary"></i>
                    <span className="fw-semibold" style={{ fontSize: 13 }}>আবেদনের সময়সীমা</span>
                  </div>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label" style={{ fontSize: 12 }}>শুরুর তারিখ</label>
                      <input type="date" className="form-control border-0 bg-white py-2 shadow-sm" style={{ fontSize: 13, borderRadius: 10 }}
                        value={form.application_start_date} onChange={e => update('application_start_date', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" style={{ fontSize: 12 }}>শেষ তারিখ</label>
                      <input type="date" className="form-control border-0 bg-white py-2 shadow-sm" style={{ fontSize: 13, borderRadius: 10 }}
                        value={form.application_end_date} onChange={e => update('application_end_date', e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-3 bg-light">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-mortarboard text-success"></i>
                    <span className="fw-semibold" style={{ fontSize: 13 }}>প্রশিক্ষণের সময়সীমা</span>
                  </div>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label" style={{ fontSize: 12 }}>শুরুর তারিখ</label>
                      <input type="date" className="form-control border-0 bg-white py-2 shadow-sm" style={{ fontSize: 13, borderRadius: 10 }}
                        value={form.training_start_date} onChange={e => update('training_start_date', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" style={{ fontSize: 12 }}>শেষ তারিখ</label>
                      <input type="date" className="form-control border-0 bg-white py-2 shadow-sm" style={{ fontSize: 13, borderRadius: 10 }}
                        value={form.training_end_date} onChange={e => update('training_end_date', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {step === 4 && (
              <div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary"
                    style={{ width: 32, height: 32, fontSize: 15 }}><i className="bi bi-list-check"></i></div>
                  <div>
                    <h6 className="fw-bold mb-0" style={{ fontSize: 14 }}>প্রিলিমিনারি চেকলিস্ট</h6>
                    <small className="text-muted">আবেদনকারীদের জন্য প্রাথমিক যাচাইয়ের শর্ত নির্ধারণ করুন</small>
                  </div>
                </div>
                {checklistItems.length === 0 && (
                  <div className="text-center py-4 px-3 rounded-3 border border-dashed bg-light mb-2">
                    <i className="bi bi-clipboard-plus text-muted" style={{ fontSize: 28 }}></i>
                    <p className="text-muted mt-2 mb-2" style={{ fontSize: 13 }}>কোনো চেকলিস্ট আইটেম যোগ করা হয়নি</p>
                  </div>
                )}
                {checklistItems.map((item, i) => (
                  <div key={i} className="card mb-2 border-0 shadow-sm" style={{ borderRadius: 12 }}>
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-primary rounded-pill px-2" style={{ fontSize: 11 }}>আইটেম {i + 1}</span>
                          <span className="badge bg-light text-dark rounded-pill" style={{ fontSize: 11 }}>
                            <i className={`bi ${CRITERIA_TYPES.find(ct => ct.value === item.criteria_type)?.icon || 'bi-gear'} me-1`}></i>
                            {CRITERIA_TYPES.find(ct => ct.value === item.criteria_type)?.label}
                          </span>
                        </div>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-outline-secondary border-0" onClick={() => moveItem(i, -1)} disabled={i === 0}
                            style={{ borderRadius: 8 }}><i className="bi bi-chevron-up"></i></button>
                          <button className="btn btn-sm btn-outline-secondary border-0" onClick={() => moveItem(i, 1)} disabled={i === checklistItems.length - 1}
                            style={{ borderRadius: 8 }}><i className="bi bi-chevron-down"></i></button>
                          <button className="btn btn-sm btn-outline-danger border-0" onClick={() => removeChecklistItem(i)}
                            style={{ borderRadius: 8 }}><i className="bi bi-trash"></i></button>
                        </div>
                      </div>
                      <div className="row g-2">
                        <div className="col-md-4">
                          <select className="form-select form-select-sm bg-light border-0" style={{ fontSize: 12 }}
                            value={item.criteria_type} onChange={e => updateChecklistItem(i, 'criteria_type', e.target.value)}>
                            {CRITERIA_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                          </select>
                        </div>
                        <div className="col-md-4">
                          <input className="form-control form-control-sm bg-light border-0" style={{ fontSize: 12 }}
                            placeholder="লেবেল (বাংলায়)" value={item.label_bn}
                            onChange={e => updateChecklistItem(i, 'label_bn', e.target.value)} />
                        </div>
                        <div className="col-md-4">
                          <input className="form-control form-control-sm bg-light border-0" style={{ fontSize: 12 }}
                            placeholder="লেবেল (ইংরেজি, ঐচ্ছিক)" value={item.label_en}
                            onChange={e => updateChecklistItem(i, 'label_en', e.target.value)} />
                        </div>
                        <div className="col-md-3">
                          <select className="form-select form-select-sm bg-light border-0" style={{ fontSize: 12 }}
                            value={item.operator} onChange={e => updateChecklistItem(i, 'operator', e.target.value)}>
                            {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                          </select>
                        </div>
                        <div className="col-md-3">
                          <input className="form-control form-control-sm bg-light border-0" style={{ fontSize: 12 }}
                            placeholder="প্রত্যাশিত মান" value={item.expected_value}
                            onChange={e => updateChecklistItem(i, 'expected_value', e.target.value)} />
                        </div>
                        <div className="col-md-2">
                          <input className="form-control form-control-sm bg-light border-0" style={{ fontSize: 12 }}
                            type="number" placeholder="স্কোর" value={item.score}
                            onChange={e => updateChecklistItem(i, 'score', e.target.value)} />
                        </div>
                        <div className="col-md-2 d-flex align-items-center">
                          <div className="form-check">
                            <input className="form-check-input" type="checkbox" id={`req-${i}`}
                              checked={item.required} onChange={e => updateChecklistItem(i, 'required', e.target.checked)} />
                            <label className="form-check-label small" htmlFor={`req-${i}`}>বাধ্যতামূলক</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button className="btn btn-outline-primary btn-sm rounded-pill px-3" onClick={addChecklistItem}
                  style={{ fontSize: 12 }}>
                  <i className="bi bi-plus-lg me-1"></i>আইটেম যোগ করুন
                </button>
              </div>
            )}
            
            {step === 5 && (
              <div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary"
                    style={{ width: 32, height: 32, fontSize: 15 }}><i className="bi bi-people"></i></div>
                  <div><h6 className="fw-bold mb-0" style={{ fontSize: 14 }}>আসন, ফি ও অটো-স্ক্রিন</h6><small className="text-muted">চূড়ান্ত সেটিংস নির্ধারণ করুন</small></div>
                </div>
                <div className="row g-2 mb-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold" style={{ fontSize: 12 }}>মোট আসন সংখ্যা</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0"><i className="bi bi-person-badge text-muted"></i></span>
                      <input type="number" className="form-control border-0 bg-light py-2" style={{ fontSize: 13 }}
                        min={1} value={form.total_seats} onChange={e => update('total_seats', e.target.value)} placeholder="যেমন: 30" />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold" style={{ fontSize: 12 }}>কোর্স ফি (ঐচ্ছিক)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0"><i className="bi bi-currency-taka text-muted"></i></span>
                      <input type="number" className="form-control border-0 bg-light py-2" style={{ fontSize: 13 }}
                        min={0} value={form.fee} onChange={e => update('fee', e.target.value)} placeholder="ডিফল্ট" />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold" style={{ fontSize: 12 }}>ন্যূনতম স্কোর</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0"><i className="bi bi-filter-circle text-muted"></i></span>
                      <input type="number" className="form-control border-0 bg-light py-2" style={{ fontSize: 13 }}
                        min={0} value={form.auto_screen_min_score}
                        onChange={e => update('auto_screen_min_score', e.target.value)}
                        placeholder={`সর্বোচ্চ: ${checklistItems.reduce((s, i) => s + Number(i.score || 0), 0)}`} />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-3 bg-light mb-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-diagram-3 text-primary"></i>
                    <span className="fw-semibold" style={{ fontSize: 13 }}>রাউটিং, ওভারফ্লো ও ওয়েটলিস্ট</span>
                  </div>
                  <div className="row g-2">
                    <div className="col-md-3">
                      <label className="form-label" style={{ fontSize: 12 }}>ডিফল্ট ওভারফ্লো (%)</label>
                      <input type="number" min="0" max="100" step="0.01" className="form-control border-0 bg-white py-2 shadow-sm" style={{ fontSize: 13, borderRadius: 10 }}
                        value={form.default_overflow_percentage} onChange={e => update('default_overflow_percentage', e.target.value)} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label" style={{ fontSize: 12 }}>w₁ (আসন ওজন)</label>
                      <input type="number" min="0" max="1" step="0.05" className="form-control border-0 bg-white py-2 shadow-sm" style={{ fontSize: 13, borderRadius: 10 }}
                        value={form.routing_weight_seats} onChange={e => update('routing_weight_seats', e.target.value)} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label" style={{ fontSize: 12 }}>w₂ (দূরত্ব ওজন)</label>
                      <input type="number" min="0" max="1" step="0.05" className="form-control border-0 bg-white py-2 shadow-sm" style={{ fontSize: 13, borderRadius: 10 }}
                        value={form.routing_weight_distance} onChange={e => update('routing_weight_distance', e.target.value)} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label" style={{ fontSize: 12 }}>w₃ (মেধা ওজন)</label>
                      <input type="number" min="0" max="1" step="0.05" className="form-control border-0 bg-white py-2 shadow-sm" style={{ fontSize: 13, borderRadius: 10 }}
                        value={form.routing_weight_merit} onChange={e => update('routing_weight_merit', e.target.value)} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label" style={{ fontSize: 12 }}>ওয়েটলিস্ট বৈধতা (দিন)</label>
                      <input type="number" min="1" className="form-control border-0 bg-white py-2 shadow-sm" style={{ fontSize: 13, borderRadius: 10 }}
                        value={form.waitlist_validity_days} onChange={e => update('waitlist_validity_days', e.target.value)} />
                    </div>
                  </div>
                </div>

                {checklistItems.length > 0 && (
                  <div className="p-3 rounded-3 bg-primary bg-opacity-10 mb-2" style={{ fontSize: 12 }}>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <i className="bi bi-clipboard-check text-primary"></i>
                      <span className="fw-semibold">চেকলিস্ট সারসংক্ষেপ</span>
                    </div>
                    <div className="d-flex gap-3 mt-2">
                      <span>মোট আইটেম: <strong>{checklistItems.length}</strong></span>
                      <span>সর্বোচ্চ স্কোর: <strong>{checklistItems.reduce((s, i) => s + Number(i.score || 0), 0)}</strong></span>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-3" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-file-text text-primary"></i>
                    <span className="fw-semibold" style={{ fontSize: 13 }}>সারসংক্ষেপ</span>
                  </div>
                  <table style={{ fontSize: 12, width: '100%' }}>
                    <tbody>
                      <tr><td className="text-muted py-1" style={{ width: 80 }}>কেন্দ্র</td><td className="fw-semibold py-1">{allCenters ? 'সব কেন্দ্র' : form.eligible_centers.map(id => centers.find(c => c.id === id)?.code).filter(Boolean).join(', ') || '-'}</td></tr>
                      <tr><td className="text-muted py-1">কোর্স</td><td className="fw-semibold py-1">{courses.find(c => c.id === Number(form.course))?.name_bn || '-'}</td></tr>
                      <tr><td className="text-muted py-1">শিরোনাম</td><td className="fw-semibold py-1">{form.title_bn || '-'}</td></tr>
                      <tr><td className="text-muted py-1">আবেদন</td><td className="fw-semibold py-1">{form.application_start_date || '?'} → {form.application_end_date || '?'}</td></tr>
                      <tr><td className="text-muted py-1">প্রশিক্ষণ</td><td className="fw-semibold py-1">{form.training_start_date || '?'} → {form.training_end_date || '?'}</td></tr>
                      <tr><td className="text-muted py-1">আসন</td><td className="fw-semibold py-1">{form.total_seats || '?'}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer border-0 pt-0 px-4 pb-3">
            <div className="d-flex justify-content-between w-100">
              <button className="btn btn-outline-secondary rounded-pill px-3" style={{ fontSize: 13 }}
                onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
                <i className="bi bi-arrow-left me-1"></i>পূর্ববর্তী
              </button>
              {step < STEPS.length - 1 ? (
                <button className="btn btn-primary rounded-pill px-4 shadow-sm" style={{ fontSize: 13 }}
                  onClick={() => setStep(s => s + 1)}>
                  পরবর্তী<i className="bi bi-arrow-right ms-1"></i>
                </button>
              ) : (
                <button className="btn btn-success rounded-pill px-4 shadow-sm" style={{ fontSize: 13 }}
                  onClick={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <><span className="spinner-border spinner-border-sm me-1"></span>সংরক্ষণ...</>
                  ) : (
                    <><i className={`bi ${editData ? 'bi-check-lg' : 'bi-check2-circle'} me-1`}></i>{editData ? 'হালনাগাদ' : 'তৈরি করুন'}</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
