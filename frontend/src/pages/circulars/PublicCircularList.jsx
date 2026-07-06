import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import circularService from '../../services/circularService';
import { formatDate } from '../../utils/dateFormatter';
import './PublicCircular.css';

export default function PublicCircularList() {
  const navigate = useNavigate();
  const [circular, setCircular] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    circularService.getAllPublished()
      .then(res => {
        const list = res.data.results || res.data || [];
        setCircular(list.length > 0 ? list[0] : null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="public-circular-page">
        <header className="circular-header">
          <div className="container">
            <div className="d-flex justify-content-between align-items-center py-3">
              <div className="header-brand">
                <h1 className="brand-title">বাংলাদেশ সড়ক পরিবহন কর্পোরেশন</h1>
                <p className="brand-subtitle mb-0">প্রশিক্ষণ ব্যবস্থাপনা সিস্টেম</p>
              </div>
            </div>
          </div>
        </header>
        <main className="container py-4">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"><span className="visually-hidden">লোড হচ্ছে...</span></div>
            <p className="mt-2 text-muted">লোড হচ্ছে...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!circular) {
    return (
      <div className="public-circular-page">
        <header className="circular-header">
          <div className="container">
            <div className="d-flex justify-content-between align-items-center py-3">
              <div className="header-brand">
                <h1 className="brand-title">বাংলাদেশ সড়ক পরিবহন কর্পোরেশন</h1>
                <p className="brand-subtitle mb-0">প্রশিক্ষণ ব্যবস্থাপনা সিস্টেম</p>
              </div>
            </div>
          </div>
        </header>
        <main className="container py-4">
          <div className="text-center py-5">
            <i className="bi bi-inbox display-1 text-muted"></i>
            <p className="mt-3 text-muted">কোনো সক্রিয় সার্কুলার নেই</p>
          </div>
        </main>
      </div>
    );
  }

  const isExpired = new Date(circular.application_end_date) < new Date();
  const isFull = (circular.remaining_seats || 0) <= 0;
  const centers = circular.eligible_centers || [];

  return (
    <div className="public-circular-page">
      <header className="circular-header">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center py-3">
            <div className="header-brand">
              <h1 className="brand-title">বাংলাদেশ সড়ক পরিবহন কর্পোরেশন</h1>
              <p className="brand-subtitle mb-0">প্রশিক্ষণ ব্যবস্থাপনা সিস্টেম</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-4">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
              <div>
                <h3 className="fw-bold mb-1">{circular.title_bn}</h3>
                <div className="text-muted">(<span className="fw-semibold">{circular.course_code}</span>) - {circular.course_name}</div>
              </div>
              {!isExpired && !isFull && (
                <button className="btn btn-success btn-lg px-5"
                  onClick={() => navigate(`/register-and-apply?circular=${circular.public_url}`)}>
                  <i className="bi bi-send me-2"></i>রেজিস্ট্রেশন ও আবেদন
                </button>
              )}
            </div>

            <div className="row g-4">
              <div className="col-md-6">
                <h6 className="fw-bold mb-3 text-muted text-uppercase small">সার্কুলার তথ্য</h6>
                <table className="table table-bordered align-middle">
                  <tbody>
                    <tr><th className="bg-light" style={{ width: 160 }}>শিরোনাম (বাংলা)</th><td>{circular.title_bn}</td></tr>
                    <tr><th className="bg-light">শিরোনাম (ইংরেজি)</th><td>{circular.title_en}</td></tr>
                    <tr><th className="bg-light">সার্কুলার নম্বর</th><td>{circular.circular_no || '-'}</td></tr>
                    <tr><th className="bg-light">সংস্করণ</th><td>{circular.edition}</td></tr>
                    <tr><th className="bg-light">কোর্স</th><td>({circular.course_code}) - {circular.course_name}</td></tr>
                    <tr><th className="bg-light">মেয়াদ</th><td>{circular.course_duration ? `${circular.course_duration} মাস` : '-'}</td></tr>
                    <tr><th className="bg-light">মোট আসন</th><td>{circular.total_seats}</td></tr>
                    <tr><th className="bg-light">অবশিষ্ট আসন</th>
                      <td><span className={`fw-bold ${circular.remaining_seats <= 5 ? 'text-danger' : 'text-success'}`}>{circular.remaining_seats}</span></td>
                    </tr>
                    <tr><th className="bg-light">কোর্স ফি</th><td>{circular.fee ? `৳${circular.fee}` : 'ডিফল্ট'}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="col-md-6">
                <h6 className="fw-bold mb-3 text-muted text-uppercase small">সময়সীমা</h6>
                <table className="table table-bordered align-middle">
                  <tbody>
                    <tr><th className="bg-light" style={{ width: 160 }}>আবেদন শুরুর তারিখ</th><td>{formatDate(circular.application_start_date)}</td></tr>
                    <tr><th className="bg-light">আবেদনের শেষ তারিখ</th>
                      <td className={`fw-bold ${isExpired ? 'text-danger' : ''}`}>{formatDate(circular.application_end_date)}</td></tr>
                    <tr><th className="bg-light">প্রশিক্ষণ শুরুর তারিখ</th><td>{formatDate(circular.training_start_date)}</td></tr>
                    <tr><th className="bg-light">প্রশিক্ষণ শেষের তারিখ</th><td>{formatDate(circular.training_end_date)}</td></tr>
                    <tr><th className="bg-light">উপযুক্ত কেন্দ্র</th>
                      <td>{circular.all_centers ? 'সব কেন্দ্র' : centers.map(c => `${c.code} - ${c.name_bn}`).join(', ')}</td></tr>
                  </tbody>
                </table>
              </div>
              {circular.description && (
                <div className="col-12">
                  <h6 className="fw-bold mb-3 text-muted text-uppercase small">বিবরণ</h6>
                  <div className="p-3 bg-light rounded description-content" dangerouslySetInnerHTML={{ __html: circular.description }} />
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-top text-center">
              {isExpired ? (
                <div className="alert alert-secondary">এই সার্কুলারের মেয়াদ উত্তীর্ণ হয়েছে</div>
              ) : isFull ? (
                <div className="alert alert-danger">সমস্ত আসন পূর্ণ হয়েছে</div>
              ) : (
                <button className="btn btn-success btn-lg px-5"
                  onClick={() => navigate(`/register-and-apply?circular=${circular.public_url}`)}>
                  <i className="bi bi-send me-2"></i>রেজিস্ট্রেশন ও আবেদন
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="circular-footer">
        <div className="container py-4">
          <div className="row">
            <div className="col-md-6">
              <h5>বাংলাদেশ সড়ক পরিবহন কর্পোরেশন</h5>
              <p className="small text-muted mb-0">সর্বস্বত্ব সংরক্ষিত</p>
            </div>
            <div className="col-md-6 text-md-end">
              <p className="mb-1"><i className="bi bi-telephone me-1"></i>+880-2-48114777</p>
              <p className="mb-0"><i className="bi bi-envelope me-1"></i>info@brtc.gov.bd</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
