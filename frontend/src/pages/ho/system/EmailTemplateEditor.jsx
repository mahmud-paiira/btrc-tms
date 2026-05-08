import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';

const VARIABLES = ['{{trainee_name}}', '{{batch_name}}', '{{course_name}}', '{{center_name}}', '{{date}}', '{{cert_no}}', '{{trainer_name}}'];

const DEFAULT_TEMPLATES = [
  { name: 'Welcome Email', subject_bn: 'BRTC TMS-এ স্বাগতম', subject_en: 'Welcome to BRTC TMS', body_bn: '', body_en: '' },
  { name: 'Application Received', subject_bn: 'আবেদন গৃহীত', subject_en: 'Application Received', body_bn: '', body_en: '' },
  { name: 'Selection Notification', subject_bn: 'নির্বাচিত হয়েছেন', subject_en: 'You are Selected', body_bn: '', body_en: '' },
  { name: 'Enrollment Confirmation', subject_bn: 'নিবন্ধন নিশ্চিতকরণ', subject_en: 'Enrollment Confirmed', body_bn: '', body_en: '' },
  { name: 'Certificate Issued', subject_bn: 'সার্টিফিকেট জারি', subject_en: 'Certificate Issued', body_bn: '', body_en: '' },
];

export default function EmailTemplateEditor() {
  const [templates, setTemplates] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewLang, setPreviewLang] = useState('bn');
  const [form, setForm] = useState({ subject_bn: '', subject_en: '', body_bn: '', body_en: '' });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hoService.getEmailTemplates();
      const data = res.data || [];
      if (data.length === 0) {
        setTemplates(DEFAULT_TEMPLATES);
      } else {
        setTemplates(data);
      }
    } catch { setTemplates(DEFAULT_TEMPLATES); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const selectTemplate = (tmpl) => {
    setActive(tmpl);
    setForm({
      subject_bn: tmpl.subject_bn || '',
      subject_en: tmpl.subject_en || '',
      body_bn: tmpl.body_bn || '',
      body_en: tmpl.body_en || '',
    });
  };

  const insertVar = (v) => {
    const lang = previewLang === 'bn' ? 'body_bn' : 'body_en';
    setForm(prev => ({ ...prev, [lang]: prev[lang] + v }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (active?.id) {
        await hoService.updateEmailTemplate(active.id, { ...form, id: active.id });
      }
      toast.success('টেমপ্লেট সংরক্ষিত');
      fetchTemplates();
    } catch { toast.error('সংরক্ষণ ব্যর্থ'); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!active?.id) { toast.warning('প্রথমে টেমপ্লেট সংরক্ষণ করুন'); return; }
    try {
      await hoService.testEmailTemplate(active.id, { id: active.id });
      toast.success('টেস্ট ইমেইল পাঠানো হয়েছে');
    } catch { toast.error('টেস্ট ব্যর্থ'); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border" /></div>;

  return (
    <div>
      <h5 className="fw-bold mb-3"><i className="bi bi-envelope me-2"></i>ইমেইল টেমপ্লেট</h5>
      <div className="row g-3">
        <div className="col-md-4">
          <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
            <div className="card-body p-2">
              {templates.map(tmpl => (
                <button key={tmpl.id || tmpl.name}
                  className={`btn w-100 text-start mb-1 ${active?.name === tmpl.name ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={{ fontSize: 13 }}
                  onClick={() => selectTemplate(tmpl)}>
                  <i className="bi bi-file-text me-2"></i>{tmpl.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="col-md-8">
          <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
            <div className="card-body">
              {active ? (
                <>
                  <div className="mb-3">
                    <div className="d-flex gap-2 mb-2">
                      <button className={`btn btn-sm ${previewLang === 'bn' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setPreviewLang('bn')}>বাংলা</button>
                      <button className={`btn btn-sm ${previewLang === 'en' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setPreviewLang('en')}>English</button>
                    </div>
                    <label className="fw-semibold" style={{ fontSize: 13 }}>বিষয়</label>
                    <input className="form-control form-control-sm mb-2" value={previewLang === 'bn' ? form.subject_bn : form.subject_en}
                      onChange={e => setForm({ ...form, [previewLang === 'bn' ? 'subject_bn' : 'subject_en']: e.target.value })} />
                    <label className="fw-semibold" style={{ fontSize: 13 }}>বডি</label>
                    <textarea className="form-control" rows={10}
                      value={previewLang === 'bn' ? form.body_bn : form.body_en}
                      onChange={e => setForm({ ...form, [previewLang === 'bn' ? 'body_bn' : 'body_en']: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <small className="fw-semibold">ভেরিয়েবল:</small>
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      {VARIABLES.map(v => (
                        <button key={v} className="btn btn-sm btn-outline-info" style={{ fontSize: 11 }} onClick={() => insertVar(v)}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                      {saving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check me-1"></i>}
                      সংরক্ষণ
                    </button>
                    <button className="btn btn-outline-secondary btn-sm" onClick={handleTest}>
                      <i className="bi bi-send me-1"></i>টেস্ট ইমেইল
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-secondary text-center py-4">বাম পাশ থেকে একটি টেমপ্লেট নির্বাচন করুন</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
