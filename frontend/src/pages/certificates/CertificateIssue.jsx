import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import certificateService from '../../services/certificateService';
import { useTranslation } from '../../hooks/useTranslation';
import './CertificateIssue.css';

export default function CertificateIssue() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [trainees, setTrainees] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issuedCount, setIssuedCount] = useState(0);

  const fetchBatches = useCallback(async () => {
    try {
      const { data } = await api.get('/batches/batches/', {
        params: { status: 'completed' },
      });
      setBatches(data.results || data || []);
    } catch {
      toast.error(t('certificate.issue.batchLoadFailed', 'ব্যাচ তালিকা লোড করতে ব্যর্থ'));
    }
  }, [t]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const fetchEligible = useCallback(async () => {
    if (!selectedBatch) {
      setTrainees([]);
      setSelectedIds([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await certificateService.getBatchEligible(selectedBatch);
      setTrainees(data.trainees || []);
      setIssuedCount(0);
      setSelectedIds([]);
    } catch (err) {
      toast.error(t('certificate.issue.dataLoadFailed', 'তথ্য লোড করতে ব্যর্থ'));
    } finally {
      setLoading(false);
    }
  }, [selectedBatch, t]);

  useEffect(() => { fetchEligible(); }, [fetchEligible]);

  const eligibleTrainees = trainees.filter((tr) => tr.eligible);
  const ineligibleHasCert = trainees.filter((tr) => tr.has_certificate && !tr.eligible);
  const ineligibleNoFinal = trainees.filter(
    (tr) => !tr.has_final_competent && !tr.has_certificate,
  );

  const handleSelectAll = () => {
    if (selectedIds.length === eligibleTrainees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(eligibleTrainees.map((tr) => tr.trainee_id));
    }
  };

  const handleToggle = (traineeId) => {
    setSelectedIds((prev) =>
      prev.includes(traineeId)
        ? prev.filter((id) => id !== traineeId)
        : [...prev, traineeId],
    );
  };

  const handleIssueSelected = async () => {
    if (selectedIds.length === 0) {
      toast.warning(t('certificate.issue.selectOne', 'কমপক্ষে একজন প্রশিক্ষণার্থী নির্বাচন করুন'));
      return;
    }
    setIssuing(true);
    try {
      const { data } = await certificateService.batchIssue({
        batch: parseInt(selectedBatch),
        trainees: selectedIds,
      });
      setIssuedCount((prev) => prev + data.created_count);
      toast.success(t('certificate.issue.issued', '{count} জনের সার্টিফিকেট ইস্যু করা হয়েছে', { count: data.created_count }));
      setSelectedIds([]);
      await fetchEligible();
    } catch (err) {
      toast.error(err.response?.data?.error || t('certificate.issue.issueFailed', 'ইস্যু করতে ব্যর্থ'));
    } finally {
      setIssuing(false);
    }
  };

  const handleIssueSingle = async (traineeId) => {
    setIssuing(true);
    try {
      await certificateService.issueCertificate({
        trainee: traineeId,
        batch: parseInt(selectedBatch),
      });
      toast.success(t('certificate.issue.singleIssued', 'সার্টিফিকেট ইস্যু করা হয়েছে'));
      setIssuedCount((prev) => prev + 1);
      await fetchEligible();
    } catch (err) {
      toast.error(err.response?.data?.error || t('certificate.issue.issueFailed', 'ইস্যু করতে ব্যর্থ'));
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="certificate-issue">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button
            className="btn btn-outline-secondary btn-sm me-2"
            onClick={() => navigate(-1)}
          >
            <i className="bi bi-arrow-left me-1"></i>{t('site.back', 'পেছনে')}
          </button>
          <h4 className="d-inline-block mb-0 align-middle">
            <i className="bi bi-award me-2"></i>{t('certificate.issue.title', 'সার্টিফিকেট ইস্যু')}
          </h4>
        </div>
      </div>

      {/* Batch selector */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <label className="form-label fw-bold">{t('certificate.issue.selectBatch', 'ব্যাচ নির্বাচন করুন')}</label>
              <select
                className="form-select"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                <option value="">{t('certificate.issue.allBatches', '-- সমাপ্ত ব্যাচ --')}</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_name_bn || b.batch_no}
                    {b.course ? ` - ${b.course.name_bn || ''}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <div className="card bg-success text-white text-center py-2">
                <div className="card-body py-1">
                  <h5 className="mb-0">{eligibleTrainees.length}</h5>
                  <small>{t('certificate.issue.eligible', 'যোগ্য')}</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-secondary text-white text-center py-2">
                <div className="card-body py-1">
                  <h5 className="mb-0">{trainees.length}</h5>
                  <small>{t('certificate.issue.totalTrainees', 'মোট প্রশিক্ষণার্থী')}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedBatch && (
        <>
          {/* Action bar */}
          {eligibleTrainees.length > 0 && (
            <div className="card shadow-sm mb-3">
              <div className="card-body d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="selectAll"
                      checked={
                        eligibleTrainees.length > 0 &&
                        selectedIds.length === eligibleTrainees.length
                      }
                      onChange={handleSelectAll}
                    />
                    <label className="form-check-label fw-bold" htmlFor="selectAll">
                      {t('certificate.issue.selectAll', 'সব নির্বাচন')}
                    </label>
                  </div>
                  <span className="text-muted">
                    {t('certificate.issue.selected', 'নির্বাচিত: {count} জন', { count: selectedIds.length })}
                  </span>
                </div>
                <button
                  className="btn btn-success"
                  onClick={handleIssueSelected}
                  disabled={issuing || selectedIds.length === 0}
                >
                  {issuing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      {t('certificate.issue.issuing', 'ইস্যু হচ্ছে...')}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-award-fill me-1"></i>
                      {t('certificate.issue.issueSelected', 'নির্বাচিতদের ইস্যু করুন ({count})', { count: selectedIds.length })}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
            </div>
          ) : (
            <>
              {/* Eligible trainees */}
              {eligibleTrainees.length > 0 && (
                <div className="card shadow-sm mb-3">
                  <div className="card-header bg-success text-white">
                    <h6 className="mb-0">
                      <i className="bi bi-check-circle me-2"></i>
                      {t('certificate.issue.eligibleHeader', 'সার্টিফিকেটের জন্য যোগ্য ({count})', { count: eligibleTrainees.length })}
                    </h6>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover table-bordered mb-0 align-middle">
                      <thead className="table-success">
                        <tr>
                          <th style={{ width: 40 }} className="text-center">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={
                                selectedIds.length === eligibleTrainees.length &&
                                eligibleTrainees.length > 0
                              }
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th>#</th>
                          <th>{t('certificate.issue.colName', 'নাম')}</th>
                          <th>{t('certificate.issue.colRegNo', 'রেজি নং')}</th>
                          <th className="text-center">{t('certificate.issue.colNid', 'NID')}</th>
                          <th className="text-center">{t('certificate.issue.colActions', 'ক্রিয়া')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eligibleTrainees.map((tr, idx) => (
                          <tr key={tr.trainee_id}>
                            <td className="text-center">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedIds.includes(tr.trainee_id)}
                                onChange={() => handleToggle(tr.trainee_id)}
                              />
                            </td>
                            <td>{idx + 1}</td>
                            <td>
                              <strong>{tr.trainee_name}</strong>
                            </td>
                            <td>{tr.trainee_reg_no}</td>
                            <td className="text-center">
                              <small className="text-muted">{tr.trainee_nid || '—'}</small>
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() => handleIssueSingle(tr.trainee_id)}
                                disabled={issuing}
                              >
                                <i className="bi bi-award me-1"></i>{t('certificate.issue.btnIssue', 'ইস্যু')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* No eligible */}
              {eligibleTrainees.length === 0 && trainees.length > 0 && (
                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  {t('certificate.issue.noEligible', 'এই ব্যাচের কোনো প্রশিক্ষণার্থী বর্তমানে সার্টিফিকেটের জন্য যোগ্য নয়।')}
                  {t('certificate.issue.needFinalCompetent', 'সকলকে চূড়ান্ত মূল্যায়নে দক্ষ হতে হবে।')}
                </div>
              )}

              {/* Ineligible - has cert */}
              {ineligibleHasCert.length > 0 && (
                <div className="card shadow-sm mb-3 border-warning">
                  <div className="card-header bg-warning text-dark">
                    <h6 className="mb-0">
                      <i className="bi bi-check2-all me-2"></i>
                      {t('certificate.issue.alreadyCertified', 'ইতিমধ্যে সার্টিফিকেট প্রাপ্ত ({count})', { count: ineligibleHasCert.length })}
                    </h6>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm mb-0">
                      <tbody>
                        {ineligibleHasCert.map((tr) => (
                          <tr key={tr.trainee_id}>
                            <td>{tr.trainee_name}</td>
                            <td>{tr.trainee_reg_no}</td>
                            <td className="text-success">
                              <i className="bi bi-patch-check-fill me-1"></i>{t('certificate.issue.badgeIssued', 'ইস্যুকৃত')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Ineligible - no final */}
              {ineligibleNoFinal.length > 0 && (
                <div className="card shadow-sm mb-3 border-danger">
                  <div className="card-header bg-danger text-white">
                    <h6 className="mb-0">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {t('certificate.issue.notPassedFinal', 'চূড়ান্ত মূল্যায়নে উত্তীর্ণ হননি ({count})', { count: ineligibleNoFinal.length })}
                    </h6>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm mb-0">
                      <tbody>
                        {ineligibleNoFinal.map((tr) => (
                          <tr key={tr.trainee_id}>
                            <td>{tr.trainee_name}</td>
                            <td>{tr.trainee_reg_no}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {trainees.length === 0 && !loading && (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                  {t('certificate.issue.empty', 'কোনো প্রশিক্ষণার্থী পাওয়া যায়নি')}
                </div>
              )}
            </>
          )}
        </>
      )}

      {!selectedBatch && (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-arrow-up fs-2 d-block mb-2"></i>
          {t('certificate.issue.selectBatchPrompt', 'উপরে একটি ব্যাচ নির্বাচন করুন')}
        </div>
      )}
    </div>
  );
}
