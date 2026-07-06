import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';
import BanglaInput from '../../components/common/BanglaInput';

const STATUS_MAP = { active: 'সক্রিয়', suspended: 'স্থগিত' };
const INFRA_STATUSES = [
  { value: 'available', label: 'উপলব্ধ' },
  { value: 'unavailable', label: 'অনুপলব্ধ' },
  { value: 'maintenance', label: 'রক্ষণাবেক্ষণাধীন' },
];
const EMP_STATUSES = [
  { value: 'active', label: 'সক্রিয়' },
  { value: 'inactive', label: 'নিষ্ক্রিয়' },
  { value: 'transferred', label: 'বদলি' },
];

const EMPTY_INFRA = { room_no: '', location_bn: '', location_en: '', capacity: '', equipment: '', status: 'available' };
const EMPTY_EMPLOYEE = { user: '', employee_no: '', designation_bn: '', designation_en: '', joining_date: '', is_contact_person: false, status: 'active' };

const EMPTY_FORM = {
  name_bn: '', name_en: '', short_name_bn: '',
  address: '', phone: '', email: '', website_url: '', logo_url: '',
  contact_person_name: '', contact_person_phone: '', status: 'active',
  center_type: 'urban',
  overflow_percentage: 20,
  quality_score: 70,
  latitude: '', longitude: '',
  total_trainees: 0, active_batches: 0, attendance_rate: 0, placement_rate: 0,
  total_batches: 0, running_batches: 0, completed_batches: 0,
  enrolled_trainees: 0, completed_trainees: 0, dropped_trainees: 0,
  infrastructures: [],
  employees: [],
};

function CenterFormModal({ show, center, onClose, onSaved, usersList }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formTab, setFormTab] = useState('overview');

  useEffect(() => {
    if (center) {
      setForm({
        code: center.code || '',
        name_bn: center.name_bn || '',
        name_en: center.name_en || '',
        short_name_bn: center.short_name_bn || '',
        address: center.address || '',
        phone: center.phone || '',
        email: center.email || '',
        website_url: center.website_url || '',
        logo_url: center.logo_url || '',
        contact_person_name: center.contact_person_name || '',
        contact_person_phone: center.contact_person_phone || '',
        status: center.status || 'active',
        center_type: center.center_type || 'urban',
        overflow_percentage: center.overflow_percentage ?? 20,
        quality_score: center.quality_score ?? 70,
        latitude: center.latitude ?? '',
        longitude: center.longitude ?? '',
        total_trainees: center.total_trainees ?? 0,
        active_batches: center.active_batches ?? 0,
        attendance_rate: center.attendance_rate ?? 0,
        placement_rate: center.placement_rate ?? 0,
        total_batches: center.total_batches ?? 0,
        running_batches: center.running_batches ?? 0,
        completed_batches: center.completed_batches ?? 0,
        enrolled_trainees: center.enrolled_trainees ?? 0,
        completed_trainees: center.completed_trainees ?? 0,
        dropped_trainees: center.dropped_trainees ?? 0,
        infrastructures: (center.infrastructures || []).map((r) => ({
          id: r.id, room_no: r.room_no || '', location_bn: r.location_bn || '',
          location_en: r.location_en || '', capacity: r.capacity ?? '', equipment: r.equipment || '',
          status: r.status || 'available',
        })),
        employees: (center.employees || []).map((e) => ({
          id: e.id, user: e.user ?? '', employee_no: e.employee_no || '',
          designation_bn: e.designation_bn || '', designation_en: e.designation_en || '',
          joining_date: e.joining_date || '', is_contact_person: e.is_contact_person ?? false,
          status: e.status || 'active',
        })),
      });
    } else {
      setForm(EMPTY_FORM);
      setFormTab('overview');
    }
  }, [center, show]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const addInfra = () => setForm((p) => ({ ...p, infrastructures: [...p.infrastructures, { ...EMPTY_INFRA }] }));
  const removeInfra = (idx) => setForm((p) => ({ ...p, infrastructures: p.infrastructures.filter((_, i) => i !== idx) }));
  const updateInfra = (idx, field, value) => setForm((p) => {
    const list = [...p.infrastructures];
    list[idx] = { ...list[idx], [field]: value };
    return { ...p, infrastructures: list };
  });

  const addEmployee = () => setForm((p) => ({ ...p, employees: [...p.employees, { ...EMPTY_EMPLOYEE, joining_date: new Date().toISOString().slice(0, 10) }] }));
  const removeEmployee = (idx) => setForm((p) => ({ ...p, employees: p.employees.filter((_, i) => i !== idx) }));
  const updateEmployee = (idx, field, value) => setForm((p) => {
    const list = [...p.employees];
    list[idx] = { ...list[idx], [field]: value };
    return { ...p, employees: list };
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.code;

      if (!center) {
        const res = await hoService.createCenter(payload);
        const newId = res.data.id;
        toast.success('কেন্দ্র তৈরি হয়েছে');
        onSaved(newId);
      } else {
        await hoService.updateCenter(center.id, payload);
        toast.success('কেন্দ্র আপডেট হয়েছে');
        onSaved();
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.code?.[0] || 'সংরক্ষণ ব্যর্থ';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
      <div className="modal-dialog modal-xl" style={{ maxHeight: '85vh', marginTop: '5vh', marginBottom: '5vh' }}>
        <div className="modal-content" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">{center ? 'কেন্দ্র সম্পাদনা' : 'নতুন কেন্দ্র'}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit} className="d-flex flex-column" style={{ overflow: 'hidden', flex: '1 1 auto' }}>
            <div className="modal-body p-0" style={{ overflowY: 'auto', flex: '1 1 auto' }}>
              <ul className="nav nav-tabs px-4 pt-3 bg-white sticky-top">
                <li className="nav-item">
                  <button type="button" className={`nav-link ${formTab === 'overview' ? 'active fw-bold' : ''}`}
                    onClick={() => setFormTab('overview')}>
                    <i className="bi bi-info-circle me-1"></i>সারাংশ
                  </button>
                </li>
                <li className="nav-item">
                  <button type="button" className={`nav-link ${formTab === 'performance' ? 'active fw-bold' : ''}`}
                    onClick={() => setFormTab('performance')}>
                    <i className="bi bi-graph-up me-1"></i>কর্মক্ষমতা
                  </button>
                </li>
                <li className="nav-item">
                  <button type="button" className={`nav-link ${formTab === 'infrastructure' ? 'active fw-bold' : ''}`}
                    onClick={() => setFormTab('infrastructure')}>
                    <i className="bi bi-buildings me-1"></i>অবকাঠামো
                  </button>
                </li>
                <li className="nav-item">
                  <button type="button" className={`nav-link ${formTab === 'employees' ? 'active fw-bold' : ''}`}
                    onClick={() => setFormTab('employees')}>
                    <i className="bi bi-people me-1"></i>কর্মচারী
                  </button>
                </li>
              </ul>
              <div className="p-4">
              {formTab === 'overview' && (
                <div className="row g-3">
                  {center ? (
                    <div className="col-md-4">
                      <label className="form-label">কোড</label>
                      <input name="code" className="form-control" value={form.code} disabled />
                    </div>
                  ) : (
                    <div className="col-md-4">
                      <label className="form-label">কোড</label>
                      <input className="form-control" value="স্বয়ংক্রিয় জেনারেট হবে" disabled />
                    </div>
                  )}
                  <div className="col-md-4">
                    <label className="form-label">নাম (বাংলা) <span className="text-danger">*</span></label>
                    <BanglaInput name="name_bn" className="form-control" value={form.name_bn} onChange={handleChange} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">নাম (ইংরেজি) <span className="text-muted" style={{ fontSize: '0.75rem' }}>English only</span></label>
                    <input name="name_en" className="form-control" value={form.name_en} onChange={handleChange} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">সংক্ষিপ্ত নাম</label>
                    <BanglaInput name="short_name_bn" className="form-control" value={form.short_name_bn} onChange={handleChange} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">ফোন <span className="text-danger">*</span></label>
                    <input name="phone" className="form-control" value={form.phone} onChange={handleChange} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">ইমেইল</label>
                    <input name="email" type="email" className="form-control" value={form.email} onChange={handleChange} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">ওয়েবসাইট</label>
                    <input name="website_url" className="form-control" value={form.website_url} onChange={handleChange} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">লোগো URL</label>
                    <input name="logo_url" className="form-control" value={form.logo_url} onChange={handleChange} placeholder="https://example.com/logo.png" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">যোগাযোগ ব্যক্তি</label>
                    <input name="contact_person_name" className="form-control" value={form.contact_person_name} onChange={handleChange} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">যোগাযোগ মোবাইল</label>
                    <input name="contact_person_phone" className="form-control" value={form.contact_person_phone} onChange={handleChange} />
                  </div>
                  <div className="col-12">
                    <label className="form-label">ঠিকানা</label>
                    <BanglaInput as="textarea" name="address" className="form-control" rows="2" value={form.address} onChange={handleChange} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">স্ট্যাটাস</label>
                    <select name="status" className="form-select" value={form.status} onChange={handleChange}>
                      <option value="active">সক্রিয়</option>
                      <option value="suspended">স্থগিত</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">কেন্দ্রের ধরন <span className="text-danger">*</span></label>
                    <select name="center_type" className="form-select" value={form.center_type} onChange={handleChange} required>
                      <option value="metro">মেট্রো</option>
                      <option value="urban">আরবান</option>
                      <option value="semi_urban">সেমি-আরবান</option>
                      <option value="rural">গ্রামীণ</option>
                      <option value="remote">দুর্গম</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">অক্ষাংশ (Latitude)</label>
                    <input name="latitude" className="form-control" value={form.latitude} onChange={handleChange} placeholder="e.g. 23.8103" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">দ্রাঘিমাংশ (Longitude)</label>
                    <input name="longitude" className="form-control" value={form.longitude} onChange={handleChange} placeholder="e.g. 90.4125" />
                  </div>
                </div>
              )}

              {formTab === 'performance' && (
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label">মোট প্রশিক্ষণার্থী</label>
                    <input type="number" min="0" className="form-control" name="total_trainees"
                      value={form.total_trainees} onChange={handleChange} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">সক্রিয় ব্যাচ</label>
                    <input type="number" min="0" className="form-control" name="active_batches"
                      value={form.active_batches} onChange={handleChange} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">উপস্থিতির হার (%)</label>
                    <input type="number" min="0" max="100" step="0.1" className="form-control" name="attendance_rate"
                      value={form.attendance_rate} onChange={handleChange} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">চাকরি স্থাপনের হার (%)</label>
                    <input type="number" min="0" max="100" step="0.1" className="form-control" name="placement_rate"
                      value={form.placement_rate} onChange={handleChange} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">মোট ব্যাচ</label>
                    <input type="number" min="0" className="form-control" name="total_batches"
                      value={form.total_batches} onChange={handleChange} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">চলমান ব্যাচ</label>
                    <input type="number" min="0" className="form-control" name="running_batches"
                      value={form.running_batches} onChange={handleChange} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">সমাপ্ত ব্যাচ</label>
                    <input type="number" min="0" className="form-control" name="completed_batches"
                      value={form.completed_batches} onChange={handleChange} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">নথিভুক্ত</label>
                    <input type="number" min="0" className="form-control" name="enrolled_trainees"
                      value={form.enrolled_trainees} onChange={handleChange} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">সফল সমাপ্তি</label>
                    <input type="number" min="0" className="form-control" name="completed_trainees"
                      value={form.completed_trainees} onChange={handleChange} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">ঝরে পড়া</label>
                    <input type="number" min="0" className="form-control" name="dropped_trainees"
                      value={form.dropped_trainees} onChange={handleChange} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">ওভারফ্লো (%)</label>
                    <input type="number" min="0" max="100" step="0.01" className="form-control" name="overflow_percentage"
                      value={form.overflow_percentage} onChange={handleChange} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">গুণগত মান</label>
                    <input type="number" min="0" max="100" step="0.01" className="form-control" name="quality_score"
                      value={form.quality_score} onChange={handleChange} />
                  </div>
                </div>
              )}

              {formTab === 'infrastructure' && (
                <div>
                  <button type="button" className="btn btn-sm btn-outline-primary mb-3" onClick={addInfra}>
                    <i className="bi bi-plus-lg"></i> কক্ষ যোগ
                  </button>
                  {form.infrastructures.length === 0 && (
                    <p className="text-muted small">কোন কক্ষ যোগ করা হয়নি।</p>
                  )}
                  {form.infrastructures.map((infra, idx) => (
                    <div key={idx} className="card bg-light mb-2 border-0">
                      <div className="card-body py-2 px-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <small className="fw-bold text-muted">কক্ষ #{idx + 1}</small>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeInfra(idx)}>
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </div>
                        <div className="row g-2">
                          <div className="col-md-3">
                            <label className="form-label small">কক্ষ নম্বর <span className="text-danger">*</span></label>
                            <input className="form-control form-control-sm" placeholder="যেমন: ১০১"
                              value={infra.room_no} onChange={(e) => updateInfra(idx, 'room_no', e.target.value)} required />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small">অবস্থান (বাংলা)</label>
                            <BanglaInput className="form-control form-control-sm" placeholder="২য় তলা"
                              value={infra.location_bn} onChange={(e) => updateInfra(idx, 'location_bn', e.target.value)} />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small">অবস্থান (ইংরেজি)</label>
                            <input className="form-control form-control-sm" placeholder="2nd floor"
                              value={infra.location_en} onChange={(e) => updateInfra(idx, 'location_en', e.target.value)} />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small">ধারণক্ষমতা</label>
                            <input type="number" className="form-control form-control-sm" placeholder="৩০"
                              value={infra.capacity} onChange={(e) => updateInfra(idx, 'capacity', e.target.value)} />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small">স্ট্যাটাস</label>
                            <select className="form-select form-select-sm" value={infra.status}
                              onChange={(e) => updateInfra(idx, 'status', e.target.value)}>
                              {INFRA_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </div>
                          <div className="col-12">
                            <label className="form-label small">সরঞ্জাম</label>
                            <input className="form-control form-control-sm" placeholder="টেবিল, চেয়ার, বোর্ড"
                              value={infra.equipment} onChange={(e) => updateInfra(idx, 'equipment', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {formTab === 'employees' && (
                <div>
                  <button type="button" className="btn btn-sm btn-outline-primary mb-3" onClick={addEmployee}>
                    <i className="bi bi-plus-lg"></i> কর্মচারী যোগ
                  </button>
                  {form.employees.length === 0 && (
                    <p className="text-muted small">কোন কর্মচারী যোগ করা হয়নি।</p>
                  )}
                  {form.employees.map((emp, idx) => (
                    <div key={idx} className="card bg-light mb-2 border-0">
                      <div className="card-body py-2 px-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <small className="fw-bold text-muted">কর্মচারী #{idx + 1}</small>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeEmployee(idx)}>
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </div>
                        <div className="row g-2">
                          <div className="col-md-4">
                            <label className="form-label small">ব্যবহারকারী <span className="text-danger">*</span></label>
                            <select className="form-select form-select-sm" value={emp.user}
                              onChange={(e) => updateEmployee(idx, 'user', e.target.value)} required>
                              <option value="">নির্বাচন করুন</option>
                              {usersList.map((u) => (
                                <option key={u.id} value={u.id}>{u.full_name_bn} ({u.email})</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small">কর্মচারী নং <span className="text-danger">*</span></label>
                            <input className="form-control form-control-sm" placeholder="EMP-001"
                              value={emp.employee_no} onChange={(e) => updateEmployee(idx, 'employee_no', e.target.value)} required />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small">পদবী (বাংলা) <span className="text-danger">*</span></label>
                            <BanglaInput className="form-control form-control-sm" placeholder="প্রশিক্ষক"
                              value={emp.designation_bn} onChange={(e) => updateEmployee(idx, 'designation_bn', e.target.value)} required />
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small">পদবী (ইংরেজি)</label>
                            <input className="form-control form-control-sm" placeholder="Trainer"
                              value={emp.designation_en} onChange={(e) => updateEmployee(idx, 'designation_en', e.target.value)} />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small">যোগদানের তারিখ <span className="text-danger">*</span></label>
                            <input type="date" className="form-control form-control-sm"
                              value={emp.joining_date} onChange={(e) => updateEmployee(idx, 'joining_date', e.target.value)} required />
                          </div>
                          <div className="col-md-3">
                            <label className="form-label small">স্ট্যাটাস</label>
                            <select className="form-select form-select-sm" value={emp.status}
                              onChange={(e) => updateEmployee(idx, 'status', e.target.value)}>
                              {EMP_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </div>
                          <div className="col-md-3 d-flex align-items-end pb-1">
                            <div className="form-check">
                              <input type="checkbox" className="form-check-input" id={`cp-${idx}`}
                                checked={emp.is_contact_person}
                                onChange={(e) => updateEmployee(idx, 'is_contact_person', e.target.checked)} />
                              <label className="form-check-label small" htmlFor={`cp-${idx}`}>যোগাযোগ ব্যক্তি</label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>বাতিল</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}সংরক্ষণ
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="col-md-3 col-6">
      <div className={`card border-0 shadow-sm h-100 bg-${color} bg-gradient text-white`}>
        <div className="card-body d-flex align-items-center gap-3 py-3">
          <i className={`bi ${icon} fs-1 opacity-50`}></i>
          <div>
            <h5 className="mb-0 fw-bold">{value}</h5>
            <small className="opacity-75">{label}</small>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkImportModal({ show, onClose, onImported }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleImport = async () => {
    if (!file) { toast.warning('ফাইল নির্বাচন করুন'); return; }
    setLoading(true);
    setResults(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await hoService.importCenters(formData);
      setResults(res.data);
      if (res.data.created > 0 || res.data.updated > 0) {
        toast.success(`${res.data.created} টি তৈরি, ${res.data.updated} টি আপডেট`);
        onImported();
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'ইম্পোর্ট ব্যর্থ';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const handleReset = () => {
    setFile(null);
    setResults(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await hoService.downloadCenterTemplate();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'center_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('টেমপ্লেট ডাউনলোড ব্যর্থ');
    }
  };

  if (!show) return null;

  return (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
      <div className="modal-dialog modal-md modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title"><i className="bi bi-upload me-2"></i>কেন্দ্র বাল্ক ইম্পোর্ট</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="border rounded-3 p-4 bg-light mb-3">
              <div className="mb-3">
                <input ref={fileRef} type="file" className="form-control"
                  accept=".csv,.xlsx" onChange={e => setFile(e.target.files[0] || null)} />
                <small className="text-secondary">Excel (.xlsx) বা CSV ফাইল আপলোড করুন</small>
              </div>
              <div className="d-flex gap-2 mt-2">
                <button className="btn btn-outline-success flex-shrink-0" onClick={handleDownloadTemplate} type="button">
                  <i className="bi bi-download me-1"></i>টেমপ্লেট
                </button>
                <button className="btn btn-primary flex-grow-1" onClick={handleImport} disabled={loading || !file}>
                  {loading ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-cloud-upload me-1"></i>}
                  ইম্পোর্ট
                </button>
              </div>
            </div>
            {results && (
              <div>
                <h6 className="fw-bold">ইম্পোর্ট ফলাফল</h6>
                <div className="d-flex gap-3 mb-2">
                  <div className="badge bg-success fs-6">তৈরি: {results.created}</div>
                  <div className="badge bg-info fs-6">আপডেট: {results.updated}</div>
                </div>
                {results.errors && results.errors.length > 0 && (
                  <div className="border rounded p-2 bg-danger bg-opacity-10" style={{ maxHeight: 200, overflowY: 'auto' }}>
                    <small className="text-danger fw-bold">ত্রুটি:</small>
                    {results.errors.map((err, i) => (
                      <div key={i} style={{ fontSize: 11 }} className="text-danger">{err}</div>
                    ))}
                  </div>
                )}
                <button className="btn btn-outline-secondary btn-sm w-100 mt-2" onClick={handleReset}>
                  <i className="bi bi-arrow-counterclockwise me-1"></i>রিসেট
                </button>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>বন্ধ</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HoCenterManagement() {
  const navigate = useNavigate();
  const [centers, setCenters] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCenter, setEditCenter] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    hoService.listHOUsers({ page_size: 500, is_active: true })
      .then((res) => setUsersList(res.data.results || res.data || []))
      .catch(() => {});
  }, []);

  const fetchCenters = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page_size: 999 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await hoService.listCenters(params);
      const list = data.results || data || [];
      list.sort((a, b) => {
        const ca = parseInt(a.code, 10);
        const cb = parseInt(b.code, 10);
        if (!isNaN(ca) && !isNaN(cb)) return ca - cb;
        if (!isNaN(ca)) return -1;
        if (!isNaN(cb)) return 1;
        return (a.code || '').localeCompare(b.code || '');
      });
      setCenters(list);
      setTotalCount(data.count ?? list.length);
      setSelectedIds(new Set());
    } catch {
      toast.error('কেন্দ্র তালিকা লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchCenters(); }, [fetchCenters]);

  const handleToggle = async (c) => {
    try {
      const { data } = await hoService.toggleCenter(c.id);
      toast.success(`কেন্দ্র ${data.status === 'active' ? 'সক্রিয়' : 'স্থগিত'} করা হয়েছে`);
      fetchCenters();
    } catch {
      toast.error('স্ট্যাটাস পরিবর্তন ব্যর্থ');
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`"${c.name_bn}" কেন্দ্রটি মুছবেন?`)) return;
    try {
      await hoService.deleteCenter(c.id);
      toast.success('কেন্দ্র মুছে ফেলা হয়েছে');
      fetchCenters();
    } catch (err) {
      toast.error(err.response?.data?.detail?.[0] || err.response?.data?.detail || 'মুছতে ব্যর্থ');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(centers.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = async (fmt = 'xlsx') => {
    try {
      const params = { file_format: fmt };
      if (selectedIds.size > 0) {
        params.ids = [...selectedIds].join(',');
      } else if (search) {
        params.search = search;
      }
      if (statusFilter) params.status = statusFilter;
      const res = await hoService.exportCenters(params);
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `centers_${new Date().toISOString().slice(0, 10)}.${fmt}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('এক্সপোর্ট সম্পন্ন');
    } catch (err) {
      console.error('Export error:', err);
      const msg = err.response?.status
        ? `এক্সপোর্ট ব্যর্থ (${err.response.status}: ${err.response.statusText})`
        : err.message || 'এক্সপোর্ট ব্যর্থ';
      toast.error(msg);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const rows = selectedIds.size > 0
      ? centers.filter((c) => selectedIds.has(c.id))
      : centers;
    printWindow.document.write(`
      <html><head><title>কেন্দ্র তালিকা</title>
      <style>
        body { font-family: 'Nikosh', 'Siyam Rupali', sans-serif; padding: 20px; }
        h2 { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
        th { background: #f0f0f0; }
        .text-center { text-align: center; }
        .badge { padding: 2px 8px; border-radius: 3px; font-size: 11px; }
        .active { background: #d4edda; }
        .suspended { background: #fff3cd; }
      </style></head><body>
      <h2>প্রশিক্ষণ কেন্দ্র তালিকা</h2>
      <table>
        <thead><tr>
          <th>ক্রমিক</th><th>নাম (বাংলা)</th><th>নাম (ইংরেজি)</th><th>ফোন</th><th>ইমেইল</th>
        </tr></thead>
        <tbody>
        ${rows.map((c, i) => `
          <tr>
            <td class="text-center">${i + 1}</td>
            <td>${c.name_bn}</td>
            <td>${c.name_en || ''}</td>
            <td>${c.phone || ''}</td>
            <td>${c.email || ''}</td>
          </tr>
        `).join('')}
        </tbody></table>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleFormSaved = async (newId) => {
    setShowForm(false);
    if (newId) {
      navigate(`/ho/centers/${newId}`);
    } else {
      fetchCenters();
    }
  };

  const total = totalCount || centers.length;
  const active = centers.filter((c) => c.status === 'active').length;
  const suspended = centers.filter((c) => c.status === 'suspended').length;

  return (
    <div className="px-4 py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h4 className="fw-bold mb-1">
            <i className="bi bi-building me-2 text-primary"></i>কেন্দ্র ব্যবস্থাপনা
          </h4>
          <p className="text-muted mb-0 small">সকল প্রশিক্ষণ কেন্দ্রের তালিকা ও ব্যবস্থাপনা</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-info shadow-sm" onClick={() => setShowImport(true)}>
            <i className="bi bi-upload me-1"></i>ইম্পোর্ট
          </button>
          <button className="btn btn-primary shadow-sm" onClick={() => { setEditCenter(null); setShowForm(true); }}>
            <i className="bi bi-plus-lg me-1"></i>নতুন কেন্দ্র
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <StatCard icon="bi-building" label="মোট কেন্দ্র" value={total} color="primary" />
        <StatCard icon="bi-check-circle" label="সক্রিয়" value={active} color="success" />
        <StatCard icon="bi-pause-circle" label="স্থগিত" value={suspended} color="warning" />
        <StatCard icon="bi-geo-alt" label="সচল কেন্দ্র" value={active} color="info" />
      </div>

      {selectedIds.size > 0 && (
        <div className="alert alert-info py-2 d-flex justify-content-between align-items-center mb-3">
          <span><i className="bi bi-check-square me-1"></i>{selectedIds.size} টি কেন্দ্র নির্বাচিত</span>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-success" onClick={() => handleExport('xlsx')}>
              <i className="bi bi-download"></i> নির্বাচিত এক্সপোর্ট
            </button>
            <button className="btn btn-sm btn-secondary" onClick={handlePrint}>
              <i className="bi bi-printer"></i> নির্বাচিত প্রিন্ট
            </button>
            <button className="btn btn-sm btn-outline-danger" onClick={() => setSelectedIds(new Set())}>
              নির্বাচন বাতিল
            </button>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="row g-2 align-items-center">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input className="form-control border-start-0 ps-0" placeholder="নাম, কোড, ফোন বা ইমেইল দিয়ে অনুসন্ধান..."
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="col-md-2">
              <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">সব স্ট্যাটাস</option>
                <option value="active">সক্রিয়</option>
                <option value="suspended">স্থগিত</option>
              </select>
            </div>
            <div className="col-md-5 d-flex gap-2 justify-content-end">
              <span className="text-muted small align-self-center">
                {selectedIds.size > 0 ? `${selectedIds.size} নির্বাচিত | ` : ''}
                মোট {total} টি
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm table-card" style={{ borderRadius: 12, border: 'none' }}>
        <div className="table-responsive">
          <table className="b-table w-100">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" className="form-check-input"
                    checked={centers.length > 0 && selectedIds.size === centers.length}
                    onChange={handleSelectAll} />
                </th>
                <th>কোড</th>
                <th>কেন্দ্রের নাম</th>
                <th className="d-none d-md-table-cell">ফোন</th>
                <th className="d-none d-md-table-cell">ইমেইল</th>
                <th>স্ট্যাটাস</th>
                <th className="text-center" style={{ width: 50 }}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4"><div className="spinner-border spinner-border-sm me-2" />লোড হচ্ছে...</td></tr>
              ) : centers.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-secondary py-4">কোন কেন্দ্র পাওয়া যায়নি</td></tr>
              ) : (
                centers.map(c => (
                  <tr key={c.id}>
                    <td><input type="checkbox" className="form-check-input"
                      checked={selectedIds.has(c.id)}
                      onChange={() => handleSelectOne(c.id)} /></td>
                    <td className="fw-semibold">
                      <span className="badge bg-secondary bg-opacity-10 text-dark">{c.code}</span>
                    </td>
                    <td>
                      <div className="fw-semibold">{c.name_bn}</div>
                      {c.name_en && <small className="text-muted">{c.name_en}</small>}
                    </td>
                    <td className="d-none d-md-table-cell">{c.phone || <span className="text-muted">—</span>}</td>
                    <td className="d-none d-md-table-cell">{c.email || <span className="text-muted">—</span>}</td>
                    <td>
                      <span className={`status-dot dot-${c.status}`}></span>
                      <span style={{fontSize:13,color:'#334155'}}>{STATUS_MAP[c.status] || c.status}</span>
                    </td>
                    <td className="act-col">
                      <div className="dropdown act-dropdown">
                        <button className="dropdown-toggle" data-bs-toggle="dropdown" type="button" data-bs-strategy="fixed">
                          <i className="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                          <li><button className="dropdown-item text-primary" onClick={() => navigate(`/ho/centers/${c.id}`)}><i className="bi bi-eye me-2"></i>বিস্তারিত</button></li>
                          <li><hr className="dropdown-divider my-1" /></li>
                          <li><button className="dropdown-item text-primary" onClick={async () => {
                            try {
                              const { data } = await hoService.getCenter(c.id);
                              setEditCenter(data);
                              setShowForm(true);
                            } catch {
                              toast.error('কেন্দ্রের তথ্য লোড করতে ব্যর্থ');
                            }
                          }}><i className="bi bi-pencil me-2"></i>সম্পাদনা</button></li>
                          <li><button className={`dropdown-item ${c.status === 'active' ? 'text-warning' : 'text-success'}`} onClick={() => handleToggle(c)}>
                            <i className={`bi ${c.status === 'active' ? 'bi-pause-circle' : 'bi-play-circle'} me-2`}></i>{c.status === 'active' ? 'স্থগিত করুন' : 'সক্রিয় করুন'}
                          </button></li>
                          <li><hr className="dropdown-divider my-1" /></li>
                          <li><button className="dropdown-item text-danger" onClick={() => handleDelete(c)}><i className="bi bi-trash me-2"></i>মুছুন</button></li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="b-pagination d-flex justify-content-between align-items-center py-2 px-3">
          <small className="text-secondary">মোট {total} টি কেন্দ্র</small>
        </div>
      </div>

      <CenterFormModal
        show={showForm}
        center={editCenter}
        usersList={usersList}
        onClose={() => { setShowForm(false); setEditCenter(null); }}
        onSaved={handleFormSaved}
      />
      <BulkImportModal
        show={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => { setShowImport(false); fetchCenters(); }}
      />
    </div>
  );
}
