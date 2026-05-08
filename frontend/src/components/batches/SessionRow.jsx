import React from 'react';

export default function SessionRow({ index, plan, trainers, daysOfWeek, classTypes, onChange, onRemove }) {
  return (
    <tr>
      <td className="text-center">{index + 1}</td>
      <td>
        <input
          type="number"
          className="form-control form-control-sm"
          style={{ width: 60 }}
          value={plan.term_no}
          onChange={(e) => onChange(index, 'term_no', parseInt(e.target.value) || 1)}
          min={1}
        />
      </td>
      <td>
        <input
          type="number"
          className="form-control form-control-sm"
          style={{ width: 60 }}
          value={plan.term_day}
          onChange={(e) => onChange(index, 'term_day', parseInt(e.target.value) || 1)}
          min={1}
        />
      </td>
      <td>
        <input
          type="number"
          className="form-control form-control-sm"
          style={{ width: 60 }}
          value={plan.session_no}
          onChange={(e) => onChange(index, 'session_no', parseInt(e.target.value) || 1)}
          min={1}
        />
      </td>
      <td>
        <select
          className="form-select form-select-sm"
          value={plan.class_type}
          onChange={(e) => onChange(index, 'class_type', e.target.value)}
        >
          {classTypes.map((ct) => (
            <option key={ct.value} value={ct.value}>{ct.label}</option>
          ))}
        </select>
      </td>
      <td>
        <select
          className="form-select form-select-sm"
          value={plan.day_of_week}
          onChange={(e) => onChange(index, 'day_of_week', parseInt(e.target.value))}
        >
          {daysOfWeek.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="time"
          className="form-control form-control-sm"
          style={{ width: 90 }}
          value={plan.start_time}
          onChange={(e) => onChange(index, 'start_time', e.target.value)}
        />
      </td>
      <td>
        <input
          type="time"
          className="form-control form-control-sm"
          style={{ width: 90 }}
          value={plan.end_time}
          onChange={(e) => onChange(index, 'end_time', e.target.value)}
        />
      </td>
      <td className="text-center">
        <span className="badge bg-info">{plan.duration_hours}</span>
      </td>
      <td>
        <input
          className="form-control form-control-sm"
          style={{ width: 80 }}
          value={plan.training_room_bn}
          onChange={(e) => onChange(index, 'training_room_bn', e.target.value)}
          placeholder="কক্ষ"
        />
      </td>
      <td>
        <select
          className="form-select form-select-sm"
          value={plan.lead_trainer}
          onChange={(e) => onChange(index, 'lead_trainer', e.target.value)}
        >
          <option value="">-- নির্বাচন --</option>
          {trainers.filter((t) => String(t.id) !== String(plan.associate_trainer)).map((t) => (
            <option key={t.id} value={t.id}>
              {t.user?.full_name_bn || `প্রশিক্ষক #${t.id}`}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select
          className="form-select form-select-sm"
          value={plan.associate_trainer}
          onChange={(e) => onChange(index, 'associate_trainer', e.target.value)}
        >
          <option value="">-- নেই --</option>
          {trainers.filter((t) => String(t.id) !== String(plan.lead_trainer)).map((t) => (
            <option key={t.id} value={t.id}>
              {t.user?.full_name_bn || `প্রশিক্ষক #${t.id}`}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          className="form-control form-control-sm"
          value={plan.topic_bn}
          onChange={(e) => onChange(index, 'topic_bn', e.target.value)}
          placeholder="বিষয়"
        />
      </td>
      <td className="text-center">
        <button
          className="btn btn-sm btn-outline-danger"
          onClick={() => onRemove(index)}
          title="সরান"
        >
          <i className="bi bi-x"></i>
        </button>
      </td>
    </tr>
  );
}
