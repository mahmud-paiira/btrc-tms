import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from '../../hooks/useTranslation';
import traineeService from '../../services/traineeService';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = [
  { v: 'male', l: 'পুরুষ' },
  { v: 'female', l: 'মহিলা' },
  { v: 'other', l: 'অন্যান্য' },
];

export default function TraineeProfile() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // password change
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    traineeService.getMe()
      .then(({ data }) => {
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
      toast.success(t('trainee.profile.updateSuccess', 'প্রোফাইল সফলভাবে আপডেট হয়েছে'));
    } catch {
      toast.error(t('trainee.profile.updateFailed', 'আপডেট করতে ব্যর্থ'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwSaving(true);
    try {
      await traineeService.changePassword(pwForm);
      toast.success(t('trainee.profile.passwordChanged', 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে'));
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

  return (
    <div style={{ fontFamily: 'NikoshBAN, sans-serif' }}>
      <h4 className="mb-4">{t('nav.profile', 'প্রোফাইল')}</h4>

      <div className="row g-4">
        {/* Personal info */}
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white"><h6 className="mb-0"><i className="bi bi-person me-2"></i>{t('trainee.profile.personalInfo', 'ব্যক্তিগত তথ্য')}</h6></div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-2">
                  <label className="form-label">{t('trainee.profile.photo', 'ছবি')}</label>
                  <div className="d-flex align-items-center gap-3">
                    {profile?.profile_image ? (
                      <img src={profile.profile_image} alt="" className="rounded-circle" style={{ width: 64, height: 64, objectFit: 'cover' }} />
                    ) : (
                      <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center" style={{ width: 64, height: 64, fontSize: 28 }}>
                        <i className="bi bi-person-fill"></i>
                      </div>
                    )}
                    <input type="file" className="form-control form-control-sm" accept="image/*" onChange={(e) => setProfileImage(e.target.files[0])} />
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label">{t('trainee.profile.nameBn', 'নাম (বাংলা)')}</label>
                  <input name="full_name_bn" className="form-control" value={form.full_name_bn} onChange={handleChange} />
                </div>
                <div className="mb-2">
                  <label className="form-label">{t('trainee.profile.nameEn', 'নাম (ইংরেজি)')}</label>
                  <input name="full_name_en" className="form-control" value={form.full_name_en} onChange={handleChange} />
                </div>
                <div className="mb-2">
                  <label className="form-label">{t('trainee.profile.mobile', 'মোবাইল')}</label>
                  <input name="phone" className="form-control" value={form.phone} onChange={handleChange} />
                </div>
                <div className="mb-2">
                  <label className="form-label">{t('trainee.profile.registrationNo', 'রেজিস্ট্রেশন নং')}</label>
                  <input className="form-control" value={profile?.registration_no || ''} disabled />
                </div>
                <div className="mb-2">
                  <label className="form-label">{t('trainee.profile.email', 'ইমেইল')}</label>
                  <input className="form-control" value={profile?.email || ''} disabled />
                </div>

                <button type="submit" className="btn btn-primary mt-2" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                  {t('trainee.profile.save', 'সংরক্ষণ')}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Banking info */}
        <div className="col-md-6">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-success text-white"><h6 className="mb-0"><i className="bi bi-bank me-2"></i>{t('trainee.profile.bankInfo', 'ব্যাংক তথ্য')}</h6></div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-2">
                  <label className="form-label">{t('trainee.profile.bankAccount', 'ব্যাংক অ্যাকাউন্ট নং')}</label>
                  <input name="bank_account_no" className="form-control" value={form.bank_account_no} onChange={handleChange} />
                </div>
                <div className="mb-2">
                  <label className="form-label">{t('trainee.profile.bankName', 'ব্যাংকের নাম')}</label>
                  <input name="bank_name" className="form-control" value={form.bank_name} onChange={handleChange} />
                </div>
                <div className="mb-2">
                  <label className="form-label">{t('trainee.profile.branch', 'শাখা')}</label>
                  <input name="bank_branch" className="form-control" value={form.bank_branch} onChange={handleChange} />
                </div>
                <h6 className="mt-3 fw-bold">{t('trainee.profile.nominee', 'মনোনীত ব্যক্তি')}</h6>
                <div className="mb-2">
                  <label className="form-label">{t('trainee.profile.nomineeName', 'নাম')}</label>
                  <input name="nominee_name" className="form-control" value={form.nominee_name} onChange={handleChange} />
                </div>
                <div className="mb-2">
                  <label className="form-label">{t('trainee.profile.nomineeRelation', 'সম্পর্ক')}</label>
                  <input name="nominee_relation" className="form-control" value={form.nominee_relation} onChange={handleChange} />
                </div>
                <div className="mb-2">
                  <label className="form-label">{t('trainee.profile.nomineeMobile', 'মোবাইল')}</label>
                  <input name="nominee_phone" className="form-control" value={form.nominee_phone} onChange={handleChange} />
                </div>
              </form>
            </div>
          </div>

          {/* Change password */}
          <div className="card shadow-sm">
            <div className="card-header bg-warning"><h6 className="mb-0"><i className="bi bi-key me-2"></i>{t('trainee.profile.changePassword', 'পাসওয়ার্ড পরিবর্তন')}</h6></div>
            <div className="card-body">
              <form onSubmit={handlePasswordChange}>
                <div className="mb-2">
                  <label className="form-label">{t('trainee.profile.currentPassword', 'বর্তমান পাসওয়ার্ড')}</label>
                  <input type="password" className="form-control" value={pwForm.old_password}
                    onChange={(e) => setPwForm((p) => ({ ...p, old_password: e.target.value }))} required />
                </div>
                <div className="mb-2">
                  <label className="form-label">{t('trainee.profile.newPassword', 'নতুন পাসওয়ার্ড')}</label>
                  <input type="password" className="form-control" value={pwForm.new_password}
                    onChange={(e) => setPwForm((p) => ({ ...p, new_password: e.target.value }))} required />
                </div>
                <div className="mb-2">
                  <label className="form-label">{t('trainee.profile.confirmPassword', 'নতুন পাসওয়ার্ড (পুনরায়)')}</label>
                  <input type="password" className="form-control" value={pwForm.confirm_password}
                    onChange={(e) => setPwForm((p) => ({ ...p, confirm_password: e.target.value }))} required />
                </div>
                <button type="submit" className="btn btn-warning mt-2" disabled={pwSaving}>
                  {pwSaving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                  {t('trainee.profile.btnChangePassword', 'পাসওয়ার্ড পরিবর্তন')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
