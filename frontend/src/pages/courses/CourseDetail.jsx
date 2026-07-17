import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { convertToBanglaDigits, formatNumber } from '../../utils/numberFormatter';

const TYPE_MAP = { vocational: 'পেশাদারিক', technical: 'প্রাবিধিক', short_course: 'সংক্ষিপ্ত কোর্স' };
const STATUS_MAP = { active: 'সক্রিয়', inactive: 'নিষ্ক্রিয়', draft: 'খসড়া' };
const STATUS_BG = { active: 'success', inactive: 'secondary', draft: 'warning' };
const TERM_MAP = { foundation: 'ফাউন্ডেশন', advanced: 'এডভান্সড' };
const SESSION_MAP = { morning: 'সকাল', day: 'দিন', evening: 'সন্ধ্যা' };

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/courses/${id}/`);
        if (!cancelled) setCourse(res.data);
      } catch {
        if (!cancelled) {
          toast.error('কোর্সের বিস্তারিত লোড করতে ব্যর্থ');
          navigate('/center-admin/courses');
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
          onClick={() => navigate('/center-admin/courses')} style={{ width: 36, height: 36 }}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <div>
          <h4 className="mb-0 fw-bold">{course.name_bn}</h4>
          <div className="text-muted small">কোর্স কোড: {convertToBanglaDigits(course.code)}</div>
        </div>
        <div className="ms-auto d-flex align-items-center gap-2">
          <span className={`badge bg-${STATUS_BG[course.status] || 'secondary'}`}>
            {STATUS_MAP[course.status] || course.status}
          </span>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-6">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3 text-muted text-uppercase small">মূল তথ্য</h6>
              <table className="b-detail-table w-100">
                <tbody>
                  <tr><th>কোড</th><td>{convertToBanglaDigits(course.code)}</td></tr>
                  <tr><th>নাম (বাংলা)</th><td>{course.name_bn}</td></tr>
                  <tr><th>নাম (ইংরেজি)</th><td>{course.name_en || '—'}</td></tr>
                  <tr><th>প্রকল্পের নাম</th><td>{course.project_name || '—'}</td></tr>
                  <tr><th>প্রকল্পের স্পনসর</th><td>{course.project_sponsor || '—'}</td></tr>
                  <tr><th>বিবরণ</th><td>{course.description || '—'}</td></tr>
                  <tr><th>ধরন</th><td>{TYPE_MAP[course.course_type] || course.course_type}</td></tr>
                  <tr><th>টার্ম</th><td>{TERM_MAP[course.term] || course.term || '—'}</td></tr>
                  <tr><th>সেশন</th><td>{SESSION_MAP[course.session] || course.session || '—'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3 text-muted text-uppercase small">সময় ও ফি</h6>
              <table className="b-detail-table w-100">
                <tbody>
                  <tr><th>মেয়াদ</th><td>{course.duration_months ? <>{formatNumber(course.duration_months)} মাস</> : '—'}</td></tr>
                  <tr><th>ঘন্টা</th><td>{formatNumber(course.duration_hours)}</td></tr>
                  <tr><th>প্রশিক্ষণ দিন</th><td>{formatNumber(course.total_training_days)}</td></tr>
                  <tr><th>ফি</th><td>৳{formatNumber(course.fee)}</td></tr>
                  <tr><th>স্টাইপেন্ড</th><td>{course.stipend_eligible ? 'হ্যাঁ' : 'না'}</td></tr>
                  <tr><th>চাকরির উপযোগী</th><td>{course.employment_eligible ? 'হ্যাঁ' : 'না'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {course.configuration && (
        <div className="card shadow-sm border-0 mt-4">
          <div className="card-body p-4">
            <h6 className="fw-bold mb-3 text-muted text-uppercase small">কনফিগারেশন</h6>
            <div className="row g-3">
              <div className="col-md-4">
                <span className="text-muted">পাস মার্কস:</span> <strong>{formatNumber(course.configuration.passing_marks || 80)}%</strong>
              </div>
              <div className="col-md-4">
                <span className="text-muted">উপস্থিতি:</span> <strong>{formatNumber(course.configuration.attendance_requirement || 80)}%</strong>
              </div>
              <div className="col-md-4">
                <span className="text-muted">সার্টিফিকেট:</span> <strong>{course.configuration.certificate_template || '—'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
