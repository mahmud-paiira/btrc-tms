import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import attendanceService from '../../services/attendanceService';
import { formatDate } from '../../utils/dateFormatter';
import { formatPercentage } from '../../utils/numberFormatter';

const STATUS_OPTIONS = [
  { value: 'present', label: 'উপস্থিত', icon: 'bi-check-circle', color: 'success' },
  { value: 'late', label: 'বিলম্বে', icon: 'bi-clock', color: 'warning' },
  { value: 'absent', label: 'অনুপস্থিত', icon: 'bi-x-circle', color: 'danger' },
  { value: 'leave', label: 'ছুটি', icon: 'bi-file-earmark', color: 'info' },
];

function getDateKey(d) {
  if (!d) return '';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AttendanceModal({
  batchId,
  sessionDate,
  weekPlans,
  summaries,
  eligible,
  calendarData,
  onClose,
  onRefresh,
}) {
  const [enrollments, setEnrollments] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [entries, setEntries] = useState({});
  const [leadTrainer, setLeadTrainer] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(1);

  const dateKey = getDateKey(sessionDate);
  const dayOfWeek = sessionDate ? ((new Date(sessionDate)).getDay() + 6) % 7 : 0;

  const weekPlanForDay = weekPlans.filter((wp) => wp.day_of_week === dayOfWeek);
  const uniqueSessions = [...new Set(weekPlanForDay.map((wp) => wp.session_no))].sort(
    (a, b) => a - b,
  );

  useEffect(() => {
    if (uniqueSessions.length > 0 && !uniqueSessions.includes(selectedSession)) {
      setSelectedSession(uniqueSessions[0]);
    }
  }, [uniqueSessions, selectedSession]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [enrollRes, trainerRes] = await Promise.all([
        attendanceService.getBatchEnrollments(batchId),
        api.get('/trainers/', { params: { status: 'active' } }),
      ]);
      setEnrollments(enrollRes.data.results || enrollRes.data || []);
      setTrainers(trainerRes.data.results || trainerRes.data || []);
    } catch {
      toast.error('প্রশিক্ষণার্থী ডাটা লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const dayData = calendarData?.find((c) => c.date === dateKey);
  const existingSessions = dayData?.sessions || [];

  useEffect(() => {
    const initial = {};
    const trainees = enrollments.map((e) =>
      e.trainee || e.trainee_id || e.id,
    );
    const uniqueTraineeIds = [...new Set(trainees)];

    uniqueTraineeIds.forEach((tId) => {
      const existing = existingSessions.find(
        (s) => s.trainee_id === tId && s.session_no === selectedSession,
      );
      initial[tId] = {
        status: existing?.status || 'present',
        remarks: existing?.remarks || '',
      };
    });
    setEntries(initial);
  }, [enrollments, existingSessions, selectedSession]);

  const handleStatusChange = (traineeId, status) => {
    setEntries((prev) => ({
      ...prev,
      [traineeId]: { ...prev[traineeId], status },
    }));
  };

  const handleRemarksChange = (traineeId, remarks) => {
    setEntries((prev) => ({
      ...prev,
      [traineeId]: { ...prev[traineeId], remarks },
    }));
  };

  const markAll = (status) => {
    const updated = {};
    Object.keys(entries).forEach((tId) => {
      updated[tId] = { ...entries[tId], status };
    });
    setEntries(updated);
  };

  const handleSave = async () => {
    if (!leadTrainer) {
      toast.warning('দয়া করে প্রধান প্রশিক্ষক নির্বাচন করুন');
      return;
    }

    const sessionDateStr = dateKey;
    const payload = {
      batch: batchId,
      session_date: sessionDateStr,
      session_no: selectedSession,
      entries: Object.entries(entries).map(([traineeId, data]) => ({
        trainee: parseInt(traineeId),
        status: data.status,
        lead_trainer: parseInt(leadTrainer),
        remarks: data.remarks || '',
      })),
    };

    setSaving(true);
    try {
      await attendanceService.markAttendance(payload);
      toast.success('উপস্থিতি সফলভাবে সংরক্ষিত হয়েছে');
      onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'সংরক্ষণ করতে ব্যর্থ');
    } finally {
      setSaving(false);
    }
  };

  const getTraineePercentage = (traineeId) => {
    const s = summaries?.find((sm) => sm.trainee === traineeId);
    return s ? parseFloat(s.attendance_percentage) : 0;
  };

  const getTraineeEligibility = (traineeId) => {
    const e = eligible?.find((el) => el.trainee_id === traineeId);
    return e;
  };

  if (!sessionDate) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="bi bi-calendar-check me-2"></i>
              উপস্থিতি মার্ক করুন - {formatDate(sessionDate, 'bn')}
            </h5>
            <button className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border"></div>
              </div>
            ) : (
              <>
                {/* Session selector */}
                {uniqueSessions.length > 0 && (
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label fw-bold">সেশন নম্বর</label>
                      <div className="d-flex gap-2">
                        {uniqueSessions.map((sn) => (
                          <button
                            key={sn}
                            className={`btn btn-sm ${selectedSession === sn ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setSelectedSession(sn)}
                          >
                            সেশন {sn}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-bold">প্রধান প্রশিক্ষক</label>
                      <select
                        className="form-select"
                        value={leadTrainer}
                        onChange={(e) => setLeadTrainer(e.target.value)}
                      >
                        <option value="">-- নির্বাচন করুন --</option>
                        {trainers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.user_email || t.trainer_no} - {t.expertise_area}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 d-flex align-items-end gap-2">
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => markAll('present')}
                      >
                        <i className="bi bi-check-all me-1"></i>সব উপস্থিত
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => markAll('absent')}
                      >
                        <i className="bi bi-x-circle me-1"></i>সব অনুপস্থিত
                      </button>
                    </div>
                  </div>
                )}

                {/* Trainee table */}
                <div className="table-responsive">
                  <table className="table table-hover table-bordered mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>প্রশিক্ষণার্থী</th>
                        <th style={{ width: 100 }} className="text-center">
                          উপস্থিতি %
                        </th>
                        <th style={{ width: 180 }}>অবস্থা</th>
                        <th>মন্তব্য</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4">
                            কোন প্রশিক্ষণার্থী পাওয়া যায়নি
                          </td>
                        </tr>
                      ) : (
                        enrollments.map((enr, idx) => {
                          const tId = enr.trainee || enr.trainee_id || enr.id;
                          const tName = enr.trainee_name || enr.trainee__user__full_name_bn || `#${tId}`;
                          const tReg = enr.trainee_reg_no || enr.trainee__registration_no || '';
                          const pct = getTraineePercentage(tId);
                          const elig = getTraineeEligibility(tId);
                          const isLow = pct < 80 && pct > 0;
                          const entry = entries[tId] || { status: 'present', remarks: '' };

                          return (
                            <tr key={tId} className={isLow ? 'table-danger' : ''}>
                              <td>{idx + 1}</td>
                              <td>
                                <strong>{tName}</strong>
                                <br />
                                <small className="text-muted">{tReg}</small>
                              </td>
                              <td className="text-center align-middle">
                                {pct > 0 ? (
                                  <span
                                    className={`badge ${isLow ? 'bg-danger' : 'bg-success'} fs-6`}
                                  >
                                    {formatPercentage(pct, 'bn')}
                                  </span>
                                ) : (
                                  <span className="badge bg-secondary">—</span>
                                )}
                              </td>
                              <td>
                                <select
                                  className="form-select form-select-sm"
                                  value={entry.status}
                                  onChange={(e) => handleStatusChange(tId, e.target.value)}
                                >
                                  {STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="মন্তব্য..."
                                  value={entry.remarks || ''}
                                  onChange={(e) => handleRemarksChange(tId, e.target.value)}
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Ineligible warning */}
                {eligible.filter((e) => !e.is_eligible).length > 0 && (
                  <div className="alert alert-warning mt-3 mb-0">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    <strong>সতর্কতা:</strong>{' '}
                    {eligible.filter((e) => !e.is_eligible).length} জন প্রশিক্ষণার্থীর
                    উপস্থিতির হার ৮০% এর নিচে।
                  </div>
                )}
              </>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-outline-secondary" onClick={onClose}>
              বাতিল
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1"></span>
                  সংরক্ষণ হচ্ছে...
                </>
              ) : (
                <>
                  <i className="bi bi-save me-1"></i>সংরক্ষণ করুন
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
