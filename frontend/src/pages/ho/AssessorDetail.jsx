import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';

const STATUS_BG = { pending: 'warning', active: 'success', suspended: 'danger' };

const TABS = [
  { key: 'overview', label: 'বিবরণ' },
  { key: 'mapped_institutes', label: 'কেন্দ্র' },
  { key: 'mapped_courses', label: 'কোর্স' },
  { key: 'batch_history', label: 'ব্যাচ' },
  { key: 'assessment_history', label: 'মূল্যায়ন' },
  { key: 'tracking', label: 'ট্র্যাকিং' },
];

export default function AssessorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessor, setAssessor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [assessments, setAssessments] = useState([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    hoService.getAssessor(id)
      .then(r => setAssessor(r.data))
      .catch(() => { toast.error('তথ্য লোড করতে ব্যর্থ'); navigate('/ho/assessors'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const loadBatches = useCallback(() => {
    if (batches.length > 0 || batchesLoading) return;
    setBatchesLoading(true);
    hoService.getAssessorBatches(id)
      .then(r => setBatches(r.data))
      .catch(() => toast.error('ব্যাচ তথ্য লোড করতে ব্যর্থ'))
      .finally(() => setBatchesLoading(false));
  }, [id, batches.length, batchesLoading]);

  const loadAssessments = useCallback(() => {
    if (assessments.length > 0 || assessmentsLoading) return;
    setAssessmentsLoading(true);
    hoService.getAssessorAssessments(id)
      .then(r => setAssessments(r.data?.results || r.data || []))
      .catch(() => toast.error('মূল্যায়ন তথ্য লোড করতে ব্যর্থ'))
      .finally(() => setAssessmentsLoading(false));
  }, [id, assessments.length, assessmentsLoading]);

  useEffect(() => {
    if (activeTab === 'batch_history') loadBatches();
    if (activeTab === 'assessment_history') loadAssessments();
  }, [activeTab, loadBatches, loadAssessments]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">লোড হচ্ছে...</p>
      </div>
    );
  }
  if (!assessor) return null;

  const user = assessor.user || {};
  const nameBn = user.full_name_bn || assessor.assessor_no;

  return (
    <div className="px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4 bg-white p-3 rounded shadow-sm">
        <button className="btn btn-outline-secondary btn-sm rounded-circle p-2"
          onClick={() => navigate('/ho/assessors')} style={{ width: 36, height: 36 }}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <div>
          <h4 className="mb-0 fw-bold">{nameBn}</h4>
          <div className="text-muted small">মূল্যায়নকারী নং: {assessor.assessor_no}</div>
        </div>
        <div className="ms-auto d-flex gap-2">
          <span className={`status-dot dot-${STATUS_BG[assessor.status] || 'secondary'}`} />
          {assessor.status_display || assessor.status}
          <span className={`status-dot dot-${assessor.approval_status === 'approved' ? 'success' : assessor.approval_status === 'rejected' ? 'danger' : 'warning'}`} />
          {assessor.approval_status_display || assessor.approval_status}
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white pt-3 border-0">
          <ul className="nav nav-tabs card-header-tabs">
            {TABS.map(t => (
              <li className="nav-item" key={t.key}>
                <button className={`nav-link ${activeTab === t.key ? 'active fw-bold' : ''}`}
                  onClick={() => setActiveTab(t.key)}>{t.label}</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body p-4">
          {activeTab === 'overview' && (
            <div className="row g-4">
              <div className="col-md-6">
                <h6 className="fw-bold mb-3 text-muted text-uppercase small">ব্যক্তিগত তথ্য</h6>
                <table className="b-detail-table align-middle">
                  <tbody>
                    <tr><th>মূল্যায়নকারী নং</th><td>{assessor.assessor_no}</td></tr>
                    <tr><th>নাম (ইংরেজি)</th><td>{user.full_name_en || '-'}</td></tr>
                    <tr><th>নাম (বাংলা)</th><td>{nameBn}</td></tr>
                    <tr><th>ইমেইল</th><td>{user.email || '-'}</td></tr>
                    <tr><th>ফোন</th><td>{user.phone || '-'}</td></tr>
                    <tr><th>এনআইডি</th><td>{assessor.nid}</td></tr>
                    <tr><th>জন্ম নিবন্ধন</th><td>{assessor.birth_certificate_no || '-'}</td></tr>
                    <tr><th>জন্ম তারিখ</th><td>{assessor.date_of_birth || '-'}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="col-md-6">
                <h6 className="fw-bold mb-3 text-muted text-uppercase small">পেশাগত তথ্য</h6>
                <table className="b-detail-table align-middle">
                  <tbody>
                    <tr><th>পিতার নাম</th><td>{assessor.father_name_bn}</td></tr>
                    <tr><th>মাতার নাম</th><td>{assessor.mother_name_bn}</td></tr>
                    <tr><th>শিক্ষাগত যোগ্যতা</th><td>{assessor.education_qualification}</td></tr>
                    <tr><th>অভিজ্ঞতা</th><td>{`${assessor.years_of_experience} বছর`}</td></tr>
                    <tr><th>দক্ষতার ক্ষেত্র</th><td>{assessor.expertise_area}</td></tr>
                    <tr><th>সার্টিফিকেশন</th><td>{assessor.certification || '-'}</td></tr>
                    <tr><th>ব্যাংক একাউন্ট</th><td>{assessor.bank_account_no || '-'}</td></tr>
                    <tr><th>ব্যাংকের নাম</th><td>{assessor.bank_name || '-'}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'mapped_institutes' && (
            <div className="table-responsive">
              <table className="b-table align-middle">
                <thead>
                  <tr><th>কেন্দ্র</th><th>অবস্থা</th></tr>
                </thead>
                <tbody>
                  {assessor.mappings?.length > 0 ? assessor.mappings.map(m => (
                    <tr key={m.id}>
                      <td>{m.center_code} - {m.center?.name_bn || ''}</td>
                      <td><span className={`status-dot dot-${STATUS_BG[m.status]}`} />{m.status}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={2} className="text-center text-muted py-4">কোনো কেন্দ্র ম্যাপ করা হয়নি</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'mapped_courses' && (
            <div className="table-responsive">
              <table className="b-table align-middle">
                <thead>
                  <tr><th>কোর্স</th><th>প্রাথমিক</th><th>অবস্থা</th></tr>
                </thead>
                <tbody>
                  {assessor.mappings?.length > 0 ? assessor.mappings.map(m => (
                    <tr key={m.id}>
                      <td>{m.course_code} - {m.course?.name_bn || ''}</td>
                      <td>{m.is_primary ? <span className="status-dot dot-info" /> : 'না'}</td>
                      <td><span className={`status-dot dot-${STATUS_BG[m.status]}`} />{m.status}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="text-center text-muted py-4">কোনো কোর্স ম্যাপ করা হয়নি</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'batch_history' && (
            <div className="table-responsive">
              <table className="b-table align-middle">
                <thead>
                  <tr><th>ব্যাচ নং</th><th>ব্যাচের নাম</th><th>কেন্দ্র</th><th>কোর্স</th><th>শুরুর তারিখ</th><th>শেষের তারিখ</th><th>অবস্থা</th><th>মোট মূল্যায়ন</th></tr>
                </thead>
                <tbody>
                  {batchesLoading ? (
                    <tr><td colSpan={8} className="text-center py-4"><div className="spinner-border spinner-border-sm me-2"></div>লোড হচ্ছে...</td></tr>
                  ) : batches.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-muted py-4">কোনো ব্যাচে মূল্যায়ন করা হয়নি</td></tr>
                  ) : batches.map(b => (
                    <tr key={b.id}>
                      <td className="fw-bold">{b.batch_no}</td>
                      <td>{b.batch_name_bn}</td>
                      <td>{b.center_code} - {b.center_name}</td>
                      <td>{b.course_code} - {b.course_name}</td>
                      <td>{b.start_date}</td>
                      <td>{b.end_date}</td>
                      <td><span className={`status-dot dot-${STATUS_BG[b.status] || 'secondary'}`} />{b.status}</td>
                      <td className="text-center fw-bold">{b.assessments_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'assessment_history' && (
            <div className="table-responsive">
              <table className="b-table align-middle">
                <thead>
                  <tr><th>তারিখ</th><th>প্রশিক্ষণার্থী</th><th>রেজি. নং</th><th>ব্যাচ</th><th>ধরণ</th><th>প্রাপ্ত নম্বর</th><th>পূর্ণ নম্বর</th><th>শতাংশ</th><th>দক্ষতা</th></tr>
                </thead>
                <tbody>
                  {assessmentsLoading ? (
                    <tr><td colSpan={9} className="text-center py-4"><div className="spinner-border spinner-border-sm me-2"></div>লোড হচ্ছে...</td></tr>
                  ) : assessments.length === 0 ? (
                    <tr><td colSpan={9} className="text-center text-muted py-4">কোনো মূল্যায়ন রেকর্ড নেই</td></tr>
                  ) : assessments.map(a => (
                    <tr key={a.id}>
                      <td>{a.assessment_date}</td>
                      <td>{a.trainee_name}</td>
                      <td>{a.trainee_reg_no}</td>
                      <td>{a.batch}</td>
                      <td>{a.assessment_type_display}</td>
                      <td>{a.marks_obtained}</td>
                      <td>{a.total_marks}</td>
                      <td>{a.percentage?.toFixed(1)}%</td>
                      <td><span className={`status-dot dot-${a.competency_status === 'competent' ? 'success' : a.competency_status === 'not_competent' ? 'danger' : 'secondary'}`} />{a.competency_status_display}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'tracking' && (
            <div className="row g-4">
              <div className="col-md-6">
                <table className="b-table align-middle">
                  <tbody>
                    <tr><th>মূল্যায়নকারী নং</th><td>{assessor.assessor_no}</td></tr>
                    <tr><th>এনআইডি</th><td>{assessor.nid}</td></tr>
                    <tr><th>মোবাইল</th><td>{user.phone || '-'}</td></tr>
                    <tr><th>জন্ম নিবন্ধন</th><td>{assessor.birth_certificate_no || '-'}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
