import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateFormatter';

const API_URL = '/api';

export default function ApplicationDetailModal({ application, onClose, onReviewed }) {
  const [remarks, setRemarks] = useState(application.remarks || '');
  const [action, setAction] = useState(null);
  const [loading, setLoading] = useState(false);

  const imageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const handleReview = async (status) => {
    setAction(status);
    setLoading(true);
    try {
      const { default: applicationService } = await import('../../services/applicationService');
      await applicationService.review(application.id, { status, remarks });
      toast.success(
        status === 'selected' ? 'নির্বাচিত করা হয়েছে' :
        status === 'rejected' ? 'বাতিল করা হয়েছে' : 'অপেক্ষমাণ করা হয়েছে'
      );
      onReviewed();
    } catch (err) {
      toast.error(err.response?.data?.error || 'পর্যালোচনা ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  if (!application) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="bi bi-person-lines-fill me-2"></i>
              {application.application_no}
            </h5>
            <button className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <div className="row g-3">
              <div className="col-12">
                <h6 className="text-primary border-bottom pb-2">সার্কুলার</h6>
              </div>
              <div className="col-md-6">
                <small className="text-muted d-block">সার্কুলার</small>
                <strong>{application.circular_title}</strong>
              </div>
              <div className="col-md-3">
                <small className="text-muted d-block">কেন্দ্র</small>
                <strong>{application.center_name}</strong>
              </div>
              <div className="col-md-3">
                <small className="text-muted d-block">কোর্স</small>
                <strong>{application.course_name}</strong>
              </div>

              <div className="col-12 mt-3">
                <h6 className="text-primary border-bottom pb-2">ব্যক্তিগত তথ্য</h6>
              </div>
              <div className="col-md-4">
                <small className="text-muted d-block">নাম (বাংলায়)</small>
                <strong>{application.name_bn}</strong>
              </div>
              <div className="col-md-4">
                <small className="text-muted d-block">নাম (ইংরেজিতে)</small>
                <strong>{application.name_en || '—'}</strong>
              </div>
              <div className="col-md-4">
                <small className="text-muted d-block">এনআইডি</small>
                <strong>{application.nid}</strong>
              </div>
              <div className="col-md-4">
                <small className="text-muted d-block">পিতার নাম</small>
                <strong>{application.father_name_bn}</strong>
              </div>
              <div className="col-md-4">
                <small className="text-muted d-block">মাতার নাম</small>
                <strong>{application.mother_name_bn}</strong>
              </div>
              <div className="col-md-4">
                <small className="text-muted d-block">জন্ম তারিখ</small>
                <strong>{application.date_of_birth}</strong>
              </div>

              <div className="col-12 mt-3">
                <h6 className="text-primary border-bottom pb-2">যোগাযোগ</h6>
              </div>
              <div className="col-md-4">
                <small className="text-muted d-block">মোবাইল</small>
                <strong>{application.phone}</strong>
              </div>
              {application.alternate_phone && (
                <div className="col-md-4">
                  <small className="text-muted d-block">বিকল্প মোবাইল</small>
                  <strong>{application.alternate_phone}</strong>
                </div>
              )}
              <div className="col-md-4">
                <small className="text-muted d-block">ইমেইল</small>
                <strong>{application.email || '—'}</strong>
              </div>

              <div className="col-12 mt-3">
                <h6 className="text-primary border-bottom pb-2">ঠিকানা</h6>
              </div>
              <div className="col-md-6">
                <small className="text-muted d-block">বর্তমান ঠিকানা</small>
                <strong>{application.present_address}</strong>
              </div>
              <div className="col-md-6">
                <small className="text-muted d-block">স্থায়ী ঠিকানা</small>
                <strong>{application.permanent_address || '—'}</strong>
              </div>

              <div className="col-12 mt-3">
                <h6 className="text-primary border-bottom pb-2">শিক্ষা ও পেশা</h6>
              </div>
              <div className="col-md-6">
                <small className="text-muted d-block">শিক্ষাগত যোগ্যতা</small>
                <strong>{application.education_qualification}</strong>
              </div>
              <div className="col-md-6">
                <small className="text-muted d-block">পেশা</small>
                <strong>{application.profession || '—'}</strong>
              </div>

              <div className="col-12 mt-3">
                <h6 className="text-primary border-bottom pb-2">ডকুমেন্টস</h6>
              </div>
              <div className="col-12">
                <div className="row g-2">
                  {[
                    { label: 'প্রোফাইল ছবি', src: imageUrl(application.profile_image) },
                    { label: 'এনআইডি (সামনে)', src: imageUrl(application.nid_front_image) },
                    { label: 'এনআইডি (পেছনে)', src: imageUrl(application.nid_back_image) },
                  ].map(({ label, src }) => (
                    <div className="col-md-4 text-center" key={label}>
                      <small className="text-muted d-block mb-1">{label}</small>
                      {src ? (
                        <a href={src} target="_blank" rel="noopener noreferrer">
                          <img
                            src={src}
                            alt={label}
                            className="img-thumbnail"
                            style={{ height: 120, objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </a>
                      ) : (
                        <div className="border rounded p-3 text-muted small">নেই</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="form-label fw-bold">মন্তব্য</label>
              <textarea
                className="form-control"
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="পর্যালোচনা মন্তব্য লিখুন..."
              />
            </div>

            {application.reviewed_by && (
              <div className="mt-3 text-muted small">
                <i className="bi bi-clock-history me-1"></i>
                পর্যালোচনা করেছেন: {application.reviewed_by_name || '—'}
                {application.reviewed_at && ` (${formatDate(application.reviewed_at, 'bn')})`}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <div className="d-flex gap-2 w-100 justify-content-between">
              <div>
                <span className={`badge fs-6 ${
                  application.status === 'selected' ? 'bg-success' :
                  application.status === 'rejected' ? 'bg-danger' :
                  application.status === 'waitlisted' ? 'bg-warning text-dark' :
                  'bg-secondary'
                }`}>
                  {application.status === 'pending' ? 'বিচারাধীন' :
                   application.status === 'selected' ? 'নির্বাচিত' :
                   application.status === 'rejected' ? 'বাতিল' :
                   application.status === 'waitlisted' ? 'অপেক্ষমাণ' : application.status}
                </span>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary" onClick={onClose}>বন্ধ</button>
                {application.status !== 'selected' && (
                  <button
                    className="btn btn-success"
                    onClick={() => handleReview('selected')}
                    disabled={loading}
                  >
                    {loading && action === 'selected' ? (
                      <span className="spinner-border spinner-border-sm me-1"></span>
                    ) : <i className="bi bi-check-circle me-1"></i>}
                    নির্বাচিত
                  </button>
                )}
                {application.status !== 'rejected' && (
                  <button
                    className="btn btn-danger"
                    onClick={() => handleReview('rejected')}
                    disabled={loading}
                  >
                    {loading && action === 'rejected' ? (
                      <span className="spinner-border spinner-border-sm me-1"></span>
                    ) : <i className="bi bi-x-circle me-1"></i>}
                    বাতিল
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
