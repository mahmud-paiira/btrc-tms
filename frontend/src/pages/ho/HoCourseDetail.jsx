import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';

const TYPE_MAP = { driver: 'ড্রাইভার', mechanic: 'মেকানিক', supervisor: 'সুপারভাইজার' };
const STATUS_MAP = { draft: 'খসড়া', active: 'সক্রিয়', completed: 'সমাপ্ত' };
const STATUS_BG = { draft: 'secondary', active: 'success', completed: 'info' };
const TERM_MAP = { foundation: 'ফাউন্ডেশন', advanced: 'এডভান্সড' };
const SESSION_MAP = { morning: 'সকাল', day: 'দিন', evening: 'সন্ধ্যা' };

const TABS = [
  { key: 'overview', label: 'সারাংশ' },
  { key: 'config', label: 'কনফিগারেশন' },
  { key: 'chapters', label: 'অধ্যায়' },
  { key: 'competency', label: 'পূর্বশর্ত' },
  { key: 'bills', label: 'বিল' },
];

export default function HoCourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [tab, setTab] = useState('overview');
  const [chapters, setChapters] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await hoService.getCourse(id);
        if (cancelled) return;
        setCourse(res.data);

        const [ch, co, bl] = await Promise.all([
          hoService.getCourseChapters(id).then(r => r.data || []).catch(() => []),
          hoService.getCourseCompetencies(id).then(r => r.data || []).catch(() => []),
          hoService.getCourseBills(id).then(r => r.data || []).catch(() => []),
        ]);
        if (cancelled) return;
        setChapters(Array.isArray(ch) ? ch : []);
        setCompetencies(Array.isArray(co) ? co : []);
        setBills(Array.isArray(bl) ? bl : []);
      } catch {
        if (!cancelled) {
          toast.error('কোর্সের বিস্তারিত লোড করতে ব্যর্থ');
          navigate('/ho/courses');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">লোড হচ্ছে...</p>
      </div>
    );
  }
  if (!course) return null;

  return (
    <div className="px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4 bg-white p-3 rounded shadow-sm">
        <button className="btn btn-outline-secondary btn-sm rounded-circle p-2"
          onClick={() => navigate('/ho/courses')} style={{ width: 36, height: 36 }}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <div>
          <h4 className="mb-0 fw-bold">{course.name_bn}</h4>
          <div className="text-muted small">কোর্স কোড: {course.code}</div>
        </div>
        <div className="ms-auto d-flex align-items-center gap-2">
          <button className="btn btn-outline-danger btn-sm" title="পিডিএফ প্রিন্ট"
            onClick={() => {
              const token = localStorage.getItem('access_token');
              window.open(`/api/ho/courses/${course.id}/print_course/?token=${token}`, '_blank');
            }}>
            <i className="bi bi-filetype-pdf me-1"></i>পিডিএফ
          </button>
          <span className={`badge bg-${STATUS_BG[course.status]} fs-6 px-3 py-2`}>
            {STATUS_MAP[course.status] || course.status}
          </span>
          <span className="badge bg-info fs-6 px-3 py-2">{TYPE_MAP[course.course_type]}</span>
          <span className="badge bg-secondary fs-6 px-3 py-2">{TERM_MAP[course.term]} - {SESSION_MAP[course.session]}</span>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white pt-3 border-0">
          <ul className="nav nav-tabs card-header-tabs">
            {TABS.map(t => (
              <li className="nav-item" key={t.key}>
                <button className={`nav-link ${tab === t.key ? 'active fw-bold' : ''}`}
                  onClick={() => setTab(t.key)}>{t.label} {t.key === 'chapters' ? `(${chapters.length})` : t.key === 'competency' ? `(${competencies.length})` : t.key === 'bills' ? `(${bills.length})` : ''}</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body p-4">
              {tab === 'overview' && (
                <div className="row g-4">
                  <div className="col-md-6">
                    <h6 className="fw-bold mb-3 text-muted text-uppercase small">মূল তথ্য</h6>
                    <table className="table table-bordered align-middle">
                      <tbody>
                        <tr><th className="bg-light" style={{ width: 130 }}>কোড</th><td>{course.code}</td></tr>
                        <tr><th className="bg-light">নাম (বাংলা)</th><td>{course.name_bn}</td></tr>
                        <tr><th className="bg-light">নাম (ইংরেজি)</th><td>{course.name_en || '—'}</td></tr>
                        <tr><th className="bg-light">প্রকল্পের নাম</th><td>{course.project_name || '—'}</td></tr>
                        <tr><th className="bg-light">প্রকল্পের স্পনসর</th><td>{course.project_sponsor || '—'}</td></tr>
                        <tr><th className="bg-light">বিবরণ</th><td>{course.description || '—'}</td></tr>
                        <tr><th className="bg-light">ধরন</th><td>{TYPE_MAP[course.course_type]}</td></tr>
                        <tr><th className="bg-light">টার্ম</th><td>{TERM_MAP[course.term]}</td></tr>
                        <tr><th className="bg-light">সেশন</th><td>{SESSION_MAP[course.session]}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="fw-bold mb-3 text-muted text-uppercase small">সময় ও ফি</h6>
                    <table className="table table-bordered align-middle">
                      <tbody>
                        <tr><th className="bg-light" style={{ width: 130 }}>মেয়াদ</th><td>
                          {course.duration_value ? <>{course.duration_value} {course.duration_unit === 'days' ? 'দিন' : course.duration_unit === 'weeks' ? 'সপ্তাহ' : 'মাস'}</> : <>{course.duration_months} মাস</>}
                        </td></tr>
                        <tr><th className="bg-light">ঘন্টা</th><td>{course.duration_hours}</td></tr>
                        <tr><th className="bg-light">প্রশিক্ষণ দিন</th><td>{course.total_training_days}</td></tr>
                        <tr><th className="bg-light">ফি</th><td>৳{course.fee}</td></tr>
                        <tr><th className="bg-light">স্টাইপেন্ড</th><td>{course.stipend_eligible ? 'হ্যাঁ' : 'না'}</td></tr>
                        <tr><th className="bg-light">চাকরির উপযোগী</th><td>{course.employment_eligible ? 'হ্যাঁ' : 'না'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

          {tab === 'config' && (
            <div className="row g-4">
              <div className="col-md-6">
                <h6 className="fw-bold mb-3 text-muted text-uppercase small">কনফিগারেশন</h6>
                <table className="table table-bordered align-middle">
                  <tbody>
                    <tr><th className="bg-light" style={{ width: 140 }}>পাস মার্কস</th><td>{course.configuration?.passing_marks || 80}%</td></tr>
                    <tr><th className="bg-light">উপস্থিতি</th><td>{course.configuration?.attendance_requirement || 80}%</td></tr>
                    <tr><th className="bg-light">সার্টিফিকেট</th><td>{course.configuration?.certificate_template || '—'}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="col-md-6">
                <h6 className="fw-bold mb-3 text-muted text-uppercase small">যোগ্যতার মানদণ্ড</h6>
                <p className="p-3 bg-light rounded">{course.configuration?.eligibility_criteria || '—'}</p>
                <h6 className="fw-bold mb-2 text-muted text-uppercase small">মূল্যায়ন</h6>
                <p className="p-3 bg-light rounded">{course.configuration?.assessment_criteria || '—'}</p>
              </div>
            </div>
          )}

          {tab === 'chapters' && (
            <div className="table-responsive">
              <table className="table table-hover table-bordered align-middle">
                <thead className="table-light">
                  <tr><th>নং</th><th>শিরোনাম (বাংলা)</th><th>শিরোনাম (ইংরেজি)</th><th>সময় (ঘন্টা)</th></tr>
                </thead>
                <tbody>
                  {chapters.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-muted py-4">কোন অধ্যায় নেই</td></tr>
                  ) : chapters.map((c) => (
                    <tr key={c.id || c.chapter_no}>
                      <td className="fw-bold">{c.chapter_no}</td>
                      <td>{c.title_bn}</td>
                      <td>{c.title_en || '—'}</td>
                      <td>{c.duration_hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'competency' && (
            <div className="table-responsive">
              <table className="table table-hover table-bordered align-middle">
                <thead className="table-light">
                  <tr><th>কোড</th><th>নাম (বাংলা)</th><th>নাম (ইংরেজি)</th><th>মূল্যায়ন</th></tr>
                </thead>
                <tbody>
                  {competencies.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-muted py-4">কোন পূর্বশর্ত নেই</td></tr>
                  ) : competencies.map((c) => (
                    <tr key={c.id || c.code}>
                      <td className="fw-bold">{c.code}</td>
                      <td>{c.name_bn}</td>
                      <td>{c.name_en || '—'}</td>
                      <td>{c.assessment_method || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'bills' && (
            <div className="table-responsive">
              <table className="table table-hover table-bordered align-middle">
                <thead className="table-light">
                  <tr><th>বিল আইটেম</th><th>পরিমাণ</th><th>বাধ্যতামূলক</th></tr>
                </thead>
                <tbody>
                  {bills.length === 0 ? (
                    <tr><td colSpan={3} className="text-center text-muted py-4">কোন বিল আইটেম নেই</td></tr>
                  ) : bills.map((b) => (
                    <tr key={b.id}>
                      <td>{b.bill_item_bn} <small className="text-muted">({b.bill_item_en})</small></td>
                      <td className="fw-bold">৳{b.amount}</td>
                      <td>{b.is_mandatory ? <span className="badge bg-success">হ্যাঁ</span> : <span className="badge bg-secondary">না</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
