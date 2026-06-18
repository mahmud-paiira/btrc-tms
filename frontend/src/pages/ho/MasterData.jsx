import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';
import BanglaInput from '../../components/common/BanglaInput';

const TABS = [
  { key: 'genders', label: 'লিঙ্গ', icon: 'bi-gender-ambiguous' },
  { key: 'educations', label: 'শিক্ষাগত যোগ্যতা', icon: 'bi-mortarboard' },
  { key: 'demographies', label: 'জনসংখ্যা তথ্য', icon: 'bi-globe' },
  { key: 'shifts', label: 'শিফট', icon: 'bi-arrow-left-right' },
  { key: 'holidays', label: 'ছুটির দিন', icon: 'bi-calendar-x' },
];

export default function MasterData() {
  const [activeTab, setActiveTab] = useState('genders');

  return (
    <div className="px-4 py-4">
      <div className="d-flex align-items-center mb-3">
        <i className="bi bi-database fs-3 me-2"></i>
        <h4 className="mb-0">মাস্টার ডাটা</h4>
      </div>

      <ul className="nav nav-tabs mb-3">
        {TABS.map(t => (
          <li className="nav-item" key={t.key}>
            <button className={`nav-link ${activeTab === t.key ? 'active fw-semibold' : ''}`}
              onClick={() => setActiveTab(t.key)}>
              <i className={`bi ${t.icon} me-1`}></i>{t.label}
            </button>
          </li>
        ))}
      </ul>

      {activeTab === 'genders' && <GenderTab />}
      {activeTab === 'educations' && <EducationTab />}
      {activeTab === 'demographies' && <DemographyTab />}
      {activeTab === 'shifts' && <ShiftTab />}
      {activeTab === 'holidays' && <HolidayTab />}
    </div>
  );
}

/* ── Reusable Inline CRUD ─────────────────────────────────── */

function InlineCrudTable({ title, icon, columns, fetchItems, createItem, updateItem, deleteItem, formFields }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await fetchItems();
      setItems(res.results || res || []);
    } catch { toast.error(`${title} লোড করতে ব্যর্থ`); }
    finally { setLoading(false); }
  }, [fetchItems, title]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    const initial = {};
    formFields.forEach(f => { initial[f.key] = ''; });
    setForm(initial);
    setShowModal(true);
  }

  function openEdit(item) {
    setEditing(item);
    const initial = {};
    formFields.forEach(f => { initial[f.key] = item[f.key] ?? ''; });
    setForm(initial);
    setShowModal(true);
  }

  async function handleSave() {
    try {
      if (editing) {
        await updateItem(editing.id, form);
        toast.success('হালনাগাদ করা হয়েছে');
      } else {
        await createItem(form);
        toast.success('তৈরি করা হয়েছে');
      }
      setShowModal(false);
      load();
    } catch (e) {
      const err = e.response?.data;
      if (typeof err === 'object') {
        const msgs = Object.values(err).flat().join(', ');
        toast.error(msgs || 'সংরক্ষণ ব্যর্থ');
      } else {
        toast.error('সংরক্ষণ ব্যর্থ');
      }
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('নিশ্চিতভাবে মুছে ফেলবেন?')) return;
    try {
      await deleteItem(id);
      toast.success('মুছে ফেলা হয়েছে');
      load();
    } catch { toast.error('মুছে ফেলতে ব্যর্থ'); }
  }

  return (
    <div className="card table-card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <span><i className={`bi ${icon} me-1`}></i>{title}</span>
        <button className="btn btn-sm btn-primary" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1"></i>নতুন
        </button>
      </div>
      <div className="card-body">
        {loading ? (
          <div className="text-center py-3"><div className="spinner-border text-primary" /></div>
        ) : (
          <table className="table table-hover mb-0">
            <thead className="table-dark">
              <tr>
                {columns.map(c => <th key={c.key}>{c.label}</th>)}
                <th style={{ width: 100 }}>কার্যক্রম</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="text-center text-muted py-3">কোনো তথ্য নেই</td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  {columns.map(c => <td key={c.key}>{c.render ? c.render(item) : item[c.key]}</td>)}
                  <td>
                    <button className="btn btn-sm btn-outline-warning me-1" onClick={() => openEdit(item)} title="সম্পাদনা">
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item.id)} title="মুছুন">
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">{editing ? 'সম্পাদনা' : 'নতুন'} {title}</h6>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                {formFields.map(f => (
                  <div className="mb-3" key={f.key}>
                    <label className="form-label">{f.label}</label>
                    {f.type === 'select' ? (
                      <select className="form-select" value={form[f.key] ?? ''}
                        onChange={e => setForm({ ...form, [f.key]: e.target.value })}>
                        <option value="">নির্বাচন করুন</option>
                        {f.options?.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : f.type === 'checkbox' ? (
                      <div className="form-check form-switch mt-2">
                        <input className="form-check-input" type="checkbox"
                          checked={form[f.key] ?? false}
                          onChange={e => setForm({ ...form, [f.key]: e.target.checked })} />
                      </div>
                    ) : (
                      <input type={f.type || 'text'} className="form-control" value={form[f.key] ?? ''}
                        onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                    )}
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>বাতিল</button>
                <button className="btn btn-primary" onClick={handleSave}>সংরক্ষণ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Gender Tab ───────────────────────────────────────────── */

function GenderTab() {
  return (
    <InlineCrudTable
      title="লিঙ্গ"
      icon="bi-gender-ambiguous"
      columns={[
        { key: 'name_bn', label: 'নাম (বাংলা)' },
        { key: 'name_en', label: 'নাম (ইংরেজি)' },
        { key: 'order', label: 'ক্রম' },
      ]}
      formFields={[
        { key: 'name_bn', label: 'নাম (বাংলা)' },
        { key: 'name_en', label: 'নাম (ইংরেজি)' },
        { key: 'order', label: 'ক্রম', type: 'number' },
      ]}
      fetchItems={() => hoService.listGenders({ ordering: 'order' })}
      createItem={data => hoService.createGender(data)}
      updateItem={(id, data) => hoService.updateGender(id, data)}
      deleteItem={id => hoService.deleteGender(id)}
    />
  );
}

/* ── Education Tab ────────────────────────────────────────── */

function EducationTab() {
  return (
    <InlineCrudTable
      title="শিক্ষাগত যোগ্যতা"
      icon="bi-mortarboard"
      columns={[
        { key: 'name_bn', label: 'নাম (বাংলা)' },
        { key: 'name_en', label: 'নাম (ইংরেজি)' },
        { key: 'rank', label: 'স্তর' },
        { key: 'order', label: 'ক্রম' },
      ]}
      formFields={[
        { key: 'name_bn', label: 'নাম (বাংলা)' },
        { key: 'name_en', label: 'নাম (ইংরেজি)' },
        { key: 'rank', label: 'স্তর', type: 'number', description: 'শিক্ষাগত স্তর নির্ধারণের জন্য সংখ্যা' },
        { key: 'order', label: 'সজ্জা ক্রম', type: 'number' },
      ]}
      fetchItems={() => hoService.listEducations({ ordering: 'order' })}
      createItem={data => hoService.createEducation(data)}
      updateItem={(id, data) => hoService.updateEducation(id, data)}
      deleteItem={id => hoService.deleteEducation(id)}
    />
  );
}

/* ── Shift Tab ───────────────────────────────────────────── */

function formatTime(val) {
  if (!val) return '-';
  return val.substring(0, 5);
}

function ShiftTab() {
  return (
    <InlineCrudTable
      title="শিফট"
      icon="bi-arrow-left-right"
      columns={[
        { key: 'name_bn', label: 'নাম (বাংলা)' },
        { key: 'name_en', label: 'নাম (ইংরেজি)' },
        { key: 'center_name', label: 'কেন্দ্র', render: item => item.center_name || 'সকল কেন্দ্র' },
        { key: 'start_time', label: 'শুরুর সময়', render: item => formatTime(item.start_time) },
        { key: 'end_time', label: 'শেষের সময়', render: item => formatTime(item.end_time) },
        { key: 'is_active', label: 'সক্রিয়', render: item => item.is_active ? 'হ্যাঁ' : 'না' },
      ]}
      formFields={[
        { key: 'name_bn', label: 'নাম (বাংলা)' },
        { key: 'name_en', label: 'নাম (ইংরেজি)' },
        { key: 'start_time', label: 'শুরুর সময়', type: 'time' },
        { key: 'end_time', label: 'শেষের সময়', type: 'time' },
        { key: 'is_active', label: 'সক্রিয়', type: 'checkbox' },
      ]}
      fetchItems={() => hoService.listShifts({ ordering: 'start_time' })}
      createItem={data => hoService.createShift(data)}
      updateItem={(id, data) => hoService.updateShift(id, data)}
      deleteItem={id => hoService.deleteShift(id)}
    />
  );
}

/* ── Holiday Tab ─────────────────────────────────────────── */

function HolidayTab() {
  const [seeding, setSeeding] = useState(false);

  async function handleSeed() {
    if (!window.confirm('২০২৬ ও ২০২৭ সালের জন্য নির্ধারিত ছুটির দিন যোগ করবেন?')) return;
    setSeeding(true);
    try {
      const res2026 = await hoService.seedHolidays({ year: 2026 });
      const res2027 = await hoService.seedHolidays({ year: 2027 });
      toast.success(
        `২০২৬: ${res2026.data.message} | ২০২৭: ${res2027.data.message}`
      );
    } catch {
      toast.error('ছুটির দিন সীড করতে ব্যর্থ');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-end mb-2">
        <button className="btn btn-sm btn-outline-success" onClick={handleSeed} disabled={seeding}>
          <i className="bi bi-database-fill-add me-1"></i>{seeding ? 'যোগ করা হচ্ছে...' : 'সীড ডাটা'}
        </button>
      </div>
      <InlineCrudTable
        title="ছুটির দিন"
        icon="bi-calendar-x"
        columns={[
          { key: 'date', label: 'তারিখ' },
          { key: 'description_bn', label: 'বিবরণ (বাংলা)' },
          { key: 'description_en', label: 'বিবরণ (ইংরেজি)' },
          { key: 'is_government_holiday', label: 'সরকারি ছুটি', render: item => item.is_government_holiday ? 'হ্যাঁ' : 'না' },
        ]}
        formFields={[
          { key: 'date', label: 'তারিখ', type: 'date' },
          { key: 'description_bn', label: 'বিবরণ (বাংলা)' },
          { key: 'description_en', label: 'বিবরণ (ইংরেজি)' },
          { key: 'is_government_holiday', label: 'সরকারি ছুটি', type: 'checkbox' },
        ]}
        fetchItems={() => hoService.listHolidays({ ordering: '-date' })}
        createItem={data => hoService.createHoliday(data)}
        updateItem={(id, data) => hoService.updateHoliday(id, data)}
        deleteItem={id => hoService.deleteHoliday(id)}
      />
    </div>
  );
}

/* ── Demography Tab ───────────────────────────────────────── */

const DEMOGRAPHY_TYPES = [
  { value: 'division', label: 'বিভাগ' },
  { value: 'district', label: 'জেলা' },
  { value: 'upazila', label: 'উপজেলা' },
];

function DemographyTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ type: '', name_bn: '', name_en: '', parent: '', bbs_code: '' });
  const [parentOptions, setParentOptions] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await hoService.listDemographies({ ordering: 'type,name_bn' });
      setItems(res.results || res || []);
    } catch { toast.error('জনসংখ্যা তথ্য লোড করতে ব্যর্থ'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function loadParents(type) {
    if (!type || type === 'division') { setParentOptions([]); return; }
    const parentType = type === 'upazila' ? 'district' : 'division';
    try {
      const { data: res } = await hoService.listDemographies({ type: parentType });
      setParentOptions(res.results || res || []);
    } catch { setParentOptions([]); }
  }

  function openCreate() {
    setEditing(null);
    setForm({ type: '', name_bn: '', name_en: '', parent: '', bbs_code: '' });
    setParentOptions([]);
    setShowModal(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      type: item.type || '',
      name_bn: item.name_bn || '',
      name_en: item.name_en || '',
      parent: item.parent || '',
      bbs_code: item.bbs_code || '',
    });
    loadParents(item.type);
    setShowModal(true);
  }

  async function handleSave() {
    const payload = { ...form };
    if (!payload.parent) payload.parent = null;
    try {
      if (editing) {
        await hoService.updateDemography(editing.id, payload);
        toast.success('হালনাগাদ করা হয়েছে');
      } else {
        await hoService.createDemography(payload);
        toast.success('তৈরি করা হয়েছে');
      }
      setShowModal(false);
      load();
    } catch (e) {
      const err = e.response?.data;
      if (typeof err === 'object') {
        const msgs = Object.values(err).flat().join(', ');
        toast.error(msgs || 'সংরক্ষণ ব্যর্থ');
      } else { toast.error('সংরক্ষণ ব্যর্থ'); }
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('নিশ্চিতভাবে মুছে ফেলবেন?')) return;
    try {
      await hoService.deleteDemography(id);
      toast.success('মুছে ফেলা হয়েছে');
      load();
    } catch { toast.error('মুছে ফেলতে ব্যর্থ'); }
  }

  const typeLabels = { division: 'বিভাগ', district: 'জেলা', upazila: 'উপজেলা' };

  return (
    <div className="card table-card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <span><i className="bi bi-globe me-1"></i>জনসংখ্যা তথ্য</span>
        <button className="btn btn-sm btn-primary" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1"></i>নতুন
        </button>
      </div>
      <div className="card-body">
        {loading ? (
          <div className="text-center py-3"><div className="spinner-border text-primary" /></div>
        ) : (
          <table className="table table-hover mb-0">
            <thead className="table-dark">
              <tr>
                <th>নাম (বাংলা)</th>
                <th>নাম (ইংরেজি)</th>
                <th>ধরন</th>
                <th>প্যারেন্ট</th>
                <th>BBS কোড</th>
                <th style={{ width: 100 }}>কার্যক্রম</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted py-3">কোনো তথ্য নেই</td></tr>
              ) : items.map(item => (
                <tr key={item.id}>
                  <td>{item.name_bn}</td>
                  <td>{item.name_en}</td>
                  <td><span className="badge bg-info">{typeLabels[item.type] || item.type}</span></td>
                  <td>{item.parent_name || '-'}</td>
                  <td>{item.bbs_code || '-'}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-warning me-1" onClick={() => openEdit(item)} title="সম্পাদনা">
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(item.id)} title="মুছুন">
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">{editing ? 'সম্পাদনা' : 'নতুন'} জনসংখ্যা তথ্য</h6>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">ধরন</label>
                  <select className="form-select" value={form.type}
                    onChange={e => { setForm({ ...form, type: e.target.value, parent: '' }); loadParents(e.target.value); }}>
                    <option value="">নির্বাচন করুন</option>
                    {DEMOGRAPHY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">নাম (বাংলা)</label>
                  <BanglaInput type="text" className="form-control" value={form.name_bn}
                    onChange={e => setForm({ ...form, name_bn: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label">নাম (ইংরেজি) <span className="text-muted" style={{ fontSize: '0.75rem' }}>English only</span></label>
                  <input type="text" className="form-control" value={form.name_en}
                    onChange={e => setForm({ ...form, name_en: e.target.value })} />
                </div>
                {form.type && form.type !== 'division' && (
                  <div className="mb-3">
                    <label className="form-label">প্যারেন্ট ({form.type === 'upazila' ? 'জেলা' : 'বিভাগ'})</label>
                    <select className="form-select" value={form.parent}
                      onChange={e => setForm({ ...form, parent: e.target.value })}>
                      <option value="">নির্বাচন করুন</option>
                      {parentOptions.map(p => <option key={p.id} value={p.id}>{p.name_bn}</option>)}
                    </select>
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">BBS কোড</label>
                  <input type="text" className="form-control" value={form.bbs_code}
                    onChange={e => setForm({ ...form, bbs_code: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>বাতিল</button>
                <button className="btn btn-primary" onClick={handleSave}>সংরক্ষণ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
