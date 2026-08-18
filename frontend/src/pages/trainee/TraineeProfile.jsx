import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from '../../hooks/useTranslation';
import traineeService from '../../services/traineeService';
import BanglaInput from '../../components/common/BanglaInput';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
function imageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

function DocPreview({ src, label }) {
  const [imgFailed, setImgFailed] = useState(false);
  const isPdf = src && src.toLowerCase().endsWith('.pdf');
  if (isPdf || imgFailed) {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer"
        className="d-inline-block border rounded p-3 text-decoration-none" style={{ width: 160 }}>
        <i className="bi bi-file-earmark-pdf text-danger" style={{ fontSize: 40 }}></i>
        <p className="mb-0 mt-1 small text-muted">{label}</p>
        <small className="text-primary">খুলতে ক্লিক করুন</small>
      </a>
    );
  }
  return (
    <a href={src} target="_blank" rel="noopener noreferrer">
      <img src={src} alt={label}
        className="img-thumbnail"
        style={{ height: 150, objectFit: 'cover' }}
        onError={() => setImgFailed(true)} />
    </a>
  );
}
import { convertToBanglaDigits } from '../../utils/numberFormatter';

export default function TraineeProfile() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [myApp, setMyApp] = useState(null);
  const [noTrainee, setNoTrainee] = useState(false);

  useEffect(() => {
    traineeService.getMe()
      .then(({ data }) => {
        if (!data.has_trainee) {
          setNoTrainee(true);
          setProfile(data);
          return;
        }
        setProfile(data);
        setForm({
          full_name_bn: data.full_name_bn || '',
          full_name_en: data.full_name_en || '',
          phone: data.phone || '',
          bank_account_no: data.bank_account_no || '',
          bank_name: data.bank_name || '',
          bank_branch: data.bank_branch || '',
          nominee_name: data.nominee_name || '',
          nominee_relation: data.nominee_relation || '',
          nominee_phone: data.nominee_phone || '',
        });
      })
      .catch(() => toast.error(t('trainee.profile.loadFailed', 'প্রোফাইল লোড করতে ব্যর্থ')))
      .finally(() => setLoading(false));

    traineeService.getMyApplication()
      .then(({ data }) => { if (data.has_application) setMyApp(data); })
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({
    full_name_bn: '', full_name_en: '', phone: '',
    bank_account_no: '', bank_name: '', bank_branch: '',
    nominee_name: '', nominee_relation: '', nominee_phone: '',
  });
  const [profileImage, setProfileImage] = useState(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (profileImage) fd.append('profile_image', profileImage);
      await traineeService.updateProfile(fd);
      toast.success(t('trainee.profile.updateSuccess', 'প্রোফাইল সফলভাবে আপডেট হয়েছে'));
    } catch {
      toast.error(t('trainee.profile.updateFailed', 'আপডেট করতে ব্যর্থ'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error(t('trainee.profile.passwordMismatch', 'নতুন পাসওয়ার্ড মিলছে না'));
      return;
    }
    setPwSaving(true);
    try {
      await traineeService.changePassword(pwForm);
      toast.success(t('trainee.profile.passwordChanged', 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে'));
      setPwForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || t('trainee.profile.passwordFailed', 'পাসওয়ার্ড পরিবর্তন ব্যর্থ'));
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (noTrainee) {
    return (
      <div style={{ fontFamily: 'NikoshBAN, sans-serif' }}>
        <h4 className="mb-4">{t('nav.profile', 'প্রোফাইল')}</h4>
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          {t('trainee.profile.notEnrolled', 'আপনি এখনো কোনো ব্যাচে নথিভুক্ত হননি। প্রথমে আবেদন করুন এবং নির্বাচিত হোন।')}
        </div>
        {profile && (
          <div className="card mt-3">
            <div className="card-body">
              <h6 className="card-title">ব্যবহারকারী তথ্য</h6>
              <table className="table table-sm mb-0">
                <tbody>
                  <tr><th>নাম</th><td>{profile.full_name_bn || '-'}</td></tr>
                  <tr><th>ইমেইল</th><td>{profile.email || '-'}</td></tr>
                  <tr><th>মোবাইল</th><td>{profile.phone || '-'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'NikoshBAN, sans-serif' }}>
      <h4 className="mb-4">{t('nav.profile', 'প্রোফাইল')}</h4>

      <div className="row g-4">
        {/* Left column: Personal info + Photo */}
        <div className="col-lg-8">
          {/* Profile header card */}
          <div className="profile-card mb-4">
            {profile?.profile_image ? (
              <img src={profile.profile_image} alt="" className="profile-avatar" />
            ) : (
              <div className="profile-avatar d-flex align-items-center justify-content-center"
                style={{ background: '#e0e7ff', color: '#6366f1', fontSize: 28 }}>
                <i className="bi bi-person-fill"></i>
              </div>
            )}
            <div className="profile-info">
              <h5>{profile?.full_name_bn || '-'}</h5>
              <div className="text-muted mb-2">{profile?.full_name_en || ''}</div>
              <div className="d-flex flex-wrap gap-2">
                <span className="badge bg-success">{profile?.registration_no || ''}</span>
                <span className="badge bg-primary">{profile?.center_name || ''}</span>
                {profile?.is_active && <span className="badge bg-success">{t('common.active', 'সক্রিয়')}</span>}
              </div>
            </div>
          </div>

          {/* Personal information form */}
          <div className="form-section">
            <h6>
              <i className="bi bi-person me-2"></i>
              {t('trainee.profile.personalInfo', 'ব্যক্তিগত তথ্য')}
            </h6>
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">{t('trainee.profile.nameBn', 'নাম (বাংলা)')}</label>
                  <BanglaInput name="full_name_bn" className="form-control" value={form.full_name_bn} onChange={handleChange} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    {t('trainee.profile.nameEn', 'নাম (ইংরেজি)')}
                    <span className="text-muted" style={{ fontSize: '0.7rem', marginRight: 4 }}> English only</span>
                  </label>
                  <input name="full_name_en" className="form-control" value={form.full_name_en} onChange={handleChange} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">{t('trainee.profile.mobile', 'মোবাইল')}</label>
                  <input name="phone" className="form-control" value={convertToBanglaDigits(form.phone)} onChange={handleChange} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">{t('trainee.profile.email', 'ইমেইল')}</label>
                  <input className="form-control" value={profile?.email || ''} disabled readOnly />
                </div>
                <div className="col-md-6">
                  <label className="form-label">{t('trainee.profile.registrationNo', 'রেজিস্ট্রেশন নং')}</label>
                  <input className="form-control" value={profile?.registration_no || ''} disabled readOnly />
                </div>
                <div className="col-12">
                  <label className="form-label">{t('trainee.profile.photo', 'প্রোফাইল ছবি')}</label>
                  <input type="file" className="form-control" accept="image/*" onChange={(e) => setProfileImage(e.target.files[0])} />
                </div>
              </div>
              <div className="mt-3">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving && <span className="spinner-border spinner-border-sm me-1" />}
                  <i className="bi bi-check2 me-1"></i>
                  {t('trainee.profile.save', 'সংরক্ষণ')}
                </button>
              </div>
            </form>
          </div>

          {/* Application Documents */}
          {myApp && (
            <div className="form-section mb-4">
              <h6>
                <i className="bi bi-file-earmark me-2"></i>
                {t('trainee.profile.documents', 'আবেদনকৃত নথিসমূহ')}
              </h6>
              <div className="row g-3">
                {[
                  { label: 'প্রোফাইল ছবি', src: imageUrl(myApp.profile_image) },
                  { label: 'এনআইডি (সামনে)', src: imageUrl(myApp.nid_front_image) },
                  { label: 'এনআইডি (পেছনে)', src: imageUrl(myApp.nid_back_image) },
                  { label: 'শিক্ষাগত সনদপত্র', src: imageUrl(myApp.education_certificate) },
                  { label: 'সরকারি চাকুরির সনদপত্র', src: imageUrl(myApp.govt_job_certificate) },
                ].map(({ label, src }) => (
                  <div className="col-md-4 text-center" key={label}>
                    <h6 className="fw-bold mb-2 text-muted small">{label}</h6>
                    {src ? <DocPreview src={src} label={label} /> : (
                      <div className="border rounded p-3 text-muted small">কোনো নথি নেই</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Banking + Password */}
        <div className="col-lg-4">
          {/* Banking info */}
          <div className="form-section mb-4">
            <h6>
              <i className="bi bi-bank me-2"></i>
              {t('trainee.profile.bankInfo', 'ব্যাংক তথ্য')}
            </h6>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">{t('trainee.profile.bankAccount', 'ব্যাংক অ্যাকাউন্ট নং')}</label>
                <input name="bank_account_no" className="form-control" value={convertToBanglaDigits(form.bank_account_no)} onChange={handleChange} />
              </div>
              <div className="mb-3">
                <label className="form-label">{t('trainee.profile.bankName', 'ব্যাংকের নাম')}</label>
                <input name="bank_name" className="form-control" value={form.bank_name} onChange={handleChange} />
              </div>
              <div className="mb-3">
                <label className="form-label">{t('trainee.profile.branch', 'শাখা')}</label>
                <input name="bank_branch" className="form-control" value={form.bank_branch} onChange={handleChange} />
              </div>

              <h6 className="mt-3 mb-3">
                <i className="bi bi-person me-2"></i>
                {t('trainee.profile.nominee', 'মনোনীত ব্যক্তি')}
              </h6>
              <div className="mb-3">
                <label className="form-label">{t('trainee.profile.nomineeName', 'নাম')}</label>
                <input name="nominee_name" className="form-control" value={form.nominee_name} onChange={handleChange} />
              </div>
              <div className="mb-3">
                <label className="form-label">{t('trainee.profile.nomineeRelation', 'সম্পর্ক')}</label>
                <input name="nominee_relation" className="form-control" value={form.nominee_relation} onChange={handleChange} />
              </div>
              <div className="mb-3">
                <label className="form-label">{t('trainee.profile.nomineeMobile', 'মোবাইল')}</label>
                <input name="nominee_phone" className="form-control" value={convertToBanglaDigits(form.nominee_phone)} onChange={handleChange} />
              </div>
              <button type="submit" className="btn btn-primary w-100" disabled={saving}>
                {saving && <span className="spinner-border spinner-border-sm me-1" />}
                <i className="bi bi-check2 me-1"></i>
                {t('trainee.profile.save', 'সংরক্ষণ')}
              </button>
            </form>
          </div>

          {/* Change password */}
          <div className="password-section">
            <h6>
              <i className="bi bi-shield-lock me-2"></i>
              {t('trainee.profile.changePassword', 'পাসওয়ার্ড পরিবর্তন')}
            </h6>
            <form onSubmit={handlePasswordChange}>
              <div className="mb-3">
                <label className="form-label">{t('trainee.profile.currentPassword', 'বর্তমান পাসওয়ার্ড')}</label>
                <input type="password" className="form-control" value={pwForm.old_password}
                  onChange={(e) => setPwForm((p) => ({ ...p, old_password: e.target.value }))} required />
              </div>
              <div className="mb-3">
                <label className="form-label">{t('trainee.profile.newPassword', 'নতুন পাসওয়ার্ড')}</label>
                <input type="password" className="form-control" value={pwForm.new_password}
                  onChange={(e) => setPwForm((p) => ({ ...p, new_password: e.target.value }))} required />
              </div>
              <div className="mb-3">
                <label className="form-label">{t('trainee.profile.confirmPassword', 'নতুন পাসওয়ার্ড (পুনরায়)')}</label>
                <input type="password" className="form-control" value={pwForm.confirm_password}
                  onChange={(e) => setPwForm((p) => ({ ...p, confirm_password: e.target.value }))} required />
              </div>
              <button type="submit" className="btn btn-danger w-100" disabled={pwSaving}>
                {pwSaving && <span className="spinner-border spinner-border-sm me-1" />}
                <i className="bi bi-key me-1"></i>
                {t('trainee.profile.btnChangePassword', 'পাসওয়ার্ড পরিবর্তন')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
