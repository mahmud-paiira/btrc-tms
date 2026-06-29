import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';

const STATUS_BG = { pending: 'warning', active: 'success', suspended: 'danger' };

const DETAIL_TABS = [
  { key: 'overview', label: 'বিবরণ' },
  { key: 'mapped_institutes', label: 'কেন্দ্র' },
  { key: 'mapped_courses', label: 'কোর্স' },
  { key: 'tracking', label: 'ট্র্যাকিং' },
];

export default function TrainerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    hoService.getTrainer(id)
      .then(r => setTrainer(r.data))
      .catch(() => { toast.error('প্রশিক্ষকের তথ্য লোড করতে ব্যর্থ'); navigate('/ho/trainers'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">লোড হচ্ছে...</p>
      </div>
    );
  }
  if (!trainer) return null;

  const user = trainer.user || {};
  const nameBn = user.full_name_bn || trainer.trainer_no;

  return (
    <div className="px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4 bg-white p-3 rounded shadow-sm">
        <button className="btn btn-outline-secondary btn-sm rounded-circle p-2"
          onClick={() => navigate('/ho/trainers')} style={{ width: 36, height: 36 }}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <div>
          <h4 className="mb-0 fw-bold">{nameBn}</h4>
          <div className="text-muted small">প্রশিক্ষক নং: {trainer.trainer_no}</div>
        </div>
        <div className="ms-auto d-flex gap-2">
          <span className={`status-dot dot-${STATUS_BG[trainer.status] || 'secondary'}`} />
          {trainer.status_display || trainer.status}
          <span className={`status-dot dot-${trainer.approval_status === 'approved' ? 'success' : trainer.approval_status === 'rejected' ? 'danger' : 'warning'}`} />
          {trainer.approval_status_display || trainer.approval_status}
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white pt-3 border-0">
          <ul className="nav nav-tabs card-header-tabs">
            {DETAIL_TABS.map(t => (
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
                    <tr><th>প্রশিক্ষক নং</th><td>{trainer.trainer_no}</td></tr>
                    <tr><th>নাম (ইংরেজি)</th><td>{user.full_name_en || '-'}</td></tr>
                    <tr><th>নাম (বাংলা)</th><td>{nameBn}</td></tr>
                    <tr><th>ইমেইল</th><td>{user.email || '-'}</td></tr>
                    <tr><th>ফোন</th><td>{user.phone || '-'}</td></tr>
                    <tr><th>এনআইডি</th><td>{trainer.nid}</td></tr>
                    <tr><th>জন্ম নিবন্ধন</th><td>{trainer.birth_certificate_no || '-'}</td></tr>
                    <tr><th>জন্ম তারিখ</th><td>{trainer.date_of_birth || '-'}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="col-md-6">
                <h6 className="fw-bold mb-3 text-muted text-uppercase small">পেশাগত তথ্য</h6>
                <table className="b-detail-table align-middle">
                  <tbody>
                    <tr><th>পিতার নাম</th><td>{trainer.father_name_bn}</td></tr>
                    <tr><th>মাতার নাম</th><td>{trainer.mother_name_bn}</td></tr>
                    <tr><th>শিক্ষাগত যোগ্যতা</th><td>{trainer.education_qualification}</td></tr>
                    <tr><th>অভিজ্ঞতা</th><td>{`${trainer.years_of_experience} বছর`}</td></tr>
                    <tr><th>দক্ষতার ক্ষেত্র</th><td>{trainer.expertise_area}</td></tr>
                    <tr><th>ব্যাংক একাউন্ট</th><td>{trainer.bank_account_no || '-'}</td></tr>
                    <tr><th>ব্যাংকের নাম</th><td>{trainer.bank_name || '-'}</td></tr>
                    <tr><th>নিবন্ধনের তারিখ</th><td>{trainer.created_at || '-'}</td></tr>
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
                  {trainer.mappings?.length > 0 ? trainer.mappings.map(m => (
                    <tr key={m.id}>
                      <td>{m.center_code} - {m.center?.name_bn || ''}</td>
                      <td><span className={`status-dot dot-${STATUS_BG[m.status]}`}></span>{m.status}</td>
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
                  {trainer.mappings?.length > 0 ? trainer.mappings.map(m => (
                    <tr key={m.id}>
                      <td>{m.course_code} - {m.course?.name_bn || ''}</td>
                      <td>{m.is_primary ? <span className="status-dot dot-info" /> : 'না'}</td>
                      <td><span className={`status-dot dot-${STATUS_BG[m.status]}`}></span>{m.status}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="text-center text-muted py-4">কোনো কোর্স ম্যাপ করা হয়নি</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'tracking' && (
            <div className="row g-4">
              <div className="col-md-6">
                <table className="b-table align-middle">
                  <tbody>
                    <tr><th>প্রশিক্ষক নং</th><td>{trainer.trainer_no}</td></tr>
                    <tr><th>এনআইডি</th><td>{trainer.nid}</td></tr>
                    <tr><th>মোবাইল</th><td>{user.phone || '-'}</td></tr>
                    <tr><th>জন্ম নিবন্ধন</th><td>{trainer.birth_certificate_no || '-'}</td></tr>
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
