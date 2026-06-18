import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import publicService from '../../services/publicService';
import circularService from '../../services/circularService';
import ApplySuccess from './ApplySuccess';
import './RegistrationForm.css';
import BanglaInput from '../../components/common/BanglaInput';

const CRITERIA_INPUT_TYPES = {
  age: 'date',
  education: 'select',
  experience_years: 'number',
  height_cm: 'number',
  weight_kg: 'number',
  boolean: 'select',
  text_match: 'text',
  number: 'number',
};

const STEPS = ['এনআইডি ও বয়স যাচাই', 'ফর্ম পূরণ', 'যাচাই ও জমা'];

function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function RegistrationForm() {
  const { public_url } = useParams();
  const [step, setStep] = useState(0);
  const [circular, setCircular] = useState(null);
  const [loadingCircular, setLoadingCircular] = useState(true);
  const [form, setForm] = useState({
    name_bn: '',
    name_en: '',
    father_name_bn: '',
    mother_name_bn: '',
    date_of_birth: '',
    nid: '',
    phone: '',
    email: '',
    gender_id: '',
    present_division_id: '',
    present_district_id: '',
    present_address: '',
    permanent_division_id: '',
    permanent_district_id: '',
    permanent_address: '',
    education_level_id: '',
    education_qualification: '',
    chosen_center_id: '',
    profile_image: null,
  });
  const [checklistValues, setChecklistValues] = useState({});
  const [photoPreview, setPhotoPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [nidChecking, setNidChecking] = useState(false);
  const [nidExists, setNidExists] = useState(false);
  const [ageCheckPassed, setAgeCheckPassed] = useState(false);
  const [genders, setGenders] = useState([]);
  const [educations, setEducations] = useState([]);
  const [demographies, setDemographies] = useState([]);
  const [sameAsPresent, setSameAsPresent] = useState(false);

  const divisions = useMemo(() => demographies.filter(d => d.type === 'division'), [demographies]);

  const presentDistricts = useMemo(() =>
    form.present_division_id
      ? demographies.filter(d => d.type === 'district' && d.parent === Number(form.present_division_id))
      : [],
    [demographies, form.present_division_id]
  );

  const permanentDistricts = useMemo(() =>
    form.permanent_division_id
      ? demographies.filter(d => d.type === 'district' && d.parent === Number(form.permanent_division_id))
      : [],
    [demographies, form.permanent_division_id]
  );

  const handleSameAsPresent = (checked) => {
    setSameAsPresent(checked);
    if (checked) {
      setForm(prev => ({
        ...prev,
        permanent_division_id: prev.present_division_id,
        permanent_district_id: prev.present_district_id,
        permanent_address: prev.present_address,
      }));
    } else {
      setForm(prev => ({
        ...prev,
        permanent_division_id: '',
        permanent_district_id: '',
        permanent_address: '',
      }));
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  useEffect(() => {
    if (public_url) {
      circularService.getByUrl(public_url)
        .then(res => setCircular(res.data))
        .catch(() => {})
        .finally(() => setLoadingCircular(false));
    }
  }, [public_url]);

  useEffect(() => {
    publicService.getGenders().then(res => setGenders(res.data)).catch(() => {});
    publicService.getEducations().then(res => setEducations(res.data)).catch(() => {});
    publicService.getDemographies().then(res => setDemographies(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!circular?.checklist_items) return;
    const updates = {};
    circular.checklist_items.forEach(item => {
      if (item.criteria_type === 'education' && form.education_level_id) {
        updates[item.id] = form.education_level_id;
      }
      if (item.criteria_type === 'age' && form.date_of_birth) {
        updates[item.id] = form.date_of_birth;
      }
    });
    if (Object.keys(updates).length) {
      setChecklistValues(prev => ({ ...prev, ...updates }));
    }
  }, [form.education_level_id, form.date_of_birth, circular]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'profile_image' && files[0]) {
      setForm((prev) => ({ ...prev, profile_image: files[0] }));
      setPhotoPreview(URL.createObjectURL(files[0]));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleChecklistChange = (itemId, value) => {
    setChecklistValues(prev => ({ ...prev, [itemId]: value }));
  };

  const handleNidBlur = async () => {
    if (form.nid.length >= 10) {
      setNidChecking(true);
      try {
        const { data } = await publicService.checkNid(form.nid);
        setNidExists(data.exists);
        if (data.exists) {
          setErrors((prev) => ({ ...prev, nid: 'এই এনআইডি দিয়ে ইতিমধ্যে আবেদন করা হয়েছে' }));
        } else {
          setErrors((prev) => { const e = { ...prev }; delete e.nid; return e; });
        }
      } catch {
        // silent
      } finally {
        setNidChecking(false);
      }
    }
  };

  const validateStep0 = () => {
    const errs = {};
    if (!form.nid.trim()) errs.nid = 'এনআইডি নম্বর দিন';
    else if (nidExists) errs.nid = 'এই এনআইডি দিয়ে ইতিমধ্যে আবেদন করা হয়েছে';
    if (!form.date_of_birth) errs.date_of_birth = 'জন্ম তারিখ নির্বাচন করুন';
    else {
      const age = calculateAge(form.date_of_birth);
      if (age === null || age < 21) errs.date_of_birth = `বয়স ${age ?? 0} বছর। ন্যূনতম ২১ বছর হতে হবে।`;
      else if (age > 100) errs.date_of_birth = 'বয়স ১০০-এর বেশি হতে পারে না';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goToStep1 = () => {
    if (validateStep0()) setStep(1);
  };

  const validateStep1 = () => {
    const errs = {};
    if (!form.name_bn.trim()) errs.name_bn = 'নাম বাংলায় লিখুন';
    if (!form.father_name_bn.trim()) errs.father_name_bn = 'পিতার নাম লিখুন';
    if (!form.mother_name_bn.trim()) errs.mother_name_bn = 'মাতার নাম লিখুন';
    if (!form.phone.trim()) errs.phone = 'মোবাইল নম্বর দিন';
    else if (!/^01\d{9}$/.test(form.phone)) errs.phone = '১১ ডিজিটের বৈধ নম্বর দিন (01XXXXXXXXX)';
    if (!form.gender_id) errs.gender_id = 'লিঙ্গ নির্বাচন করুন';
    if (!form.present_address.trim()) errs.present_address = 'বর্তমান ঠিকানা লিখুন';
    if (!form.education_level_id) errs.education_level_id = 'শিক্ষাগত যোগ্যতা নির্বাচন করুন';
    if (!form.chosen_center_id) errs.chosen_center_id = 'কেন্দ্র নির্বাচন করুন';

    if (circular?.checklist_items) {
      circular.checklist_items.forEach(item => {
        if (item.required && !checklistValues[item.id]?.toString().trim()) {
          errs[`checklist_${item.id}`] = 'এই ক্ষেত্রটি পূরণ করুন';
        }
      });
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goToStep2 = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('circular_url', public_url);
      formData.append('chosen_center_id', form.chosen_center_id);

      if (circular?.checklist_items?.length > 0) {
        const responses = circular.checklist_items.map(item => ({
          checklist_item_id: item.id,
          value: checklistValues[item.id]?.toString() || '',
        }));
        formData.append('checklist_responses', JSON.stringify(responses));
      }

      Object.entries(form).forEach(([key, val]) => {
        if (val !== null && val !== undefined && key !== 'chosen_center_id') {
          formData.append(key, val);
        }
      });
      const { data } = await publicService.submitApplication(formData);
      setSubmitted(data);
    } catch (err) {
      const serverErrors = err.response?.data || {};
      const fieldErrors = {};
      Object.entries(serverErrors).forEach(([key, msgs]) => {
        if (Array.isArray(msgs)) fieldErrors[key] = msgs[0];
        else fieldErrors[key] = msgs;
      });
      setErrors(fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return <ApplySuccess data={submitted} />;
  }

  const renderField = (name, label, opts = {}) => {
    const { type = 'text', placeholder = '', required = true, col = 'col-12', options, readOnly, bangla } = opts;
    const hasError = errors[name];
    return (
      <div className={col}>
        <label className="form-label">
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </label>
        {type === 'textarea' ? (
          bangla ? (
            <BanglaInput as="textarea" className={`form-control ${hasError ? 'is-invalid' : ''}`} name={name} value={form[name]} onChange={handleChange} rows={3} placeholder={placeholder} />
          ) : (
            <textarea className={`form-control ${hasError ? 'is-invalid' : ''}`} name={name} value={form[name]} onChange={handleChange} rows={3} placeholder={placeholder} />
          )
        ) : type === 'select' ? (
          <select
            className={`form-select ${hasError ? 'is-invalid' : ''}`}
            name={name}
            value={form[name]}
            onChange={handleChange}
          >
            <option value="">-- নির্বাচন করুন --</option>
            {(options || []).map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : type === 'file' ? (
          <div>
            {photoPreview ? (
              <div className="d-flex align-items-center gap-2">
                <img src={photoPreview} alt="Profile" className="rounded" style={{ width: 80, height: 80, objectFit: 'cover' }} />
                <button className="btn btn-sm btn-outline-danger" onClick={() => { setForm(p => ({ ...p, profile_image: null })); setPhotoPreview(null); }}>
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            ) : (
              <input className={`form-control ${hasError ? 'is-invalid' : ''}`} type="file" accept="image/*" name="profile_image" onChange={handleChange} />
            )}
          </div>
        ) : (
          bangla ? (
            <BanglaInput as="input" type={type} className={`form-control ${hasError ? 'is-invalid' : ''}`} name={name} value={form[name]} onChange={handleChange} placeholder={placeholder} readOnly={readOnly} />
          ) : (
            <input type={type} className={`form-control ${hasError ? 'is-invalid' : ''}`} name={name} value={form[name]} onChange={handleChange} onBlur={name === 'nid' ? handleNidBlur : undefined} placeholder={placeholder} readOnly={readOnly} />
          )
        )}
        {hasError && <div className="invalid-feedback">{typeof hasError === 'string' ? hasError : 'এই ক্ষেত্রটি প্রয়োজনীয়'}</div>}
        {name === 'nid' && nidChecking && (
          <small className="text-info"><i className="bi bi-arrow-repeat me-1"></i>যাচাই করা হচ্ছে...</small>
        )}
      </div>
    );
  };

  const renderChecklistField = (item) => {
    const inputType = CRITERIA_INPUT_TYPES[item.criteria_type] || 'text';
    const fieldName = `checklist_${item.id}`;
    const hasError = errors[fieldName];

    if (inputType === 'select') {
      let options = [];
      if (item.criteria_type === 'boolean') {
        options = [{ value: 'true', label: 'হ্যাঁ' }, { value: 'false', label: 'না' }];
      } else if (item.criteria_type === 'education') {
        options = educations.map(e => ({ value: e.id, label: e.name_bn }));
      }
      return (
        <div className="col-md-6" key={item.id}>
          <label className="form-label">{item.label_bn}</label>
          <select
            className={`form-select ${hasError ? 'is-invalid' : ''}`}
            value={checklistValues[item.id] || ''}
            onChange={e => handleChecklistChange(item.id, e.target.value)}
          >
            <option value="">-- নির্বাচন করুন --</option>
            {options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {item.score && <small className="text-muted">স্কোর: {item.score}</small>}
          {hasError && <div className="invalid-feedback">এই ক্ষেত্রটি প্রয়োজনীয়</div>}
        </div>
      );
    }

    return (
      <div className="col-md-6" key={item.id}>
        <label className="form-label">{item.label_bn}</label>
        <input
          type={inputType}
          className={`form-control ${hasError ? 'is-invalid' : ''}`}
          value={checklistValues[item.id] || ''}
          onChange={e => handleChecklistChange(item.id, e.target.value)}
          placeholder={item.criteria_type === 'age' ? 'জন্ম তারিখ নির্বাচন করুন' : ''}
        />
        {item.score && <small className="text-muted">স্কোর: {item.score}</small>}
        {hasError && <div className="invalid-feedback">এই ক্ষেত্রটি প্রয়োজনীয়</div>}
      </div>
    );
  };

  const renderNidAgeStep = () => (
    <div>
      <div className="alert alert-primary d-flex align-items-center gap-3 py-3 px-4 rounded-3 border-start border-4 border-primary">
        <i className="bi bi-shield-check fs-3 text-primary"></i>
        <div>
          <strong>এনআইডি ও বয়স যাচাই</strong>
          <p className="mb-0 mt-1 small text-muted">প্রথমে আপনার এনআইডি ও জন্ম তারিখ দিন। বয়স কমপক্ষে ২১ বছর হতে হবে।</p>
        </div>
      </div>
      <div className="row g-3 mt-2">
        <div className="col-md-6">
          <div className="form-floating">
            <input type="text" className={`form-control ${errors.nid ? 'is-invalid' : ''}`}
              id="nid" name="nid" value={form.nid} onChange={handleChange}
              onBlur={handleNidBlur} placeholder="এনআইডি নম্বর" />
            <label htmlFor="nid">এনআইডি নম্বর <span className="text-danger">*</span></label>
            {errors.nid && <div className="invalid-feedback">{errors.nid}</div>}
            {nidChecking && <small className="text-info mt-1 d-block"><i className="bi bi-arrow-repeat me-1"></i>যাচাই করা হচ্ছে...</small>}
          </div>
        </div>
        <div className="col-md-6">
          <div className="form-floating">
            <input type="date" className={`form-control ${errors.date_of_birth ? 'is-invalid' : ''}`}
              id="date_of_birth" name="date_of_birth" value={form.date_of_birth} onChange={handleChange}
              placeholder="জন্ম তারিখ" />
            <label htmlFor="date_of_birth">জন্ম তারিখ <span className="text-danger">*</span></label>
            {errors.date_of_birth && <div className="invalid-feedback">{errors.date_of_birth}</div>}
          </div>
        </div>
        {form.date_of_birth && (
          <div className="col-12">
            <div className={`p-3 rounded-3 d-flex align-items-center gap-2 ${calculateAge(form.date_of_birth) >= 21 ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
              <i className={`bi ${calculateAge(form.date_of_birth) >= 21 ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} fs-5`}></i>
              <span><strong>বয়স: {calculateAge(form.date_of_birth)} বছর</strong></span>
              {calculateAge(form.date_of_birth) >= 21
                ? <span className="badge bg-success ms-2">যোগ্য</span>
                : <span className="badge bg-danger ms-2">অযোগ্য (ন্যূনতম ২১ বছর)</span>}
            </div>
          </div>
        )}
      </div>
      <div className="d-flex justify-content-between mt-4 pt-3 border-top">
        <button className="btn btn-outline-secondary px-4" onClick={() => window.history.back()}>
          <i className="bi bi-arrow-left me-1"></i>পেছনে
        </button>
        <button className="btn btn-primary px-4" onClick={goToStep1}>
          পরবর্তী<i className="bi bi-arrow-right ms-1"></i>
        </button>
      </div>
    </div>
  );

  const renderFormStep = () => {
    if (loadingCircular) {
      return (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}></div>
          <p className="mt-3 text-muted">সার্কুলার লোড হচ্ছে...</p>
        </div>
      );
    }

    const centers = circular?.eligible_centers || [];

    const SectionCard = ({ icon, title, children }) => (
      <div className="form-section-card mb-4">
        <div className="form-section-header">
          <i className={`bi ${icon} me-2`}></i>
          <span>{title}</span>
        </div>
        <div className="form-section-body">
          <div className="row g-3">{children}</div>
        </div>
      </div>
    );

    return (
      <div>
        <div className="verified-badge mb-4">
          <i className="bi bi-check2-circle text-success me-2"></i>
          <span className="fw-medium">এনআইডি: {form.nid}</span>
          <span className="mx-2 text-muted">|</span>
          <span className="fw-medium">জন্ম তারিখ: {form.date_of_birth}</span>
        </div>

        <SectionCard icon="bi-megaphone" title="সার্কুলার ও কেন্দ্র নির্বাচন">
          <div className="col-md-6">
            <label className="form-label fw-medium">সার্কুলার</label>
            <input className="form-control bg-light" value={circular?.title_bn || '—'} readOnly />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-medium">আবেদনের কেন্দ্র <span className="text-danger">*</span></label>
            <select className={`form-select ${errors.chosen_center_id ? 'is-invalid' : ''}`}
              name="chosen_center_id" value={form.chosen_center_id} onChange={handleChange}>
              <option value="">-- কেন্দ্র নির্বাচন করুন --</option>
              {centers.map(c => (
                <option key={c.id} value={c.id}>{c.name_bn} ({c.code})</option>
              ))}
            </select>
            {errors.chosen_center_id && <div className="invalid-feedback">{errors.chosen_center_id}</div>}
          </div>
        </SectionCard>

        {circular?.checklist_items?.filter(i => i.criteria_type !== 'education' && i.criteria_type !== 'age').length > 0 && (
          <SectionCard icon="bi-clipboard-check" title="প্রাথমিক যাচাইকরণ (চেকলিস্ট)">
            {circular.checklist_items
              .filter(i => i.criteria_type !== 'education' && i.criteria_type !== 'age')
              .sort((a, b) => a.order - b.order)
              .map(item => renderChecklistField(item))}
          </SectionCard>
        )}

        <SectionCard icon="bi-person-badge" title="ব্যক্তিগত তথ্য">
          {renderField('name_bn', 'নাম (বাংলায়)', { col: 'col-md-6', bangla: true })}
          {renderField('name_en', 'নাম (ইংরেজিতে)', { required: false, col: 'col-md-6' })}
          {renderField('father_name_bn', 'পিতার নাম', { col: 'col-md-6', bangla: true })}
          {renderField('mother_name_bn', 'মাতার নাম', { col: 'col-md-6', bangla: true })}
          {renderField('phone', 'মোবাইল নম্বর', { col: 'col-md-4', placeholder: '01XXXXXXXXX' })}
          {renderField('email', 'ইমেইল', { type: 'email', required: false, col: 'col-md-4' })}
          <div className="col-md-4">
            <label className="form-label fw-medium">লিঙ্গ <span className="text-danger">*</span></label>
            <select className={`form-select ${errors.gender_id ? 'is-invalid' : ''}`}
              name="gender_id" value={form.gender_id} onChange={handleChange}>
              <option value="">-- নির্বাচন করুন --</option>
              {genders.map(g => <option key={g.id} value={g.id}>{g.name_bn}</option>)}
            </select>
            {errors.gender_id && <div className="invalid-feedback">{errors.gender_id}</div>}
          </div>
        </SectionCard>

        <SectionCard icon="bi-house-door" title="বর্তমান ঠিকানা">
          <div className="col-md-6">
            <label className="form-label fw-medium">বিভাগ</label>
            <select className="form-select" name="present_division_id" value={form.present_division_id}
              onChange={e => { handleChange(e); setForm(p => ({ ...p, present_district_id: '' })); }}>
              <option value="">-- নির্বাচন করুন --</option>
              {divisions.map(d => <option key={d.id} value={d.id}>{d.name_bn}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label fw-medium">জেলা</label>
            <select className="form-select" name="present_district_id" value={form.present_district_id}
              onChange={handleChange} disabled={!form.present_division_id}>
              <option value="">-- নির্বাচন করুন --</option>
              {presentDistricts.map(d => <option key={d.id} value={d.id}>{d.name_bn}</option>)}
            </select>
          </div>
          <div className="col-12">
            <label className="form-label fw-medium">বিস্তারিত ঠিকানা <span className="text-danger">*</span></label>
            <BanglaInput as="textarea" className={`form-control ${errors.present_address ? 'is-invalid' : ''}`}
              name="present_address" value={form.present_address} onChange={handleChange}
              rows={2} placeholder="গ্রাম/রাস্তা, বাড়ি নম্বর, পোস্ট অফিস ইত্যাদি"></BanglaInput>
            {errors.present_address && <div className="invalid-feedback">{errors.present_address}</div>}
          </div>
        </SectionCard>

        <div className="form-section-card mb-4 border-primary">
          <div className="form-section-body pb-2">
            <div className="form-check form-switch d-flex align-items-center gap-2 ps-0">
              <input className="form-check-input m-0" type="checkbox" role="switch"
                id="sameAsPresent" checked={sameAsPresent}
                onChange={e => handleSameAsPresent(e.target.checked)}
                style={{ width: '2.5rem', height: '1.25rem', cursor: 'pointer' }} />
              <label className="form-check-label fw-medium user-select-none" htmlFor="sameAsPresent" style={{ cursor: 'pointer' }}>
                <i className="bi bi-arrow-down-up text-primary me-1"></i>
                স্থায়ী ঠিকানা বর্তমান ঠিকানার মতোই
              </label>
            </div>
          </div>
        </div>

        <SectionCard icon="bi-house-gear" title="স্থায়ী ঠিকানা">
          <div className="col-md-6">
            <label className="form-label fw-medium">বিভাগ</label>
            <select className="form-select" name="permanent_division_id" value={form.permanent_division_id}
              onChange={e => { handleChange(e); setForm(p => ({ ...p, permanent_district_id: '' })); }}
              disabled={sameAsPresent}>
              <option value="">-- নির্বাচন করুন --</option>
              {divisions.map(d => <option key={d.id} value={d.id}>{d.name_bn}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label fw-medium">জেলা</label>
            <select className="form-select" name="permanent_district_id" value={form.permanent_district_id}
              onChange={handleChange} disabled={sameAsPresent || !form.permanent_division_id}>
              <option value="">-- নির্বাচন করুন --</option>
              {permanentDistricts.map(d => <option key={d.id} value={d.id}>{d.name_bn}</option>)}
            </select>
          </div>
          <div className="col-12">
            <label className="form-label fw-medium">বিস্তারিত ঠিকানা</label>
            <BanglaInput as="textarea" className="form-control"
              name="permanent_address" value={form.permanent_address} onChange={handleChange}
              rows={2} disabled={sameAsPresent}
              placeholder={sameAsPresent ? 'বর্তমান ঠিকানার মতোই হবে' : 'গ্রাম/রাস্তা, বাড়ি নম্বর, পোস্ট অফিস ইত্যাদি'}></BanglaInput>
            {sameAsPresent && <small className="text-muted mt-1 d-block"><i className="bi bi-info-circle me-1"></i>বর্তমান ঠিকানার মতোই স্বয়ংক্রিয়ভাবে পূরণ হবে</small>}
          </div>
        </SectionCard>

        <SectionCard icon="bi-mortarboard" title="শিক্ষাগত যোগ্যতা">
          <div className="col-md-6">
            <label className="form-label fw-medium">শিক্ষাগত যোগ্যতা <span className="text-danger">*</span></label>
            <select className={`form-select ${errors.education_level_id ? 'is-invalid' : ''}`}
              name="education_level_id" value={form.education_level_id}
              onChange={e => {
                handleChange(e);
                const edu = educations.find(ed => ed.id === Number(e.target.value));
                setForm(p => ({ ...p, education_qualification: edu ? edu.name_bn : '' }));
              }}>
              <option value="">-- নির্বাচন করুন --</option>
              {educations.map(e => <option key={e.id} value={e.id}>{e.name_bn}</option>)}
            </select>
            {errors.education_level_id && <div className="invalid-feedback">{errors.education_level_id}</div>}
          </div>
          <div className="col-md-6">
            <label className="form-label fw-medium">প্রোফাইল ছবি</label>
            <div className={`upload-box border rounded-3 p-3 text-center ${errors.profile_image ? 'border-danger' : 'border-dashed'}`}>
              {photoPreview ? (
                <div className="d-flex align-items-center gap-3 justify-content-center">
                  <img src={photoPreview} alt="Profile" className="rounded-3"
                    style={{ width: 80, height: 80, objectFit: 'cover' }} />
                  <div className="text-start">
                    <p className="mb-1 small text-muted">ছবি আপলোড করা হয়েছে</p>
                    <button className="btn btn-sm btn-outline-danger"
                      onClick={() => { setForm(p => ({ ...p, profile_image: null })); setPhotoPreview(null); }}>
                      <i className="bi bi-trash me-1"></i>মুছে ফেলুন
                    </button>
                  </div>
                </div>
              ) : (
                <label className="mb-0 cursor-pointer d-block" style={{ cursor: 'pointer' }}>
                  <input type="file" accept="image/*" name="profile_image" onChange={handleChange}
                    className="d-none" />
                  <div className="py-2">
                    <i className="bi bi-camera fs-2 text-muted"></i>
                    <p className="mb-0 mt-2 small text-muted">ছবি নির্বাচন করুন</p>
                  </div>
                </label>
              )}
            </div>
          </div>
        </SectionCard>

        <div className="d-flex justify-content-between mt-4 pt-3 border-top">
          <button className="btn btn-outline-secondary px-4" onClick={() => setStep(0)}>
            <i className="bi bi-arrow-left me-1"></i>পেছনে
          </button>
          <button className="btn btn-primary px-4" onClick={goToStep2}>
            পরবর্তী<i className="bi bi-arrow-right ms-1"></i>
          </button>
        </div>
      </div>
    );
  };

  const renderReviewStep = () => {
    const centers = circular?.eligible_centers || [];
    const chosenCenter = centers.find(c => c.id === Number(form.chosen_center_id));

    const reviewRows = [
      ['এনআইডি', form.nid],
      ['জন্ম তারিখ', form.date_of_birth],
      ['কেন্দ্র', chosenCenter?.name_bn || form.chosen_center_id],
      ['নাম (বাংলায়)', form.name_bn],
      ['নাম (ইংরেজিতে)', form.name_en || '—'],
      ['পিতার নাম', form.father_name_bn],
      ['মাতার নাম', form.mother_name_bn],
      ['লিঙ্গ', genders.find(g => g.id === Number(form.gender_id))?.name_bn || '—'],
      ['মোবাইল', form.phone],
      ['ইমেইল', form.email || '—'],
      ['বর্তমান বিভাগ', divisions.find(d => d.id === Number(form.present_division_id))?.name_bn || '—'],
      ['বর্তমান জেলা', presentDistricts.find(d => d.id === Number(form.present_district_id))?.name_bn || '—'],
      ['বর্তমান ঠিকানা', form.present_address],
      ['স্থায়ী বিভাগ', sameAsPresent ? 'বর্তমান ঠিকানার মতোই' : (divisions.find(d => d.id === Number(form.permanent_division_id))?.name_bn || '—')],
      ['স্থায়ী জেলা', sameAsPresent ? 'বর্তমান ঠিকানার মতোই' : (permanentDistricts.find(d => d.id === Number(form.permanent_district_id))?.name_bn || '—')],
      ['স্থায়ী ঠিকানা', sameAsPresent ? 'বর্তমান ঠিকানার মতোই' : (form.permanent_address || '—')],
      ['শিক্ষাগত যোগ্যতা', form.education_qualification || educations.find(e => e.id === Number(form.education_level_id))?.name_bn || '—'],
    ];

    return (
      <div>
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 mb-4 rounded-3">
          <i className="bi bi-check-circle-fill fs-5"></i>
          <span className="small">আপনার প্রদত্ত তথ্য যাচাই করে নিশ্চিত হন, তারপর জমা দিন</span>
        </div>

        <div className="review-card border rounded-3 overflow-hidden mb-4">
          <div className="review-card-header px-4 py-3 border-bottom bg-light">
            <h5 className="mb-0 fw-semibold"><i className="bi bi-file-text me-2"></i>আপনার দেয়া তথ্য</h5>
          </div>
          <div className="table-responsive">
            <table className="table table-borderless review-table mb-0">
              <tbody>
                {reviewRows.map(([label, val]) => (
                  <tr key={label}>
                    <th className="text-nowrap px-4 py-2" style={{ width: 180, background: '#fafbfc' }}>{label}</th>
                    <td className="px-4 py-2">{val}</td>
                  </tr>
                ))}
                {circular?.checklist_items?.filter(i => i.criteria_type !== 'education' && i.criteria_type !== 'age').length > 0 && (
                  <tr>
                    <th className="text-nowrap px-4 py-2" style={{ width: 180, background: '#fafbfc' }}>চেকলিস্ট</th>
                    <td className="px-4 py-2">
                      {circular.checklist_items
                        .filter(i => i.criteria_type !== 'education' && i.criteria_type !== 'age')
                        .sort((a, b) => a.order - b.order)
                        .map(item => (
                          <div key={item.id}>
                            <strong>{item.label_bn}:</strong> {checklistValues[item.id] || '—'}
                          </div>
                        ))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {photoPreview && (
            <div className="px-4 py-3 border-top d-flex align-items-center gap-3">
              <strong>প্রোফাইল ছবি:</strong>
              <img src={photoPreview} alt="Profile" className="rounded-3 border"
                style={{ width: 80, height: 80, objectFit: 'cover' }} />
            </div>
          )}
        </div>

        {errors.form && (
          <div className="alert alert-danger d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-triangle-fill"></i>
            {errors.form}
          </div>
        )}

        <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
          <button className="btn btn-outline-secondary px-4" onClick={() => setStep(1)}>
            <i className="bi bi-pencil me-1"></i>সম্পাদনা
          </button>
          <div className="d-flex align-items-center gap-3">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              জমা দেওয়ার পর তথ্য পরিবর্তন করা যাবে না
            </small>
            <button className="btn btn-success btn-lg px-4" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1"></span>
                  জমা দেওয়া হচ্ছে...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-1"></i>
                  জমা দিন
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="registration-page">
      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h3 className="text-center mb-4">প্রশিক্ষণে আবেদন</h3>

                <div className="steps-indicator mb-4">
                  {STEPS.map((label, i) => (
                    <div
                      key={label}
                      className={`step-item ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}
                    >
                      <div className="step-circle">
                        {i < step ? <i className="bi bi-check"></i> : i + 1}
                      </div>
                      <div className="step-label">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="step-content">
                  {step === 0 && renderNidAgeStep()}
                  {step === 1 && renderFormStep()}
                  {step === 2 && renderReviewStep()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
