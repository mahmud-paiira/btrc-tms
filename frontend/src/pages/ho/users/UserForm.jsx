import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useTranslation } from '../../../hooks/useTranslation';

const USER_TYPES = [
  { value: 'head_office', label: 'হেড অফিস' },
  { value: 'center_admin', label: 'কেন্দ্র প্রশাসক' },
  { value: 'trainer', label: 'প্রশিক্ষক' },
  { value: 'assessor', label: 'মূল্যায়নকারী' },
  { value: 'trainee', label: 'প্রশিক্ষণার্থী' },
];

const FORM_STEPS = ['Basic Info', 'Profile', 'Role & Permissions'];

export default function UserForm({ show, onClose, onSaved, user, centers }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
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

  const needsCenter = form.user_type !== 'head_office';
  const needsNid = ['trainer', 'assessor', 'trainee'].includes(form.user_type);

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {user ? t('users.editUser', 'ব্যবহারকারী সম্পাদনা') : t('users.createUser', 'নতুন ব্যবহারকারী')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex justify-content-center mb-4 gap-2">
          {FORM_STEPS.map((s, i) => (
            <div key={i} className={`d-flex align-items-center gap-1 ${step === i+1 ? 'text-primary fw-bold' : 'text-secondary'}`}
              style={{ cursor: step > i+1 ? 'pointer' : 'default', fontSize: 12 }}
              onClick={() => step > i+1 && setStep(i+1)}>
              <div className={`rounded-circle d-flex align-items-center justify-content-center ${step >= i+1 ? 'bg-primary text-white' : 'bg-light'}`}
                style={{ width: 24, height: 24, fontSize: 11 }}>{i + 1}</div>
              <span>{s}</span>
              {i < FORM_STEPS.length - 1 && <span className="mx-1 text-secondary">→</span>}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="row g-3">
            <div className="col-md-6">
              <Form.Label className="fw-semibold">ইমেইল *</Form.Label>
              <Form.Control type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                disabled={!!user} required />
            </div>
            <div className="col-md-6">
              <Form.Label className="fw-semibold">{t('users.type', 'ধরণ')} *</Form.Label>
              <Form.Select value={form.user_type} onChange={e => setForm({ ...form, user_type: e.target.value })}>
                {USER_TYPES.map(ut => <option key={ut.value} value={ut.value}>{ut.label}</option>)}
              </Form.Select>
            </div>
            {!user && (
              <div className="col-md-6">
                <Form.Label className="fw-semibold">{t('users.password', 'পাসওয়ার্ড')}</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control type="text" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    disabled={form.auto_generate_password} />
                </div>
                <Form.Check type="checkbox" label={t('users.autoGenerate', 'অটো জেনারেট')}
                  checked={form.auto_generate_password}
                  onChange={e => setForm({ ...form, auto_generate_password: e.target.checked })} />
              </div>
            )}
            <div className="col-md-6">
              <Form.Label className="fw-semibold">{t('users.role', 'ভূমিকা')}</Form.Label>
              <Form.Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="">{t('common.none', 'ছাড়া')}</option>
                {filteredRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Form.Select>
            </div>
            {needsCenter && (
              <div className="col-md-6">
                <Form.Label className="fw-semibold">{t('budget.center', 'কেন্দ্র')}</Form.Label>
                <Form.Select value={form.center} onChange={e => setForm({ ...form, center: e.target.value })}>
                  <option value="">{t('common.select', 'নির্বাচন করুন')}</option>
                  {centers.map(c => <option key={c.id} value={c.id}>{c.name_bn}</option>)}
                </Form.Select>
              </div>
            )}
            <div className="col-md-6">
              <Form.Label className="fw-semibold">{t('users.nameBn', 'নাম (বাংলায়)')} *</Form.Label>
              <Form.Control value={form.full_name_bn}
                onChange={e => setForm({ ...form, full_name_bn: e.target.value })} required />
            </div>
            <div className="col-md-6">
              <Form.Label className="fw-semibold">{t('users.nameEn', 'নাম (ইংরেজিতে)')} *</Form.Label>
              <Form.Control value={form.full_name_en}
                onChange={e => setForm({ ...form, full_name_en: e.target.value })} required />
            </div>
            <div className="col-md-4">
              <Form.Label className="fw-semibold">{t('users.phone', 'ফোন')} *</Form.Label>
              <Form.Control value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} required />
            </div>
            {needsNid && (
              <div className="col-md-4">
                <Form.Label className="fw-semibold">এনআইডি *</Form.Label>
                <Form.Control value={form.nid}
                  onChange={e => setForm({ ...form, nid: e.target.value })} required />
              </div>
            )}
            <div className="col-md-4">
              <Form.Label className="fw-semibold">{t('users.birthCertificate', 'জন্ম নিবন্ধন')}</Form.Label>
              <Form.Control value={form.birth_certificate_no}
                onChange={e => setForm({ ...form, birth_certificate_no: e.target.value })} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="row g-3">
            <div className="col-md-6">
              <Form.Label className="fw-semibold">{t('users.gender', 'লিঙ্গ')}</Form.Label>
              <Form.Select value={profile.gender}
                onChange={e => setProfile({ ...profile, gender: e.target.value })}>
                <option value="">{t('common.select', 'নির্বাচন করুন')}</option>
                <option value="male">পুরুষ</option>
                <option value="female">মহিলা</option>
                <option value="other">অন্যান্য</option>
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label className="fw-semibold">{t('users.dob', 'জন্ম তারিখ')}</Form.Label>
              <Form.Control type="date" value={profile.date_of_birth}
                onChange={e => setProfile({ ...profile, date_of_birth: e.target.value })} />
            </div>
            <div className="col-12">
              <Form.Label className="fw-semibold">{t('users.presentAddress', 'বর্তমান ঠিকানা')}</Form.Label>
              <Form.Control as="textarea" rows={2} value={profile.present_address}
                onChange={e => setProfile({ ...profile, present_address: e.target.value })} />
            </div>
            <div className="col-12">
              <Form.Label className="fw-semibold">{t('users.permanentAddress', 'স্থায়ী ঠিকানা')}</Form.Label>
              <Form.Control as="textarea" rows={2} value={profile.permanent_address}
                onChange={e => setProfile({ ...profile, permanent_address: e.target.value })} />
            </div>
            <div className="col-12">
              <Form.Label className="fw-semibold">{t('users.profileImage', 'প্রোফাইল ছবি')}</Form.Label>
              <Form.Control type="file" accept="image/*"
                onChange={e => setForm({ ...form, profile_image: e.target.files[0] || null })} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="mb-3">
              <Form.Label className="fw-semibold">{t('users.role', 'ভূমিকা')}</Form.Label>
              <Form.Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="">{t('common.none', 'ছাড়া')}</option>
                {filteredRoles.map(r => <option key={r.id} value={r.id}>{r.name} ({r.permission_count || 0} permissions)</option>)}
              </Form.Select>
            </div>
            {!user && (
              <Form.Check type="checkbox" label={t('users.sendWelcome', 'স্বাগতম ইমেইল পাঠান')}
                checked={form.send_welcome_email}
                onChange={e => setForm({ ...form, send_welcome_email: e.target.checked })} />
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        {step > 1 && <Button variant="outline-secondary" onClick={() => setStep(step - 1)}>
          <i className="bi bi-arrow-left me-1"></i>{t('common.back', 'পিছনে')}</Button>}
        {step < 3 ? (
          <Button variant="primary" onClick={() => setStep(step + 1)}>
            {t('common.next', 'পরবর্তী')}<i className="bi bi-arrow-right ms-1"></i></Button>
        ) : (
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="spinner-border spinner-border-sm me-1" /> : null}
            {user ? t('common.update', 'হালনাগাদ') : t('common.save', 'সংরক্ষণ')}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
