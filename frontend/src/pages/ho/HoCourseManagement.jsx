import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';

const TYPE_MAP = { driver: 'ড্রাইভার', mechanic: 'মেকানিক', supervisor: 'সুপারভাইজার' };
const STATUS_MAP = { draft: 'খসড়া', active: 'সক্রিয়', completed: 'সমাপ্ত' };
const STATUS_BG = { draft: 'secondary', active: 'success', completed: 'info' };
const TERM_MAP = { foundation: 'ফাউন্ডেশন', advanced: 'এডভান্সড' };
const SESSION_MAP = { morning: 'সকাল', day: 'দিন', evening: 'সন্ধ্যা' };

const STEP_LABELS = ['বেসিক তথ্য', 'কনফিগারেশন', 'বিল আইটেম', 'অধ্যায়', 'কম্পিটেন্সি'];

const EMPTY_COURSE = {
  code: '', name_bn: '', name_en: '', course_type: 'driver', term: 'foundation',
  session: 'morning', duration_months: 3, duration_hours: 0, total_training_days: 0,
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
        code: course.code || '', name_bn: course.name_bn || '', name_en: course.name_en || '',
        course_type: course.course_type || 'driver', term: course.term || 'foundation',
        session: course.session || 'morning', duration_months: course.duration_months || 3,
        duration_hours: course.duration_hours || 0, total_training_days: course.total_training_days || 0,
        fee: course.fee || 0, stipend_eligible: course.stipend_eligible || false,
        employment_eligible: course.employment_eligible || false, status: course.status || 'draft',
      });
      setConfig(course.configuration || {
        eligibility_criteria: '', training_methodology: '', assessment_criteria: '',
        passing_marks: 80, attendance_requirement: 80, certificate_template: '',
      });
      setBills(course.bills || []);
      setChapters(course.chapters || []);
      setCompetencies(course.competencies || []);
    } else {
      setForm(EMPTY_COURSE);
      setConfig({ eligibility_criteria: '', training_methodology: '', assessment_criteria: '', passing_marks: 80, attendance_requirement: 80, certificate_template: '' });
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

  const buildPayload = () => ({
    ...form,
    configuration: config,
    bills: bills.filter((b) => b.bill_item_bn),
    chapters: chapters.filter((c) => c.title_bn),
    competencies: competencies.filter((c) => c.code),
  });

  const handleSubmit = async () => {
    if (!form.code || !form.name_bn) { toast.error('কোড ও নাম আবশ্যক'); return; }
    if (chapters.filter((c) => c.title_bn).length === 0) { toast.error('অন্তত একটি অধ্যায় দিন'); return; }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (course) {
        await hoService.updateCourse(course.id, payload);
        toast.success('কোর্স আপডেট হয়েছে');
      } else {
        await hoService.createCourse(payload);
        toast.success('কোর্স তৈরি হয়েছে');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail?.[0] || 'সংরক্ষণ ব্যর্থ');
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="row g-3">
          <div className="col-4"><label className="form-label">কোড <span className="text-danger">*</span></label><input name="code" className="form-control" value={form.code} onChange={handleForm} required /></div>
          <div className="col-4"><label className="form-label">নাম (বাংলা) <span className="text-danger">*</span></label><input name="name_bn" className="form-control" value={form.name_bn} onChange={handleForm} required /></div>
          <div className="col-4"><label className="form-label">নাম (ইংরেজি)</label><input name="name_en" className="form-control" value={form.name_en} onChange={handleForm} /></div>
          <div className="col-3"><label className="form-label">ধরন</label><select name="course_type" className="form-select" value={form.course_type} onChange={handleForm}>{Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="col-3"><label className="form-label">টার্ম</label><select name="term" className="form-select" value={form.term} onChange={handleForm}>{Object.entries(TERM_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="col-3"><label className="form-label">সেশন</label><select name="session" className="form-select" value={form.session} onChange={handleForm}>{Object.entries(SESSION_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="col-3"><label className="form-label">মেয়াদ (মাস)</label><input name="duration_months" type="number" min="1" className="form-control" value={form.duration_months} onChange={handleForm} /></div>
          <div className="col-3"><label className="form-label">মোট ঘন্টা</label><input name="duration_hours" type="number" className="form-control" value={form.duration_hours} onChange={handleForm} /></div>
          <div className="col-3"><label className="form-label">প্রশিক্ষণ দিন</label><input name="total_training_days" type="number" className="form-control" value={form.total_training_days} onChange={handleForm} /></div>
          <div className="col-3"><label className="form-label">ফি (৳)</label><input name="fee" type="number" className="form-control" value={form.fee} onChange={handleForm} /></div>
          <div className="col-6 d-flex gap-4 align-items-center pt-4">
            <div className="form-check"><input className="form-check-input" type="checkbox" name="stipend_eligible" checked={form.stipend_eligible} onChange={handleForm} /><label className="form-check-label">স্টাইপেন্ড উপযোগী</label></div>
            <div className="form-check"><input className="form-check-input" type="checkbox" name="employment_eligible" checked={form.employment_eligible} onChange={handleForm} /><label className="form-check-label">চাকরির উপযোগী</label></div>
          </div>
        </div>
      );
      case 1: return (
        <div className="row g-3">
          <div className="col-12"><label className="form-label">যোগ্যতার মানদণ্ড</label><textarea name="eligibility_criteria" className="form-control" rows="3" value={config.eligibility_criteria} onChange={(e) => setConfig((p) => ({ ...p, eligibility_criteria: e.target.value }))} /></div>
          <div className="col-12"><label className="form-label">প্রশিক্ষণ পদ্ধতি</label><textarea name="training_methodology" className="form-control" rows="3" value={config.training_methodology} onChange={(e) => setConfig((p) => ({ ...p, training_methodology: e.target.value }))} /></div>
          <div className="col-12"><label className="form-label">মূল্যায়নের মানদণ্ড</label><textarea name="assessment_criteria" className="form-control" rows="3" value={config.assessment_criteria} onChange={(e) => setConfig((p) => ({ ...p, assessment_criteria: e.target.value }))} /></div>
          <div className="col-4"><label className="form-label">পাস মার্কস (%)</label><input type="number" className="form-control" value={config.passing_marks} onChange={(e) => setConfig((p) => ({ ...p, passing_marks: +e.target.value }))} /></div>
          <div className="col-4"><label className="form-label">উপস্থিতি (%)</label><input type="number" className="form-control" value={config.attendance_requirement} onChange={(e) => setConfig((p) => ({ ...p, attendance_requirement: +e.target.value }))} /></div>
          <div className="col-4"><label className="form-label">সার্টিফিকেট টেমপ্লেট</label><input className="form-control" value={config.certificate_template} onChange={(e) => setConfig((p) => ({ ...p, certificate_template: e.target.value }))} /></div>
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
          <button className="btn btn-sm btn-outline-primary mt-2" onClick={() => setCompetencies([...competencies, { code: '', name_bn: '', name_en: '', assessment_method: '' }])}><i className="bi bi-plus me-1"></i>কম্পিটেন্সি যোগ</button>
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

function CourseDetailPanel({ course, onClose }) {
  const [tab, setTab] = useState('overview');
  const [chapters, setChapters] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [bills, setBills] = useState([]);

  useEffect(() => {
    if (course.id) {
      hoService.getCourseChapters(course.id).then((r) => setChapters(r.data || [])).catch(() => {});
      hoService.getCourseCompetencies(course.id).then((r) => setCompetencies(r.data || [])).catch(() => {});
      hoService.getCourseBills(course.id).then((r) => setBills(r.data || [])).catch(() => {});
    }
  }, [course.id]);

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0"><i className="bi bi-book me-2"></i>{course.name_bn} ({course.code})</h5>
        <button className="btn btn-sm btn-outline-secondary" onClick={onClose}><i className="bi bi-x-lg"></i></button>
      </div>
      <div className="card-body">
        <div className="d-flex gap-2 mb-3 flex-wrap">
          <span className={`badge bg-${STATUS_BG[course.status]} fs-6`}>{STATUS_MAP[course.status]}</span>
          <span className="badge bg-info fs-6">{TYPE_MAP[course.course_type]}</span>
          <span className="badge bg-secondary fs-6">{TERM_MAP[course.term]} - {SESSION_MAP[course.session]}</span>
        </div>

        <ul className="nav nav-tabs mb-3">
          <li className="nav-item"><button className={`nav-link ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>সারাংশ</button></li>
          <li className="nav-item"><button className={`nav-link ${tab === 'config' ? 'active' : ''}`} onClick={() => setTab('config')}>কনফিগারেশন</button></li>
          <li className="nav-item"><button className={`nav-link ${tab === 'chapters' ? 'active' : ''}`} onClick={() => setTab('chapters')}>অধ্যায় ({chapters.length})</button></li>
          <li className="nav-item"><button className={`nav-link ${tab === 'competency' ? 'active' : ''}`} onClick={() => setTab('competency')}>কম্পিটেন্সি ({competencies.length})</button></li>
          <li className="nav-item"><button className={`nav-link ${tab === 'bills' ? 'active' : ''}`} onClick={() => setTab('bills')}>বিল ({bills.length})</button></li>
        </ul>

        {tab === 'overview' && (
          <div className="row">
            <div className="col-6">
              <table className="table table-bordered">
                <tbody>
                  <tr><th style={{ width: 130 }}>কোড</th><td>{course.code}</td></tr>
                  <tr><th>নাম (বাংলা)</th><td>{course.name_bn}</td></tr>
                  <tr><th>নাম (ইংরেজি)</th><td>{course.name_en || '—'}</td></tr>
                  <tr><th>ধরন</th><td>{TYPE_MAP[course.course_type]}</td></tr>
                  <tr><th>টার্ম</th><td>{TERM_MAP[course.term]}</td></tr>
                  <tr><th>সেশন</th><td>{SESSION_MAP[course.session]}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="col-6">
              <table className="table table-bordered">
                <tbody>
                  <tr><th style={{ width: 130 }}>মেয়াদ</th><td>{course.duration_months} মাস</td></tr>
                  <tr><th>ঘন্টা</th><td>{course.duration_hours}</td></tr>
                  <tr><th>প্রশিক্ষণ দিন</th><td>{course.total_training_days}</td></tr>
                  <tr><th>ফি</th><td>৳{course.fee}</td></tr>
                  <tr><th>স্টাইপেন্ড</th><td>{course.stipend_eligible ? 'হ্যাঁ' : 'না'}</td></tr>
                  <tr><th>চাকরির উপযোগী</th><td>{course.employment_eligible ? 'হ্যাঁ' : 'না'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'config' && (
          <div className="row">
            <div className="col-6">
              <table className="table table-bordered">
                <tbody>
                  <tr><th style={{ width: 140 }}>পাস মার্কস</th><td>{course.configuration?.passing_marks || 80}%</td></tr>
                  <tr><th>উপস্থিতি</th><td>{course.configuration?.attendance_requirement || 80}%</td></tr>
                  <tr><th>সার্টিফিকেট</th><td>{course.configuration?.certificate_template || '—'}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="col-6">
              <h6>যোগ্যতার মানদণ্ড</h6>
              <p className="text-muted small">{course.configuration?.eligibility_criteria || '—'}</p>
              <h6>মূল্যায়ন</h6>
              <p className="text-muted small">{course.configuration?.assessment_criteria || '—'}</p>
            </div>
          </div>
        )}

        {tab === 'chapters' && (
          <table className="table table-sm table-bordered">
            <thead className="table-light"><tr><th>নং</th><th>শিরোনাম (বাংলা)</th><th>শিরোনাম (ইংরেজি)</th><th>সময় (ঘন্টা)</th></tr></thead>
            <tbody>
              {chapters.length === 0 ? <tr><td colSpan={4} className="text-center text-muted">কোন অধ্যায় নেই</td></tr>
              : chapters.map((c) => (
                <tr key={c.id || c.chapter_no}>
                  <td>{c.chapter_no}</td>
                  <td>{c.title_bn}</td>
                  <td>{c.title_en || '—'}</td>
                  <td>{c.duration_hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'competency' && (
          <table className="table table-sm table-bordered">
            <thead className="table-light"><tr><th>কোড</th><th>নাম (বাংলা)</th><th>নাম (ইংরেজি)</th><th>মূল্যায়ন</th></tr></thead>
            <tbody>
              {competencies.length === 0 ? <tr><td colSpan={4} className="text-center text-muted">কোন কম্পিটেন্সি নেই</td></tr>
              : competencies.map((c) => (
                <tr key={c.id || c.code}>
                  <td>{c.code}</td>
                  <td>{c.name_bn}</td>
                  <td>{c.name_en || '—'}</td>
                  <td>{c.assessment_method || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'bills' && (
          <table className="table table-sm table-bordered">
            <thead className="table-light"><tr><th>বিল আইটেম</th><th>পরিমাণ</th><th>বাধ্যতামূলক</th></tr></thead>
            <tbody>
              {bills.length === 0 ? <tr><td colSpan={3} className="text-center text-muted">কোন বিল আইটেম নেই</td></tr>
              : bills.map((b) => (
                <tr key={b.id}>
                  <td>{b.bill_item_bn} <small className="text-muted">({b.bill_item_en})</small></td>
                  <td>৳{b.amount}</td>
                  <td>{b.is_mandatory ? <span className="badge bg-success">হ্যাঁ</span> : <span className="badge bg-secondary">না</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function HoCourseManagement() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [detailCourse, setDetailCourse] = useState(null);

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
      if (detailCourse?.id === c.id) setDetailCourse(null);
      fetchCourses();
    } catch (err) { toast.error(err.response?.data?.detail?.[0] || 'মুছতে ব্যর্থ'); }
  };

  return (
    <div style={{ fontFamily: 'NikoshBAN, sans-serif' }}>
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

      <div className="row g-3">
        <div className={detailCourse ? 'col-7' : 'col-12'}>
          <div className="card shadow-sm">
            <div className={loading ? 'card-body text-center py-5' : 'card-body p-0'}>
              {loading ? <div className="spinner-border text-primary" /> : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-dark">
                      <tr><th>কোড</th><th>নাম (বাংলা)</th><th>ধরন</th><th>মেয়াদ</th><th>ফি</th><th>স্ট্যাটাস</th><th className="text-center">কার্যক্রম</th></tr>
                    </thead>
                    <tbody>
                      {courses.length === 0 ? <tr><td colSpan={7} className="text-center text-muted py-4">কোন কোর্স পাওয়া যায়নি</td></tr>
                      : courses.map((c) => (
                        <tr key={c.id}>
                          <td><strong>{c.code}</strong></td>
                          <td><button className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold" onClick={() => setDetailCourse(c)}>{c.name_bn}</button></td>
                          <td>{c.course_type_display || TYPE_MAP[c.course_type]}</td>
                          <td>{c.duration_months} মাস</td>
                          <td>৳{c.fee}</td>
                          <td><span className={`badge bg-${STATUS_BG[c.status]}`}>{c.status_display || STATUS_MAP[c.status]}</span></td>
                          <td><div className="d-flex gap-1 justify-content-center">
                            <button className="btn btn-sm btn-outline-info" onClick={() => setDetailCourse(c)} title="বিস্তারিত"><i className="bi bi-eye"></i></button>
                            <button className="btn btn-sm btn-outline-primary" onClick={() => { setEditCourse(c); setShowForm(true); }} title="সম্পাদনা"><i className="bi bi-pencil"></i></button>
                            <button className={`btn btn-sm ${c.status === 'active' ? 'btn-outline-warning' : 'btn-outline-success'}`} onClick={() => handleToggle(c)} title={c.status === 'active' ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}><i className={`bi ${c.status === 'active' ? 'bi-pause-circle' : 'bi-play-circle'}`}></i></button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c)} title="মুছুন"><i className="bi bi-trash"></i></button>
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="card-footer text-muted small">মোট {courses.length} টি কোর্স</div>
          </div>
        </div>
        {detailCourse && <div className="col-5"><CourseDetailPanel course={detailCourse} onClose={() => setDetailCourse(null)} /></div>}
      </div>

      <CourseFormWizard show={showForm} course={editCourse} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchCourses(); }} />
    </div>
  );
}
