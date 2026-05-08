import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';

export default function QRCheckin() {
  const { batchId, sessionNo, dateStr } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marked, setMarked] = useState(false);
  const [trainees, setTrainees] = useState([]);
  const [entries, setEntries] = useState({});
  const [leadTrainer, setLeadTrainer] = useState('');
  const [saving, setSaving] = useState(false);
  const [trainers, setTrainers] = useState([]);

  const sessionDate = dateStr
    ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
    : '';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchRes, enrollRes, trainerRes] = await Promise.all([
        api.get(`/batches/batches/${batchId}/`),
        api.get(`/batches/enrollments/`, { params: { batch: batchId } }),
        api.get('/trainers/', { params: { status: 'active' } }),
      ]);
      setBatch(batchRes.data);
      const enrollments = enrollRes.data.results || enrollRes.data || [];
      setTrainees(enrollments);
      setTrainers(trainerRes.data.results || trainerRes.data || []);

      const initial = {};
      enrollments.forEach((enr) => {
        const tId = enr.trainee || enr.trainee_id || enr.id;
        initial[tId] = { status: 'present', remarks: '' };
      });
      setEntries(initial);
    } catch {
      toast.error(t('attendance.loadFailed', 'ডাটা লোড করতে ব্যর্থ'));
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = (traineeId, status) => {
    setEntries((prev) => ({
      ...prev,
      [traineeId]: { ...prev[traineeId], status },
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
      toast.warning(t('attendance.mark.selectTrainerWarning', 'দয়া করে প্রধান প্রশিক্ষক নির্বাচন করুন'));
      return;
    }

    const payload = {
      batch: parseInt(batchId),
      session_date: sessionDate,
      session_no: parseInt(sessionNo),
      entries: Object.entries(entries).map(([traineeId, data]) => ({
        trainee: parseInt(traineeId),
        status: data.status,
        lead_trainer: parseInt(leadTrainer),
        remarks: data.remarks || '',
      })),
    };

    setSaving(true);
    try {
      await api.post('/center/attendance/mark/', payload);
      setMarked(true);
      toast.success(t('attendance.mark.saveSuccess', 'উপস্থিতি সফলভাবে সংরক্ষিত হয়েছে'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('attendance.mark.saveFailed', 'সংরক্ষণ করতে ব্যর্থ'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2">{t('site.loading', 'লোড হচ্ছে...')}</p>
        </div>
      </div>
    );
  }

  if (marked) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="display-1 text-success mb-3">
            <i className="bi bi-check-circle-fill"></i>
          </div>
          <h3>{t('attendance.qr.saveSuccess', 'উপস্থিতি সংরক্ষিত হয়েছে!')}</h3>
          <p className="text-muted">
            {batch?.batch_name_bn} - সেশন {sessionNo}
          </p>
          <p>তারিখ: {sessionDate}</p>
          <button className="btn btn-primary mt-3" onClick={() => navigate('/')}>
            {t('attendance.qr.goToDashboard', 'ড্যাশবোর্ডে যান')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">
            <i className="bi bi-qr-code-scan me-2"></i>
            QR চেক-ইন - {batch?.batch_name_bn || `ব্যাচ #${batchId}`}
          </h5>
        </div>
        <div className="card-body">
          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            সেশন {sessionNo} | তারিখ: {sessionDate}
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label fw-bold">{t('attendance.qr.leadTrainer', 'প্রধান প্রশিক্ষক')}</label>
              <select
                className="form-select"
                value={leadTrainer}
                onChange={(e) => setLeadTrainer(e.target.value)}
              >
                <option value="">{t('site.select', '-- নির্বাচন করুন --')}</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.user_email || t.trainer_no}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6 d-flex align-items-end gap-2">
              <button
                className="btn btn-sm btn-success"
                onClick={() => markAll('present')}
              >
                <i className="bi bi-check-all me-1"></i>{t('attendance.qr.allPresent', 'সব উপস্থিত')}
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => markAll('absent')}
              >
                <i className="bi bi-x-circle me-1"></i>{t('attendance.qr.allAbsent', 'সব অনুপস্থিত')}
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover table-bordered">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>{t('attendance.qr.colTrainee', 'প্রশিক্ষণার্থী')}</th>
                  <th style={{ width: 180 }}>{t('attendance.qr.colStatus', 'অবস্থা')}</th>
                </tr>
              </thead>
              <tbody>
                {trainees.map((enr, idx) => {
                  const tId = enr.trainee || enr.trainee_id || enr.id;
                  const tName = enr.trainee_name || enr.trainee__user__full_name_bn || `#${tId}`;
                  const entry = entries[tId] || { status: 'present', remarks: '' };
                  return (
                    <tr key={tId}>
                      <td>{idx + 1}</td>
                      <td>{tName}</td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={entry.status}
                          onChange={(e) => handleStatusChange(tId, e.target.value)}
                        >
                          <option value="present">{t('attendance.mark.statusPresent', 'উপস্থিত')}</option>
                          <option value="late">{t('attendance.mark.statusLate', 'বিলম্বে')}</option>
                          <option value="absent">{t('attendance.mark.statusAbsent', 'অনুপস্থিত')}</option>
                          <option value="leave">{t('attendance.mark.statusLeave', 'ছুটি')}</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-3">
            <button className="btn btn-outline-secondary" onClick={() => navigate('/')}>
              {t('site.cancel', 'বাতিল')}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1"></span>
                  {t('attendance.mark.saving', 'সংরক্ষণ হচ্ছে...')}
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg me-1"></i>{t('attendance.qr.confirm', 'নিশ্চিত করুন')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
