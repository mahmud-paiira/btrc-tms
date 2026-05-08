import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useTranslation } from '../../../hooks/useTranslation';

const SETTING_GROUPS = [
  { key: 'training', label: 'প্রশিক্ষণের নিয়ম', icon: 'bi-book', settings: ['attendance_requirement', 'passing_marks'] },
  { key: 'security', label: 'নিরাপত্তা', icon: 'bi-shield-lock', settings: ['session_timeout_hours', 'password_min_length', 'password_require_uppercase', 'password_require_lowercase', 'password_require_number', 'password_require_special', 'max_login_attempts'] },
  { key: 'mfa', label: 'MFA কনফিগারেশন', icon: 'bi-shield-check', settings: ['mfa_required'] },
  { key: 'backup', label: 'ব্যাকআপ সময়সূচী', icon: 'bi-cloud-arrow-up', settings: ['backup_enabled', 'backup_time'] },
];

export default function SystemSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hoService.getSystemSettings();
      const map = {};
      (res.data || []).forEach(s => { map[s.key] = s; });
      setSettings(map);
    } catch { toast.error('সেটিংস লোড ব্যর্থ'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async (key, value) => {
    setSaving(key);
    try {
      await hoService.updateSystemSetting(key, { key, value: String(value) });
      toast.success(`"${key}" হালনাগাদ করা হয়েছে`);
      fetchSettings();
    } catch (err) {
      const msg = err.response?.data?.value?.[0] || 'সংরক্ষণ ব্যর্থ';
      toast.error(msg);
    } finally { setSaving(null); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border" /></div>;

  return (
    <div>
      <h5 className="fw-bold mb-3"><i className="bi bi-gear me-2"></i>সিস্টেম সেটিংস</h5>
      <div className="row g-3">
        {SETTING_GROUPS.map(group => (
          <div key={group.key} className="col-md-6">
            <div className="card shadow-sm h-100" style={{ borderRadius: 12, border: 'none' }}>
              <div className="card-header bg-white fw-semibold d-flex align-items-center gap-2" style={{ borderRadius: '12px 12px 0 0' }}>
                <i className={`bi ${group.icon} text-primary`}></i>
                {group.label}
              </div>
              <div className="card-body">
                {group.settings.map(key => {
                  const s = settings[key];
                  if (!s) return null;
                  const isBool = s.data_type === 'boolean';
                  const isInt = s.data_type === 'integer';
                  return (
                    <div key={key} className="mb-3 d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1 me-3">
                        <div style={{ fontSize: 13 }} className="fw-semibold">{key}</div>
                        <small className="text-secondary">{s.description}</small>
                      </div>
                      <div className="d-flex align-items-center gap-2" style={{ minWidth: 100 }}>
                        {isBool ? (
                          <div className="form-check form-switch mb-0">
                            <input className="form-check-input" type="checkbox"
                              checked={s.value === 'true' || s.value === 'True'}
                              onChange={e => handleSave(key, e.target.checked ? 'true' : 'false')} />
                          </div>
                        ) : (
                          <input className="form-control form-control-sm" type={isInt ? 'number' : 'text'}
                            defaultValue={s.value} style={{ width: 100 }}
                            onBlur={e => e.target.value !== s.value && handleSave(key, e.target.value)} />
                        )}
                        {saving === key && <span className="spinner-border spinner-border-sm" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
