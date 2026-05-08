import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';

const STATUS_MAP = { active: 'সক্রিয়', suspended: 'স্থগিত' };
const STATUS_BG = { active: 'success', suspended: 'warning' };

const EMPTY_FORM = {
  code: '', name_bn: '', name_en: '', short_name_bn: '',
  address: '', phone: '', email: '', website_url: '',
  contact_person_name: '', contact_person_phone: '', status: 'active',
};

function CenterFormModal({ show, center, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

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
        contact_person_name: center.contact_person_name || '',
        contact_person_phone: center.contact_person_phone || '',
        status: center.status || 'active',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [center, show]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (center) {
        await hoService.updateCenter(center.id, form);
        toast.success('কেন্দ্র আপডেট হয়েছে');
      } else {
        await hoService.createCenter(form);
        toast.success('কেন্দ্র তৈরি হয়েছে');
      }
      onSaved();
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
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">{center ? 'কেন্দ্র সম্পাদনা' : 'নতুন কেন্দ্র'}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">কোড <span className="text-danger">*</span></label>
                  <input name="code" className="form-control" value={form.code} onChange={handleChange} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label">নাম (বাংলা) <span className="text-danger">*</span></label>
                  <input name="name_bn" className="form-control" value={form.name_bn} onChange={handleChange} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label">নাম (ইংরেজি)</label>
                  <input name="name_en" className="form-control" value={form.name_en} onChange={handleChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">সংক্ষিপ্ত নাম</label>
                  <input name="short_name_bn" className="form-control" value={form.short_name_bn} onChange={handleChange} />
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
                  <label className="form-label">যোগাযোগ ব্যক্তি</label>
                  <input name="contact_person_name" className="form-control" value={form.contact_person_name} onChange={handleChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">যোগাযোগ মোবাইল</label>
                  <input name="contact_person_phone" className="form-control" value={form.contact_person_phone} onChange={handleChange} />
                </div>
                <div className="col-12">
                  <label className="form-label">ঠিকানা</label>
                  <textarea name="address" className="form-control" rows="2" value={form.address} onChange={handleChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">স্ট্যাটাস</label>
                  <select name="status" className="form-select" value={form.status} onChange={handleChange}>
                    <option value="active">সক্রিয়</option>
                    <option value="suspended">স্থগিত</option>
                  </select>
                </div>
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

function StatsCard({ label, value, color, icon }) {
  return (
    <div className="card text-bg-${color} shadow-sm">
      <div className="card-body d-flex align-items-center gap-3 py-3">
        <i className={`bi ${icon} fs-2`}></i>
        <div>
          <h5 className="mb-0">{value}</h5>
          <small>{label}</small>
        </div>
      </div>
    </div>
  );
}

function CenterDetail({ center, onClose }) {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [infra, setInfra] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, i, e] = await Promise.all([
          hoService.getCenterStats(center.id).then((r) => r.data).catch(() => null),
          hoService.getCenterInfrastructure(center.id).then((r) => r.data).catch(() => []),
          hoService.getCenterEmployees(center.id).then((r) => r.data).catch(() => []),
        ]);
        setStats(s);
        setInfra(Array.isArray(i) ? i : []);
        setEmployees(Array.isArray(e) ? e : []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [center.id]);

  if (loading) {
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-5"><div className="spinner-border text-primary" /></div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0"><i className="bi bi-building me-2"></i>{center.name_bn} ({center.code})</h5>
        <button className="btn btn-sm btn-outline-secondary" onClick={onClose}><i className="bi bi-x-lg"></i></button>
      </div>
      <div className="card-body">
        {stats && (
          <div className="row g-2 mb-4">
            <div className="col-6 col-md-3"><StatsCard label="প্রশিক্ষণার্থী" value={stats.trainee_count} color="primary" icon="bi-people" /></div>
            <div className="col-6 col-md-3"><StatsCard label="সক্রিয় ব্যাচ" value={stats.active_batch_count} color="success" icon="bi-layers" /></div>
            <div className="col-6 col-md-3"><StatsCard label="উপস্থিতি" value={`${stats.attendance_rate}%`} color="info" icon="bi-graph-up" /></div>
            <div className="col-6 col-md-3"><StatsCard label="স্থাপন হার" value={`${stats.placement_rate}%`} color="warning" icon="bi-briefcase" /></div>
          </div>
        )}

        <ul className="nav nav-tabs mb-3">
          <li className="nav-item"><button className={`nav-link ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}><i className="bi bi-info-circle me-1"></i>সারাংশ</button></li>
          <li className="nav-item"><button className={`nav-link ${tab === 'infrastructure' ? 'active' : ''}`} onClick={() => setTab('infrastructure')}><i className="bi bi-buildings me-1"></i>অবকাঠামো</button></li>
          <li className="nav-item"><button className={`nav-link ${tab === 'employees' ? 'active' : ''}`} onClick={() => setTab('employees')}><i className="bi bi-people me-1"></i>কর্মচারী</button></li>
          <li className="nav-item"><button className={`nav-link ${tab === 'performance' ? 'active' : ''}`} onClick={() => setTab('performance')}><i className="bi bi-graph-up me-1"></i>কর্মক্ষমতা</button></li>
        </ul>

        {tab === 'overview' && (
          <div className="row">
            <div className="col-md-6">
              <table className="table table-bordered">
                <tbody>
                  <tr><th style={{ width: 140 }}>কোড</th><td>{center.code}</td></tr>
                  <tr><th>নাম (বাংলা)</th><td>{center.name_bn}</td></tr>
                  <tr><th>নাম (ইংরেজি)</th><td>{center.name_en || '—'}</td></tr>
                  <tr><th>ফোন</th><td>{center.phone || '—'}</td></tr>
                  <tr><th>ইমেইল</th><td>{center.email || '—'}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="col-md-6">
              <table className="table table-bordered">
                <tbody>
                  <tr><th style={{ width: 140 }}>ঠিকানা</th><td>{center.address || '—'}</td></tr>
                  <tr><th>যোগাযোগ ব্যক্তি</th><td>{center.contact_person_name || '—'}</td></tr>
                  <tr><th>যোগাযোগ মোবাইল</th><td>{center.contact_person_phone || '—'}</td></tr>
                  <tr><th>স্ট্যাটাস</th><td><span className={`badge bg-${STATUS_BG[center.status] || 'secondary'}`}>{STATUS_MAP[center.status] || center.status}</span></td></tr>
                  <tr><th>তৈরির তারিখ</th><td>{center.created_at ? new Date(center.created_at).toLocaleDateString('bn-BD') : '—'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'infrastructure' && (
          <div className="table-responsive">
            <table className="table table-sm table-bordered">
              <thead className="table-light">
                <tr><th>কক্ষ নং</th><th>অবস্থান</th><th>ধারণক্ষমতা</th><th>সরঞ্জাম</th><th>স্ট্যাটাস</th></tr>
              </thead>
              <tbody>
                {infra.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-muted py-3">কোন কক্ষ পাওয়া যায়নি</td></tr>
                ) : infra.map((r) => (
                  <tr key={r.id}>
                    <td>{r.room_no}</td>
                    <td>{r.location_bn || r.location_en || '—'}</td>
                    <td>{r.capacity}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.equipment || '—'}</td>
                    <td><span className={`badge bg-${r.status === 'available' ? 'success' : r.status === 'maintenance' ? 'warning' : 'danger'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'employees' && (
          <div className="table-responsive">
            <table className="table table-sm table-bordered">
              <thead className="table-light">
                <tr><th>কর্মচারী নং</th><th>নাম</th><th>পদবী</th><th>যোগাযোগ</th><th>স্ট্যাটাস</th></tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-muted py-3">কোন কর্মচারী নেই</td></tr>
                ) : employees.map((e) => (
                  <tr key={e.id}>
                    <td>{e.employee_no}</td>
                    <td>{e.user_full_name_bn || e.user_email || '—'}</td>
                    <td>{e.designation_bn || '—'}</td>
                    <td>{e.user_email || '—'}</td>
                    <td><span className={`badge bg-${e.status === 'active' ? 'success' : 'secondary'}`}>{e.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'performance' && stats && (
          <div>
            <div className="row g-3 mb-3">
              <div className="col-md-3">
                <div className="card text-bg-primary shadow-sm"><div className="card-body py-3 text-center"><h4 className="mb-0">{stats.total_batches}</h4><small>মোট ব্যাচ</small></div></div>
              </div>
              <div className="col-md-3">
                <div className="card text-bg-success shadow-sm"><div className="card-body py-3 text-center"><h4 className="mb-0">{stats.running_batches}</h4><small>চলমান ব্যাচ</small></div></div>
              </div>
              <div className="col-md-3">
                <div className="card text-bg-info shadow-sm"><div className="card-body py-3 text-center"><h4 className="mb-0">{stats.completed_batches}</h4><small>সমাপ্ত ব্যাচ</small></div></div>
              </div>
              <div className="col-md-3">
                <div className="card text-bg-warning shadow-sm"><div className="card-body py-3 text-center"><h4 className="mb-0">{stats.enrolled_trainees}</h4><small>নথিভুক্ত</small></div></div>
              </div>
              <div className="col-md-3">
                <div className="card text-bg-danger shadow-sm"><div className="card-body py-3 text-center"><h4 className="mb-0">{stats.dropped_trainees}</h4><small>ঝরে পড়া</small></div></div>
              </div>
              <div className="col-md-3">
                <div className="card text-bg-success shadow-sm"><div className="card-body py-3 text-center"><h4 className="mb-0">{stats.completed_trainees}</h4><small>সমাপ্ত</small></div></div>
              </div>
            </div>

            {stats.monthly_enrollment?.length > 0 && (
              <div className="mt-3">
                <h6 className="mb-2">মাসিক নথিভুক্তি (গত ১২ মাস)</h6>
                <div className="d-flex align-items-end gap-1" style={{ height: 150 }}>
                  {stats.monthly_enrollment.map((m) => {
                    const max = Math.max(...stats.monthly_enrollment.map((x) => x.count), 1);
                    const pct = (m.count / max) * 100;
                    return (
                      <div key={m.month} className="d-flex flex-column align-items-center flex-fill">
                        <small className="mb-1 fw-bold" style={{ fontSize: 10 }}>{m.count}</small>
                        <div className="bg-primary rounded" style={{ width: '100%', height: `${Math.max(pct, 2)}%` }} title={m.month} />
                        <small className="mt-1" style={{ fontSize: 8 }}>{m.month.slice(5)}</small>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HoCenterManagement() {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCenter, setEditCenter] = useState(null);
  const [detailCenter, setDetailCenter] = useState(null);

  const fetchCenters = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await hoService.listCenters(params);
      setCenters(data.results || data || []);
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
      if (detailCenter?.id === c.id) setDetailCenter(null);
      fetchCenters();
    } catch (err) {
      toast.error(err.response?.data?.detail?.[0] || err.response?.data?.detail || 'মুছতে ব্যর্থ');
    }
  };

  const handleExport = (type) => {
    let csv = 'কোড,নাম (বাংলা),নাম (ইংরেজি),ফোন,ইমেইল,স্ট্যাটাস\n';
    centers.forEach((c) => {
      csv += `${c.code},"${c.name_bn}","${c.name_en || ''}","${c.phone || ''}","${c.email || ''}","${STATUS_MAP[c.status] || c.status}"\n`;
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `centers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV এক্সপোর্ট সম্পন্ন');
  };

  return (
    <div style={{ fontFamily: 'NikoshBAN, sans-serif' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0"><i className="bi bi-building me-2"></i>কেন্দ্র ব্যবস্থাপনা</h4>
        <button className="btn btn-primary" onClick={() => { setEditCenter(null); setShowForm(true); }}>
          <i className="bi bi-plus-lg me-1"></i>নতুন কেন্দ্র
        </button>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <input className="form-control" placeholder="অনুসন্ধান (নাম, কোড, ফোন, ইমেইল)..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="col-md-2">
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">সব স্ট্যাটাস</option>
            <option value="active">সক্রিয়</option>
            <option value="suspended">স্থগিত</option>
          </select>
        </div>
        <div className="col-md-6 d-flex gap-2 justify-content-end">
          <button className="btn btn-outline-success btn-sm" onClick={() => handleExport('csv')}>
            <i className="bi bi-file-earmark-excel me-1"></i>CSV
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className={detailCenter ? 'col-md-7' : 'col-12'}>
          <div className="card shadow-sm">
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th>কোড</th>
                        <th>নাম (বাংলা)</th>
                        <th>ফোন</th>
                        <th>ইমেইল</th>
                        <th>স্ট্যাটাস</th>
                        <th className="text-center">কার্যক্রম</th>
                      </tr>
                    </thead>
                    <tbody>
                      {centers.length === 0 ? (
                        <tr><td colSpan={6} className="text-center text-muted py-4">কোন কেন্দ্র পাওয়া যায়নি</td></tr>
                      ) : centers.map((c) => (
                        <tr key={c.id}>
                          <td><strong>{c.code}</strong></td>
                          <td>
                            <button className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold" onClick={() => setDetailCenter(c)}>
                              {c.name_bn}
                            </button>
                            {c.short_name_bn && <small className="text-muted d-block">{c.short_name_bn}</small>}
                          </td>
                          <td>{c.phone || '—'}</td>
                          <td>{c.email || '—'}</td>
                          <td><span className={`badge bg-${STATUS_BG[c.status] || 'secondary'}`}>{STATUS_MAP[c.status] || c.status}</span></td>
                          <td>
                            <div className="d-flex gap-1 justify-content-center">
                              <button className="btn btn-sm btn-outline-info" onClick={() => setDetailCenter(c)} title="বিস্তারিত">
                                <i className="bi bi-eye"></i>
                              </button>
                              <button className="btn btn-sm btn-outline-primary" onClick={() => { setEditCenter(c); setShowForm(true); }} title="সম্পাদনা">
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button className={`btn btn-sm ${c.status === 'active' ? 'btn-outline-warning' : 'btn-outline-success'}`}
                                onClick={() => handleToggle(c)} title={c.status === 'active' ? 'স্থগিত করুন' : 'সক্রিয় করুন'}>
                                <i className={`bi ${c.status === 'active' ? 'bi-pause-circle' : 'bi-play-circle'}`}></i>
                              </button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c)} title="মুছুন">
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="card-footer text-muted small">
              মোট {centers.length} টি কেন্দ্র
            </div>
          </div>
        </div>

        {detailCenter && (
          <div className="col-md-5">
            <CenterDetail center={detailCenter} onClose={() => setDetailCenter(null)} />
          </div>
        )}
      </div>

      <CenterFormModal
        show={showForm}
        center={editCenter}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); fetchCenters(); }}
      />
    </div>
  );
}
