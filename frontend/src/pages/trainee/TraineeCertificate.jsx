import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import traineeService from '../../services/traineeService';
import { formatDate } from '../../utils/dateFormatter';

export default function TraineeCertificate() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    traineeService.getCertificate()
      .then(({ data: res }) => setData(res))
      .catch(() => toast.error('সার্টিফিকেট ডাটা লোড করতে ব্যর্থ'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!data) return null;

  if (!data.has_certificate) {
    return (
      <div style={{ fontFamily: 'NikoshBAN, sans-serif' }}>
        <h4 className="mb-3">সার্টিফিকেট</h4>
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-award fs-1 text-muted"></i>
            <p className="mt-3 text-muted">{data.detail || 'এখনো কোনো সার্টিফিকেট ইস্যু করা হয়নি।'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'NikoshBAN, sans-serif' }}>
      <h4 className="mb-3">সার্টিফিকেট</h4>

      <div className="card shadow-sm mb-4">
        <div className="card-body text-center py-4">
          <i className="bi bi-award-fill text-warning" style={{ fontSize: 64 }}></i>
          <h5 className="mt-3 mb-1">{data.certificate_no}</h5>
          <p className="text-muted mb-0">ইস্যুর তারিখ: {formatDate(data.issue_date, 'bn')}</p>

          {data.is_verified && (
            <p className="text-success mt-2 mb-0">
              <i className="bi bi-shield-check me-1"></i>
              যাচাইকৃত ({data.verified_count} বার)
            </p>
          )}

          <div className="d-flex justify-content-center gap-2 mt-3">
            {data.pdf_url && (
              <a href={data.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                <i className="bi bi-download me-1"></i>PDF ডাউনলোড
              </a>
            )}
            {data.verification_url && (
              <Link to={`/verify/certificate/${data.verification_url}`} target="_blank" className="btn btn-outline-success">
                <i className="bi bi-shield-check me-1"></i>যাচাই করুন
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* QR Code */}
        {data.qr_code_image && (
          <div className="col-md-4">
            <div className="card shadow-sm text-center">
              <div className="card-body">
                <h6 className="mb-3">QR কোড</h6>
                <img
                  src={data.qr_code_image}
                  alt="Certificate QR Code"
                  className="img-fluid"
                  style={{ maxWidth: 180 }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Verification link */}
        <div className="col-md-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="mb-3">সার্বজনীন যাচাইকরণ লিংক</h6>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  readOnly
                  value={data.qr_code_url || `${window.location.origin}/verify/certificate/${data.verification_url}`}
                />
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(data.qr_code_url || `${window.location.origin}/verify/certificate/${data.verification_url}`);
                    toast.success('লিংক কপি করা হয়েছে');
                  }}
                >
                  <i className="bi bi-clipboard"></i>
                </button>
              </div>
              <p className="text-muted mt-2 mb-0 small">
                এই লিংক ব্যবহার করে যেকেউ আপনার সার্টিফিকেটের সত্যতা যাচাই করতে পারবেন।
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
