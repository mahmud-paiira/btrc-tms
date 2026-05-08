import React, { useState, useEffect, useCallback } from 'react';
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

export default function AssessorDetail({ assessorId, onClose, onRefresh }) {
  const [assessor, setAssessor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [assessments, setAssessments] = useState([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);

  useEffect(() => {
    if (!assessorId) return;
    setLoading(true);
    hoService.getAssessor(assessorId)
      .then(r => setAssessor(r.data))
      .catch(() => toast.error('তথ্য লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  }, [assessorId]);

  const loadBatches = useCallback(() => {
    if (batches.length > 0 || batchesLoading) return;
    setBatchesLoading(true);
    hoService.getAssessorBatches(assessorId)
      .then(r => setBatches(r.data))
      .catch(() => toast.error('ব্যাচ তথ্য লোড করতে ব্যর্থ'))
      .finally(() => setBatchesLoading(false));
  }, [assessorId, batches.length, batchesLoading]);

  const loadAssessments = useCallback(() => {
    if (assessments.length > 0 || assessmentsLoading) return;
    setAssessmentsLoading(true);
    hoService.getAssessorAssessments(assessorId)
      .then(r => setAssessments(r.data?.results || r.data || []))
      .catch(() => toast.error('মূল্যায়ন তথ্য লোড করতে ব্যর্থ'))
      .finally(() => setAssessmentsLoading(false));
  }, [assessorId, assessments.length, assessmentsLoading]);

  useEffect(() => {
    if (activeTab === 'batch_history') loadBatches();
    if (activeTab === 'assessment_history') loadAssessments();
  }, [activeTab, loadBatches, loadAssessments]);

  if (loading) return <div className="text-center py-4"><div className="spinner-border spinner-border-sm me-2"></div>লোড হচ্ছে...</div>;
  if (!assessor) return null;

  const user = assessor.user || {};
  const nameBn = user.full_name_bn || assessor.assessor_no;

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2">
        <span className="fw-semibold" style={{ fontSize: 14 }}>{nameBn}</span>
        <button className="btn btn-sm btn-outline-light" onClick={onClose}><i className="bi bi-x-lg"></i></button>
      </div>
      <div className="card-body p-0">
        <ul className="nav nav-tabs">
          {TABS.map(t => (
            <li className="nav-item" key={t.key}>
              <button className={`nav-link py-2 ${activeTab === t.key ? 'active fw-semibold' : ''}`}
                style={{ fontSize: 12 }} onClick={() => setActiveTab(t.key)}>{t.label}</button>
            </li>
          ))}
        </ul>
        <div className="p-3" style={{ fontSize: 13 }}>
          {activeTab === 'overview' && (
            <div>
              <InfoRow label="মূল্যায়নকারী নং" value={assessor.assessor_no} />
              <InfoRow label="নাম (ইংরেজি)" value={user.full_name_en || '-'} />
              <InfoRow label="নাম (বাংলা)" value={nameBn} />
              <InfoRow label="ইমেইল" value={user.email || '-'} />
              <InfoRow label="ফোন" value={user.phone || '-'} />
              <InfoRow label="এনআইডি" value={assessor.nid} />
              <InfoRow label="জন্ম নিবন্ধন" value={assessor.birth_certificate_no || '-'} />
              <InfoRow label="জন্ম তারিখ" value={assessor.date_of_birth || '-'} />
              <InfoRow label="পিতার নাম" value={assessor.father_name_bn} />
              <InfoRow label="মাতার নাম" value={assessor.mother_name_bn} />
              <InfoRow label="শিক্ষাগত যোগ্যতা" value={assessor.education_qualification} />
              <InfoRow label="অভিজ্ঞতা" value={`${assessor.years_of_experience} বছর`} />
              <InfoRow label="দক্ষতার ক্ষেত্র" value={assessor.expertise_area} />
              <InfoRow label="সার্টিফিকেশন" value={assessor.certification || '-'} />
              <InfoRow label="ব্যাংক একাউন্ট" value={assessor.bank_account_no || '-'} />
              <InfoRow label="ব্যাংকের নাম" value={assessor.bank_name || '-'} />
              <InfoRow label="অবস্থা" value={<span className={`badge bg-${STATUS_BG[assessor.status] || 'secondary'}`}>{assessor.status_display || assessor.status}</span>} />
              <InfoRow label="অনুমোদন" value={<span className={`badge bg-${assessor.approval_status === 'approved' ? 'success' : assessor.approval_status === 'rejected' ? 'danger' : 'warning'}`}>{assessor.approval_status_display || assessor.approval_status}</span>} />
              <InfoRow label="অনুমোদনকারী" value={assessor.approved_by_name || '-'} />
              <InfoRow label="অনুমোদনের তারিখ" value={assessor.approved_at || '-'} />
              <InfoRow label="নিবন্ধনের তারিখ" value={assessor.created_at || '-'} />
            </div>
          )}
          {activeTab === 'mapped_institutes' && (
            <div>
              <h6 className="fw-semibold mb-2">ম্যাপকৃত কেন্দ্র</h6>
              {assessor.mappings?.length > 0 ? (
                <table className="table table-sm table-bordered" style={{ fontSize: 12 }}>
                  <thead><tr><th>কেন্দ্র</th><th>অবস্থা</th></tr></thead>
                  <tbody>
                    {assessor.mappings.map(m => (
                      <tr key={m.id}>
                        <td>{m.center_code} - {m.center?.name_bn || ''}</td>
                        <td><span className={`badge bg-${STATUS_BG[m.status]}`}>{m.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-muted">কোনো কেন্দ্র ম্যাপ করা হয়নি</p>}
            </div>
          )}
          {activeTab === 'mapped_courses' && (
            <div>
              <h6 className="fw-semibold mb-2">ম্যাপকৃত কোর্স</h6>
              {assessor.mappings?.length > 0 ? (
                <table className="table table-sm table-bordered" style={{ fontSize: 12 }}>
                  <thead><tr><th>কোর্স</th><th>প্রাথমিক</th><th>অবস্থা</th></tr></thead>
                  <tbody>
                    {assessor.mappings.map(m => (
                      <tr key={m.id}>
                        <td>{m.course_code} - {m.course?.name_bn || ''}</td>
                        <td>{m.is_primary ? <span className="badge bg-info">হ্যাঁ</span> : 'না'}</td>
                        <td><span className={`badge bg-${STATUS_BG[m.status]}`}>{m.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-muted">কোনো কোর্স ম্যাপ করা হয়নি</p>}
            </div>
          )}
          {activeTab === 'batch_history' && (
            <div>
              <h6 className="fw-semibold mb-2">মূল্যায়নকৃত ব্যাচসমূহ</h6>
              {batchesLoading ? (
                <div className="text-center py-3"><div className="spinner-border spinner-border-sm me-2"></div>লোড হচ্ছে...</div>
              ) : batches.length === 0 ? (
                <p className="text-muted">কোনো ব্যাচে মূল্যায়ন করা হয়নি</p>
              ) : (
                <table className="table table-sm table-bordered" style={{ fontSize: 12 }}>
                  <thead><tr><th>ব্যাচ নং</th><th>ব্যাচের নাম</th><th>কেন্দ্র</th><th>কোর্স</th><th>শুরুর তারিখ</th><th>শেষের তারিখ</th><th>অবস্থা</th><th>মোট মূল্যায়ন</th></tr></thead>
                  <tbody>
                    {batches.map(b => (
                      <tr key={b.id}>
                        <td>{b.batch_no}</td>
                        <td>{b.batch_name_bn}</td>
                        <td>{b.center_code} - {b.center_name}</td>
                        <td>{b.course_code} - {b.course_name}</td>
                        <td>{b.start_date}</td>
                        <td>{b.end_date}</td>
                        <td><span className={`badge bg-${STATUS_BG[b.status] || 'secondary'}`}>{b.status}</span></td>
                        <td className="text-center fw-bold">{b.assessments_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {activeTab === 'assessment_history' && (
            <div>
              <h6 className="fw-semibold mb-2">মূল্যায়নের ইতিহাস</h6>
              {assessmentsLoading ? (
                <div className="text-center py-3"><div className="spinner-border spinner-border-sm me-2"></div>লোড হচ্ছে...</div>
              ) : assessments.length === 0 ? (
                <p className="text-muted">কোনো মূল্যায়ন রেকর্ড নেই</p>
              ) : (
                <table className="table table-sm table-bordered" style={{ fontSize: 12 }}>
                  <thead><tr><th>তারিখ</th><th>প্রশিক্ষণার্থী</th><th>রেজি. নং</th><th>ব্যাচ</th><th>ধরণ</th><th>প্রাপ্ত নম্বর</th><th>পূর্ণ নম্বর</th><th>শতাংশ</th><th>দক্ষতা</th></tr></thead>
                  <tbody>
                    {assessments.map(a => (
                      <tr key={a.id}>
                        <td>{a.assessment_date}</td>
                        <td>{a.trainee_name}</td>
                        <td>{a.trainee_reg_no}</td>
                        <td>{a.batch}</td>
                        <td>{a.assessment_type_display}</td>
                        <td>{a.marks_obtained}</td>
                        <td>{a.total_marks}</td>
                        <td>{a.percentage?.toFixed(1)}%</td>
                        <td><span className={`badge bg-${a.competency_status === 'competent' ? 'success' : a.competency_status === 'not_competent' ? 'danger' : 'secondary'}`}>{a.competency_status_display}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {activeTab === 'tracking' && (
            <div>
              <h6 className="fw-semibold mb-2">ট্র্যাকিং তথ্য</h6>
              <InfoRow label="মূল্যায়নকারী নং" value={assessor.assessor_no} />
              <InfoRow label="এনআইডি" value={assessor.nid} />
              <InfoRow label="মোবাইল" value={user.phone || '-'} />
              <InfoRow label="জন্ম নিবন্ধন" value={assessor.birth_certificate_no || '-'} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="row mb-1">
      <div className="col-5 text-muted">{label}</div>
      <div className="col-7 fw-semibold">{value}</div>
    </div>
  );
}
