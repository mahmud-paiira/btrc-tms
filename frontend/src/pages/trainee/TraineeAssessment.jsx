import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import traineeService from '../../services/traineeService';

const STATUS_BADGE = {
  competent: 'success', not_competent: 'danger', absent: 'secondary',
};

export default function TraineeAssessment() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    traineeService.getAssessments()
      .then(({ data: res }) => setData(res))
      .catch(() => toast.error('মূল্যায়ন ফলাফল লোড করতে ব্যর্থ'))
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

  const competentCount = data.assessments.filter((a) => a.competency_status === 'competent').length;
  const notCompetentCount = data.assessments.filter((a) => a.competency_status === 'not_competent').length;
  const absentCount = data.assessments.filter((a) => a.competency_status === 'absent').length;

  return (
    <div style={{ fontFamily: 'NikoshBAN, sans-serif' }}>
      <h4 className="mb-3">মূল্যায়নের ফলাফল</h4>
      {data.batch_name && <p className="text-muted">{data.batch_name}</p>}

      <div className="row g-2 mb-4">
        <div className="col-4">
          <div className="card text-bg-success text-center py-2">
            <h4 className="mb-0">{competentCount}</h4>
            <small>দক্ষ</small>
          </div>
        </div>
        <div className="col-4">
          <div className="card text-bg-danger text-center py-2">
            <h4 className="mb-0">{notCompetentCount}</h4>
            <small>অদক্ষ</small>
          </div>
        </div>
        <div className="col-4">
          <div className="card text-bg-secondary text-center py-2">
            <h4 className="mb-0">{absentCount}</h4>
            <small>অনুপস্থিত</small>
          </div>
        </div>
      </div>

      {/* Overall status */}
      <div className={`alert ${data.all_competent ? 'alert-success' : 'alert-warning'} mb-4`}>
        <i className={`bi ${data.all_competent ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
        {data.all_competent
          ? 'সকল মূল্যায়নে আপনি দক্ষ হিসেবে চিহ্নিত হয়েছেন।'
          : 'কিছু মূল্যায়নে আপনি অদক্ষ বা অনুপস্থিত হিসেবে চিহ্নিত হয়েছেন।'}
      </div>

      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead className="table-dark">
            <tr>
              <th>মূল্যায়নের ধরণ</th>
              <th>তারিখ</th>
              <th>ফলাফল</th>
              <th>প্রাপ্ত নম্বর</th>
              <th>মোট নম্বর</th>
              <th>শতাংশ</th>
              <th>পুনঃমূল্যায়ন</th>
            </tr>
          </thead>
          <tbody>
            {data.assessments.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-muted py-4">কোন মূল্যায়ন পাওয়া যায়নি</td></tr>
            ) : (
              data.assessments.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.assessment_type_display}</strong></td>
                  <td>{a.assessment_date}</td>
                  <td>
                    <span className={`badge bg-${STATUS_BADGE[a.competency_status]}`}>
                      {a.competency_status_display}
                    </span>
                  </td>
                  <td>{a.marks_obtained ?? '—'}</td>
                  <td>{a.total_marks ?? '—'}</td>
                  <td>{a.percentage !== null ? `${a.percentage}%` : '—'}</td>
                  <td>{a.is_reassessment ? <span className="badge bg-info">পুনঃমূল্যায়ন</span> : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.assessments.length > 0 && !data.has_final && (
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          চূড়ান্ত মূল্যায়ন এখনো সম্পন্ন হয়নি।
        </div>
      )}
    </div>
  );
}
