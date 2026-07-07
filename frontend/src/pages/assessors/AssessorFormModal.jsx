import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { convertToBanglaDigits, formatNumber } from '../../utils/numberFormatter';

const STEPS = [
  { key: 'basic', label: 'মৌলিক তথ্য', icon: 'bi-person-badge' },
  { key: 'professional', label: 'পেশাগত তথ্য', icon: 'bi-briefcase' },
  { key: 'review', label: 'পর্যালোচনা', icon: 'bi-check2-circle' },
];

const BANGLA_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
const days = Array.from({ length: 31 }, (_, i) => i + 1);

function parseDate(dateStr) {
  if (!dateStr) return { day: '', month: '', year: '' };
  const [y, m, d] = dateStr.split('-');
  return { day: d || '', month: m || '', year: y || '' };
}

function formatDate(day, month, year) {
  if (!day || !month || !year) return '';
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

const defaultForm = {
  email: '', password: '', full_name_bn: '', full_name_en: '',
  phone: '', nid: '', birth_certificate_no: '',
  date_of_birth: '', father_name_bn: '', mother_name_bn: '',
  education: '', education_qualification: '', years_of_experience: 0, expertise_area: '',
  certification: '', bank_account_no: '', bank_name: '',
};

export default function AssessorFormModal({ show, editData, onClose, onSaved }) {
  const [form, setForm] = useState(defaultForm);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [educations, setEducations] = useState([]);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (show) {
      setStep(1);
      if (editData) {
        const u = editData.user || {};
        const dob = parseDate(editData.date_of_birth || '');
        setForm({
          email: u.email || '', password: '',
          full_name_bn: u.full_name_bn || '', full_name_en: u.full_name_en || '',
          phone: u.phone || '', nid: editData.nid || '',
          birth_certificate_no: editData.birth_certificate_no || '',
          date_of_birth: editData.date_of_birth || '',
          dobDay: dob.day, dobMonth: dob.month, dobYear: dob.year,
          father_name_bn: editData.father_name_bn || '', mother_name_bn: editData.mother_name_bn || '',
          education: editData.education || '',
          education_qualification: editData.education_qualification || '',
          years_of_experience: editData.years_of_experience || 0,
          expertise_area: editData.expertise_area || '',
          certification: editData.certification || '',
          bank_account_no: editData.bank_account_no || '', bank_name: editData.bank_name || '',
        });
      } else {
        setForm({ ...defaultForm, dobDay: '', dobMonth: '', dobYear: '' });
      }
      api.get('/public/educations/').then(r => setEducations(r.data)).catch(() => {});
    }
  }, [show, editData]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  if (!show) return null;

  const isEdit = Boolean(editData);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const progress = (step / STEPS.length) * 100;

  const setDob = (field, value) => {
    const updated = { ...form, [field]: value };
    const dobStr = formatDate(updated.dobDay, updated.dobMonth, updated.dobYear);
    updated.date_of_birth = dobStr;
    setForm(updated);
  };

  const canNext = () => {
    if (step === 1) {
      if (!form.email) { toast.warning('ইমেইল দেওয়া আবশ্যক। দয়া করে ইমেইল ঠিকানা দিন।'); return false; }
      if (!form.full_name_bn) { toast.warning('বাংলা নাম দেওয়া আবশ্যক। দয়া করে বাংলায় নাম লিখুন।'); return false; }
      if (!form.phone || form.phone.length < 11) { toast.warning('সঠিক ফোন নম্বর দিন। ফোন নম্বর ১১ ডিজিটের হতে হবে।'); return false; }
      if (!form.nid) { toast.warning('এনআইডি নম্বর দেওয়া আবশ্যক। দয়া করে এনআইডি নম্বর দিন।'); return false; }
    }
    if (step === 2) {
      if (!form.date_of_birth) { toast.warning('জন্ম তারিখ নির্বাচন করুন। দয়া করে দিন, মাস ও বছর নির্বাচন করুন।'); return false; }
    }
    return true;
  };

  const handleSave = async () => {
    if (!form.date_of_birth) return toast.warning('জন্ম তারিখ নির্বাচন করুন।');

    setSaving(true);
    try {
      const payload = {
        nid: form.nid,
        birth_certificate_no: form.birth_certificate_no || undefined,
        date_of_birth: form.date_of_birth,
        father_name_bn: form.father_name_bn || undefined,
        mother_name_bn: form.mother_name_bn || undefined,
        education: form.education || undefined,
        education_qualification: form.education_qualification || undefined,
        years_of_experience: form.years_of_experience,
        expertise_area: form.expertise_area || undefined,
        certification: form.certification || undefined,
        bank_account_no: form.bank_account_no || undefined,
        bank_name: form.bank_name || undefined,
      };
      if (isEdit) {
        await api.put(`/assessors/${editData.id}/`, {
          ...payload,
          full_name_bn: form.full_name_bn,
          full_name_en: form.full_name_en || undefined,
          phone: form.phone,
        });
        toast.success('মূল্যায়নকারীর তথ্য হালনাগাদ করা হয়েছে।');
      } else {
        const userRes = await api.post('/users/', {
          email: form.email, password: form.password || 'assessor@123',
          user_type: 'assessor', full_name_bn: form.full_name_bn,
          full_name_en: form.full_name_en || undefined, phone: form.phone,
          nid: form.nid, birth_certificate_no: form.birth_certificate_no || undefined,
          is_active: true,
        });
        await api.post('/assessors/', { user: userRes.data.id, ...payload });
        toast.success('নতুন মূল্যায়নকারী সফলভাবে তৈরি করা হয়েছে।');
      }
      onSaved();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msgs = Object.entries(data).map(([field, msgs]) => {
          const label = { email: 'ইমেইল', nid: 'এনআইডি', phone: 'ফোন', assessor_no: 'মূল্যায়নকারী নং', date_of_birth: 'জন্ম তারিখ' }[field] || field;
          return `${label}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`;
        });
        toast.error(msgs.join(' | '));
      } else {
        toast.error('সংরক্ষণ ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal d-block" style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered" style={{ maxWidth: 720 }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16, overflow: 'hidden' }}>
          <div className="modal-header border-0 pb-0" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' }}>
            <div className="w-100 py-2 px-1">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="text-white mb-0 fw-bold" style={{ fontSize: 17 }}>
                    <i className={`bi ${isEdit ? 'bi-pencil-square' : 'bi-person-plus'} me-2`}></i>
                    {isEdit ? 'মূল্যায়নকারী সম্পাদনা' : 'নতুন মূল্যায়নকারী'}
                  </h5>
                  <small className="text-white text-opacity-75">ধাপ {step} / {STEPS.length}</small>
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
                const idx = i + 1;
                const completed = idx < step;
                const active = idx === step;
                return (
                  <div key={s.key}
                    onClick={() => idx < step && setStep(idx)}
                    style={{ flex: 1, cursor: idx < step ? 'pointer' : 'default' }}>
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
            {step === 1 && (
              <div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary"
                    style={{ width: 32, height: 32, fontSize: 15 }}><i className="bi bi-person-badge"></i></div>
                  <div><h6 className="fw-bold mb-0" style={{ fontSize: 14 }}>মৌলিক তথ্য</h6><small className="text-muted">মূল্যায়নকারীর বেসিক তথ্য দিন</small></div>
                </div>

                <div className="p-3 rounded-3 bg-light mb-3">
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>ইমেইল <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <span className="input-group-text bg-white border-0"><i className="bi bi-envelope text-muted"></i></span>
                        <input className="form-control border-0 bg-white py-2" style={{ fontSize: 13 }}
                          value={form.email} onChange={e => set('email', e.target.value)} placeholder="assessor@brtc.gov.bd"
                          disabled={isEdit} />
                      </div>
                      {isEdit && <small className="text-muted" style={{ fontSize: 10 }}>লগইন ইমেইল পরিবর্তন করা যাবে না</small>}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>বাংলা নাম <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <span className="input-group-text bg-white border-0"><i className="bi bi-person text-muted"></i></span>
                        <input className="form-control border-0 bg-white py-2" style={{ fontSize: 13 }}
                          value={form.full_name_bn} onChange={e => set('full_name_bn', e.target.value)} placeholder="বাংলায় নাম" />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>ইংরেজি নাম</label>
                      <div className="input-group">
                        <span className="input-group-text bg-white border-0"><i className="bi bi-type text-muted"></i></span>
                        <input className="form-control border-0 bg-white py-2" style={{ fontSize: 13 }}
                          value={form.full_name_en} onChange={e => set('full_name_en', e.target.value)} placeholder="English name" />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>ফোন <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <span className="input-group-text bg-white border-0"><i className="bi bi-telephone text-muted"></i></span>
                        <input className="form-control border-0 bg-white py-2" style={{ fontSize: 13 }}
                          value={form.phone} onChange={e => set('phone', e.target.value)} maxLength={11} placeholder="০১XXXXXXXXX" />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>এনআইডি <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <span className="input-group-text bg-white border-0"><i className="bi bi-credit-card text-muted"></i></span>
                        <input className="form-control border-0 bg-white py-2" style={{ fontSize: 13 }}
                          value={form.nid} onChange={e => set('nid', e.target.value)} placeholder="এনআইডি নম্বর" />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>জন্ম নিবন্ধন</label>
                      <div className="input-group">
                        <span className="input-group-text bg-white border-0"><i className="bi bi-file-text text-muted"></i></span>
                        <input className="form-control border-0 bg-white py-2" style={{ fontSize: 13 }}
                          value={form.birth_certificate_no} onChange={e => set('birth_certificate_no', e.target.value)} placeholder="জন্ম নিবন্ধন" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary"
                    style={{ width: 32, height: 32, fontSize: 15 }}><i className="bi bi-briefcase"></i></div>
                  <div><h6 className="fw-bold mb-0" style={{ fontSize: 14 }}>পেশাগত তথ্য</h6><small className="text-muted">মূল্যায়ন সংক্রান্ত তথ্য দিন</small></div>
                </div>

                <div className="p-3 rounded-3 bg-light mb-3">
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>জন্ম তারিখ <span className="text-danger">*</span></label>
                      <div className="row g-1">
                        <div className="col-4">
                          <select className="form-select border-0 bg-white py-2 shadow-sm" style={{ fontSize: 13, borderRadius: 10 }}
                            value={form.dobDay} onChange={e => setDob('dobDay', e.target.value)}>
                            <option value="">দিন</option>
                            {days.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div className="col-4">
                          <select className="form-select border-0 bg-white py-2 shadow-sm" style={{ fontSize: 13, borderRadius: 10 }}
                            value={form.dobMonth} onChange={e => setDob('dobMonth', e.target.value)}>
                            <option value="">মাস</option>
                            {BANGLA_MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                          </select>
                        </div>
                        <div className="col-4">
                          <select className="form-select border-0 bg-white py-2 shadow-sm" style={{ fontSize: 13, borderRadius: 10 }}
                            value={form.dobYear} onChange={e => setDob('dobYear', e.target.value)}>
                            <option value="">সাল</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>অভিজ্ঞতা (বছর)</label>
                      <div className="input-group">
                        <span className="input-group-text bg-white border-0"><i className="bi bi-clock-history text-muted"></i></span>
                        <input className="form-control border-0 bg-white py-2" style={{ fontSize: 13 }} type="number" min="0"
                          value={form.years_of_experience} onChange={e => set('years_of_experience', +e.target.value)} />
                      </div>
                    </div>
                    <div className="col-md-8">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>শিক্ষাগত যোগ্যতা <span className="text-danger">*</span></label>
                      <select className="form-select border-0 bg-white py-2 shadow-sm" style={{ fontSize: 13, borderRadius: 10 }}
                        value={form.education} onChange={e => set('education', e.target.value)}>
                        <option value="">শিক্ষাগত যোগ্যতা নির্বাচন করুন</option>
                        {educations.map(e => <option key={e.id} value={e.id}>{e.name_bn}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>শিক্ষাগত যোগ্যতা (বিস্তারিত)</label>
                      <textarea className="form-control border-0 bg-white py-2 shadow-sm" rows={2}
                        style={{ fontSize: 13, borderRadius: 10 }}
                        value={form.education_qualification} onChange={e => set('education_qualification', e.target.value)} placeholder="প্রযোজ্য হলে অন্যান্য যোগ্যতা উল্লেখ করুন" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>পিতার নাম</label>
                      <div className="input-group">
                        <span className="input-group-text bg-white border-0"><i className="bi bi-people text-muted"></i></span>
                        <input className="form-control border-0 bg-white py-2" style={{ fontSize: 13 }}
                          value={form.father_name_bn} onChange={e => set('father_name_bn', e.target.value)} />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>মাতার নাম</label>
                      <div className="input-group">
                        <span className="input-group-text bg-white border-0"><i className="bi bi-people text-muted"></i></span>
                        <input className="form-control border-0 bg-white py-2" style={{ fontSize: 13 }}
                          value={form.mother_name_bn} onChange={e => set('mother_name_bn', e.target.value)} />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>দক্ষতার ক্ষেত্র</label>
                      <div className="input-group">
                        <span className="input-group-text bg-white border-0"><i className="bi bi-star text-muted"></i></span>
                        <input className="form-control border-0 bg-white py-2" style={{ fontSize: 13 }}
                          value={form.expertise_area} onChange={e => set('expertise_area', e.target.value)} />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>সার্টিফিকেশন</label>
                      <div className="input-group">
                        <span className="input-group-text bg-white border-0"><i className="bi bi-award text-muted"></i></span>
                        <input className="form-control border-0 bg-white py-2" style={{ fontSize: 13 }}
                          value={form.certification} onChange={e => set('certification', e.target.value)} />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>ব্যাংক একাউন্ট</label>
                      <div className="input-group">
                        <span className="input-group-text bg-white border-0"><i className="bi bi-bank text-muted"></i></span>
                        <input className="form-control border-0 bg-white py-2" style={{ fontSize: 13 }}
                          value={form.bank_account_no} onChange={e => set('bank_account_no', e.target.value)} />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>ব্যাংকের নাম</label>
                      <input className="form-control border-0 bg-white py-2 shadow-sm" style={{ fontSize: 13, borderRadius: 10 }}
                        value={form.bank_name} onChange={e => set('bank_name', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success bg-opacity-10 text-success"
                    style={{ width: 32, height: 32, fontSize: 15 }}><i className="bi bi-check2-circle"></i></div>
                  <div><h6 className="fw-bold mb-0" style={{ fontSize: 14 }}>তথ্য পর্যালোচনা</h6><small className="text-muted">সবকিছু ঠিক আছে কিনা যাচাই করুন</small></div>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <h6 className="fw-semibold mb-2" style={{ fontSize: 12, color: '#64748b' }}>ব্যবহারকারী তথ্য</h6>
                    <div className="p-3 rounded-3 bg-light" style={{ fontSize: 12 }}>
                      {[
                        ['ইমেইল', form.email || '-'],
                        ['বাংলা নাম', form.full_name_bn],
                        ['ইংরেজি নাম', form.full_name_en || '-'],
                        ['ফোন', convertToBanglaDigits(form.phone)],
                        ['এনআইডি', convertToBanglaDigits(form.nid)],
                        ['জন্ম নিবন্ধন', form.birth_certificate_no || '-'],
                      ].map(([k, v], i) => (
                        <div key={i} className="d-flex justify-content-between py-1 border-bottom border-white">
                          <span className="text-muted">{k}</span>
                          <span className="fw-semibold">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-semibold mb-2" style={{ fontSize: 12, color: '#64748b' }}>পেশাগত তথ্য</h6>
                    <div className="p-3 rounded-3 bg-light" style={{ fontSize: 12 }}>
                      {[
                        ['জন্ম তারিখ', form.date_of_birth || '-'],
                        ['অভিজ্ঞতা', form.years_of_experience ? `${formatNumber(form.years_of_experience)} বছর` : '-'],
                        ['শিক্ষাগত যোগ্যতা', educations.find(e => e.id == form.education)?.name_bn || form.education_qualification || '-'],
                        ['শিক্ষাগত যোগ্যতা (বিস্তারিত)', form.education_qualification || '-'],
                        ['পিতার নাম', form.father_name_bn || '-'],
                        ['মাতার নাম', form.mother_name_bn || '-'],
                        ['দক্ষতার ক্ষেত্র', form.expertise_area || '-'],
                        ['সার্টিফিকেশন', form.certification || '-'],
                      ].map(([k, v], i) => (
                        <div key={i} className="d-flex justify-content-between py-1 border-bottom border-white">
                          <span className="text-muted">{k}</span>
                          <span className="fw-semibold">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer border-0 pt-0 px-4 pb-3">
            <div className="d-flex justify-content-between w-100">
              <div>
                {step > 1 && (
                  <button className="btn btn-outline-secondary rounded-pill px-3" style={{ fontSize: 13 }}
                    onClick={() => setStep(s => s - 1)} disabled={saving}>
                    <i className="bi bi-arrow-left me-1"></i>পিছনে
                  </button>
                )}
              </div>
              {step < STEPS.length ? (
                <button className="btn btn-primary rounded-pill px-4 shadow-sm" style={{ fontSize: 13 }}
                  onClick={() => canNext() && setStep(s => s + 1)}>
                  পরবর্তী<i className="bi bi-arrow-right ms-1"></i>
                </button>
              ) : (
                <button className="btn btn-success rounded-pill px-4 shadow-sm" style={{ fontSize: 13 }}
                  onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <><span className="spinner-border spinner-border-sm me-1"></span>সংরক্ষণ...</>
                  ) : (
                    <><i className={`bi ${isEdit ? 'bi-check-lg' : 'bi-check2-circle'} me-1`}></i>{isEdit ? 'হালনাগাদ' : 'সংরক্ষণ'}</>
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
