import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import assessmentService from '../../services/assessmentService';
import AssessmentForm from '../../components/assessments/AssessmentForm';
import ReassessmentRequest from '../../components/assessments/ReassessmentRequest';
import { useTranslation } from '../../hooks/useTranslation';
import './AssessorAssessment.css';

const ASSESSMENT_TYPES = [
  { value: 'pre_evaluation', label: 'পূর্ব-মূল্যায়ন' },
  { value: 'written', label: 'লিখিত' },
  { value: 'viva', label: 'মৌখিক' },
  { value: 'practical', label: 'ব্যবহারিক' },
  { value: 'final', label: 'চূড়ান্ত' },
];

export default function AssessorAssessment() {
  const { id: batchId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [batch, setBatch] = useState(null);
  const [eligibleData, setEligibleData] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  const [assessmentType, setAssessmentType] = useState('pre_evaluation');
  const [assessmentDate, setAssessmentDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [formData, setFormData] = useState({});
  const [reassessmentTrainee, setReassessmentTrainee] = useState(null);
  const [reassessmentType, setReassessmentType] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [eligibleRes, batchRes, resultsRes] = await Promise.all([
        assessmentService.getBatchEligible(batchId),
        assessmentService.getBatchDetail(batchId),
        assessmentService.getBatchResults(batchId),
      ]);
      setEligibleData(eligibleRes.data);
      setBatch(batchRes.data);
      setResults(resultsRes.data);
    } catch (err) {
      toast.error(t('assessment.conduct.loadFailed', 'ডাটা লোড করতে ব্যর্থ'));
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const trainees = eligibleData?.trainees || [];
  const eligibleCount = eligibleData?.eligible_count || 0;
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const initial = {};
    trainees.forEach((t) => {
      const existing = results?.by_type?.[assessmentType]?.assessments?.find(
        (a) => a.trainee_id === t.trainee_id,
      );
      initial[t.trainee_id] = {
        competency_status: existing?.competency_status || '',
        marks_obtained: existing?.marks_obtained ?? '',
        total_marks: existing?.total_marks ?? 100,
        remarks: existing?.remarks || '',
        assessment_id: existing?.id || null,
      };
    });
    setFormData(initial);
  }, [trainees, assessmentType, results]);

  const handleFieldChange = (traineeId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [traineeId]: { ...prev[traineeId], [field]: value },
    }));
  };

  const handleSaveSingle = async (payload) => {
    setSaving(true);
    try {
      await assessmentService.conductAssessment({
        batch: parseInt(batchId),
        assessment_type: assessmentType,
        assessment_date: assessmentDate,
        entries: payload,
      });
      toast.success(t('assessment.conduct.saveSuccess', 'মূল্যায়ন সফলভাবে সংরক্ষিত হয়েছে'));
      await fetchData();
    } catch (err) {
      const msg = err.response?.data?.error?.[0]
        || err.response?.data?.error
        || t('assessment.conduct.saveFailed', 'সংরক্ষণ করতে ব্যর্থ');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const entries = Object.entries(formData)
      .filter(([_, data]) => data.competency_status)
      .map(([traineeId, data]) => ({
        trainee: parseInt(traineeId),
        competency_status: data.competency_status,
        marks_obtained: parseFloat(data.marks_obtained) || 0,
        total_marks: parseFloat(data.total_marks) || 100,
        remarks: data.remarks || '',
      }));

    if (entries.length === 0) {
      toast.warning('কমপক্ষে একজন প্রশিক্ষণার্থীর দক্ষতার অবস্থা নির্বাচন করুন');
      return;
    }

    setSavingAll(true);
    try {
      await assessmentService.conductAssessment({
        batch: parseInt(batchId),
        assessment_type: assessmentType,
        assessment_date: assessmentDate,
        entries,
      });
      toast.success(t('assessment.conduct.saveSuccess', `${entries.length} জনের মূল্যায়ন সংরক্ষিত হয়েছে`));
      await fetchData();
    } catch (err) {
      const msg = err.response?.data?.error?.[0]
        || err.response?.data?.error
        || t('assessment.conduct.saveFailed', 'সংরক্ষণ করতে ব্যর্থ');
      toast.error(msg);
    } finally {
      setSavingAll(false);
    }
  };

  const handleReassessmentClick = (trainee) => {
    setReassessmentTrainee(trainee);
    setReassessmentType(assessmentType);
  };

  const handleReassessmentClose = (submitted) => {
    setReassessmentTrainee(null);
    if (submitted) {
      fetchData();
    }
  };

  const ongoingEvaluations = Object.values(formData).filter(
    (d) => d.competency_status,
  ).length;

  const competentCount = Object.values(formData).filter(
    (d) => d.competency_status === 'competent',
  ).length;

  const notCompetentCount = Object.values(formData).filter(
    (d) => d.competency_status === 'not_competent',
  ).length;

  const absenteeCount = Object.values(formData).filter(
    (d) => d.competency_status === 'absent',
  ).length;

  const totalEvaluated = ongoingEvaluations;
  const progressPct = trainees.length > 0
    ? Math.round((totalEvaluated / trainees.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">{t('assessment.conduct.loading', 'লোড হচ্ছে...')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="assessor-assessment">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button
            className="btn btn-outline-secondary btn-sm me-2"
            onClick={() => navigate(-1)}
          >
            <i className="bi bi-arrow-left me-1"></i>{t('site.back', 'পেছনে')}
          </button>
          <h4 className="d-inline-block mb-0 align-middle">
            <i className="bi bi-clipboard-data me-2"></i>
            {t('assessment.conduct.title', 'মূল্যায়ন পরিচালনা')}
          </h4>
        </div>
      </div>

      {/* Batch Info Card */}
      {batch && (
        <div className="card shadow-sm mb-4 border-0 bg-light">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <small className="text-muted d-block">{t('assessment.conduct.batch', 'ব্যাচ')}</small>
                <strong>{batch.batch_name_bn || batch.batch_no}</strong>
              </div>
              <div className="col-md-3">
                <small className="text-muted d-block">{t('assessment.conduct.course', 'কোর্স')}</small>
                <strong>{batch.course_name || batch.course?.name_bn || '—'}</strong>
              </div>
              <div className="col-md-3">
                <small className="text-muted d-block">{t('assessment.conduct.startDate', 'শুরুর তারিখ')}</small>
                <strong>{batch.start_date || '—'}</strong>
              </div>
              <div className="col-md-3">
                <small className="text-muted d-block">{t('assessment.conduct.eligibleCount', 'যোগ্য প্রশিক্ষণার্থী')}</small>
                <strong className="text-success">{eligibleCount} জন</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Controls */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label fw-bold">{t('assessment.conduct.assessmentType', 'মূল্যায়নের ধরণ')}</label>
              <select
                className="form-select"
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value)}
              >
                {ASSESSMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-bold">{t('assessment.conduct.assessmentDate', 'মূল্যায়নের তারিখ')}</label>
              <input
                type="date"
                className="form-control"
                value={assessmentDate}
                max={todayStr}
                onChange={(e) => setAssessmentDate(e.target.value)}
              />
            </div>
            <div className="col-md-5 d-flex gap-2 justify-content-md-end">
              <button
                className="btn btn-success"
                onClick={handleSaveAll}
                disabled={savingAll || totalEvaluated === 0}
              >
                {savingAll ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1"></span>
                    {t('assessment.conduct.saving', 'সংরক্ষণ হচ্ছে...')}
                  </>
                ) : (
                  <>
                    <i className="bi bi-save2 me-1"></i>
                    {t('assessment.conduct.saveAll', 'সব সংরক্ষণ')} ({totalEvaluated})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress & Summary */}
      <div className="row g-3 mb-4">
        <div className="col-md-8">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <span className="fw-bold">মূল্যায়নের অগ্রগতি</span>
                <span className="text-muted">
                  {totalEvaluated} / {trainees.length} জন ({progressPct}%)
                </span>
              </div>
              <div className="progress" style={{ height: 20 }}>
                <div
                  className="progress-bar bg-success"
                  style={{ width: `${progressPct}%` }}
                >
                  {progressPct > 10 ? `${progressPct}%` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex align-items-center justify-content-around text-center">
              <div>
                <h5 className="text-success mb-0">{competentCount}</h5>
                <small className="text-muted">দক্ষ</small>
              </div>
              <div className="vr"></div>
              <div>
                <h5 className="text-danger mb-0">{notCompetentCount}</h5>
                <small className="text-muted">অদক্ষ</small>
              </div>
              <div className="vr"></div>
              <div>
                <h5 className="text-secondary mb-0">{absenteeCount}</h5>
                <small className="text-muted">অনুপস্থিত</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Eligibility Info */}
      {assessmentType === 'final' && competentCount > 0 && (
        <div className="alert alert-success d-flex align-items-center gap-2 mb-3">
          <i className="bi bi-award-fill fs-4"></i>
          <div>
            <strong>{competentCount} জন</strong> প্রশিক্ষণার্থী চূড়ান্ত মূল্যায়নে দক্ষ
            হয়েছেন। তারা সার্টিফিকেটের জন্য যোগ্য।
          </div>
        </div>
      )}

      {/* Trainee Assessment Table */}
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <i className="bi bi-people me-2"></i>
            প্রশিক্ষণার্থী তালিকা
          </h6>
          {eligibleData && (
            <span className="badge bg-light text-dark">
              যোগ্য: {eligibleCount} জন
            </span>
          )}
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered table-hover mb-0 align-middle">
              <thead className="table-dark">
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>প্রশিক্ষণার্থী</th>
                  <th style={{ width: 90 }} className="text-center">উপস্থিতি</th>
                  <th>দক্ষতার অবস্থা</th>
                  <th>নম্বর</th>
                  <th>মন্তব্য</th>
                  <th style={{ width: 100 }} className="text-center">ক্রিয়া</th>
                </tr>
              </thead>
              <tbody>
                {trainees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      <i className="bi bi-inbox me-2"></i>
                      {t('assessment.conduct.noEligible', 'কোন যোগ্য প্রশিক্ষণার্থী নেই')}
                    </td>
                  </tr>
                ) : (
                  trainees.map((t, idx) => (
                    <AssessmentForm
                      key={t.trainee_id}
                      trainee={t}
                      assessmentType={assessmentType}
                      formData={formData}
                      index={idx}
                      onFieldChange={handleFieldChange}
                      onSave={handleSaveSingle}
                      saving={saving}
                      showReassessmentBtn={true}
                      onReassessmentClick={handleReassessmentClick}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {trainees.length > 0 && (
          <div className="card-footer text-muted small">
            <i className="bi bi-info-circle me-1"></i>
            হলুদ সারি = ৮০% এর নিচে উপস্থিতি (মূল্যায়ন অযোগ্য)
          </div>
        )}
      </div>

      {/* Ineligible warning */}
      {trainees.length < (eligibleData?.trainees?.length || 0) && (
        <div className="alert alert-warning mt-3">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {(eligibleData?.trainees?.length || 0) - trainees.length} জন
          প্রশিক্ষণার্থীর উপস্থিতির হার ৮০% এর নিচে, তাই তারা এই তালিকায়
          দেখানো হচ্ছে না।
        </div>
      )}

      {/* Reassessment Modal */}
      {reassessmentTrainee && (
        <ReassessmentRequest
          trainee={reassessmentTrainee}
          assessmentType={reassessmentType}
          onClose={handleReassessmentClose}
        />
      )}
    </div>
  );
}
