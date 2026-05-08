import React from 'react';
import { Link } from 'react-router-dom';

export default function ApplySuccess({ data }) {
  return (
    <div className="registration-page">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card shadow-sm text-center">
              <div className="card-body p-5">
                <div className="mb-4">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success"
                    style={{ width: 80, height: 80 }}
                  >
                    <i className="bi bi-check-lg text-white display-4"></i>
                  </div>
                </div>

                <h3 className="text-success mb-2">আবেদন সফল হয়েছে!</h3>
                <p className="text-muted mb-4">
                  আপনার আবেদন সফলভাবে জমা হয়েছে। নিচে আপনার আবেদন নম্বর দেওয়া হলো।
                </p>

                <div className="bg-light rounded p-4 mb-4">
                  <p className="text-muted small mb-1">আবেদন নম্বর</p>
                  <h2 className="fw-bold text-primary mb-0">{data.application_no}</h2>
                </div>

                <div className="text-start bg-light rounded p-3 mb-4">
                  <div className="row g-2 small">
                    <div className="col-6">
                      <span className="text-muted">নাম:</span>
                    </div>
                    <div className="col-6">{data.name_bn}</div>
                    <div className="col-6">
                      <span className="text-muted">এনআইডি:</span>
                    </div>
                    <div className="col-6">{data.nid}</div>
                    <div className="col-6">
                      <span className="text-muted">মোবাইল:</span>
                    </div>
                    <div className="col-6">{data.phone}</div>
                    <div className="col-6">
                      <span className="text-muted">কোর্স:</span>
                    </div>
                    <div className="col-6">{data.circular_title_bn}</div>
                    <div className="col-6">
                      <span className="text-muted">কেন্দ্র:</span>
                    </div>
                    <div className="col-6">{data.center_name_bn}</div>
                  </div>
                </div>

                <div className="alert alert-info small" role="alert">
                  <i className="bi bi-info-circle me-1"></i>
                  আপনার আবেদনটি পর্যালোচনার পর অবহিত করা হবে। নিশ্চিতকরণ এসএমএস/ইমেইল পাঠানো হবে।
                </div>

                <Link to="/" className="btn btn-outline-primary">
                  <i className="bi bi-house me-1"></i>হোম পেজে ফিরুন
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
