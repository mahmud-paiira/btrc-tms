import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import traineeService from '../../services/traineeService';

export default function TraineeSchedule() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await traineeService.getSchedule();
      setData(res);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'সময়সূচি লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!data) return null;

  const handleDownloadPDF = () => {
    window.print();
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ fontFamily: 'NikoshBAN, sans-serif' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1">পাঠ্য সময়সূচি</h4>
          <p className="text-muted mb-0">{data.batch_name} ({data.batch_dates})</p>
        </div>
        <button className="btn btn-outline-primary" onClick={handleDownloadPDF}>
          <i className="bi bi-download me-1"></i>PDF ডাউনলোড
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead className="table-dark">
            <tr>
              <th>#</th>
              <th>তারিখ</th>
              <th>দিন</th>
              <th>সময়</th>
              <th>ধরণ</th>
              <th>বিষয়</th>
              <th>প্রশিক্ষক</th>
              <th>কক্ষ</th>
            </tr>
          </thead>
          <tbody>
            {data.sessions.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted py-4">কোন সেশন পাওয়া যায়নি</td>
              </tr>
            ) : (
              data.sessions.map((s, i) => {
                const isPast = s.is_past;
                const isToday = s.start_date === today;
                return (
                  <tr
                    key={s.id}
                    className={`${isToday ? 'table-warning fw-bold' : ''} ${isPast && !isToday ? 'text-muted' : ''}`}
                    style={{ opacity: isPast && !isToday ? 0.6 : 1 }}
                  >
                    <td>{i + 1}</td>
                    <td>{s.start_date}{s.end_date !== s.start_date ? ` - ${s.end_date}` : ''}</td>
                    <td>{s.day_of_week_display}</td>
                    <td>{s.start_time} - {s.end_time}</td>
                    <td><span className="badge bg-info">{s.class_type_display}</span></td>
                    <td>{s.topic}</td>
                    <td>{s.lead_trainer_name}{s.associate_trainer_name ? `, ${s.associate_trainer_name}` : ''}</td>
                    <td>{s.training_room || '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="d-flex gap-3 mt-2">
        <span><span className="badge bg-warning">&nbsp;&nbsp;</span> আজকের সেশন</span>
        <span className="text-muted"><span className="badge bg-light text-muted">&nbsp;&nbsp;</span> অতীতের সেশন</span>
      </div>
    </div>
  );
}
