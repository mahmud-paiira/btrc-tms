import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';

const STATUS_BG = { pending: 'warning', active: 'success', suspended: 'danger' };

const DETAIL_TABS = [
  { key: 'overview', label: 'বিবরণ' },
  { key: 'mapped_institutes', label: 'কেন্দ্র' },
  { key: 'mapped_courses', label: 'কোর্স' },
  { key: 'tracking', label: 'ট্র্যাকিং' },
];

export default function TrainerDetail({ trainerId, onClose, onRefresh }) {
  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!trainerId) return;
    setLoading(true);
    hoService.getTrainer(trainerId)
      .then(r => setTrainer(r.data))
      .catch(() => toast.error('প্রশিক্ষকের তথ্য লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  }, [trainerId]);

  if (loading) return <div className="text-center py-4"><div className="spinner-border spinner-border-sm me-2"></div>লোড হচ্ছে...</div>;
  if (!trainer) return null;

  const user = trainer.user || {};
  const nameBn = user.full_name_bn || trainer.trainer_no;
  const phone = user.phone || '-';
  const email = user.email || '-';

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2">
        <span className="fw-semibold" style={{ fontSize: 14 }}>{nameBn}</span>
        <button className="btn btn-sm btn-outline-light" onClick={onClose}><i className="bi bi-x-lg"></i></button>
      </div>
      <div className="card-body p-0">
        <ul className="nav nav-tabs">
          {DETAIL_TABS.map(t => (
            <li className="nav-item" key={t.key}>
              <button className={`nav-link py-2 ${activeTab === t.key ? 'active fw-semibold' : ''}`}
                style={{ fontSize: 12 }} onClick={() => setActiveTab(t.key)}>{t.label}</button>
            </li>
          ))}
        </ul>
        <div className="p-3" style={{ fontSize: 13 }}>
          {activeTab === 'overview' && (
            <div>
              <InfoRow label="প্রশিক্ষক নং" value={trainer.trainer_no} />
              <InfoRow label="নাম (ইংরেজি)" value={user.full_name_en || '-'} />
              <InfoRow label="নাম (বাংলা)" value={nameBn} />
              <InfoRow label="ইমেইল" value={email} />
              <InfoRow label="ফোন" value={phone} />
              <InfoRow label="এনআইডি" value={trainer.nid} />
              <InfoRow label="জন্ম নিবন্ধন" value={trainer.birth_certificate_no || '-'} />
              <InfoRow label="জন্ম তারিখ" value={trainer.date_of_birth || '-'} />
              <InfoRow label="পিতার নাম" value={trainer.father_name_bn} />
              <InfoRow label="মাতার নাম" value={trainer.mother_name_bn} />
              <InfoRow label="শিক্ষাগত যোগ্যতা" value={trainer.education_qualification} />
              <InfoRow label="অভিজ্ঞতা" value={`${trainer.years_of_experience} বছর`} />
              <InfoRow label="দক্ষতার ক্ষেত্র" value={trainer.expertise_area} />
              <InfoRow label="ব্যাংক একাউন্ট" value={trainer.bank_account_no || '-'} />
              <InfoRow label="ব্যাংকের নাম" value={trainer.bank_name || '-'} />
              <InfoRow label="অবস্থা" value={
                <span className={`badge bg-${STATUS_BG[trainer.status] || 'secondary'}`}>
                  {trainer.status_display || trainer.status}
                </span>
              } />
              <InfoRow label="অনুমোদন" value={
                <span className={`badge bg-${trainer.approval_status === 'approved' ? 'success' : trainer.approval_status === 'rejected' ? 'danger' : 'warning'}`}>
                  {trainer.approval_status_display || trainer.approval_status}
                </span>
              } />
              <InfoRow label="অনুমোদনকারী" value={trainer.approved_by_name || '-'} />
              <InfoRow label="অনুমোদনের তারিখ" value={trainer.approved_at || '-'} />
              <InfoRow label="নিবন্ধনের তারিখ" value={trainer.created_at || '-'} />
            </div>
          )}
          {activeTab === 'mapped_institutes' && (
            <div>
              <h6 className="fw-semibold mb-2">ম্যাপকৃত কেন্দ্র</h6>
              {trainer.mappings?.length > 0 ? (
                <table className="table table-sm table-bordered" style={{ fontSize: 12 }}>
                  <thead><tr><th>কেন্দ্র</th><th>অবস্থা</th></tr></thead>
                  <tbody>
                    {trainer.mappings.map(m => (
                      <tr key={m.id}><td>{m.center_code} - {m.center?.name_bn || ''}</td>
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
              {trainer.mappings?.length > 0 ? (
                <table className="table table-sm table-bordered" style={{ fontSize: 12 }}>
                  <thead><tr><th>কোর্স</th><th>প্রাথমিক</th><th>অবস্থা</th></tr></thead>
                  <tbody>
                    {trainer.mappings.map(m => (
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
          {activeTab === 'tracking' && (
            <div>
              <h6 className="fw-semibold mb-2">ট্র্যাকিং তথ্য</h6>
              <InfoRow label="প্রশিক্ষক নং" value={trainer.trainer_no} />
              <InfoRow label="এনআইডি" value={trainer.nid} />
              <InfoRow label="মোবাইল" value={phone} />
              <InfoRow label="জন্ম নিবন্ধন" value={trainer.birth_certificate_no || '-'} />
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
