import React from 'react';

const COMPETENCY_STATUSES = [
  { value: 'competent', label: 'দক্ষ', color: 'success' },
  { value: 'not_competent', label: 'অদক্ষ', color: 'danger' },
  { value: 'absent', label: 'অনুপস্থিত', color: 'secondary' },
];

export default function AssessmentForm({
  trainee,
  assessmentType,
  formData,
  index,
  onFieldChange,
  onSave,
  saving,
  showReassessmentBtn,
  onReassessmentClick,
}) {
  const data = formData[trainee.trainee_id] || {};

  const handleChange = (field, value) => {
    onFieldChange(trainee.trainee_id, field, value);
  };

  const handleSave = () => {
    const payload = [
      {
        trainee: trainee.trainee_id,
        competency_status: data.competency_status || 'absent',
        marks_obtained: data.marks_obtained || 0,
        total_marks: data.total_marks || 100,
        remarks: data.remarks || '',
      },
    ];
    onSave(payload);
  };

  const isNotCompetent = data.competency_status === 'not_competent';
  const marksDisabled = data.competency_status === 'absent';

  return (
    <tr>
      <td className="text-center">{index + 1}</td>
      <td>
        <div className="d-flex align-items-center gap-2">
          <div
            className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-bold"
            style={{ width: 36, height: 36, fontSize: 14, flexShrink: 0 }}
          >
            {trainee.trainee_name?.charAt(0) || '?'}
          </div>
          <div>
            <strong className="d-block">{trainee.trainee_name}</strong>
            <small className="text-muted">{trainee.trainee_reg_no}</small>
          </div>
        </div>
      </td>
      <td className="text-center align-middle">
        <span className="badge fs-6 bg-info">
          {trainee.attendance_percentage}%
        </span>
      </td>
      <td className="align-middle" style={{ minWidth: 160 }}>
        <select
          className="form-select form-select-sm"
          value={data.competency_status || ''}
          onChange={(e) => handleChange('competency_status', e.target.value)}
        >
          <option value="">-- নির্বাচন করুন --</option>
          {COMPETENCY_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </td>
      <td className="align-middle" style={{ minWidth: 120 }}>
        <div className="input-group input-group-sm">
          <input
            type="number"
            className="form-control"
            placeholder="প্রাপ্ত"
            value={data.marks_obtained ?? ''}
            disabled={marksDisabled}
            onChange={(e) => handleChange('marks_obtained', e.target.value)}
            min={0}
          />
          <span className="input-group-text">/</span>
          <input
            type="number"
            className="form-control"
            placeholder="পূর্ণ"
            value={data.total_marks ?? ''}
            disabled={marksDisabled}
            onChange={(e) => handleChange('total_marks', e.target.value)}
            min={1}
          />
        </div>
      </td>
      <td className="align-middle" style={{ minWidth: 140 }}>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="মন্তব্য..."
          value={data.remarks || ''}
          onChange={(e) => handleChange('remarks', e.target.value)}
        />
      </td>
      <td className="align-middle text-center" style={{ minWidth: 100 }}>
        <div className="d-flex gap-1 justify-content-center">
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={handleSave}
            disabled={saving || !data.competency_status}
            title="সংরক্ষণ"
          >
            {saving ? (
              <span className="spinner-border spinner-border-sm"></span>
            ) : (
              <i className="bi bi-check-lg"></i>
            )}
          </button>
          {isNotCompetent && showReassessmentBtn && data.assessment_id && (
            <button
              className="btn btn-sm btn-outline-warning"
              onClick={() =>
                onReassessmentClick({
                  ...trainee,
                  assessment_id: data.assessment_id,
                })
              }
              title="পুনর্মূল্যায়নের অনুরোধ"
            >
              <i className="bi bi-arrow-repeat"></i>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
