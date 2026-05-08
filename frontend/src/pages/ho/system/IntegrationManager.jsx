import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';

const INTEGRATION_META = {
  'NID Verification': { icon: 'bi-credit-card-2-front', color: '#0d6efd', provider: 'nid_mock' },
  'SMS Gateway': { icon: 'bi-chat-dots', color: '#198754', provider: 'sms_gateway' },
  'Payment Gateway': { icon: 'bi-credit-card', color: '#6f42c1', provider: 'payment_bkash' },
  'Email Service': { icon: 'bi-envelope', color: '#fd7e14', provider: 'email_smtp' },
};

export default function IntegrationManager() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hoService.getIntegrations();
      setIntegrations(res.data || []);
    } catch { setIntegrations([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  const openEdit = (cfg) => {
    setEditName(cfg.name);
    setEditForm({
      settings: cfg.settings || {},
      is_active: cfg.is_active,
    });
  };

  const handleSave = async () => {
    try {
      await hoService.updateIntegration(editName, { name: editName, settings: editForm.settings, is_active: editForm.is_active });
      toast.success(`"${editName}" হালনাগাদ`);
      setEditName(null);
      fetchIntegrations();
    } catch { toast.error('সংরক্ষণ ব্যর্থ'); }
  };

  const handleTest = async (name) => {
    try {
      const res = await hoService.testIntegration(name, { name });
      if (res.data.detail) toast.success(res.data.detail);
      fetchIntegrations();
    } catch (err) {
      toast.error(err.response?.data?.error || 'টেস্ট ব্যর্থ');
    }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border" /></div>;

  const list = integrations.length > 0 ? integrations : Object.keys(INTEGRATION_META).map(name => ({
    name,
    provider: INTEGRATION_META[name].provider,
    is_active: false,
    settings: {},
    last_test_status: '',
    last_test_at: null,
  }));

  return (
    <div>
      <h5 className="fw-bold mb-3"><i className="bi bi-plugin me-2"></i>ইন্টিগ্রেশন কনফিগারেশন</h5>
      <div className="row g-3">
        {list.map(cfg => {
          const meta = INTEGRATION_META[cfg.name] || { icon: 'bi-box', color: '#6c757d' };
          const isEditing = editName === cfg.name;
          return (
            <div key={cfg.name} className="col-md-6">
              <div className="card shadow-sm h-100" style={{ borderRadius: 12, border: 'none' }}>
                <div className="card-body">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, backgroundColor: meta.color + '20' }}>
                      <i className={`bi ${meta.icon} fs-4`} style={{ color: meta.color }}></i>
                    </div>
                    <div className="flex-grow-1">
                      <h6 className="fw-bold mb-0">{cfg.name}</h6>
                      <small className="text-secondary">{cfg.provider}</small>
                    </div>
                    <span className={`badge ${cfg.is_active ? 'bg-success' : 'bg-secondary'}`}>
                      {cfg.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </span>
                  </div>

                  {isEditing ? (
                    <div>
                      <div className="mb-2">
                        <label className="form-check-label" style={{ fontSize: 13 }}>
                          <input className="form-check-input me-1" type="checkbox"
                            checked={editForm.is_active}
                            onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })} />
                          সক্রিয়
                        </label>
                      </div>
                      <div className="mb-2">
                        <label className="fw-semibold" style={{ fontSize: 12 }}>API Key</label>
                        <input className="form-control form-control-sm" type="password" placeholder="••••••••"
                          value={editForm.settings?.api_key || ''}
                          onChange={e => setEditForm({ ...editForm, settings: { ...editForm.settings, api_key: e.target.value } })} />
                      </div>
                      <div className="mb-2">
                        <label className="fw-semibold" style={{ fontSize: 12 }}>Endpoint URL</label>
                        <input className="form-control form-control-sm" type="text" placeholder="https://..."
                          value={editForm.settings?.endpoint || ''}
                          onChange={e => setEditForm({ ...editForm, settings: { ...editForm.settings, endpoint: e.target.value } })} />
                      </div>
                      <div className="d-flex gap-2 mt-3">
                        <button className="btn btn-sm btn-primary" onClick={handleSave}>সংরক্ষণ</button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditName(null)}>বাতিল</button>
                      </div>
                    </div>
                  ) : (
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(cfg)}>
                        <i className="bi bi-pencil me-1"></i>কনফিগার
                      </button>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => handleTest(cfg.name)}>
                        <i className="bi bi-plug me-1"></i>টেস্ট
                      </button>
                      {cfg.last_test_at && (
                        <small className={`ms-auto ${cfg.last_test_status === 'success' ? 'text-success' : 'text-danger'}`} style={{ fontSize: 11 }}>
                          {cfg.last_test_status === 'success' ? 'সংযুক্ত' : 'ত্রুটি'}
                        </small>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
