import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import traineeService from '../../services/traineeService';

const STATUS_BADGE = {
  present: 'success', late: 'warning', absent: 'danger', leave: 'info',
};

export default function TraineeAttendance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear().toString());
  const [month, setMonth] = useState((now.getMonth() + 1).toString().padStart(2, '0'));

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (year) params.year = year;
      if (month) params.month = month;
      const { data: res } = await traineeService.getAttendance(params);
      setData(res);
    } catch {
      toast.error('উপস্থিতি ডাটা লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetch(); }, [fetch]);

  const months = [
    { v: '01', l: 'জানুয়ারি' }, { v: '02', l: 'ফেব্রুয়ারি' }, { v: '03', l: 'মার্চ' },
    { v: '04', l: 'এপ্রিল' }, { v: '05', l: 'মে' }, { v: '06', l: 'জুন' },
    { v: '07', l: 'জুলাই' }, { v: '08', l: 'আগস্ট' }, { v: '09', l: 'সেপ্টেম্বর' },
    { v: '10', l: 'অক্টোবর' }, { v: '11', l: 'নভেম্বর' }, { v: '12', l: 'ডিসেম্বর' },
  ];

  return (
    <div style={{ fontFamily: 'NikoshBAN, sans-serif' }}>
      <h4 className="mb-3">উপস্থিতি</h4>

      <div className="row g-2 mb-3">
        <div className="col-md-3">
          <select className="form-select" value={year} onChange={(e) => setYear(e.target.value)}>
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <select className="form-select" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">সব মাস</option>
            {months.map((m) => (
              <option key={m.v} value={m.v}>{m.l}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : data ? (
        <>
          <div className="row g-2 mb-4">
            <div className="col-3">
              <div className="card text-bg-success text-center py-2"><h4 className="mb-0">{data.present}</h4><small>উপস্থিত</small></div>
            </div>
            <div className="col-3">
              <div className="card text-bg-warning text-center py-2"><h4 className="mb-0">{data.late}</h4><small>বিলম্বে</small></div>
            </div>
            <div className="col-3">
              <div className="card text-bg-danger text-center py-2"><h4 className="mb-0">{data.absent}</h4><small>অনুপস্থিত</small></div>
            </div>
            <div className="col-3">
              <div className="card text-bg-info text-center py-2"><h4 className="mb-0">{data.leave}</h4><small>ছুটি</small></div>
            </div>
          </div>

          <div className="d-flex justify-content-between mb-2">
            <span>মোট উপস্থিতি</span>
            <span className={`fw-bold ${data.attendance_percentage < 80 ? 'text-danger' : 'text-success'}`}>
              {data.attendance_percentage}%
            </span>
          </div>
          <div className="progress mb-4" style={{ height: 12 }}>
            <div
              className={`progress-bar ${data.attendance_percentage < 80 ? 'bg-danger' : 'bg-success'}`}
              style={{ width: `${Math.min(data.attendance_percentage, 100)}%` }}
            />
          </div>

          {/* Trend chart */}
          {data.trend && data.trend.length > 0 && (
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-light"><h6 className="mb-0">সাপ্তাহিক উপস্থিতির প্রবণতা</h6></div>
              <div className="card-body">
                <div className="d-flex align-items-end gap-2" style={{ height: 120 }}>
                  {data.trend.map((w) => {
                    const pct = w.total > 0 ? (w.attended / w.total) * 100 : 0;
                    return (
                      <div key={w.week} className="d-flex flex-column align-items-center flex-fill">
                        <small className="mb-1">{Math.round(pct)}%</small>
                        <div
                          className={`rounded ${pct >= 80 ? 'bg-success' : 'bg-danger'}`}
                          style={{ width: '100%', height: `${Math.max(pct, 5)}%`, minHeight: 8 }}
                          title={`সপ্তাহ ${w.week}: ${w.attended}/${w.total}`}
                        />
                        <small className="mt-1">W{w.week}</small>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Records table */}
          <div className="table-responsive">
            <table className="table table-hover table-bordered align-middle">
              <thead className="table-dark">
                <tr>
                  <th>তারিখ</th>
                  <th>সেশন</th>
                  <th>স্ট্যাটাস</th>
                  <th>মন্তব্য</th>
                </tr>
              </thead>
              <tbody>
                {data.records.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-muted py-4">কোন রেকর্ড নেই</td></tr>
                ) : (
                  data.records.map((r) => (
                    <tr key={r.id}>
                      <td>{r.session_date}</td>
                      <td>{r.session_no}</td>
                      <td>
                        <span className={`badge bg-${STATUS_BADGE[r.status]}`}>
                          {r.status_display}
                        </span>
                      </td>
                      <td>{r.remarks || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
