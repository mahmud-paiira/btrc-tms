import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';
import { convertToBanglaDigits } from '../../utils/numberFormatter';
import { formatDate } from '../../utils/dateFormatter';

const STATUS_BG = { enrolled: 'success', completed: 'primary', withdrawn: 'warning', suspended: 'danger', failed: 'dark' };

const DETAIL_TABS = [
  { key: 'overview', label: 'Bibaran' },
  { key: 'tracking', label: 'Tracking' },
];

export default function TraineeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trainee, setTrainee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    hoService.getTrainee(id)
      .then(r => setTrainee(r.data))
      .catch(() => { toast.error('unable to load trainee'); navigate('/ho/trainees'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">Loea suru...</p>
      </div>
    );
  }
  if (!trainee) return null;

  const nameBn = trainee.user_name || trainee.registration_no;

  return (
    <div className="px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4 bg-white p-3 rounded shadow-sm">
        <button className="btn btn-outline-secondary btn-sm rounded-circle p-2"
          onClick={() => navigate('/ho/trainees')} style={{ width: 36, height: 36 }}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <div>
          <h4 className="mb-0 fw-bold">{nameBn}</h4>
          <div className="text-muted small">Registration No: {convertToBanglaDigits(trainee.registration_no)}</div>
        </div>
        <div className="ms-auto d-flex gap-2">
          <span className={`status-dot dot-${STATUS_BG[trainee.status] || 'secondary'}`}/>
          {trainee.status_display || trainee.status}
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white pt-3 border-0">
          <ul className="nav nav-tabs card-header-tabs">
            {DETAIL_TABS.map((t) => (
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
                <h6 className="fw-bold text-muted mb-3 text-uppercase small">Personal Information</h6>
                <table className="b-detail-table align-middle">
                  <tbody>
                    <tr><th>Reg No</th><td>{convertToBanglaDigits(trainee.registration_no)}</td></tr>
                    <tr><th>Name (Bn)</th><td>{nameBn}</td></tr>
                    <tr><th>Name (En)</th><td>{trainee.user_name_en || '-'}</td></tr>
                    <tr><th>Email</th><td>{trainee.user_email || '-'}</td></tr>
                    <tr><th>Phone</th><td>{trainee.user_phone || '-'}</td></tr>
                    <tr><th>NID</th><td>{trainee.user_nid ? convertToBanglaDigits(trainee.user_nid) : '-'}</td></tr>
                    <tr><th>Center</th><td>{trainee.center_name || '-'}</td></tr>
                    <tr><th>Batch</th><td>{trainee.batch_name || '-'}</td></tr>
                    <tr><th>Status</th><td>{trainee.status_display || trainee.status}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="col-md-6">
                <h6 className="fw-bold text-muted mb-3 text-uppercase small">Other Information</h6>
                <table className="b-detail-table align-middle">
                  <tbody>
                    <tr><th>Bank Account</th><td>{trainee.bank_account_no ? convertToBanglaDigits(trainee.bank_account_no) : '-'}</td></tr>
                    <tr><th>Bank Name</th><td>{trainee.bank_name || '-'}</td></tr>
                    <tr><th>Bank Branch</th><td>{trainee.bank_branch || '-'}</td></tr>
                    <tr><th>Nominee Name</th><td>{trainee.nominee_name || '-'}</td></tr>
                    <tr><th>Nominee Relation</th><td>{trainee.nominee_relation || '-'}</td></tr>
                    <tr><th>Nominee Phone</th><td>{trainee.nominee_phone || '-'}</td></tr>
                    <tr><th>Enrollment Date</th><td>{trainee.enrollment_date ? formatDate(trainee.enrollment_date) : '-'}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'tracking' && (
            <div className="row g-4">
              <div className="col-md-6">
                <table className="b-table align-middle">
                  <tbody>
                    <tr><th>Reg No</th><td>{convertToBanglaDigits(trainee.registration_no)}</td></tr>
                    <tr><th>NID</th><td>{trainee.user_nid ? convertToBanglaDigits(trainee.user_nid) : '-'}</td></tr>
                    <tr><th>Mobile</th><td>{trainee.user_phone || '-'}</td></tr>
                    <tr><th>Center</th><td>{trainee.center_name || '-'}</td></tr>
                    <tr><th>Batch</th><td>{trainee.batch_name || '-'}</td></tr>
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
