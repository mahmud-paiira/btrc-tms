import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import traineeService from '../../services/traineeService';
import { formatDate } from '../../utils/dateFormatter';
import { convertToBanglaDigits } from '../../utils/numberFormatter';

const STATUS_BADGE = {
  pending: 'bg-warning text-dark',
  auto_rejected: 'bg-danger',
  selected: 'bg-success',
  rejected: 'bg-danger',
  waitlisted: 'bg-info text-dark',
  enrolled: 'bg-primary',
};

export default function TraineeApplications() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    traineeService.getMyApplications()
      .then(({ data }) => setList(data))
      .catch(() => toast.error('আবেদন তালিকা লোড করতে ব্যর্থ'))
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

  if (!list.length) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-inbox fs-1 text-muted mb-3 d-block"></i>
        <h5>কোনো আবেদন পাওয়া যায়নি</h5>
        <p className="text-muted">আপনি এখনো কোনো সার্কুলারে আবেদন করেননি।</p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="mb-4 fw-bold"><i className="bi bi-file-text me-2"></i>আমার আবেদনসমূহ</h4>
      <div className="row g-3">
        {list.map((app) => (
          <div className="col-12" key={app.id}>
            <div className="card shadow-sm border-0" style={{ borderRadius: 16 }}>
              <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
                  <div>
                    <h6 className="mb-1 fw-bold">{app.circular_title}</h6>
                    <div className="small text-muted">
                      <span className="text-nowrap"><i className="bi bi-hash me-1"></i>{convertToBanglaDigits(app.application_no)}</span>
                      {app.center_name && <span className="ms-3 text-nowrap"><i className="bi bi-geo-alt me-1"></i>{app.center_name}</span>}
                    </div>
                  </div>
                  <span className={`badge rounded-pill px-3 py-2 ${STATUS_BADGE[app.status] || 'bg-secondary'}`}>
                    {app.status_display}
                  </span>
                </div>
                <div className="d-flex flex-wrap gap-3 small text-muted mt-2">
                  <span><i className="bi bi-clock me-1"></i>{formatDate(app.applied_at)}</span>
                  {app.merit_score != null && (
                    <span><i className="bi bi-trophy me-1"></i>মেধা স্কোর: {app.merit_score}</span>
                  )}
                  {app.waitlist_position != null && (
                    <span><i className="bi bi-list-ol me-1"></i>অপেক্ষমাণ অবস্থান: {app.waitlist_position}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
