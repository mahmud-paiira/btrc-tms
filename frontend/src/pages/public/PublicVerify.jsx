import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import certificateService from '../../services/certificateService';
import './PublicVerify.css';

export default function PublicVerify() {
  const { certNo: paramCertNo } = useParams();
  const [searchParams] = useSearchParams();
  const queryCertNo = searchParams.get('cert_no');
  const initialCertNo = paramCertNo || queryCertNo || '';

  const [certNo, setCertNo] = useState(initialCertNo);
  const [searchInput, setSearchInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialCertNo) {
      handleVerify(initialCertNo);
    }
  }, []);

  const handleVerify = async (value) => {
    const certNumber = value || searchInput.trim();
    if (!certNumber) {
      setError('সার্টিফিকেট নম্বর লিখুন');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setSearched(false);

    try {
      const { data } = await certificateService.verifyPublic(certNumber);
      setResult(data);
      setCertNo(certNumber);
    } catch (err) {
      if (err.response?.status === 404) {
        setResult({ is_valid: false, certificate_no: certNumber });
      } else {
        setError('যাচাই করতে ব্যর্থ। আবার চেষ্টা করুন।');
      }
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleVerify();
  };

  return (
    <div className="public-verify-page">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            {/* Header */}
            <div className="text-center mb-4">
              <div className="verify-logo mb-3">
                <i className="bi bi-patch-check-fill text-primary" style={{ fontSize: 48 }}></i>
              </div>
              <h3 className="fw-bold">সার্টিফিকেট যাচাই</h3>
              <p className="text-muted">
                বাংলাদেশ সড়ক পরিবহন কর্তৃপক্ষ (BRTC) - প্রশিক্ষণ বিভাগ
              </p>
              <p className="text-muted small">
                Certificate Verification &mdash; Bangladesh Road Transport Corporation
              </p>
            </div>

            {/* Search */}
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="input-group input-group-lg">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="সার্টিফিকেট নম্বর লিখুন (যেমন: BRTC-CERT-2026-00001)"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="spinner-border spinner-border-sm"></span>
                      ) : (
                        <>
                          <i className="bi bi-search me-1"></i>যাচাই
                        </>
                      )}
                    </button>
                  </div>
                </form>
                {error && (
                  <div className="alert alert-danger mt-3 mb-0">
                    <i className="bi bi-exclamation-circle me-2"></i>{error}
                  </div>
                )}
                {(paramCertNo || queryCertNo) && !result && !loading && !error && (
                  <div className="alert alert-info mt-3 mb-0">
                    <i className="bi bi-hourglass-split me-2"></i>
                    সার্টিফিকেট যাচাই করা হচ্ছে...
                  </div>
                )}
              </div>
            </div>

            {/* Result */}
            {result && (
              <div
                className={`card shadow ${
                  result.is_valid
                    ? 'border-success'
                    : 'border-danger'
                }`}
              >
                <div
                  className={`card-header text-white text-center py-3 ${
                    result.is_valid ? 'bg-success' : 'bg-danger'
                  }`}
                >
                  {result.is_valid ? (
                    <>
                      <i className="bi bi-check-circle-fill me-2" style={{ fontSize: 24 }}></i>
                      <h5 className="d-inline-block mb-0">বৈধ সার্টিফিকেট</h5>
                      <p className="mb-0 mt-1 small opacity-75">Valid Certificate</p>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-x-circle-fill me-2" style={{ fontSize: 24 }}></i>
                      <h5 className="d-inline-block mb-0">অবৈধ সার্টিফিকেট</h5>
                      <p className="mb-0 mt-1 small opacity-75">Invalid Certificate</p>
                    </>
                  )}
                </div>

                <div className="card-body">
                  {result.is_valid ? (
                    <div className="verify-details">
                      {/* Trainee Info */}
                      <div className="d-flex align-items-center gap-3 mb-4 p-3 bg-light rounded">
                        <div
                          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                          style={{ width: 56, height: 56, fontSize: 22 }}
                        >
                          {result.trainee_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <h5 className="mb-1">{result.trainee_name}</h5>
                          <small className="text-muted">
                            রেজি নং: {result.trainee_reg_no}
                          </small>
                        </div>
                      </div>

                      {/* Details Table */}
                      <table className="table table-borderless verify-table">
                        <tbody>
                          <tr>
                            <td className="fw-bold text-muted" style={{ width: 140 }}>
                              সার্টিফিকেট নং
                            </td>
                            <td className="fw-bold">{result.certificate_no}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold text-muted">কোর্স</td>
                            <td>{result.course_name}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold text-muted">ব্যাচ</td>
                            <td>{result.batch_name}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold text-muted">প্রশিক্ষণ কেন্দ্র</td>
                            <td>{result.center_name}</td>
                          </tr>
                          <tr>
                            <td className="fw-bold text-muted">ইস্যুর তারিখ</td>
                            <td>{result.issue_date}</td>
                          </tr>
                        </tbody>
                      </table>

                      <hr />

                      {/* Verification Stats */}
                      <div className="row text-center g-3">
                        <div className="col-6">
                          <div className="p-3 bg-light rounded">
                            <h3 className="text-primary mb-0">{result.verified_count}</h3>
                            <small className="text-muted">বার যাচাই করা হয়েছে</small>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="p-3 bg-light rounded">
                            <i
                              className={`bi ${
                                result.is_verified
                                  ? 'bi-check-circle-fill text-success'
                                  : 'bi-dash-circle text-secondary'
                              } fs-2`}
                            ></i>
                            <br />
                            <small className="text-muted">
                              {result.is_verified
                                ? 'পূর্বে যাচাইকৃত'
                                : 'প্রথমবার যাচাই'}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <i className="bi bi-shield-exclamation text-danger" style={{ fontSize: 48 }}></i>
                      <h5 className="mt-3">সার্টিফিকেট পাওয়া যায়নি</h5>
                      <p className="text-muted">
                        "{result.certificate_no}" এই নম্বরের কোনো বৈধ সার্টিফিকেট
                        আমাদের সিস্টেমে নেই।
                      </p>
                    </div>
                  )}

                  {/* Download */}
                  {result.is_valid && (
                    <div className="text-center mt-3">
                      <a
                        href={`/api/certificates/download/${result.certificate_no}/`}
                        className="btn btn-outline-primary"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <i className="bi bi-download me-1"></i>PDF ডাউনলোড
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center mt-4">
              <small className="text-muted">
                <i className="bi bi-shield-lock me-1"></i>
                এই সার্টিফিকেট যাচাই ব্যবস্থা BRTC কর্তৃক পরিচালিত
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
