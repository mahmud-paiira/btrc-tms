import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useTranslation } from '../../../hooks/useTranslation';
import BanglaInput from '../../../components/common/BanglaInput';

const USER_TYPES = [
  { value: 'head_office', label: 'হেড অফিস', icon: 'bi-building' },
  { value: 'center_admin', label: 'কেন্দ্র প্রশাসক', icon: 'bi-shop' },
  { value: 'trainer', label: 'প্রশিক্ষক', icon: 'bi-person-workspace' },
  { value: 'assessor', label: 'মূল্যায়নকারী', icon: 'bi-clipboard-check' },
  { value: 'trainee', label: 'প্রশিক্ষণার্থী', icon: 'bi-mortarboard' },
];

const STEPS = [
  { key: 'basic', label: 'মৌলিক তথ্য', icon: 'bi-person-badge' },
  { key: 'profile', label: 'প্রোফাইল', icon: 'bi-person-lines-fill' },
  { key: 'role', label: 'ভূমিকা ও অনুমতি', icon: 'bi-shield-check' },
];

export default function UserForm({ show, onClose, onSaved, user, centers }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const bodyRef = useRef(null);

  const [form, setForm] = useState({
    email: '', password: '', auto_generate_password: false, send_welcome_email: true,
    user_type: 'trainee', center: '', role: '',
    full_name_bn: '', full_name_en: '', phone: '', nid: '', birth_certificate_no: '',
    profile_image: null,
  });
  const [profile, setProfile] = useState({
    gender: '', date_of_birth: '', present_address: '', permanent_address: '',
  });

  const filteredRoles = roles.filter(r => !r.user_type || r.user_type === form.user_type);

  useEffect(() => {
    if (user) {
      setForm({
        email: user.email || '', password: '', auto_generate_password: false, send_welcome_email: false,
        user_type: user.user_type || 'trainee', center: user.center || '', role: user.role || '',
        full_name_bn: user.full_name_bn || '', full_name_en: user.full_name_en || '',
        phone: user.phone || '', nid: user.nid || '', birth_certificate_no: user.birth_certificate_no || '',
        profile_image: null,
      });
      setProfile({
        gender: user.profile?.gender || '', date_of_birth: user.profile?.date_of_birth || '',
        present_address: user.profile?.present_address || '',
        permanent_address: user.profile?.permanent_address || '',
      });
    } else {
      setForm({
        email: '', password: '', auto_generate_password: false, send_welcome_email: true,
        user_type: 'trainee', center: '', role: '',
        full_name_bn: '', full_name_en: '', phone: '', nid: '', birth_certificate_no: '',
        profile_image: null,
      });
      setProfile({ gender: '', date_of_birth: '', present_address: '', permanent_address: '' });
    }
    setStep(1);
  }, [user, show]);

  useEffect(() => {
    hoService.listRoles().then(res => setRoles(res.data.results || res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const needsCenter = form.user_type !== 'head_office';
  const needsNid = ['trainer', 'assessor', 'trainee'].includes(form.user_type);

  const handleSubmit = async () => {
    if (!form.email || !form.full_name_bn || !form.full_name_en || !form.phone || !form.nid) {
      toast.warning(t('users.requiredFields', 'ইমেইল, নাম, ফোন ও এনআইডি আবশ্যক'));
      return;
    }
    if (needsCenter && !form.center) {
      toast.warning(t('users.centerRequired', 'কেন্দ্র নির্বাচন আবশ্যক'));
      return;
    }
    setLoading(true);
    try {
      const payload = {
        email: form.email,
        user_type: form.user_type,
        center: Number(form.center) || null,
        role: Number(form.role) || null,
        full_name_bn: form.full_name_bn,
        full_name_en: form.full_name_en,
        phone: form.phone,
        nid: form.nid,
        birth_certificate_no: form.birth_certificate_no || '',
        send_welcome_email: form.send_welcome_email,
        profile: {
          gender: profile.gender,
          date_of_birth: profile.date_of_birth || null,
          present_address: profile.present_address,
          permanent_address: profile.permanent_address,
        },
      };

      if (!user) {
        payload.auto_generate_password = form.auto_generate_password;
        if (!form.auto_generate_password) payload.password = form.password;
        await hoService.createHOUser(payload);
        toast.success(t('users.created', 'ব্যবহারকারী তৈরি করা হয়েছে'));
      } else {
        await hoService.updateHOUser(user.id, payload);
        toast.success(t('users.updated', 'হালনাগাদ করা হয়েছে'));
      }
      onSaved();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msgs = Object.values(data).flat().join(', ');
        toast.error(msgs || t('users.saveError', 'সংরক্ষণ ব্যর্থ'));
      } else {
        toast.error(t('users.saveError', 'সংরক্ষণ ব্যর্থ'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  const progress = (step / STEPS.length) * 100;

  return (
    <div className="modal d-block" style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered" style={{ maxWidth: 720 }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16, overflow: 'hidden' }}>
          <div className="modal-header border-0 pb-0" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' }}>
            <div className="w-100 py-2 px-1">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="text-white mb-0 fw-bold" style={{ fontSize: 17 }}>
                    <i className={`bi ${user ? 'bi-pencil-square' : 'bi-person-plus'} me-2`}></i>
                    {user ? t('users.editUser', 'ব্যবহারকারী সম্পাদনা') : t('users.createUser', 'নতুন ব্যবহারকারী')}
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
                  <div><h6 className="fw-bold mb-0" style={{ fontSize: 14 }}>মৌলিক তথ্য</h6><small className="text-muted">ব্যবহারকারীর বেসিক তথ্য দিন</small></div>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" style={{ fontSize: 12 }}>ইমেইল *</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0"><i className="bi bi-envelope text-muted"></i></span>
                      <input type="email" className="form-control border-0 bg-light py-2" style={{ fontSize: 13 }}
                        value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                        disabled={!!user} placeholder="user@example.com" />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" style={{ fontSize: 12 }}>{t('users.type', 'ধরণ')} *</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0"><i className="bi bi-people text-muted"></i></span>
                      <select className="form-select border-0 bg-light py-2" style={{ fontSize: 13 }}
                        value={form.user_type} onChange={e => setForm({ ...form, user_type: e.target.value })}>
                        {USER_TYPES.map(ut => <option key={ut.value} value={ut.value}>{ut.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      {USER_TYPES.map(ut => (
                        <div key={ut.value}
                          className={`d-flex align-items-center gap-1 px-3 py-1 rounded-pill border ${form.user_type === ut.value ? 'border-primary bg-primary bg-opacity-10 text-primary fw-semibold' : 'border-secondary text-muted'}`}
                          style={{ fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}
                          onClick={() => setForm({ ...form, user_type: ut.value })}>
                          <i className={`bi ${ut.icon}`}></i>
                          {ut.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {!user && (
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>{t('users.password', 'পাসওয়ার্ড')}</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-0"><i className="bi bi-lock text-muted"></i></span>
                        <input type="text" className="form-control border-0 bg-light py-2" style={{ fontSize: 13 }}
                          value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                          disabled={form.auto_generate_password} placeholder="পাসওয়ার্ড দিন" />
                      </div>
                      <div className="form-check mt-1">
                        <input className="form-check-input" type="checkbox" id="auto-gen-pass"
                          checked={form.auto_generate_password}
                          onChange={e => setForm({ ...form, auto_generate_password: e.target.checked })} />
                        <label className="form-check-label small" htmlFor="auto-gen-pass">{t('users.autoGenerate', 'অটো জেনারেট')}</label>
                      </div>
                    </div>
                  )}

                  <div className="col-md-6">
                    <label className="form-label fw-semibold" style={{ fontSize: 12 }}>{t('users.role', 'ভূমিকা')}</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0"><i className="bi bi-shield text-muted"></i></span>
                      <select className="form-select border-0 bg-light py-2" style={{ fontSize: 13 }}
                        value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                        <option value="">{t('common.none', 'ছাড়া')}</option>
                        {filteredRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {needsCenter && (
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>{t('budget.center', 'কেন্দ্র')}</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-0"><i className="bi bi-geo-alt text-muted"></i></span>
                        <select className="form-select border-0 bg-light py-2" style={{ fontSize: 13 }}
                          value={form.center} onChange={e => setForm({ ...form, center: e.target.value })}>
                          <option value="">{t('common.select', 'নির্বাচন করুন')}</option>
                          {centers.map(c => <option key={c.id} value={c.id}>{c.name_bn}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <hr className="my-3" />

                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="bi bi-person text-primary"></i>
                  <span className="fw-semibold" style={{ fontSize: 13 }}>ব্যক্তিগত তথ্য</span>
                </div>
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" style={{ fontSize: 12 }}>{t('users.nameBn', 'নাম (বাংলায়)')} *</label>
                    <BanglaInput className="form-control border-0 bg-light py-2" style={{ fontSize: 13 }}
                      value={form.full_name_bn} onChange={e => setForm({ ...form, full_name_bn: e.target.value })} placeholder="বাংলায় নাম" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" style={{ fontSize: 12 }}>{t('users.nameEn', 'নাম (ইংরেজিতে)')} *</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0"><i className="bi bi-type text-muted"></i></span>
                      <input className="form-control border-0 bg-light py-2" style={{ fontSize: 13 }}
                        value={form.full_name_en} onChange={e => setForm({ ...form, full_name_en: e.target.value })} placeholder="English name" />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold" style={{ fontSize: 12 }}>{t('users.phone', 'ফোন')} *</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0"><i className="bi bi-telephone text-muted"></i></span>
                      <input className="form-control border-0 bg-light py-2" style={{ fontSize: 13 }}
                        value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="০১XXXXXXXXX" />
                    </div>
                  </div>
                  {needsNid && (
                    <div className="col-md-4">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>এনআইডি *</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-0"><i className="bi bi-credit-card text-muted"></i></span>
                        <input className="form-control border-0 bg-light py-2" style={{ fontSize: 13 }}
                          value={form.nid} onChange={e => setForm({ ...form, nid: e.target.value })} placeholder="এনআইডি নম্বর" />
                      </div>
                    </div>
                  )}
                  <div className="col-md-4">
                    <label className="form-label fw-semibold" style={{ fontSize: 12 }}>{t('users.birthCertificate', 'জন্ম নিবন্ধন')}</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0"><i className="bi bi-file-text text-muted"></i></span>
                      <input className="form-control border-0 bg-light py-2" style={{ fontSize: 13 }}
                        value={form.birth_certificate_no} onChange={e => setForm({ ...form, birth_certificate_no: e.target.value })} placeholder="জন্ম নিবন্ধন নম্বর" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary"
                    style={{ width: 32, height: 32, fontSize: 15 }}><i className="bi bi-person-lines-fill"></i></div>
                  <div><h6 className="fw-bold mb-0" style={{ fontSize: 14 }}>প্রোফাইল</h6><small className="text-muted">ব্যবহারকারীর প্রোফাইল তথ্য সম্পূর্ণ করুন</small></div>
                </div>

                <div className="p-3 rounded-3 bg-light mb-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-info-circle text-primary"></i>
                    <span className="fw-semibold" style={{ fontSize: 13 }}>মৌলিক তথ্য</span>
                  </div>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>{t('users.gender', 'লিঙ্গ')}</label>
                      <div className="d-flex gap-2">
                        {['male', 'female', 'other'].map(g => (
                          <div key={g}
                            className={`d-flex align-items-center gap-1 px-3 py-1 rounded-pill border ${profile.gender === g ? 'border-primary bg-primary bg-opacity-10 text-primary fw-semibold' : 'border-secondary text-muted'}`}
                            style={{ fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}
                            onClick={() => setProfile({ ...profile, gender: g })}>
                            <i className={`bi ${g === 'male' ? 'bi-gender-male' : g === 'female' ? 'bi-gender-female' : 'bi-gender-ambiguous'}`}></i>
                            {g === 'male' ? 'পুরুষ' : g === 'female' ? 'মহিলা' : 'অন্যান্য'}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>{t('users.dob', 'জন্ম তারিখ')}</label>
                      <input type="date" className="form-control border-0 bg-white py-2 shadow-sm" style={{ fontSize: 13, borderRadius: 10 }}
                        value={profile.date_of_birth} onChange={e => setProfile({ ...profile, date_of_birth: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-3 bg-light mb-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-geo-alt text-primary"></i>
                    <span className="fw-semibold" style={{ fontSize: 13 }}>ঠিকানা</span>
                  </div>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>{t('users.presentAddress', 'বর্তমান ঠিকানা')}</label>
                      <textarea className="form-control border-0 bg-white py-2 shadow-sm" rows={2} style={{ fontSize: 13, borderRadius: 10 }}
                        value={profile.present_address} onChange={e => setProfile({ ...profile, present_address: e.target.value })} placeholder="বর্তমান ঠিকানা" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold" style={{ fontSize: 12 }}>{t('users.permanentAddress', 'স্থায়ী ঠিকানা')}</label>
                      <textarea className="form-control border-0 bg-white py-2 shadow-sm" rows={2} style={{ fontSize: 13, borderRadius: 10 }}
                        value={profile.permanent_address} onChange={e => setProfile({ ...profile, permanent_address: e.target.value })} placeholder="স্থায়ী ঠিকানা" />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-3 bg-light">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-image text-primary"></i>
                    <span className="fw-semibold" style={{ fontSize: 13 }}>{t('users.profileImage', 'প্রোফাইল ছবি')}</span>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-secondary bg-opacity-10 text-secondary"
                      style={{ width: 56, height: 56, fontSize: 20 }}>
                      <i className="bi bi-person"></i>
                    </div>
                    <div>
                      <input type="file" accept="image/*" id="profile-image" className="d-none"
                        onChange={e => setForm({ ...form, profile_image: e.target.files[0] || null })} />
                      <label htmlFor="profile-image" className="btn btn-outline-primary btn-sm rounded-pill" style={{ fontSize: 12 }}>
                        <i className="bi bi-upload me-1"></i>ছবি আপলোড
                      </label>
                      {form.profile_image && <span className="ms-2 small text-muted">{form.profile_image.name}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary"
                    style={{ width: 32, height: 32, fontSize: 15 }}><i className="bi bi-shield-check"></i></div>
                  <div><h6 className="fw-bold mb-0" style={{ fontSize: 14 }}>ভূমিকা ও অনুমতি</h6><small className="text-muted">ব্যবহারকারীর ভূমিকা ও বিজ্ঞপ্তি সেটিংস</small></div>
                </div>

                <div className="p-3 rounded-3 bg-light mb-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="bi bi-shield text-primary"></i>
                    <span className="fw-semibold" style={{ fontSize: 13 }}>{t('users.role', 'ভূমিকা')}</span>
                  </div>
                  <select className="form-select border-0 bg-white py-2 shadow-sm" style={{ fontSize: 13, borderRadius: 10 }}
                    value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="">{t('common.none', 'ছাড়া')}</option>
                    {filteredRoles.map(r => <option key={r.id} value={r.id}>{r.name} ({r.permission_count || 0} permissions)</option>)}
                  </select>
                  {form.role && (
                    <div className="mt-2 p-2 rounded-2 bg-primary bg-opacity-10 d-flex align-items-center gap-2">
                      <i className="bi bi-check-circle-fill text-primary small"></i>
                      <span className="small">ভূমিকা নির্বাচিত: {roles.find(r => r.id === Number(form.role))?.name}</span>
                    </div>
                  )}
                </div>

                {!user && (
                  <div className="p-3 rounded-3 bg-light">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <i className="bi bi-envelope text-primary"></i>
                      <span className="fw-semibold" style={{ fontSize: 13 }}>বিজ্ঞপ্তি</span>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="send-welcome"
                        checked={form.send_welcome_email}
                        onChange={e => setForm({ ...form, send_welcome_email: e.target.checked })} />
                      <label className="form-check-label small" htmlFor="send-welcome">
                        {t('users.sendWelcome', 'স্বাগতম ইমেইল পাঠান')}
                        <br /><span className="text-muted" style={{ fontSize: 11 }}>ব্যবহারকারীকে অ্যাকাউন্স খোলার বিজ্ঞপ্তি ইমেইল পাঠানো হবে</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer border-0 pt-0 px-4 pb-3">
            <div className="d-flex justify-content-between w-100">
              <button className="btn btn-outline-secondary rounded-pill px-3" style={{ fontSize: 13 }}
                onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>
                <i className="bi bi-arrow-left me-1"></i>{t('common.back', 'পিছনে')}
              </button>
              {step < STEPS.length ? (
                <button className="btn btn-primary rounded-pill px-4 shadow-sm" style={{ fontSize: 13 }}
                  onClick={() => setStep(s => s + 1)}>
                  {t('common.next', 'পরবর্তী')}<i className="bi bi-arrow-right ms-1"></i>
                </button>
              ) : (
                <button className="btn btn-success rounded-pill px-4 shadow-sm" style={{ fontSize: 13 }}
                  onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm me-1"></span>সংরক্ষণ...</>
                  ) : (
                    <><i className={`bi ${user ? 'bi-check-lg' : 'bi-check2-circle'} me-1`}></i>{user ? t('common.update', 'হালনাগাদ') : t('common.save', 'সংরক্ষণ')}</>
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
