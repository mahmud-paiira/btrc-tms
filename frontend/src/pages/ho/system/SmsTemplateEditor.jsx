import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';

const VARIABLES = ['{{trainee_name}}', '{{batch_name}}', '{{course_name}}', '{{center_name}}', '{{date}}', '{{time}}'];

const DEFAULT_TEMPLATES = [
  { name: 'Application Received SMS', message_bn: '', message_en: '' },
  { name: 'Admission Confirmation SMS', message_bn: '', message_en: '' },
  { name: 'Class Reminder SMS', message_bn: '', message_en: '' },
];

export default function SmsTemplateEditor() {
  const [templates, setTemplates] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewLang, setPreviewLang] = useState('bn');
  const [form, setForm] = useState({ message_bn: '', message_en: '' });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hoService.getSmsTemplates();
      const data = res.data || [];
      setTemplates(data.length > 0 ? data : DEFAULT_TEMPLATES);
    } catch { setTemplates(DEFAULT_TEMPLATES); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const selectTemplate = (tmpl) => {
    setActive(tmpl);
    setForm({
      message_bn: tmpl.message_bn || '',
      message_en: tmpl.message_en || '',
    });
  };

  const insertVar = (v) => {
    const lang = previewLang === 'bn' ? 'message_bn' : 'message_en';
    setForm(prev => ({ ...prev, [lang]: prev[lang] + v }));
  };

  const charCount = (previewLang === 'bn' ? form.message_bn : form.message_en).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (active?.id) {
        await hoService.updateSmsTemplate(active.id, { ...form, id: active.id });
      }
      toast.success('এসএমএস টেমপ্লেট সংরক্ষিত');
      fetchTemplates();
    } catch { toast.error('সংরক্ষণ ব্যর্থ'); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!active?.id) { toast.warning('প্রথমে টেমপ্লেট সংরক্ষণ করুন'); return; }
    try {
      await hoService.testSmsTemplate(active.id, { id: active.id });
      toast.success('টেস্ট এসএমএস পাঠানো হয়েছে');
    } catch { toast.error('টেস্ট ব্যর্থ'); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border" /></div>;

  return (
    <div>
      <h5 className="fw-bold mb-3"><i className="bi bi-chat-dots me-2"></i>এসএমএস টেমপ্লেট</h5>
      <div className="row g-3">
        <div className="col-md-4">
          <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
            <div className="card-body p-2">
              {templates.map(tmpl => (
                <button key={tmpl.id || tmpl.name}
                  className={`btn w-100 text-start mb-1 ${active?.name === tmpl.name ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={{ fontSize: 13 }}
                  onClick={() => selectTemplate(tmpl)}>
                  <i className="bi bi-chat me-2"></i>{tmpl.name}
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
                  <div className="d-flex gap-2 mb-3">
                    <button className={`btn btn-sm ${previewLang === 'bn' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setPreviewLang('bn')}>বাংলা</button>
                    <button className={`btn btn-sm ${previewLang === 'en' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setPreviewLang('en')}>English</button>
                  </div>
                  <label className="fw-semibold" style={{ fontSize: 13 }}>বার্তা</label>
                  <textarea className="form-control" rows={4}
                    value={previewLang === 'bn' ? form.message_bn : form.message_en}
                    onChange={e => setForm({ ...form, [previewLang === 'bn' ? 'message_bn' : 'message_en']: e.target.value })} />
                  <div className="d-flex justify-content-between mt-1">
                    <small className={`${charCount > 160 ? 'text-danger fw-bold' : 'text-secondary'}`}>{charCount} / 160</small>
                    {charCount > 160 && <small className="text-danger">{Math.ceil(charCount / 160)}টি SMS</small>}
                  </div>
                  <div className="mb-3 mt-2">
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
                      <i className="bi bi-send me-1"></i>টেস্ট এসএমএস
                    </button>
                  </div>
                  <div className="mt-3 p-2 bg-light rounded-3">
                    <small className="fw-semibold">প্রিভিউ:</small>
                    <p className="mb-0 mt-1" style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
                      {previewLang === 'bn' ? form.message_bn || '(খালি)' : form.message_en || '(empty)'}
                    </p>
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
