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
  { key: 'eye_test', label: 'চোখের দৃষ্টি পরীক্ষা' },
];

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [eyeTest, setEyeTest] = useState(null);
  const [eyeResult, setEyeResult] = useState('');
  const [eyeRemarks, setEyeRemarks] = useState('');
  const [eyeFile, setEyeFile] = useState(null);
  const [eyePreview, setEyePreview] = useState(null);
  const [eyeSubmitting, setEyeSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    applicationService.get(id)
      .then(r => {
        setApplication(r.data);
        setRemarks(r.data.remarks || '');
        const eyeData = r.data.eye_screening || null;
        setEyeTest(eyeData);
        if (eyeData) {
          setEyeResult(eyeData.result || '');
          setEyeRemarks(eyeData.remarks || '');
          if (eyeData.evidence_file_url) setEyePreview(eyeData.evidence_file_url);
        }
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

  const handleEyeTest = async () => {
    if (!eyeResult) { toast.warning('ফলাফল নির্বাচন করুন'); return; }
    if (eyeResult === 'fail' && !eyeRemarks.trim()) {
      toast.warning('ব্যর্থ হলে কারণ উল্লেখ করা আবশ্যক');
      return;
    }
    if (!eyeFile && !eyeTest) {
      toast.warning('প্রমাণপত্র আপলোড করুন');
      return;
    }
    setEyeSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('result', eyeResult);
      if (eyeRemarks) fd.append('remarks', eyeRemarks);
      if (eyeFile) fd.append('evidence_file', eyeFile);
      const { data } = await applicationService.eyeScreening(id, fd);
      setEyeTest(data);
      toast.success('চোখের দৃষ্টি পরীক্ষার ফলাফল সংরক্ষিত হয়েছে');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.evidence_file?.[0] || err.response?.data?.remarks?.[0] || 'সংরক্ষণ ব্যর্থ';
      toast.error(msg);
    } finally {
      setEyeSubmitting(false);
    }
  };

  const handleEyeFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEyeFile(file);
      setEyePreview(URL.createObjectURL(file));
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

          {activeTab === 'eye_test' && (
            <div>
              {eyeTest && (eyeTest.result === 'pass' || eyeTest.result === 'fail') ? (
                <>
                  <div className="alert alert-info mb-4">
                    <i className="bi bi-info-circle me-2"></i>
                    এই আবেদনের চোখের দৃষ্টি পরীক্ষা ইতিমধ্যে সম্পন্ন হয়েছে।
                  </div>
                  <div className="row g-4">
                    <div className="col-md-6">
                      <h6 className="fw-bold mb-3 text-muted text-uppercase small">পরীক্ষার ফলাফল</h6>
                      <table className="b-detail-table w-100">
                        <tbody>
                          <tr>
                            <th>ফলাফল</th>
                            <td>
                              <span className={`badge ${eyeTest.result === 'pass' ? 'bg-success' : 'bg-danger'}`}>
                                {eyeTest.result === 'pass' ? 'পাস' : 'ব্যর্থ'}
                              </span>
                            </td>
                          </tr>
                          {eyeTest.remarks && <tr><th>কারণ</th><td>{eyeTest.remarks}</td></tr>}
                          {eyeTest.tested_by_name && <tr><th>পরীক্ষক</th><td>{eyeTest.tested_by_name}</td></tr>}
                          {eyeTest.tested_at && <tr><th>তারিখ</th><td>{eyeTest.tested_at}</td></tr>}
                        </tbody>
                      </table>
                    </div>
                    <div className="col-md-6">
                      <h6 className="fw-bold mb-3 text-muted text-uppercase small">প্রমাণপত্র</h6>
                      {eyeTest.evidence_file_url ? (
                        <a href={eyeTest.evidence_file_url} target="_blank" rel="noopener noreferrer"
                          className="btn btn-outline-primary btn-sm">
                          <i className="bi bi-file-earmark me-1"></i>ফাইল দেখুন
                        </a>
                      ) : (
                        <div className="border rounded p-4 text-muted small">কোনো প্রমাণপত্র নেই</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="alert alert-warning mb-4">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    এই আবেদনের চোখের দৃষ্টি পরীক্ষা এখনো সম্পন্ন হয়নি। নিচে ফলাফল জমা দিন।
                  </div>
                  <div className="row g-4">
                    <div className="col-md-6">
                      <h6 className="fw-bold mb-3">ফলাফল নির্বাচন</h6>
                      <div className="d-flex gap-3 mb-3">
                        <button className={`btn ${eyeResult === 'pass' ? 'btn-success' : 'btn-outline-success'} d-flex align-items-center gap-2`}
                          onClick={() => setEyeResult('pass')} type="button">
                          <i className="bi bi-check-circle"></i> পাস
                        </button>
                        <button className={`btn ${eyeResult === 'fail' ? 'btn-danger' : 'btn-outline-danger'} d-flex align-items-center gap-2`}
                          onClick={() => setEyeResult('fail')} type="button">
                          <i className="bi bi-x-circle"></i> ব্যর্থ
                        </button>
                      </div>
                      {eyeResult === 'fail' && (
                        <div className="mb-3">
                          <label className="form-label fw-semibold">ব্যর্থের কারণ <span className="text-danger">*</span></label>
                          <textarea className="form-control" rows={3}
                            value={eyeRemarks}
                            onChange={(e) => setEyeRemarks(e.target.value)}
                            placeholder="ব্যর্থ হওয়ার কারণ লিখুন..." />
                        </div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <h6 className="fw-bold mb-3">প্রমাণপত্র আপলোড</h6>
                      {eyePreview ? (
                        <div className="text-center position-relative">
                          <img src={eyePreview} alt="প্রমাণপত্র"
                            className="img-thumbnail"
                            style={{ maxHeight: 250, objectFit: 'contain' }} />
                          <button className="btn btn-sm btn-outline-danger mt-2"
                            onClick={() => { setEyeFile(null); setEyePreview(null); }}>
                            <i className="bi bi-trash me-1"></i>মুছুন
                          </button>
                        </div>
                      ) : (
                        <label className="upload-box d-flex flex-column align-items-center justify-content-center p-4 border border-2 border-dashed rounded-3"
                          style={{ cursor: 'pointer', minHeight: 180 }}>
                          <input type="file" accept="image/*" className="d-none" onChange={handleEyeFileChange} />
                          <i className="bi bi-cloud-arrow-up fs-1 text-muted mb-2"></i>
                          <span className="text-muted small">ছবি আপলোড করুন</span>
                          <small className="text-muted">JPG, PNG (সর্বোচ্চ 10MB)</small>
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <button className="btn btn-primary d-flex align-items-center gap-2"
                      onClick={handleEyeTest} disabled={eyeSubmitting || !eyeResult}>
                      {eyeSubmitting ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-check2-circle"></i>}
                      সংরক্ষণ করুন
                    </button>
                  </div>
                </>
              )}
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
