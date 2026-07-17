import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { convertToBanglaDigits } from '../../utils/numberFormatter';
import { formatDate } from '../../utils/dateFormatter';

const STATUS_BG = { enrolled: 'success', completed: 'primary', withdrawn: 'warning', suspended: 'danger', failed: 'dark' };

export default function TraineeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trainee, setTrainee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/trainees/${id}/`)
      .then(r => setTrainee(r.data))
      .catch(() => { toast.error('তথ্য লোড করতে ব্যর্থ'); navigate('/center-admin/trainees'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <div className="text-center py-5"><div className="spinner-border" /></div>;
  if (!trainee) return null;

  return (
    <div>
      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/center-admin/trainees')} style={{ width: 36, height: 36 }}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <div>
          <h4 className="mb-0 fw-bold">{trainee.user_name || trainee.registration_no}</h4>
          <div className="text-muted small">{trainee.registration_no}</div>
        </div>
        <div className="ms-auto">
          <span className={`badge bg-${STATUS_BG[trainee.status] || 'secondary'}`}>{trainee.status_display || trainee.status}</span>
          <button className="btn btn-sm btn-outline-primary ms-2" onClick={() => navigate(`/center-admin/trainees/${id}/edit`)}>
            <i className="bi bi-pencil me-1"></i>সম্পাদনা
          </button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-6">
          <div className="card shadow-sm border-0" style={{ borderRadius: 12 }}>
            <div className="card-body">
              <h6 className="fw-bold mb-3 text-primary"><i className="bi bi-person me-2"></i>ব্যক্তিগত তথ্য</h6>
              <table className="table table-borderless mb-0" style={{ fontSize: 14 }}>
                <tbody>
                  <tr><th style={{ width: 140 }} className="text-secondary">রেজি. নং</th><td>{trainee.registration_no}</td></tr>
                  <tr><th className="text-secondary">নাম (বাংলা)</th><td>{trainee.user_name}</td></tr>
                  <tr><th className="text-secondary">নাম (ইংরেজি)</th><td>{trainee.user_name_en || '-'}</td></tr>
                  <tr><th className="text-secondary">ইমেইল</th><td>{trainee.user_email || '-'}</td></tr>
                  <tr><th className="text-secondary">ফোন</th><td>{trainee.user_phone || '-'}</td></tr>
                  <tr><th className="text-secondary">এনআইডি</th><td>{trainee.user_nid ? convertToBanglaDigits(trainee.user_nid) : '-'}</td></tr>
                  <tr><th className="text-secondary">কেন্দ্র</th><td>{trainee.center_name || '-'}</td></tr>
                  <tr><th className="text-secondary">ব্যাচ</th><td>{trainee.batch_name || '-'}</td></tr>
                  <tr><th className="text-secondary">নথিভুক্তির তারিখ</th><td>{trainee.enrollment_date ? formatDate(trainee.enrollment_date) : '-'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card shadow-sm border-0" style={{ borderRadius: 12 }}>
            <div className="card-body">
              <h6 className="fw-bold mb-3 text-primary"><i className="bi bi-bank me-2"></i>ব্যাংক ও মনোনীত ব্যক্তি</h6>
              <table className="table table-borderless mb-0" style={{ fontSize: 14 }}>
                <tbody>
                  <tr><th style={{ width: 140 }} className="text-secondary">অ্যাকাউন্ট</th><td>{trainee.bank_account_no ? convertToBanglaDigits(trainee.bank_account_no) : '-'}</td></tr>
                  <tr><th className="text-secondary">ব্যাংক</th><td>{trainee.bank_name || '-'}</td></tr>
                  <tr><th className="text-secondary">শাখা</th><td>{trainee.bank_branch || '-'}</td></tr>
                  <tr><th className="text-secondary">মোবাইল ব্যাংকিং</th><td>{trainee.mobile_banking_provider ? `${trainee.mobile_banking_provider} - ${trainee.mobile_banking_number || '-'}` : '-'}</td></tr>
                  <tr><td colSpan={2} className="border-top pt-3"></td></tr>
                  <tr><th className="text-secondary">মনোনীত</th><td>{trainee.nominee_name || '-'}</td></tr>
                  <tr><th className="text-secondary">সম্পর্ক</th><td>{trainee.nominee_relation || '-'}</td></tr>
                  <tr><th className="text-secondary">মোবাইল</th><td>{trainee.nominee_phone || '-'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
