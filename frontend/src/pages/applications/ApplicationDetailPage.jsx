import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import applicationService from '../../services/applicationService';
import api from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/dateFormatter';
import { convertToBanglaDigits } from '../../utils/numberFormatter';

const STATUS_BG = { pending: 'secondary', selected: 'success', rejected: 'danger', waitlisted: 'warning' };
const API_URL = '/api';

function imageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

const TABS = [
  { key: 'overview', label: 'বিবরণ' },
  { key: 'documents', label: 'ডকুমেন্টস' },
];

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    applicationService.get(id)
      .then(r => {
        setApplication(r.data);
        setRemarks(r.data.remarks || '');
      })
      .catch(() => { toast.error('আবেদনের তথ্য লোড করতে ব্যর্থ'); navigate('/center-admin/applications'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleReview = async (status) => {
    if (status === 'rejected' && !remarks.trim()) {
      toast.warning('বাতিলের কারণ উল্লেখ করা আবশ্যক');
      return;
    }
    setSubmitting(true);
    try {
      await applicationService.review(id, { status, remarks });
      toast.success(status === 'selected' ? 'নির্বাচিত করা হয়েছে' : status === 'rejected' ? 'বাতিল করা হয়েছে' : 'অপেক্ষমাণ করা হয়েছে');
      const { data } = await applicationService.get(id);
      setApplication(data);
    } catch (err) {
      const msg = err.response?.data?.error || 'অপারেশন ব্যর্থ';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = async () => {
    try {
      const response = await api.get(`/public/print/${application.application_no}/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch {
      toast.error('PDF ডাউনলোড ব্যর্থ হয়েছে');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">লোড হচ্ছে...</p>
      </div>
    );
  }
  if (!application) return null;

  const app = application;

  return (
    <div className="px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4 bg-white p-3 rounded shadow-sm">
        <button className="btn btn-outline-secondary btn-sm rounded-circle p-2"
          onClick={() => navigate('/center-admin/applications')} style={{ width: 36, height: 36 }}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <div>
          <h4 className="mb-0 fw-bold">{app.name_bn}</h4>
          <div className="text-muted small">আবেদন নং: {convertToBanglaDigits(app.application_no)}</div>
        </div>
        <div className="ms-auto d-flex gap-2">
          <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 px-3"
            onClick={handlePrint} style={{ borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
            <i className="bi bi-printer"></i>
            PDF
          </button>
          <span className={`status-dot dot-${STATUS_BG[app.status] || 'secondary'}`}>
            {app.status === 'pending' ? 'পেন্ডিং' :
             app.status === 'selected' ? 'নির্বাচিত' :
             app.status === 'rejected' ? 'বাতিল' :
             app.status === 'waitlisted' ? 'অপেক্ষমাণ' : app.status}
          </span>
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
            <>
              <div className="row g-4">
                <div className="col-md-6">
                  <h6 className="fw-bold mb-3 text-muted text-uppercase small">সার্কুলার</h6>
                  <table className="b-detail-table w-100">
                    <tbody>
                      <tr><th >সার্কুলার</th><td>{app.circular_title}</td></tr>
                      <tr><th >কোর্স</th><td>{app.course_name || '—'}</td></tr>
                      <tr><th >কেন্দ্র</th><td>{app.center_name || '—'}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="col-md-6">
                  <h6 className="fw-bold mb-3 text-muted text-uppercase small">অবস্থা</h6>
                  <table className="b-detail-table w-100">
                    <tbody>
                      <tr><th >আবেদনের তারিখ</th><td>{formatDate(app.applied_at)}</td></tr>
                      <tr><th >অবস্থা</th>
                        <td>
                          <span className={`status-dot dot-${STATUS_BG[app.status] || 'secondary'}`}>
                            {app.status === 'pending' ? 'পেন্ডিং' :
                             app.status === 'selected' ? 'নির্বাচিত' :
                             app.status === 'rejected' ? 'বাতিল' :
                             app.status === 'waitlisted' ? 'অপেক্ষমাণ' : app.status}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="row g-4 mt-2">
                <div className="col-md-6">
                  <h6 className="fw-bold mb-3 text-muted text-uppercase small">ব্যক্তিগত তথ্য</h6>
                  <table className="b-detail-table w-100">
                    <tbody>
                      <tr><th >নাম (বাংলায়)</th><td>{app.name_bn}</td></tr>
                      <tr><th >নাম (ইংরেজিতে)</th><td>{app.name_en || '—'}</td></tr>
                      <tr><th >পিতার নাম</th><td>{app.father_name_bn}</td></tr>
                      <tr><th >মাতার নাম</th><td>{app.mother_name_bn}</td></tr>
                      <tr><th >জন্ম তারিখ</th><td>{formatDate(app.date_of_birth)}</td></tr>
                      <tr><th >এনআইডি</th><td>{convertToBanglaDigits(app.nid)}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="col-md-6">
                  <h6 className="fw-bold mb-3 text-muted text-uppercase small">যোগাযোগ</h6>
                  <table className="b-detail-table w-100">
                    <tbody>
                      <tr><th >মোবাইল</th><td>{convertToBanglaDigits(app.phone)}</td></tr>
                      <tr><th >বিকল্প মোবাইল</th><td>{app.alternate_phone || '—'}</td></tr>
                      <tr><th >ইমেইল</th><td>{app.email || '—'}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="row g-4 mt-2">
                <div className="col-md-6">
                  <h6 className="fw-bold mb-3 text-muted text-uppercase small">ঠিকানা</h6>
                  <table className="b-detail-table w-100">
                    <tbody>
                      <tr><th >বর্তমান ঠিকানা</th><td>{app.present_address}</td></tr>
                      <tr><th >স্থায়ী ঠিকানা</th><td>{app.permanent_address || '—'}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="col-md-6">
                  <h6 className="fw-bold mb-3 text-muted text-uppercase small">শিক্ষা ও পেশা</h6>
                  <table className="b-detail-table w-100">
                    <tbody>
                      <tr><th >শিক্ষাগত যোগ্যতা</th><td>{app.education_qualification}</td></tr>
                      <tr><th >পেশা</th><td>{app.profession || '—'}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {app.reviewed_by && (
                <div className="row g-4 mt-2">
                  <div className="col-12">
                    <h6 className="fw-bold mb-3 text-muted text-uppercase small">পর্যালোচনা</h6>
                    <table className="b-detail-table w-100">
                      <tbody>
                        <tr><th >পর্যালোচনা করেছেন</th><td>{app.reviewed_by_name || '—'}</td></tr>
                        <tr><th >পর্যালোচনার তারিখ</th><td>{formatDate(app.reviewed_at)}</td></tr>
                        {app.remarks && <tr><th >মন্তব্য</th><td>{app.remarks}</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'documents' && (
            <div className="row g-4">
              {[
                { label: 'প্রোফাইল ছবি', src: imageUrl(app.profile_image) },
                { label: 'এনআইডি (সামনে)', src: imageUrl(app.nid_front_image) },
                { label: 'এনআইডি (পেছনে)', src: imageUrl(app.nid_back_image) },
              ].map(({ label, src }) => (
                <div className="col-md-4 text-center" key={label}>
                  <h6 className="fw-bold mb-3 text-muted text-uppercase small">{label}</h6>
                  {src ? (
                    <a href={src} target="_blank" rel="noopener noreferrer">
                      <img src={src} alt={label}
                        className="img-thumbnail"
                        style={{ height: 200, objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }} />
                    </a>
                  ) : (
                    <div className="border rounded p-4 text-muted small">কোনো ছবি নেই</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {app.status === 'pending' && (
        <div className="card shadow-sm border-0 mt-4">
          <div className="card-body p-4">
            <h6 className="fw-bold mb-3">পর্যালোচনা</h6>
            <div className="mb-3">
              <label className="form-label fw-semibold">মন্তব্য {remarks.length > 0 && <span className="text-success">(লিখিত)</span>}</label>
              <textarea className="form-control" rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="পর্যালোচনা মন্তব্য লিখুন..." />
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-success d-flex align-items-center gap-2"
                onClick={() => handleReview('selected')}
                disabled={submitting}>
                {submitting ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-check-circle"></i>}
                নির্বাচিত
              </button>
              <button className="btn btn-danger d-flex align-items-center gap-2"
                onClick={() => handleReview('rejected')}
                disabled={submitting}>
                {submitting ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-x-circle"></i>}
                বাতিল
              </button>
              <button className="btn btn-warning text-dark d-flex align-items-center gap-2"
                onClick={() => handleReview('waitlisted')}
                disabled={submitting}>
                {submitting ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-clock"></i>}
                অপেক্ষমাণ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
