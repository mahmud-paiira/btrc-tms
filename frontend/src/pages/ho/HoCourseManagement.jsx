import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';
import BanglaInput from '../../components/common/BanglaInput';
import { convertToBanglaDigits } from '../../utils/numberFormatter';

const TYPE_MAP = { driver: 'ড্রাইভার', mechanic: 'মেকানিক', supervisor: 'সুপারভাইজার' };
const STATUS_MAP = { draft: 'খসড়া', active: 'সক্রিয়', completed: 'সমাপ্ত' };
const STEP_LABELS = ['বেসিক তথ্য', 'কনফিগারেশন', 'বিল আইটেম', 'অধ্যায়', 'পূর্বশর্ত'];

const DURATION_UNITS = [
  { value: 'days', label: 'দিন' },
  { value: 'weeks', label: 'সপ্তাহ' },
  { value: 'months', label: 'মাস' },
];

const EMPTY_COURSE = {
  code: '', name_bn: '', name_en: '',
  description: '', project_name: '', project_sponsor: '',
  duration_value: 3, duration_unit: 'months',
  fee: 0, stipend_eligible: false, employment_eligible: false, status: 'draft',
};

function CourseFormWizard({ show, course, onClose, onSaved }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_COURSE);
  const [config, setConfig] = useState({
    eligibility_criteria: '', training_methodology: '', assessment_criteria: '',
    passing_marks: 80, attendance_requirement: 80, certificate_template: '',
  });
  const [bills, setBills] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (course) {
      setForm({
        code: course.code || `${new Date().getFullYear()}-0001`,
        name_bn: course.name_bn || '', name_en: course.name_en || '',
        description: course.description || '', project_name: course.project_name || '',
        project_sponsor: course.project_sponsor || '',
        duration_value: course.duration_value || 3,
        duration_unit: course.duration_unit || 'months',
        fee: course.fee || 0, stipend_eligible: course.stipend_eligible || false,
        employment_eligible: course.employment_eligible || false, status: course.status || 'draft',
      });
      setConfig(course.configuration || {
        eligibility_criteria: '', training_methodology: '', assessment_criteria: '',
        passing_marks: 80, attendance_requirement: 80, certificate_template: '',
        fee: course.fee || 0, stipend_eligible: course.stipend_eligible || false,
        employment_eligible: course.employment_eligible || false,
      });
      setBills(course.bills || []);
      setChapters(course.chapters || []);
      setCompetencies(course.competencies || []);
    } else {
      setForm(EMPTY_COURSE);
      setConfig({
        eligibility_criteria: '', training_methodology: '', assessment_criteria: '',
        passing_marks: 80, attendance_requirement: 80, certificate_template: '',
        fee: 0, stipend_eligible: false, employment_eligible: false,
      });
      setBills([]);
      setChapters([]);
      setCompetencies([]);
    }
    setStep(0);
  }, [course, show]);

  const handleForm = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const buildPayload = () => {
    const { fee: cFee, stipend_eligible: cStipend, employment_eligible: cEmployment, ...restConfig } = config;
    const durationValue = form.duration_value || 3;
    const durationUnit = form.duration_unit || 'months';
    let durationMonths = 0, durationHours = 0, totalTrainingDays = 0;
    if (durationUnit === 'months') durationMonths = durationValue;
    else if (durationUnit === 'weeks') durationMonths = Math.ceil(durationValue / 4);
    else if (durationUnit === 'days') {
      totalTrainingDays = durationValue;
      durationHours = durationValue * 8;
    }
    const { code, ...formWithoutCode } = form;
    return {
      ...formWithoutCode,
      course_type: 'driver',
      duration_months: durationMonths,
      duration_hours: durationHours,
      total_training_days: totalTrainingDays,
      configuration: {
        ...restConfig,
        fee: cFee,
        stipend_eligible: cStipend,
        employment_eligible: cEmployment,
      },
      bills: bills.filter((b) => b.bill_item_bn),
      chapters: chapters.filter((c) => c.title_bn),
      competencies: competencies.filter((c) => c.code),
    };
  };

  const handleSubmit = async () => {
    if (!form.name_bn) { toast.error('নাম আবশ্যক'); return; }
    setSaving(true);
    try {
      const payload = buildPayload();
      console.log('Submitting course payload:', JSON.stringify(payload, null, 2));
      if (course) {
        await hoService.updateCourse(course.id, payload);
        toast.success('কোর্স আপডেট হয়েছে');
      } else {
        await hoService.createCourse(payload);
        toast.success('কোর্স তৈরি হয়েছে');
      }
      onSaved();
    } catch (err) {
      console.error('Course save error:', err.response?.data || err);
      toast.error(err.response?.data?.detail?.[0] || JSON.stringify(err.response?.data) || 'সংরক্ষণ ব্যর্থ');
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="row g-3">
          <div className="col-12 mb-1">
            <h6 className="fw-bold" style={{ color: '#6366f1', fontSize: '0.9rem' }}>
              <i className="bi bi-info-circle me-1"></i>বেসিক তথ্য
            </h6>
            <hr className="mt-1 mb-3" style={{ borderColor: '#e2e8f0' }} />
          </div>
          <div className="col-4">
            <label className="form-label">কোড</label>
            <input name="code" className="form-control bg-light" value={form.code || (course ? course.code : 'স্বয়ংক্রিয়ভাবে জেনারেট হবে')} readOnly />
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>{form.code ? '' : 'নতুন কোর্সের জন্য স্বয়ংক্রিয়ভাবে জেনারেট হবে'}</small>
          </div>
          <div className="col-4">
            <label className="form-label">নাম (বাংলা) <span className="text-danger">*</span></label>
            <BanglaInput name="name_bn" className="form-control" value={form.name_bn} onChange={handleForm} required />
          </div>
          <div className="col-4">
            <label className="form-label">নাম (ইংরেজি) <span className="text-muted" style={{ fontSize: '0.75rem' }}>English only</span></label>
            <input name="name_en" className="form-control" value={form.name_en} onChange={handleForm} />
          </div>
          <div className="col-4">
            <label className="form-label">কোর্সের মেয়াদ</label>
            <div className="input-group">
              <input name="duration_value" type="number" min="1" className="form-control"
                value={form.duration_value} onChange={handleForm} />
              <select name="duration_unit" className="form-select" style={{ flex: '0 0 120px' }}
                value={form.duration_unit} onChange={handleForm}>
                {DURATION_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
          </div>
          <div className="col-8">
            <label className="form-label">কোর্স বিবরণ</label>
            <BanglaInput as="textarea" name="description" className="form-control" rows="2"
              value={form.description} onChange={handleForm}
              placeholder="কোর্স সম্পর্কে সংক্ষিপ্ত বিবরণ..." />
          </div>
          <div className="col-6">
            <label className="form-label">প্রকল্পের নাম</label>
            <input name="project_name" className="form-control" value={form.project_name} onChange={handleForm}
              placeholder="প্রকল্পের নাম লিখুন" />
          </div>
          <div className="col-6">
            <label className="form-label">প্রকল্পের স্পনসর</label>
            <input name="project_sponsor" className="form-control" value={form.project_sponsor} onChange={handleForm}
              placeholder="স্পনসরের নাম লিখুন" />
          </div>
        </div>
      );
      case 1: return (
        <div className="row g-3">
          <div className="col-12 mb-1">
            <h6 className="fw-bold" style={{ color: '#10b981', fontSize: '0.9rem' }}>
              <i className="bi bi-gear me-1"></i>কনফিগারেশন
            </h6>
            <hr className="mt-1 mb-3" style={{ borderColor: '#e2e8f0' }} />
          </div>
          <div className="col-12"><label className="form-label">যোগ্যতার মানদণ্ড</label><textarea className="form-control" rows="2" value={config.eligibility_criteria} onChange={(e) => setConfig((p) => ({ ...p, eligibility_criteria: e.target.value }))} /></div>
          <div className="col-12"><label className="form-label">প্রশিক্ষণ পদ্ধতি</label><textarea className="form-control" rows="2" value={config.training_methodology} onChange={(e) => setConfig((p) => ({ ...p, training_methodology: e.target.value }))} /></div>
          <div className="col-12"><label className="form-label">মূল্যায়নের মানদণ্ড</label><textarea className="form-control" rows="2" value={config.assessment_criteria} onChange={(e) => setConfig((p) => ({ ...p, assessment_criteria: e.target.value }))} /></div>
          <div className="col-4"><label className="form-label">পাস মার্কস (%)</label><input type="number" className="form-control" value={config.passing_marks} onChange={(e) => setConfig((p) => ({ ...p, passing_marks: +e.target.value }))} /></div>
          <div className="col-4"><label className="form-label">উপস্থিতি (%)</label><input type="number" className="form-control" value={config.attendance_requirement} onChange={(e) => setConfig((p) => ({ ...p, attendance_requirement: +e.target.value }))} /></div>
          <div className="col-4"><label className="form-label">সার্টিফিকেট টেমপ্লেট</label><input className="form-control" value={config.certificate_template} onChange={(e) => setConfig((p) => ({ ...p, certificate_template: e.target.value }))} /></div>
          <div className="col-12">
            <hr className="my-2" style={{ borderColor: '#e2e8f0' }} />
          </div>
          <div className="col-4">
            <label className="form-label">ফি (৳)</label>
            <input type="number" className="form-control" value={config.fee}
              onChange={(e) => setConfig((p) => ({ ...p, fee: +e.target.value }))} />
          </div>
          <div className="col-8 d-flex gap-4 align-items-center pt-4">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" checked={config.stipend_eligible}
                onChange={(e) => setConfig((p) => ({ ...p, stipend_eligible: e.target.checked }))} />
              <label className="form-check-label">স্টাইপেন্ড উপযোগী</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" checked={config.employment_eligible}
                onChange={(e) => setConfig((p) => ({ ...p, employment_eligible: e.target.checked }))} />
              <label className="form-check-label">চাকরির উপযোগী</label>
            </div>
          </div>
        </div>
      );
      case 2: return (
        <div>
          {bills.map((b, i) => (
            <div key={i} className="row g-2 mb-2 align-items-center">
              <div className="col-4"><input className="form-control" placeholder="আইটেম (বাংলা)" value={b.bill_item_bn} onChange={(e) => { const c = [...bills]; c[i] = { ...c[i], bill_item_bn: e.target.value }; setBills(c); }} /></div>
              <div className="col-4"><input className="form-control" placeholder="Item (English)" value={b.bill_item_en} onChange={(e) => { const c = [...bills]; c[i] = { ...c[i], bill_item_en: e.target.value }; setBills(c); }} /></div>
              <div className="col-2"><input className="form-control" type="number" placeholder="পরিমাণ" value={b.amount} onChange={(e) => { const c = [...bills]; c[i] = { ...c[i], amount: +e.target.value }; setBills(c); }} /></div>
              <div className="col-1"><input className="form-check-input" type="checkbox" checked={b.is_mandatory} onChange={(e) => { const c = [...bills]; c[i] = { ...c[i], is_mandatory: e.target.checked }; setBills(c); }} title="বাধ্যতামূলক" /></div>
              <div className="col-1"><button className="btn btn-sm btn-outline-danger" onClick={() => setBills(bills.filter((_, j) => j !== i))}><i className="bi bi-x"></i></button></div>
            </div>
          ))}
          <button className="btn btn-sm btn-outline-primary mt-2" onClick={() => setBills([...bills, { bill_item_bn: '', bill_item_en: '', amount: 0, is_mandatory: true }])}><i className="bi bi-plus me-1"></i>আইটেম যোগ</button>
        </div>
      );
      case 3: return (
        <div>
          {chapters.map((c, i) => (
            <div key={i} className="row g-2 mb-2 align-items-center">
              <div className="col-2"><input className="form-control" type="number" placeholder="নং" value={c.chapter_no} onChange={(e) => { const cc = [...chapters]; cc[i] = { ...cc[i], chapter_no: +e.target.value }; setChapters(cc); }} /></div>
              <div className="col-4"><input className="form-control" placeholder="শিরোনাম (বাংলা)" value={c.title_bn} onChange={(e) => { const cc = [...chapters]; cc[i] = { ...cc[i], title_bn: e.target.value }; setChapters(cc); }} /></div>
              <div className="col-4"><input className="form-control" placeholder="শিরোনাম (ইংরেজি)" value={c.title_en} onChange={(e) => { const cc = [...chapters]; cc[i] = { ...cc[i], title_en: e.target.value }; setChapters(cc); }} /></div>
              <div className="col-1"><input className="form-control" type="number" step="0.5" placeholder="ঘন্টা" value={c.duration_hours} onChange={(e) => { const cc = [...chapters]; cc[i] = { ...cc[i], duration_hours: +e.target.value }; setChapters(cc); }} /></div>
              <div className="col-1"><button className="btn btn-sm btn-outline-danger" onClick={() => setChapters(chapters.filter((_, j) => j !== i))}><i className="bi bi-x"></i></button></div>
            </div>
          ))}
          <button className="btn btn-sm btn-outline-primary mt-2" onClick={() => setChapters([...chapters, { chapter_no: chapters.length + 1, title_bn: '', title_en: '', duration_hours: 1 }])}><i className="bi bi-plus me-1"></i>অধ্যায় যোগ</button>
        </div>
      );
      case 4: return (
        <div>
          {competencies.map((c, i) => (
            <div key={i} className="row g-2 mb-2 align-items-center">
              <div className="col-3"><input className="form-control" placeholder="কোড" value={c.code} onChange={(e) => { const cc = [...competencies]; cc[i] = { ...cc[i], code: e.target.value }; setCompetencies(cc); }} /></div>
              <div className="col-3"><input className="form-control" placeholder="নাম (বাংলা)" value={c.name_bn} onChange={(e) => { const cc = [...competencies]; cc[i] = { ...cc[i], name_bn: e.target.value }; setCompetencies(cc); }} /></div>
              <div className="col-4"><input className="form-control" placeholder="নাম (ইংরেজি)" value={c.name_en} onChange={(e) => { const cc = [...competencies]; cc[i] = { ...cc[i], name_en: e.target.value }; setCompetencies(cc); }} /></div>
              <div className="col-1"><input className="form-control" placeholder="পদ্ধতি" value={c.assessment_method} onChange={(e) => { const cc = [...competencies]; cc[i] = { ...cc[i], assessment_method: e.target.value }; setCompetencies(cc); }} /></div>
              <div className="col-1"><button className="btn btn-sm btn-outline-danger" onClick={() => setCompetencies(competencies.filter((_, j) => j !== i))}><i className="bi bi-x"></i></button></div>
            </div>
          ))}
          <button className="btn btn-sm btn-outline-primary mt-2" onClick={() => setCompetencies([...competencies, { code: '', name_bn: '', name_en: '', assessment_method: '' }])}><i className="bi bi-plus me-1"></i>পূর্বশর্ত যোগ</button>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,.5)', zIndex: 1050 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">{course ? 'কোর্স সম্পাদনা' : 'নতুন কোর্স'}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="d-flex gap-2 mb-3 justify-content-center">
              {STEP_LABELS.map((l, i) => (
                <button key={l} className={`btn btn-sm ${i === step ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setStep(i)}>{i + 1}. {l}</button>
              ))}
            </div>
            {renderStep()}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>বাতিল</button>
            {step > 0 && <button className="btn btn-outline-primary" onClick={() => setStep(step - 1)}>পেছনে</button>}
            {step < STEP_LABELS.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setStep(step + 1)}>পরবর্তী</button>
            ) : (
              <button className="btn btn-success" onClick={handleSubmit} disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}{course ? 'আপডেট' : 'তৈরি করুন'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HoCourseManagement() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterType) params.course_type = filterType;
      if (filterStatus) params.status = filterStatus;
      const { data } = await hoService.listCourses(params);
      setCourses(data.results || data || []);
    } catch { toast.error('কোর্স তালিকা লোড করতে ব্যর্থ'); }
    finally { setLoading(false); }
  }, [search, filterType, filterStatus]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);
  useEffect(() => { setSelectAll(false); setSelectedIds([]); }, [courses]);

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setSelectedIds(newSelectAll ? courses.map(c => c.id) : []);
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleToggle = async (c) => {
    try {
      if (c.status === 'active') {
        await hoService.deactivateCourse(c.id);
        toast.success('কোর্স নিষ্ক্রিয় করা হয়েছে');
      } else {
        await hoService.activateCourse(c.id);
        toast.success('কোর্স সক্রিয় করা হয়েছে');
      }
      fetchCourses();
    } catch { toast.error('স্ট্যাটাস পরিবর্তন ব্যর্থ'); }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`"${c.name_bn}" কোর্সটি মুছবেন?`)) return;
    try {
      await hoService.deleteCourse(c.id);
      toast.success('কোর্স মুছে ফেলা হয়েছে');
      fetchCourses();
    } catch (err) { toast.error(err.response?.data?.detail?.[0] || 'মুছতে ব্যর্থ'); }
  };

  return (
    <div className="px-4 py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0"><i className="bi bi-book me-2"></i>কোর্স ব্যবস্থাপনা</h4>
        <button className="btn btn-primary" onClick={() => { setEditCourse(null); setShowForm(true); }}>
          <i className="bi bi-plus-lg me-1"></i>নতুন কোর্স
        </button>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-4"><input className="form-control" placeholder="অনুসন্ধান (কোড, নাম)..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="col-2"><select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">সব ধরন</option>{Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></div>
        <div className="col-2"><select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">সব স্ট্যাটাস</option>{Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></div>
      </div>

      {selectedIds.length > 0 && (
        <div className="d-flex align-items-center justify-content-between bg-light rounded-3 px-3 py-2 mb-3 border">
          <span className="fw-medium">
            <i className="bi bi-check-square me-1"></i>
            <strong>{selectedIds.length}</strong> টি কোর্স নির্বাচিত
          </span>
          <div className="d-flex gap-1">
            <button className="btn btn-outline-danger btn-sm" onClick={() => { setSelectedIds([]); setSelectAll(false); }}>
              <i className="bi bi-slash-circle me-1"></i>মুক্ত করুন
            </button>
          </div>
        </div>
      )}

      <div className="row g-3">
        <div className="col-12">
          <div className="card shadow-sm table-card">
            <div className={loading ? 'card-body text-center py-5' : 'card-body p-0'}>
              {loading ? <div className="spinner-border text-primary" /> : (
                <div className="table-responsive">
                  <table className="b-table w-100">
                    <thead>
                      <tr>
                        <th>
                          <input type="checkbox" className="form-check-input" checked={selectAll} onChange={handleSelectAll} />
                        </th>
                        <th>কোড</th><th>নাম (বাংলা)</th><th>মেয়াদ</th><th>প্রকল্প</th><th>স্পনসর</th><th>বিবরণ</th><th>স্ট্যাটাস</th><th className="text-center">কার্যক্রম</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.length === 0 ? <tr><td colSpan={9} className="text-center text-muted py-4">কোন কোর্স পাওয়া যায়নি</td></tr>
                      : courses.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <input type="checkbox" className="form-check-input"
                                checked={selectedIds.includes(c.id)} onChange={() => handleSelectOne(c.id)} />
                            </td>
                            <td><strong>{convertToBanglaDigits(c.code)}</strong></td>
                            <td><button className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold" onClick={() => navigate('/ho/courses/' + c.id)}>{c.name_bn}</button></td>
                            <td>
{c.duration_value ? (
                        <>{convertToBanglaDigits(c.duration_value)} {c.duration_unit === 'days' ? 'দিন' : c.duration_unit === 'weeks' ? 'সপ্তাহ' : 'মাস'}</>
                      ) : (
                        c.duration_months ? <>{convertToBanglaDigits(c.duration_months)} মাস</> : <span className="text-muted">—</span>
                      )}
                            </td>
                            <td>{c.project_name || '—'}</td>
                            <td>{c.project_sponsor || '—'}</td>
                            <td>{c.description ? c.description.slice(0, 60) + (c.description.length > 60 ? '…' : '') : '—'}</td>
                            <td><span className={`status-dot dot-${c.status}`}></span> {c.status_display || STATUS_MAP[c.status]}</td>
                            <td className="act-col">
                              <div className="dropdown act-dropdown">
                                <button className="dropdown-toggle" data-bs-toggle="dropdown" type="button" data-bs-strategy="fixed">
                                  <i className="bi bi-three-dots-vertical"></i>
                                </button>
                                <ul className="dropdown-menu dropdown-menu-end">
                                  <li><button className="dropdown-item text-primary" onClick={() => navigate('/ho/courses/' + c.id)}><i className="bi bi-eye me-2"></i>বিস্তারিত</button></li>
                                  <li><hr className="dropdown-divider my-1" /></li>
                                  <li><button className="dropdown-item text-primary" onClick={async () => {
                                    try {
                                      const { data } = await hoService.getCourse(c.id);
                                      setEditCourse(data);
                                      setShowForm(true);
                                    } catch { toast.error('কোর্স ডেটা লোড করতে ব্যর্থ'); }
                                  }}><i className="bi bi-pencil me-2"></i>সম্পাদনা</button></li>
                                  <li><button className={`dropdown-item ${c.status === 'active' ? 'text-warning' : 'text-success'}`} onClick={() => handleToggle(c)}>
                                    <i className={`bi ${c.status === 'active' ? 'bi-pause-circle' : 'bi-play-circle'} me-2`}></i>{c.status === 'active' ? 'নিষ্ক্রিয়' : 'সক্রিয়'}
                                  </button></li>
                                  <li><hr className="dropdown-divider my-1" /></li>
                                  <li><button className="dropdown-item text-danger" onClick={() => handleDelete(c)}><i className="bi bi-trash me-2"></i>মুছুন</button></li>
                                </ul>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="card-footer b-pagination">
              <span className="page-info">মোট {courses.length} টি কোর্স</span>
            </div>
          </div>
        </div>
      </div>

      <CourseFormWizard show={showForm} course={editCourse} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchCourses(); }} />
    </div>
  );
}
