import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import publicService from '../../services/publicService';
import circularService from '../../services/circularService';
import BanglaInput from '../../components/common/BanglaInput';
import { useAuth } from '../../contexts/AuthContext';
import ApplySuccess from './ApplySuccess';
import './RegistrationForm.css';

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

function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function RegisterAndApply() {
  const [searchParams] = useSearchParams();
  const circularUrl = searchParams.get('circular');
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const [circular, setCircular] = useState(null);
  const [loadingCircular, setLoadingCircular] = useState(true);

  const [mode, setMode] = useState('register');
  const [step, setStep] = useState('register');
  const [otpModal, setOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [userId, setUserId] = useState(null);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [regForm, setRegForm] = useState({
    full_name_bn: '',
    full_name_en: '',
    phone: '',
    nid: '',
    password: '',
    confirm_password: '',
  });
  const [regErrors, setRegErrors] = useState({});
  const [regSubmitting, setRegSubmitting] = useState(false);

  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [loginErrors, setLoginErrors] = useState({});
  const [loginSubmitting, setLoginSubmitting] = useState(false);

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
    nid_front_image: null,
    nid_back_image: null,
  });
  const [checklistValues, setChecklistValues] = useState({});
  const [photoPreview, setPhotoPreview] = useState(null);
  const [nidFrontPreview, setNidFrontPreview] = useState(null);
  const [nidBackPreview, setNidBackPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [genders, setGenders] = useState([]);
  const [educations, setEducations] = useState([]);
  const [demographies, setDemographies] = useState([]);
  const [sameAsPresent, setSameAsPresent] = useState(false);
  const [applyStep, setApplyStep] = useState(1);
  const [nidVerified, setNidVerified] = useState(false);
  const [nidVerifying, setNidVerifying] = useState(false);
  const [nidVerifyError, setNidVerifyError] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');

  const MONTHS = [
    { value: '1', label: 'জানুয়ারি' }, { value: '2', label: 'ফেব্রুয়ারি' },
    { value: '3', label: 'মার্চ' }, { value: '4', label: 'এপ্রিল' },
    { value: '5', label: 'মে' }, { value: '6', label: 'জুন' },
    { value: '7', label: 'জুলাই' }, { value: '8', label: 'আগস্ট' },
    { value: '9', label: 'সেপ্টেম্বর' }, { value: '10', label: 'অক্টোবর' },
    { value: '11', label: 'নভেম্বর' }, { value: '12', label: 'ডিসেম্বর' },
  ];
  const DAYS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: String(i + 1) }));
  const YEARS = Array.from({ length: 56 }, (_, i) => ({ value: String(1970 + i), label: String(1970 + i) }));
  const APPLY_STEPS = ['এনআইডি যাচাই', 'ঠিকানা', 'শিক্ষাগত যোগ্যতা ও ফর্ম', 'যাচাই ও জমা'];

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

  useEffect(() => {
    publicService.getGenders().then(res => setGenders(res.data)).catch(() => {});
    publicService.getEducations().then(res => setEducations(res.data)).catch(() => {});
    publicService.getDemographies().then(res => setDemographies(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!circularUrl) {
      setLoadingCircular(false);
      return;
    }
    circularService.getByUrl(circularUrl)
      .then(res => setCircular(res.data))
      .catch(() => navigate('/circulars'))
      .finally(() => setLoadingCircular(false));
  }, [circularUrl, navigate]);

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

  const handleRegChange = (e) => {
    const { name, value } = e.target;
    setRegForm(prev => ({ ...prev, [name]: value }));
    if (regErrors[name]) setRegErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({ ...prev, [name]: value }));
    if (loginErrors[name]) setLoginErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleDobChange = (field, value) => {
    const updaters = { dobDay: setDobDay, dobMonth: setDobMonth, dobYear: setDobYear };
    updaters[field](value);
    const day = field === 'dobDay' ? value : dobDay;
    const month = field === 'dobMonth' ? value : dobMonth;
    const year = field === 'dobYear' ? value : dobYear;
    if (day && month && year) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setForm(prev => ({ ...prev, date_of_birth: iso }));
    }
    setNidVerified(false);
    setNidVerifyError('');
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'profile_image' && files[0]) {
      setForm(prev => ({ ...prev, profile_image: files[0] }));
      setPhotoPreview(URL.createObjectURL(files[0]));
    } else if (name === 'nid_front_image' && files[0]) {
      setForm(prev => ({ ...prev, nid_front_image: files[0] }));
      setNidFrontPreview(URL.createObjectURL(files[0]));
    } else if (name === 'nid_back_image' && files[0]) {
      setForm(prev => ({ ...prev, nid_back_image: files[0] }));
      setNidBackPreview(URL.createObjectURL(files[0]));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleChecklistChange = (itemId, value) => {
    setChecklistValues(prev => ({ ...prev, [itemId]: value }));
  };

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

  const storeUserSession = (data) => {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (updateUser) updateUser(data.user);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegSubmitting(true);
    setRegErrors({});
    try {
      const { data } = await publicService.register(regForm);
      setOtpPhone(data.phone);
      setUserId(data.user_id);
      setOtpModal(true);
    } catch (err) {
      const serverErrors = err.response?.data || {};
      const fieldErrors = {};
      Object.entries(serverErrors).forEach(([key, msgs]) => {
        if (key === 'non_field_errors') {
          fieldErrors.form = Array.isArray(msgs) ? msgs[0] : msgs;
        } else {
          fieldErrors[key] = Array.isArray(msgs) ? msgs[0] : msgs;
        }
      });
      setRegErrors(fieldErrors);
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    try {
      await publicService.verifyOtp({ phone: otpPhone, otp_code: otpCode });
      setOtpModal(false);
      setPhoneVerified(true);
      setMode('login');
    } catch (err) {
      setOtpError(err.response?.data?.error || 'OTP যাচাইকরণ ব্যর্থ হয়েছে');
    }
  };

  const handleResendOtp = async () => {
    setOtpSending(true);
    setOtpError('');
    try {
      await publicService.resendOtp({ phone: otpPhone });
    } catch (err) {
      setOtpError(err.response?.data?.error || 'পুনরায় OTP পাঠানো ব্যর্থ হয়েছে');
    } finally {
      setOtpSending(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginSubmitting(true);
    setLoginErrors({});
    try {
      const { data } = await publicService.loginPublic(loginForm);
      storeUserSession(data);
      setForm(prev => ({
        ...prev,
        name_bn: data.user.full_name_bn,
        name_en: data.user.full_name_en,
        nid: data.user.nid,
        phone: data.user.phone,
      }));
      setUserId(data.user.id);
      setApplyStep(1);
      setStep('apply');
    } catch (err) {
      const serverErrors = err.response?.data || {};
      const fieldErrors = {};
      Object.entries(serverErrors).forEach(([key, msgs]) => {
        if (key === 'non_field_errors') {
          fieldErrors.form = Array.isArray(msgs) ? msgs[0] : msgs;
        } else {
          fieldErrors[key] = Array.isArray(msgs) ? msgs[0] : msgs;
        }
      });
      setLoginErrors(fieldErrors);
    } finally {
      setLoginSubmitting(false);
    }
  };

  const validateApply = () => {
    const errs = {};
    if (!form.father_name_bn.trim()) errs.father_name_bn = 'পিতার নাম লিখুন';
    if (!form.mother_name_bn.trim()) errs.mother_name_bn = 'মাতার নাম লিখুন';
    if (!form.date_of_birth) errs.date_of_birth = 'জন্ম তারিখ নির্বাচন করুন';
    if (!form.gender_id) errs.gender_id = 'লিঙ্গ নির্বাচন করুন';
    if (!form.present_address.trim()) errs.present_address = 'বর্তমান ঠিকানা লিখুন';
    if (!form.education_level_id) errs.education_level_id = 'শিক্ষাগত যোগ্যতা নির্বাচন করুন';
    if (!form.chosen_center_id) errs.chosen_center_id = 'কেন্দ্র নির্বাচন করুন';
    const age = calculateAge(form.date_of_birth);
    if (age !== null && age < 21) errs.date_of_birth = `বয়স ${age} বছর। ন্যূনতম ২১ বছর হতে হবে।`;
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

  const handleSubmit = async () => {
    if (!validateApply()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('circular_url', circularUrl);
      formData.append('chosen_center_id', form.chosen_center_id);
      formData.append('user_id', userId);

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
      console.error('Submit error:', err.response?.data || err.message);
      const serverErrors = err.response?.data || {};
      const fieldErrors = {};
      Object.entries(serverErrors).forEach(([key, msgs]) => {
        if (Array.isArray(msgs)) fieldErrors[key] = msgs[0];
        else fieldErrors[key] = msgs;
      });
      if (!Object.keys(fieldErrors).length) fieldErrors.form = 'আবেদন জমা দেওয়া ব্যর্থ হয়েছে। আবার চেষ্টা করুন।';
      setErrors(fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (name, label, opts = {}) => {
    const { type = 'text', placeholder = '', required = true, col = 'col-12', options, readOnly, bangla } = opts;
    const hasError = errors[name];
    return (
      <div className={col}>
        <label className="form-label fw-medium">{label}{required && <span className="text-danger ms-1">*</span>}</label>
        {type === 'textarea' ? (
          bangla ? (
            <BanglaInput as="textarea" className={`form-control ${hasError ? 'is-invalid' : ''}`} name={name} value={form[name]} onChange={handleChange} rows={3} placeholder={placeholder} />
          ) : (
            <textarea className={`form-control ${hasError ? 'is-invalid' : ''}`} name={name} value={form[name]} onChange={handleChange} rows={3} placeholder={placeholder} />
          )
        ) : type === 'select' ? (
          <select className={`form-select ${hasError ? 'is-invalid' : ''}`} name={name} value={form[name]} onChange={handleChange}>
            <option value="">-- নির্বাচন করুন --</option>
            {(options || []).map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
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
        ) : bangla ? (
          <BanglaInput as="input" type={type} className={`form-control ${hasError ? 'is-invalid' : ''}`} name={name} value={form[name]} onChange={handleChange} placeholder={placeholder} readOnly={readOnly} />
        ) : (
          <input type={type} className={`form-control ${hasError ? 'is-invalid' : ''}`} name={name} value={form[name]} onChange={handleChange} placeholder={placeholder} readOnly={readOnly} />
        )}
        {hasError && <div className="invalid-feedback">{typeof hasError === 'string' ? hasError : 'এই ক্ষেত্রটি প্রয়োজনীয়'}</div>}
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
          <label className="form-label fw-medium">{item.label_bn}</label>
          <select className={`form-select ${hasError ? 'is-invalid' : ''}`} value={checklistValues[item.id] || ''} onChange={e => handleChecklistChange(item.id, e.target.value)}>
            <option value="">-- নির্বাচন করুন --</option>
            {options.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
          {item.score && <small className="text-muted">স্কোর: {item.score}</small>}
          {hasError && <div className="invalid-feedback">এই ক্ষেত্রটি প্রয়োজনীয়</div>}
        </div>
      );
    }

    return (
      <div className="col-md-6" key={item.id}>
        <label className="form-label fw-medium">{item.label_bn}</label>
        <input type={inputType} className={`form-control ${hasError ? 'is-invalid' : ''}`} value={checklistValues[item.id] || ''} onChange={e => handleChecklistChange(item.id, e.target.value)} />
        {item.score && <small className="text-muted">স্কোর: {item.score}</small>}
        {hasError && <div className="invalid-feedback">এই ক্ষেত্রটি প্রয়োজনীয়</div>}
      </div>
    );
  };

  const SectionCard = ({ icon, title, children }) => (
    <div className="form-section-card mb-4">
      <div className="form-section-header"><i className={`bi ${icon} me-2`}></i><span>{title}</span></div>
      <div className="form-section-body"><div className="row g-3">{children}</div></div>
    </div>
  );

  if (submitted) {
    return <ApplySuccess data={submitted} />;
  }

  if (loadingCircular) {
    return (
      <div className="registration-page">
        <div className="container py-4">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-8">
              <div className="card shadow-sm">
                <div className="card-body p-4 text-center py-5">
                  <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}></div>
                  <p className="mt-3 text-muted">সার্কুলার লোড হচ্ছে...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="registration-page">
      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8">
            <div className="card shadow-sm">
              <div className="card-body p-4">

                {step === 'register' && (
                  <>
                    <div className="text-center mb-4">
                      <ul className="nav nav-pills nav-justified mb-3" style={{ maxWidth: 320, margin: '0 auto' }}>
                        <li className="nav-item">
                          <button className={`nav-link ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>
                            <i className="bi bi-person-plus me-1"></i>নতুন একাউন্ট
                          </button>
                        </li>
                        <li className="nav-item">
                          <button className={`nav-link ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
                            <i className="bi bi-box-arrow-in-right me-1"></i>লগইন
                          </button>
                        </li>
                      </ul>
                      <p className="text-muted small mb-0">
                        {mode === 'register' ? 'নতুন একাউন্ট তৈরি করে আবেদন করুন' : 'আগের একাউন্ট দিয়ে লগইন করে আবেদন করুন'}
                      </p>
                    </div>

                    {circular && (
                      <div className="alert alert-info d-flex align-items-center gap-2 py-2 px-3 rounded-3 mb-2">
                        <i className="bi bi-megaphone fs-5"></i>
                        <span className="small">{circular.title_bn}</span>
                      </div>
                    )}

                    {phoneVerified && (
                      <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 rounded-3 mb-3">
                        <i className="bi bi-check-circle-fill fs-5"></i>
                        <span className="small">মোবাইল নিশ্চিতকরণ সফল হয়েছে। এখন লগইন করে আবেদন সম্পন্ন করুন।</span>
                      </div>
                    )}

                    {mode === 'register' ? (
                      <form onSubmit={handleRegister}>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label fw-medium">নাম (বাংলায়) <span className="text-danger">*</span></label>
                            <BanglaInput as="input" className={`form-control ${regErrors.full_name_bn ? 'is-invalid' : ''}`} name="full_name_bn" value={regForm.full_name_bn} onChange={handleRegChange} placeholder="আপনার নাম বাংলায়" />
                            {regErrors.full_name_bn && <div className="invalid-feedback">{regErrors.full_name_bn}</div>}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">নাম (ইংরেজিতে) <span className="text-danger">*</span></label>
                            <input className={`form-control ${regErrors.full_name_en ? 'is-invalid' : ''}`} name="full_name_en" value={regForm.full_name_en} onChange={handleRegChange} placeholder="Your name in English" />
                            {regErrors.full_name_en && <div className="invalid-feedback">{regErrors.full_name_en}</div>}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">মোবাইল নম্বর <span className="text-danger">*</span></label>
                            <input className={`form-control ${regErrors.phone ? 'is-invalid' : ''}`} name="phone" value={regForm.phone} onChange={handleRegChange} placeholder="01XXXXXXXXX" />
                            {regErrors.phone && <div className="invalid-feedback">{regErrors.phone}</div>}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">এনআইডি নম্বর <span className="text-danger">*</span></label>
                            <input className={`form-control ${regErrors.nid ? 'is-invalid' : ''}`} name="nid" value={regForm.nid} onChange={handleRegChange} placeholder="১০ বা ১৭ ডিজিট" />
                            {regErrors.nid && <div className="invalid-feedback">{regErrors.nid}</div>}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">পাসওয়ার্ড <span className="text-danger">*</span></label>
                            <input type="password" className={`form-control ${regErrors.password ? 'is-invalid' : ''}`} name="password" value={regForm.password} onChange={handleRegChange} placeholder="ন্যূনতম ৬ অক্ষর" />
                            {regErrors.password && <div className="invalid-feedback">{regErrors.password}</div>}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">পাসওয়ার্ড নিশ্চিতকরণ <span className="text-danger">*</span></label>
                            <input type="password" className={`form-control ${regErrors.confirm_password ? 'is-invalid' : ''}`} name="confirm_password" value={regForm.confirm_password} onChange={handleRegChange} placeholder="আবার পাসওয়ার্ড দিন" />
                            {regErrors.confirm_password && <div className="invalid-feedback">{regErrors.confirm_password}</div>}
                          </div>
                        </div>
                        {regErrors.form && <div className="alert alert-danger mt-3 py-2 small">{regErrors.form}</div>}
                        <div className="d-flex justify-content-between mt-4 pt-3 border-top">
                          <button type="button" className="btn btn-outline-secondary px-4" onClick={() => window.history.back()}>
                            <i className="bi bi-arrow-left me-1"></i>পেছনে
                          </button>
                          <button type="submit" className="btn btn-primary px-4" disabled={regSubmitting}>
                            {regSubmitting ? (
                              <><span className="spinner-border spinner-border-sm me-1"></span>অপেক্ষা করুন...</>
                            ) : (
                              <><i className="bi bi-person-plus me-1"></i>একাউন্ট তৈরি করুন</>
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleLogin}>
                        <div className="row g-3">
                          <div className="col-12">
                            <label className="form-label fw-medium">মোবাইল বা এনআইডি <span className="text-danger">*</span></label>
                            <input className={`form-control ${loginErrors.identifier ? 'is-invalid' : ''}`} name="identifier" value={loginForm.identifier} onChange={handleLoginChange} placeholder="01XXXXXXXXX বা এনআইডি নম্বর" />
                            {loginErrors.identifier && <div className="invalid-feedback">{loginErrors.identifier}</div>}
                          </div>
                          <div className="col-12">
                            <label className="form-label fw-medium">পাসওয়ার্ড <span className="text-danger">*</span></label>
                            <input type="password" className={`form-control ${loginErrors.password ? 'is-invalid' : ''}`} name="password" value={loginForm.password} onChange={handleLoginChange} placeholder="পাসওয়ার্ড দিন" />
                            {loginErrors.password && <div className="invalid-feedback">{loginErrors.password}</div>}
                          </div>
                        </div>
                        {loginErrors.form && <div className="alert alert-danger mt-3 py-2 small">{loginErrors.form}</div>}
                        <div className="d-flex justify-content-between mt-4 pt-3 border-top">
                          <button type="button" className="btn btn-outline-secondary px-4" onClick={() => window.history.back()}>
                            <i className="bi bi-arrow-left me-1"></i>পেছনে
                          </button>
                          <button type="submit" className="btn btn-success px-4" disabled={loginSubmitting}>
                            {loginSubmitting ? (
                              <><span className="spinner-border spinner-border-sm me-1"></span>অপেক্ষা করুন...</>
                            ) : (
                              <><i className="bi bi-box-arrow-in-right me-1"></i>লগইন ও আবেদন করুন</>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}

                {step === 'apply' && (
                  <>
                    <div className="d-flex align-items-center gap-2 mb-4 pb-3 border-bottom">
                      <i className="bi bi-check-circle-fill text-success fs-4"></i>
                      <div>
                        <h5 className="mb-0">
                          {mode === 'register' ? 'একাউন্ট তৈরী হয়েছে' : 'লগইন সফল হয়েছে'}
                        </h5>
                        <small className="text-muted">{form.name_bn} ({form.phone})</small>
                      </div>
                    </div>

                    <div className="steps-indicator mb-4">
                      {APPLY_STEPS.map((label, i) => (
                        <div key={label} className={`step-item ${i + 1 === applyStep ? 'active' : ''} ${i + 1 < applyStep ? 'completed' : ''}`}>
                          <div className="step-circle">{i + 1 < applyStep ? <i className="bi bi-check"></i> : i + 1}</div>
                          <div className="step-label">{label}</div>
                        </div>
                      ))}
                    </div>

                    {applyStep === 1 && (
                      <>
                        <div className="alert alert-primary d-flex align-items-center gap-3 py-3 px-4 rounded-3 border-start border-4 border-primary mb-4">
                          <i className="bi bi-shield-check fs-3 text-primary"></i>
                          <div>
                            <strong>এনআইডি যাচাই</strong>
                            <p className="mb-0 mt-1 small text-muted">আপনার এনআইডি ও জন্ম তারিখ যাচাই করে পরবর্তী ধাপে যান</p>
                          </div>
                        </div>

                        <div className="row g-3 mb-4">
                          <div className="col-md-6">
                            <label className="form-label fw-medium">পূর্ণ নাম</label>
                            <input className="form-control bg-light" value={form.name_bn} readOnly />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">মোবাইল নম্বর</label>
                            <input className="form-control bg-light" value={form.phone} readOnly />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">এনআইডি নম্বর</label>
                            <input className="form-control bg-light" value={form.nid} readOnly />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">জন্ম তারিখ</label>
                            <div className="row g-1">
                              <div className="col-4">
                                <select className={`form-select ${nidVerifyError ? 'is-invalid' : nidVerified ? 'is-valid' : ''}`} value={dobDay} onChange={e => handleDobChange('dobDay', e.target.value)}>
                                  <option value="">দিন</option>
                                  {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                </select>
                              </div>
                              <div className="col-4">
                                <select className={`form-select ${nidVerifyError ? 'is-invalid' : nidVerified ? 'is-valid' : ''}`} value={dobMonth} onChange={e => handleDobChange('dobMonth', e.target.value)}>
                                  <option value="">মাস</option>
                                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                              </div>
                              <div className="col-4">
                                <select className={`form-select ${nidVerifyError ? 'is-invalid' : nidVerified ? 'is-valid' : ''}`} value={dobYear} onChange={e => handleDobChange('dobYear', e.target.value)}>
                                  <option value="">সাল</option>
                                  {YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                                </select>
                              </div>
                            </div>
                            {nidVerifyError && <div className="invalid-feedback">{nidVerifyError}</div>}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">পিতার নাম <span className="text-danger">*</span></label>
                            <BanglaInput className={`form-control ${errors.father_name_bn ? 'is-invalid' : ''}`} name="father_name_bn" value={form.father_name_bn} onChange={handleChange} placeholder="পিতার নাম লিখুন" />
                            {errors.father_name_bn && <div className="invalid-feedback">{errors.father_name_bn}</div>}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">মাতার নাম <span className="text-danger">*</span></label>
                            <BanglaInput className={`form-control ${errors.mother_name_bn ? 'is-invalid' : ''}`} name="mother_name_bn" value={form.mother_name_bn} onChange={handleChange} placeholder="মাতার নাম লিখুন" />
                            {errors.mother_name_bn && <div className="invalid-feedback">{errors.mother_name_bn}</div>}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">লিঙ্গ <span className="text-danger">*</span></label>
                            <select className={`form-select ${errors.gender_id ? 'is-invalid' : ''}`} name="gender_id" value={form.gender_id} onChange={handleChange}>
                              <option value="">-- নির্বাচন করুন --</option>
                              {genders.map(g => <option key={g.id} value={g.id}>{g.name_bn}</option>)}
                            </select>
                            {errors.gender_id && <div className="invalid-feedback">{errors.gender_id}</div>}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">আবেদনের কেন্দ্র <span className="text-danger">*</span></label>
                            <select className={`form-select ${errors.chosen_center_id ? 'is-invalid' : ''}`} name="chosen_center_id" value={form.chosen_center_id} onChange={handleChange}>
                              <option value="">-- কেন্দ্র নির্বাচন করুন --</option>
                              {(circular?.eligible_centers || []).map(c => <option key={c.id} value={c.id}>{c.name_bn}</option>)}
                            </select>
                            {errors.chosen_center_id && <div className="invalid-feedback">{errors.chosen_center_id}</div>}
                          </div>
                        </div>

                        {nidVerified && (
                          <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 rounded-3 mb-4">
                            <i className="bi bi-check-circle-fill fs-5"></i>
                            <span>এনআইডি সফলভাবে যাচাই করা হয়েছে</span>
                          </div>
                        )}

                        {circular && (
                          <div className="alert alert-info d-flex align-items-center gap-2 py-2 px-3 rounded-3 mb-4">
                            <i className="bi bi-megaphone fs-5"></i>
                            <span className="small">{circular.title_bn}</span>
                          </div>
                        )}

                        <div className="d-flex justify-content-between mt-4 pt-3 border-top">
                          <button className="btn btn-outline-secondary px-4" onClick={() => navigate('/circulars')}>
                            <i className="bi bi-x-circle me-1"></i>বাতিল
                          </button>
                          <button className="btn btn-success px-4" disabled={nidVerifying || !form.date_of_birth} onClick={async () => {
                              if (!form.date_of_birth) { setNidVerifyError('জন্ম তারিখ নির্বাচন করুন'); return; }
                              if (nidVerified) { setApplyStep(2); return; }
                              setNidVerifying(true); setNidVerifyError('');
                              try {
                                const { data } = await publicService.verifyNid({ nid: form.nid, date_of_birth: form.date_of_birth });
                                if (data.verified) {
                                  setNidVerified(true);
                                  setApplyStep(2);
                                } else {
                                  setNidVerifyError(data.message || 'যাচাই ব্যর্থ হয়েছে');
                                }
                              } catch (err) {
                                setNidVerifyError(err.response?.data?.message || 'যাচাইকরণ সার্ভারে সমস্যা হয়েছে');
                              } finally { setNidVerifying(false); }
                            }}>
                              {nidVerifying ? <><span className="spinner-border spinner-border-sm me-1"></span>যাচাই করা হচ্ছে...</> : <><i className="bi bi-arrow-right me-1"></i>পরবর্তী</>}
                            </button>
                        </div>
                      </>
                    )}

                    {applyStep === 2 && (
                      <>
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
                            <BanglaInput as="textarea" className={`form-control ${errors.present_address ? 'is-invalid' : ''}`} name="present_address" value={form.present_address} onChange={handleChange} rows={2} placeholder="গ্রাম/রাস্তা, বাড়ি নম্বর, পোস্ট অফিস ইত্যাদি"></BanglaInput>
                            {errors.present_address && <div className="invalid-feedback">{errors.present_address}</div>}
                          </div>
                        </SectionCard>

                        <div className="form-section-card mb-4 border-primary">
                          <div className="form-section-body pb-2">
                            <div className="form-check form-switch d-flex align-items-center gap-2 ps-0">
                              <input className="form-check-input m-0" type="checkbox" role="switch" id="sameAsPresent" checked={sameAsPresent}
                                onChange={e => handleSameAsPresent(e.target.checked)}
                                style={{ width: '2.5rem', height: '1.25rem', cursor: 'pointer' }} />
                              <label className="form-check-label fw-medium user-select-none" htmlFor="sameAsPresent" style={{ cursor: 'pointer' }}>
                                <i className="bi bi-arrow-down-up text-primary me-1"></i>স্থায়ী ঠিকানা বর্তমান ঠিকানার মতোই
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
                            <BanglaInput as="textarea" className="form-control" name="permanent_address" value={form.permanent_address}
                              onChange={handleChange} rows={2} disabled={sameAsPresent}
                              placeholder={sameAsPresent ? 'বর্তমান ঠিকানার মতোই হবে' : 'গ্রাম/রাস্তা, বাড়ি নম্বর, পোস্ট অফিস ইত্যাদি'}></BanglaInput>
                          </div>
                        </SectionCard>

                        <div className="d-flex justify-content-between mt-4 pt-3 border-top">
                          <button className="btn btn-outline-secondary px-4" onClick={() => setApplyStep(1)}>
                            <i className="bi bi-arrow-left me-1"></i>পেছনে
                          </button>
                          <button className="btn btn-primary px-4" onClick={() => setApplyStep(3)}>
                            পরবর্তী<i className="bi bi-arrow-right ms-1"></i>
                          </button>
                        </div>
                      </>
                    )}

                    {applyStep === 3 && (
                      <>
                        <SectionCard icon="bi-mortarboard" title="শিক্ষাগত যোগ্যতা ও ছবি">
                          <div className="col-md-6">
                            <label className="form-label fw-medium">শিক্ষাগত যোগ্যতা <span className="text-danger">*</span></label>
                            <select className={`form-select ${errors.education_level_id ? 'is-invalid' : ''}`} name="education_level_id" value={form.education_level_id}
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
                                  <img src={photoPreview} alt="Profile" className="rounded-3" style={{ width: 80, height: 80, objectFit: 'cover' }} />
                                  <div className="text-start">
                                    <p className="mb-1 small text-muted">ছবি আপলোড করা হয়েছে</p>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => { setForm(p => ({ ...p, profile_image: null })); setPhotoPreview(null); }}>
                                      <i className="bi bi-trash me-1"></i>মুছে ফেলুন
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <label className="mb-0 d-block" style={{ cursor: 'pointer' }}>
                                  <input type="file" accept="image/*" name="profile_image" onChange={handleChange} className="d-none" />
                                  <div className="py-2">
                                    <i className="bi bi-camera fs-2 text-muted"></i>
                                    <p className="mb-0 mt-2 small text-muted">ছবি নির্বাচন করুন</p>
                                  </div>
                                </label>
                              )}
                            </div>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">এনআইডি (সামনে)</label>
                            <div className={`upload-box border rounded-3 p-3 text-center ${errors.nid_front_image ? 'border-danger' : 'border-dashed'}`}>
                              {nidFrontPreview ? (
                                <div className="d-flex align-items-center gap-3 justify-content-center">
                                  <img src={nidFrontPreview} alt="NID Front" className="rounded-3" style={{ width: 120, height: 80, objectFit: 'cover' }} />
                                  <div className="text-start">
                                    <p className="mb-1 small text-muted">আপলোড করা হয়েছে</p>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => { setForm(p => ({ ...p, nid_front_image: null })); setNidFrontPreview(null); }}>
                                      <i className="bi bi-trash me-1"></i>মুছে ফেলুন
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <label className="mb-0 d-block" style={{ cursor: 'pointer' }}>
                                  <input type="file" accept="image/*" name="nid_front_image" onChange={handleChange} className="d-none" />
                                  <div className="py-2">
                                    <i className="bi bi-card-image fs-2 text-muted"></i>
                                    <p className="mb-0 mt-2 small text-muted">এনআইডি (সামনে) নির্বাচন করুন</p>
                                  </div>
                                </label>
                              )}
                            </div>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium">এনআইডি (পেছনে)</label>
                            <div className={`upload-box border rounded-3 p-3 text-center ${errors.nid_back_image ? 'border-danger' : 'border-dashed'}`}>
                              {nidBackPreview ? (
                                <div className="d-flex align-items-center gap-3 justify-content-center">
                                  <img src={nidBackPreview} alt="NID Back" className="rounded-3" style={{ width: 120, height: 80, objectFit: 'cover' }} />
                                  <div className="text-start">
                                    <p className="mb-1 small text-muted">আপলোড করা হয়েছে</p>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => { setForm(p => ({ ...p, nid_back_image: null })); setNidBackPreview(null); }}>
                                      <i className="bi bi-trash me-1"></i>মুছে ফেলুন
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <label className="mb-0 d-block" style={{ cursor: 'pointer' }}>
                                  <input type="file" accept="image/*" name="nid_back_image" onChange={handleChange} className="d-none" />
                                  <div className="py-2">
                                    <i className="bi bi-card-image fs-2 text-muted"></i>
                                    <p className="mb-0 mt-2 small text-muted">এনআইডি (পেছনে) নির্বাচন করুন</p>
                                  </div>
                                </label>
                              )}
                            </div>
                          </div>
                        </SectionCard>

                        <div className="d-flex justify-content-between mt-4 pt-3 border-top">
                          <button className="btn btn-outline-secondary px-4" onClick={() => setApplyStep(2)}>
                            <i className="bi bi-arrow-left me-1"></i>পেছনে
                          </button>
                          <button className="btn btn-primary px-4" onClick={() => setApplyStep(4)}>
                            পরবর্তী<i className="bi bi-arrow-right ms-1"></i>
                          </button>
                        </div>
                      </>
                    )}

                    {applyStep === 4 && (
                      <>
                        <div className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 rounded-3 mb-4">
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
                                {[
                                  ['নাম (বাংলায়)', form.name_bn],
                                  ['নাম (ইংরেজিতে)', form.name_en || '—'],
                                  ['পিতার নাম', form.father_name_bn],
                                  ['মাতার নাম', form.mother_name_bn],
                                  ['মোবাইল', form.phone],
                                  ['এনআইডি', form.nid],
                                  ['ইমেইল', form.email || '—'],
                                  ['লিঙ্গ', genders.find(g => g.id === Number(form.gender_id))?.name_bn || '—'],
                                  ['জন্ম তারিখ', form.date_of_birth],
                                  ['আবেদনের কেন্দ্র', (circular?.eligible_centers || []).find(c => c.id === Number(form.chosen_center_id))?.name_bn || form.chosen_center_id],
                                  ['বর্তমান বিভাগ', divisions.find(d => d.id === Number(form.present_division_id))?.name_bn || '—'],
                                  ['বর্তমান জেলা', presentDistricts.find(d => d.id === Number(form.present_district_id))?.name_bn || '—'],
                                  ['বর্তমান ঠিকানা', form.present_address],
                                  ['স্থায়ী বিভাগ', sameAsPresent ? 'বর্তমান ঠিকানার মতোই' : (divisions.find(d => d.id === Number(form.permanent_division_id))?.name_bn || '—')],
                                  ['স্থায়ী জেলা', sameAsPresent ? 'বর্তমান ঠিকানার মতোই' : (permanentDistricts.find(d => d.id === Number(form.permanent_district_id))?.name_bn || '—')],
                                  ['স্থায়ী ঠিকানা', sameAsPresent ? 'বর্তমান ঠিকানার মতোই' : (form.permanent_address || '—')],
                                  ['শিক্ষাগত যোগ্যতা', form.education_qualification || educations.find(e => e.id === Number(form.education_level_id))?.name_bn || '—'],
                                ].map(([label, val]) => (
                                  <tr key={label}>
                                    <th className="text-nowrap px-4 py-2" style={{ width: 180, background: '#fafbfc' }}>{label}</th>
                                    <td className="px-4 py-2">{val}</td>
                                  </tr>
                                ))}
                                {circular?.checklist_items?.filter(i => i.criteria_type !== 'education' && i.criteria_type !== 'age').length > 0 && (
                                  <tr>
                                    <th className="text-nowrap px-4 py-2" style={{ width: 180, background: '#fafbfc' }}>চেকলিস্ট</th>
                                    <td className="px-4 py-2">
                                      {circular.checklist_items.filter(i => i.criteria_type !== 'education' && i.criteria_type !== 'age').sort((a, b) => a.order - b.order).map(item => (
                                        <div key={item.id}><strong>{item.label_bn}:</strong> {checklistValues[item.id] || '—'}</div>
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
                              <img src={photoPreview} alt="Profile" className="rounded-3 border" style={{ width: 80, height: 80, objectFit: 'cover' }} />
                            </div>
                          )}
                          {(nidFrontPreview || nidBackPreview) && (
                            <div className="px-4 py-3 border-top d-flex align-items-center gap-4 flex-wrap">
                              {nidFrontPreview && (
                                <div className="d-flex align-items-center gap-2">
                                  <strong>এনআইডি (সামনে):</strong>
                                  <img src={nidFrontPreview} alt="NID Front" className="rounded-3 border" style={{ width: 120, height: 80, objectFit: 'cover' }} />
                                </div>
                              )}
                              {nidBackPreview && (
                                <div className="d-flex align-items-center gap-2">
                                  <strong>এনআইডি (পেছনে):</strong>
                                  <img src={nidBackPreview} alt="NID Back" className="rounded-3 border" style={{ width: 120, height: 80, objectFit: 'cover' }} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {errors.form && <div className="alert alert-danger py-2 small">{errors.form}</div>}
                        {Object.entries(errors).filter(([k]) => k !== 'form').length > 0 && (
                          <div className="alert alert-danger py-2 small">
                            <strong>নিচের ক্ষেত্রগুলি ঠিক করুন:</strong>
                            <ul className="mb-0 mt-1 ps-3">
                              {Object.entries(errors).filter(([k]) => k !== 'form').map(([k, v]) => <li key={k}>{v}</li>)}
                            </ul>
                          </div>
                        )}

                        <div className="d-flex justify-content-between mt-4 pt-3 border-top align-items-center">
                          <button className="btn btn-outline-secondary px-4" onClick={() => setApplyStep(3)}>
                            <i className="bi bi-pencil me-1"></i>সম্পাদনা
                          </button>
                          <div className="d-flex align-items-center gap-3">
                            <small className="text-muted"><i className="bi bi-info-circle me-1"></i>জমা দেওয়ার পর তথ্য পরিবর্তন করা যাবে না</small>
                            <button className="btn btn-success btn-lg px-4" onClick={handleSubmit} disabled={submitting}>
                              {submitting ? (
                                <><span className="spinner-border spinner-border-sm me-1"></span>জমা দেওয়া হচ্ছে...</>
                              ) : (
                                <><i className="bi bi-check-circle me-1"></i>জমা দিন</>
                              )}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {otpModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-body text-center p-4">
                <div className="mb-3">
                  <i className="bi bi-phone fs-1 text-primary"></i>
                </div>
                <h5 className="mb-2">OTP নিশ্চিতকরণ</h5>
                <p className="small text-muted mb-3">{otpPhone} নম্বরে একটি OTP কোড পাঠানো হয়েছে</p>
                <input type="text" className={`form-control text-center form-control-lg mb-2 ${otpError ? 'is-invalid' : ''}`}
                  maxLength={6} placeholder="OTP কোড" value={otpCode}
                  onChange={e => { setOtpCode(e.target.value); setOtpError(''); }}
                  autoFocus />
                {otpError && <div className="text-danger small mb-2">{otpError}</div>}
                <button className="btn btn-primary w-100 mb-2" onClick={handleVerifyOtp} disabled={otpCode.length !== 6}>
                  <i className="bi bi-check-lg me-1"></i>নিশ্চিত করুন
                </button>
                <button className="btn btn-link btn-sm text-muted w-100" onClick={handleResendOtp} disabled={otpSending}>
                  {otpSending ? 'পাঠানো হচ্ছে...' : 'পুনরায় OTP পাঠান'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
