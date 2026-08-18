import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import publicService from '../../services/publicService';
import circularService from '../../services/circularService';
import { useAuth } from '../../contexts/AuthContext';
import { convertToBanglaDigits, toEnglishDigits } from '../../utils/numberFormatter';
import ApplySuccess from './ApplySuccess';
import './RegistrationForm.css';


function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}


function GovHeader({ circular }) {
  return (
    <div className="apply-header mb-4">
      <div className="gov-header" style={{ marginBottom: 0, paddingBottom: 12 }}>
        <div className="gov-line-1">{'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার'}</div>
        <div className="gov-line-2">{'বাংলাদেশ সড়ক পরিবহন কর্পোরেশন (BRTC)'}</div>
        <div className="gov-line-3">{'www.brtc.gov.bd'}</div>
        <div className="gov-line-4">{'প্রশিক্ষণ ব্যবস্থাপনা সিস্টেম — নিবন্ধন ফর্ম'}</div>
      </div>
      <div className="apply-header-title">
        <div className="apply-header-project">{'প্রকল্প: BRTC-BRSP'}</div>
        <h4 className="apply-header-form-name">
          <i className="bi bi-file-earmark-text me-2"></i>
          {'প্রশিক্ষণ ব্যবস্থাপনা সিস্টেম — নিবন্ধন ফরম'}
        </h4>
      </div>
      {circular && (
        <div className="apply-header-circular">
          <strong>{'প্রশিক্ষণ প্রতিষ্ঠান:'} </strong>{circular.title_bn || circular.title_en}
          {circular.course_name && <span className="ms-2 text-muted">| {circular.course_name}</span>}
        </div>
      )}
    </div>
  );
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
  const [regDobDay, setRegDobDay] = useState('');
  const [regDobMonth, setRegDobMonth] = useState('');
  const [regDobYear, setRegDobYear] = useState('');

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
    father_name_en: '',
    mother_name_en: '',
    nationality: 'বাংলাদেশী',
    present_profession: '',
    emergency_phone: '',
    marital_status: '',
    blood_group: '',
    profile_image: null,
    nid_front_image: null,
    nid_back_image: null,
    education_certificate: null,
    govt_job_certificate: null,
  });
  const [courseSelected, setCourseSelected] = useState(false);
  const [undertakingAgreed, setUndertakingAgreed] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [nidFrontPreview, setNidFrontPreview] = useState(null);
  const [nidBackPreview, setNidBackPreview] = useState(null);
  const [eduCertPreview, setEduCertPreview] = useState(null);
  const [govtJobPreview, setGovtJobPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [genders, setGenders] = useState([]);
  const [educations, setEducations] = useState([]);


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




  useEffect(() => {
    publicService.getGenders().then(res => setGenders(res.data)).catch(() => {});
    publicService.getEducations().then(res => setEducations(res.data)).catch(() => {});

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
    if (circular?.eligible_centers?.length === 1) {
      setForm(prev => ({ ...prev, chosen_center_id: circular.eligible_centers[0].id }));
    }
  }, [circular]);



  const handleRegChange = (e) => {
    const { name, value } = e.target;
    const cleaned = (name === 'phone' || name === 'nid') ? toEnglishDigits(value).replace(/[^0-9]/g, '') : value;
    setRegForm(prev => ({ ...prev, [name]: cleaned }));
    if (regErrors[name]) setRegErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({ ...prev, [name]: value }));
    if (loginErrors[name]) setLoginErrors(prev => ({ ...prev, [name]: null }));
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
    } else if (name === 'education_certificate' && files[0]) {
      setForm(prev => ({ ...prev, education_certificate: files[0] }));
      setEduCertPreview(URL.createObjectURL(files[0]));
    } else if (name === 'govt_job_certificate' && files[0]) {
      setForm(prev => ({ ...prev, govt_job_certificate: files[0] }));
      setGovtJobPreview(URL.createObjectURL(files[0]));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };





  const storeUserSession = (data) => {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (updateUser) updateUser(data.user);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegErrors({});
    const day = regDobDay;
    const month = regDobMonth;
    const year = regDobYear;
    let dob = '';
    if (day && month && year) {
      dob = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const age = calculateAge(dob);
      if (age < 21) {
        setRegErrors({ date_of_birth: `বয়স ${age} বছর। ন্যূনতম ২১ বছর হতে হবে।` });
        setRegSubmitting(false);
        return;
      }
    } else {
      setRegErrors({ date_of_birth: 'জন্ম তারিখ নির্বাচন করুন' });
      setRegSubmitting(false);
      return;
    }
    setRegSubmitting(true);
    try {
      const payload = { ...regForm, date_of_birth: dob };
      const { data } = await publicService.register(payload);
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

  const handleCloseOtp = () => {
    setOtpModal(false);
    setOtpCode('');
    setOtpError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginSubmitting(true);
    setLoginErrors({});
    try {
      const { data } = await publicService.loginPublic(loginForm);
      storeUserSession(data);
      const dobStr = data.user?.date_of_birth || '';
      if (dobStr) {

      }
      setForm(prev => ({
        ...prev,
        name_bn: data.user.full_name_bn,
        name_en: data.user.full_name_en,
        nid: data.user.nid,
        phone: data.user.phone,
        date_of_birth: dobStr,
      }));
      setUserId(data.user.id);
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
    if (!form.emergency_phone.trim()) errs.emergency_phone = 'জরুরি মোবাইল নম্বর লিখুন';
    if (!form.marital_status) errs.marital_status = 'বৈবাহিক অবস্থা নির্বাচন করুন';
    if (!form.blood_group) errs.blood_group = 'রক্তের গ্রুপ নির্বাচন করুন';
    const age = calculateAge(form.date_of_birth);
    if (age !== null && age < 21) errs.date_of_birth = `বয়স ${age} বছর। ন্যূনতম ২১ বছর হতে হবে।`;
    if (!courseSelected) errs.course_selected = 'কোর্স সিলেক্ট করুন';
    if (!undertakingAgreed) errs.undertaking_agreed = 'সত্যাবচন গ্রহণ করুন';
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
      formData.append('present_division_id', '');
      formData.append('present_district_id', '');
      formData.append('permanent_division_id', '');
      formData.append('permanent_district_id', '');
      formData.append('form_type', 'training');
      formData.append('project_code', '');
      const fields = [
        'name_bn', 'name_en', 'father_name_bn', 'father_name_en',
        'mother_name_bn', 'mother_name_en', 'date_of_birth', 'nid', 'phone',
        'email', 'gender_id', 'nationality', 'present_address', 'permanent_address',
        'education_level_id', 'education_qualification', 'present_profession',
        'emergency_phone', 'marital_status', 'blood_group',
      ];
      fields.forEach(key => { if (form[key] != null) formData.append(key, form[key]); });
      if (form.profile_image) formData.append('profile_image', form.profile_image);
      if (form.nid_front_image) formData.append('nid_front_image', form.nid_front_image);
      if (form.nid_back_image) formData.append('nid_back_image', form.nid_back_image);
      if (form.education_certificate) formData.append('education_certificate', form.education_certificate);
      if (form.govt_job_certificate) formData.append('govt_job_certificate', form.govt_job_certificate);
      const { data } = await publicService.submitApplication(formData);
      setSubmitted(data);
    } catch (err) {
      const serverErrors = err.response?.data || {};
      const fieldErrors = {};
      Object.entries(serverErrors).forEach(([key, msgs]) => {
        fieldErrors[key] = Array.isArray(msgs) ? msgs[0] : msgs;
      });
      if (!Object.keys(fieldErrors).length) fieldErrors.form = 'আবেদন জমা দেওয়া ব্যর্থ হয়েছে। আবার চেষ্টা করুন।';
      setErrors(fieldErrors);
    } finally { setSubmitting(false); }
  };


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
                      <div className="gov-reg-card">
                        <div className="gov-reg-inner">
                          <div className="gov-header">
                            <div className="gov-line-1">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</div>
                            <div className="gov-line-2">বাংলাদেশ সড়ক পরিবহন কর্পোরেশন (BRTC)</div>
                            <div className="gov-line-3">প্রশিক্ষণ ব্যবস্থাপনা সিস্টেম — নিবন্ধন ফর্ম</div>
                          </div>
                          <form onSubmit={handleRegister}>
                            <div className="gov-section-title"><i className="bi bi-person-vcard"></i>আবেদনকারীর তথ্য</div>
                            <div className="row g-3">
                              <div className="col-md-6">
                                <label className="form-label">নাম (বাংলায়) <span className="text-danger">*</span></label>
                                <input className={`form-control ${regErrors.full_name_bn ? 'is-invalid' : ''}`} name="full_name_bn" value={regForm.full_name_bn} onChange={handleRegChange} placeholder="আপনার নাম বাংলায় লিখুন" />
                                {regErrors.full_name_bn && <div className="invalid-feedback">{regErrors.full_name_bn}</div>}
                              </div>
                              <div className="col-md-6">
                                <label className="form-label">নাম (ইংরেজিতে) <span className="text-danger">*</span></label>
                                <input className={`form-control ${regErrors.full_name_en ? 'is-invalid' : ''}`} name="full_name_en" value={regForm.full_name_en} onChange={handleRegChange} placeholder="Your name in English" />
                                {regErrors.full_name_en && <div className="invalid-feedback">{regErrors.full_name_en}</div>}
                              </div>
                              <div className="col-md-6">
                                <label className="form-label">মোবাইল নম্বর <span className="text-danger">*</span></label>
                                <input className={`form-control ${regErrors.phone ? 'is-invalid' : ''}`} name="phone" value={convertToBanglaDigits(regForm.phone)} onChange={handleRegChange} placeholder="01XXXXXXXXX" />
                                {regErrors.phone && <div className="invalid-feedback">{regErrors.phone}</div>}
                              </div>
                              <div className="col-md-6">
                                <label className="form-label">জাতীয় পরিচয়পত্র নম্বর <span className="text-danger">*</span></label>
                                <input className={`form-control ${regErrors.nid ? 'is-invalid' : ''}`} name="nid" value={convertToBanglaDigits(regForm.nid)} onChange={handleRegChange} placeholder="১০ বা ১৭ ডিজিট" />
                                {regErrors.nid && <div className="invalid-feedback">{regErrors.nid}</div>}
                              </div>
                              <div className="col-12">
                                <label className="form-label">জন্ম তারিখ <span className="text-danger">*</span></label>
                                <div className="row g-1">
                                  <div className="col-4">
                                    <select className={`form-select ${regErrors.date_of_birth ? 'is-invalid' : ''}`} value={regDobDay} onChange={e => setRegDobDay(e.target.value)}>
                                      <option value="">দিন</option>
                                      {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                  </div>
                                  <div className="col-4">
                                    <select className={`form-select ${regErrors.date_of_birth ? 'is-invalid' : ''}`} value={regDobMonth} onChange={e => setRegDobMonth(e.target.value)}>
                                      <option value="">মাস</option>
                                      {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                  </div>
                                  <div className="col-4">
                                    <select className={`form-select ${regErrors.date_of_birth ? 'is-invalid' : ''}`} value={regDobYear} onChange={e => setRegDobYear(e.target.value)}>
                                      <option value="">সাল</option>
                                      {YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                                    </select>
                                  </div>
                                </div>
                                {regErrors.date_of_birth && <div className="invalid-feedback d-block">{regErrors.date_of_birth}</div>}
                              </div>
                              <div className="col-md-6">
                                <label className="form-label">পাসওয়ার্ড <span className="text-danger">*</span></label>
                                <input type="password" className={`form-control ${regErrors.password ? 'is-invalid' : ''}`} name="password" value={regForm.password} onChange={handleRegChange} placeholder="ন্যূনতম ৮ অক্ষর" />
                                {regErrors.password && <div className="invalid-feedback">{regErrors.password}</div>}
                              </div>
                              <div className="col-md-6">
                                <label className="form-label">পাসওয়ার্ড নিশ্চিতকরণ <span className="text-danger">*</span></label>
                                <input type="password" className={`form-control ${regErrors.confirm_password ? 'is-invalid' : ''}`} name="confirm_password" value={regForm.confirm_password} onChange={handleRegChange} placeholder="আবার পাসওয়ার্ড দিন" />
                                {regErrors.confirm_password && <div className="invalid-feedback">{regErrors.confirm_password}</div>}
                              </div>
                            </div>
                            {regErrors.form && <div className="alert alert-danger mt-3 py-2 small">{regErrors.form}</div>}
                            <div className="gov-divider"></div>
                            <div className="d-flex justify-content-between align-items-center">
                              <button type="button" className="btn btn-outline-secondary px-4" onClick={() => window.history.back()}>
                                <i className="bi bi-arrow-left me-1"></i>পেছনে
                              </button>
                              <button type="submit" className="btn gov-btn-primary px-4" disabled={regSubmitting}>
                                {regSubmitting ? (
                                  <><span className="spinner-border spinner-border-sm me-1"></span>অপেক্ষা করুন...</>
                                ) : (
                                  <><i className="bi bi-person-check me-1"></i>নিবন্ধন করুন</>
                                )}
                              </button>
                            </div>
                          </form>
                          <div className="text-center mt-3">
                            <small className="text-muted" style={{fontSize: '0.75rem'}}>সরকারি ব্যবহারের জন্য — সঠিক তথ্য প্রদান করুন</small>
                          </div>
                        </div>
                      </div>
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
                          {mode === 'register' ? 'একাউন্ট তৈরী হয়েছে' : 'লগইন সফল হয়েছে'}
                        </h5>
                        <small className="text-muted">{form.name_bn} ({convertToBanglaDigits(form.phone)})</small>
                      </div>
                    </div>

                    <GovHeader circular={circular} />

                    <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>

                      <div className="gov-section-title"><i className="bi bi-person-lines-fill"></i>আবেদনকারীর তথ্য</div>
                      <div className="table-responsive mb-4">
                        <table className="table table-bordered mb-0">
                          <tbody>
                            <tr>
                              <th style={{ width: 200, background: '#fafbfc' }}>নাম (বাংলা) <span className="text-danger">*</span></th>
                              <td><input className="form-control bg-light" name="name_bn" value={form.name_bn} onChange={handleChange} readOnly /></td>
                              <th style={{ width: 200, background: '#fafbfc' }}>নাম (ইংরেজি)</th>
                              <td><input className="form-control bg-light" name="name_en" value={form.name_en} onChange={handleChange} readOnly /></td>
                            </tr>
                            <tr>
                              <th style={{ background: '#fafbfc' }}>পিতার নাম (বাংলা) <span className="text-danger">*</span></th>
                              <td><input className={`form-control ${errors.father_name_bn ? 'is-invalid' : ''}`} name="father_name_bn" value={form.father_name_bn} onChange={handleChange} />{errors.father_name_bn && <div className="invalid-feedback">{errors.father_name_bn}</div>}</td>
                              <th style={{ background: '#fafbfc' }}>পিতার নাম (ইংরেজি)</th>
                              <td><input className="form-control" name="father_name_en" value={form.father_name_en} onChange={handleChange} /></td>
                            </tr>
                            <tr>
                              <th style={{ background: '#fafbfc' }}>মাতার নাম (বাংলা) <span className="text-danger">*</span></th>
                              <td><input className={`form-control ${errors.mother_name_bn ? 'is-invalid' : ''}`} name="mother_name_bn" value={form.mother_name_bn} onChange={handleChange} />{errors.mother_name_bn && <div className="invalid-feedback">{errors.mother_name_bn}</div>}</td>
                              <th style={{ background: '#fafbfc' }}>মাতার নাম (ইংরেজি)</th>
                              <td><input className="form-control" name="mother_name_en" value={form.mother_name_en} onChange={handleChange} /></td>
                            </tr>
                            <tr>
                              <th style={{ background: '#fafbfc' }}>জন্ম তারিখ <span className="text-danger">*</span></th>
                              <td>
                                <div className="row g-1">
                                  <div className="col-4">
                                    <select className={`form-select ${errors.date_of_birth ? 'is-invalid' : ''}`} value={form.date_of_birth ? form.date_of_birth.split('-')[2] : ''} onChange={e => { const y = form.date_of_birth ? form.date_of_birth.split('-')[0] : ''; const m = form.date_of_birth ? form.date_of_birth.split('-')[1] : ''; if (y && m && e.target.value) setForm(p => ({ ...p, date_of_birth: y + '-' + m + '-' + e.target.value.padStart(2, '0') })); }}>
                                      <option value="">দিন</option>{DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                  </div>
                                  <div className="col-4">
                                    <select className={`form-select ${errors.date_of_birth ? 'is-invalid' : ''}`} value={form.date_of_birth ? form.date_of_birth.split('-')[1] : ''} onChange={e => { const y = form.date_of_birth ? form.date_of_birth.split('-')[0] : ''; const d = form.date_of_birth ? form.date_of_birth.split('-')[2] : ''; if (y && d && e.target.value) setForm(p => ({ ...p, date_of_birth: y + '-' + e.target.value.padStart(2, '0') + '-' + d })); }}>
                                      <option value="">মাস</option>{MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                  </div>
                                  <div className="col-4">
                                    <select className={`form-select ${errors.date_of_birth ? 'is-invalid' : ''}`} value={form.date_of_birth ? form.date_of_birth.split('-')[0] : ''} onChange={e => { const m = form.date_of_birth ? form.date_of_birth.split('-')[1] : ''; const d = form.date_of_birth ? form.date_of_birth.split('-')[2] : ''; if (m && d && e.target.value) setForm(p => ({ ...p, date_of_birth: e.target.value + '-' + m + '-' + d })); }}>
                                      <option value="">সাল</option>{YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                                    </select>
                                  </div>
                                </div>
                                {errors.date_of_birth && <div className="invalid-feedback d-block">{errors.date_of_birth}</div>}
                              </td>
                              <th style={{ background: '#fafbfc' }}>নাগরিকত্ব</th>
                              <td><input className="form-control" name="nationality" value={form.nationality} onChange={handleChange} /></td>
                            </tr>
                            <tr>
                              <th style={{ background: '#fafbfc' }}>লিঙ্গ <span className="text-danger">*</span></th>
                              <td>
                                <select className={`form-select ${errors.gender_id ? 'is-invalid' : ''}`} name="gender_id" value={form.gender_id} onChange={handleChange}>
                                  <option value="">-- নির্বাচন করুন --</option>
                                  {genders.map(g => <option key={g.id} value={g.id}>{g.name_bn}</option>)}
                                </select>
                                {errors.gender_id && <div className="invalid-feedback">{errors.gender_id}</div>}
                              </td>
                              <th style={{ background: '#fafbfc' }}>সাদার্শন তথ্য <span className="text-danger">*</span></th>
                              <td>
                                <select className={`form-select ${errors.marital_status ? 'is-invalid' : ''}`} name="marital_status" value={form.marital_status} onChange={handleChange}>
                                  <option value="">-- নির্বাচন করুন --</option>
                                  <option value="single">অবিবাহিত</option>
                                  <option value="married">বিবাহিত</option>
                                  <option value="divorced">তালাকপ্রাপ্ত</option>
                                  <option value="widowed">বিধবা</option>
                                </select>
                                {errors.marital_status && <div className="invalid-feedback">{errors.marital_status}</div>}
                              </td>
                            </tr>
                            <tr>
                              <th style={{ background: '#fafbfc' }}>এনআইডি নম্বর <span className="text-danger">*</span></th>
                              <td><input className="form-control bg-light" name="nid" value={convertToBanglaDigits(form.nid)} readOnly /></td>
                              <th style={{ background: '#fafbfc' }}>রক্তের গ্রুপ <span className="text-danger">*</span></th>
                              <td>
                                <select className={`form-select ${errors.blood_group ? 'is-invalid' : ''}`} name="blood_group" value={form.blood_group} onChange={handleChange}>
                                  <option value="">-- নির্বাচন করুন --</option>
                                  <option value="A+">A+</option><option value="A-">A-</option>
                                  <option value="B+">B+</option><option value="B-">B-</option>
                                  <option value="O+">O+</option><option value="O-">O-</option>
                                  <option value="AB+">AB+</option><option value="AB-">AB-</option>
                                </select>
                                {errors.blood_group && <div className="invalid-feedback">{errors.blood_group}</div>}
                              </td>
                            </tr>
                            <tr>
                              <th style={{ background: '#fafbfc' }}>বর্তমান ঠিকানা <span className="text-danger">*</span></th>
                              <td colSpan="3">
                                <textarea className={`form-control ${errors.present_address ? 'is-invalid' : ''}`} name="present_address" value={form.present_address} onChange={handleChange} rows={2}></textarea>
                                {errors.present_address && <div className="invalid-feedback">{errors.present_address}</div>}
                              </td>
                            </tr>
                            <tr>
                              <th style={{ background: '#fafbfc' }}>স্থায়ী ঠিকানা</th>
                              <td colSpan="3"><textarea className="form-control" name="permanent_address" value={form.permanent_address} onChange={handleChange} rows={2}></textarea></td>
                            </tr>
                            <tr>
                              <th style={{ background: '#fafbfc' }}>শিক্ষাগত যোগ্যতা <span className="text-danger">*</span></th>
                              <td>
                                <select className={`form-select ${errors.education_level_id ? 'is-invalid' : ''}`} name="education_level_id" value={form.education_level_id}
                                  onChange={e => { handleChange(e); const edu = educations.find(ed => ed.id === Number(e.target.value)); setForm(p => ({ ...p, education_qualification: edu ? edu.name_bn : '' })); }}>
                                  <option value="">-- নির্বাচন করুন --</option>
                                  {educations.map(e => <option key={e.id} value={e.id}>{e.name_bn}</option>)}
                                </select>
                                {errors.education_level_id && <div className="invalid-feedback">{errors.education_level_id}</div>}
                              </td>
                              <th style={{ background: '#fafbfc' }}>শিক্ষাগত যোগ্যতার বিবরণ</th>
                              <td><input className="form-control" name="education_qualification" value={form.education_qualification} onChange={handleChange} /></td>
                            </tr>
                            <tr>
                              <th style={{ background: '#fafbfc' }}>বর্তমান পেশা</th>
                              <td><input className="form-control" name="present_profession" value={form.present_profession} onChange={handleChange} /></td>
                              <th style={{ background: '#fafbfc' }}>ইমেইল</th>
                              <td><input type="email" className="form-control" name="email" value={form.email} onChange={handleChange} /></td>
                            </tr>
                            <tr>
                              <th style={{ background: '#fafbfc' }}>মোবাইল নম্বর <span className="text-danger">*</span></th>
                              <td>
                                <input className={`form-control ${errors.emergency_phone ? 'is-invalid' : ''}`} name="emergency_phone" value={form.emergency_phone} onChange={handleChange} placeholder="01XXXXXXXXX" />
                                {errors.emergency_phone && <div className="invalid-feedback">{errors.emergency_phone}</div>}
                              </td>
                              <th style={{ background: '#fafbfc' }}>আবেদনের কেন্দ্র <span className="text-danger">*</span></th>
                              <td>
                                <select className={`form-select ${errors.chosen_center_id ? 'is-invalid' : ''}`} name="chosen_center_id" value={form.chosen_center_id} onChange={handleChange}>
                                  <option value="">-- কেন্দ্র নির্বাচন করুন --</option>
                                  {(circular?.eligible_centers || []).map(c => <option key={c.id} value={c.id}>{c.name_bn}</option>)}
                                </select>
                                {errors.chosen_center_id && <div className="invalid-feedback">{errors.chosen_center_id}</div>}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {circular && (
                        <>
                          <div className="gov-section-title"><i className="bi bi-bookmark-check"></i>কোর্সের নির্বাচন</div>
                          <div className="table-responsive mb-4">
                            <table className="table table-bordered mb-0">
                              <thead className="table-light">
                                <tr>
                                  <th style={{ width: 60 }}>#</th>
                                  <th>কোর্সের নাম</th>
                                  <th>ধরন</th>
                                  <th style={{ width: 80 }}>নির্বাচন</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>1</td>
                                  <td>{circular.course_name || circular.title_bn || circular.title_en}</td>
                                  <td>{circular.course_type_display || 'Training'}</td>
                                  <td>
                                    <div className="form-check">
                                      <input className={`form-check-input ${errors.course_selected ? 'is-invalid' : ''}`} type="checkbox" id="course_check" checked={courseSelected}
                                        onChange={e => { setCourseSelected(e.target.checked); if (errors.course_selected) setErrors(p => ({ ...p, course_selected: null })); }} />
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}

                      <div className="gov-section-title"><i className="bi bi-camera"></i>সংযুক্ত ছবি ও নথি</div>
                      <div className="row g-3 mb-4">
                        <div className="col-md-4">
                          <label className="form-label fw-medium">প্রোফাইল ছবি</label>
                          <div className={`upload-box border rounded-3 p-3 text-center ${errors.profile_image ? 'border-danger' : 'border-dashed'}`}>
                            {photoPreview ? (
                              <div className="d-flex align-items-center gap-3 justify-content-center">
                                <img src={photoPreview} alt="Profile" className="rounded-3" style={{ width: 80, height: 80, objectFit: 'cover' }} />
                                <div className="text-start">
                                  <p className="mb-1 small text-muted">ছবি আপলোড করা হয়েছে</p>
                                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => { setForm(p => ({ ...p, profile_image: null })); setPhotoPreview(null); }}>
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
                        <div className="col-md-4">
                          <label className="form-label fw-medium">এনআইডি (সামনে) <span className="text-danger">*</span></label>
                          <div className={`upload-box border rounded-3 p-3 text-center ${errors.nid_front_image ? 'border-danger' : 'border-dashed'}`}>
                            {nidFrontPreview ? (
                              <div className="d-flex align-items-center gap-3 justify-content-center">
                                <img src={nidFrontPreview} alt="NID Front" className="rounded-3" style={{ width: 100, height: 70, objectFit: 'cover' }} />
                                <div className="text-start">
                                  <p className="mb-1 small text-muted">আপলোড করা হয়েছে</p>
                                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => { setForm(p => ({ ...p, nid_front_image: null })); setNidFrontPreview(null); }}>
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
                        <div className="col-md-4">
                          <label className="form-label fw-medium">এনআইডি (পেছনে) <span className="text-danger">*</span></label>
                          <div className={`upload-box border rounded-3 p-3 text-center ${errors.nid_back_image ? 'border-danger' : 'border-dashed'}`}>
                            {nidBackPreview ? (
                              <div className="d-flex align-items-center gap-3 justify-content-center">
                                <img src={nidBackPreview} alt="NID Back" className="rounded-3" style={{ width: 100, height: 70, objectFit: 'cover' }} />
                                <div className="text-start">
                                  <p className="mb-1 small text-muted">আপলোড করা হয়েছে</p>
                                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => { setForm(p => ({ ...p, nid_back_image: null })); setNidBackPreview(null); }}>
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
                      </div>

                      <div className="gov-section-title"><i className="bi bi-file-earmark-check"></i>প্রয়োজনীয় নথি</div>
                      <div className="row g-3 mb-4">
                        <div className="col-md-6">
                          <label className="form-label fw-medium">শিক্ষাগত সনদপত্র</label>
                          <div className={`upload-box border rounded-3 p-3 text-center ${errors.education_certificate ? 'border-danger' : 'border-dashed'}`}>
                            {eduCertPreview ? (
                              <div className="d-flex align-items-center gap-3 justify-content-center">
                                <div className="text-start">
                                  <p className="mb-1 small text-muted"><i className="bi bi-file-earmark-check text-success me-1"></i>{form.education_certificate?.name || 'ফাইল আপলোড করা হয়েছে'}</p>
                                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => { setForm(p => ({ ...p, education_certificate: null })); setEduCertPreview(null); }}>
                                    <i className="bi bi-trash me-1"></i>মুছে ফেলুন
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="mb-0 d-block" style={{ cursor: 'pointer' }}>
                                <input type="file" accept="image/*,.pdf" name="education_certificate" onChange={handleChange} className="d-none" />
                                <div className="py-2">
                                  <i className="bi bi-file-earmark-pdf fs-2 text-muted"></i>
                                  <p className="mb-0 mt-2 small text-muted">শিক্ষাগত সনদপত্র নির্বাচন করুন</p>
                                  <p className="mb-0 small text-muted">স্ক্যান কপি (PDF বা ছবি)</p>
                                </div>
                              </label>
                            )}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-medium">সরকারি চাকুরির সনদপত্র</label>
                          <div className={`upload-box border rounded-3 p-3 text-center ${errors.govt_job_certificate ? 'border-danger' : 'border-dashed'}`}>
                            {govtJobPreview ? (
                              <div className="d-flex align-items-center gap-3 justify-content-center">
                                <div className="text-start">
                                  <p className="mb-1 small text-muted"><i className="bi bi-file-earmark-check text-success me-1"></i>{form.govt_job_certificate?.name || 'ফাইল আপলোড করা হয়েছে'}</p>
                                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => { setForm(p => ({ ...p, govt_job_certificate: null })); setGovtJobPreview(null); }}>
                                    <i className="bi bi-trash me-1"></i>মুছে ফেলুন
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="mb-0 d-block" style={{ cursor: 'pointer' }}>
                                <input type="file" accept="image/*,.pdf" name="govt_job_certificate" onChange={handleChange} className="d-none" />
                                <div className="py-2">
                                  <i className="bi bi-file-earmark-pdf fs-2 text-muted"></i>
                                  <p className="mb-0 mt-2 small text-muted">সরকারি চাকুরির সনদপত্র নির্বাচন করুন</p>
                                  <p className="mb-0 small text-muted">স্ক্যান কপি (PDF বা ছবি)</p>
                                </div>
                              </label>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="gov-section-title"><i className="bi bi-signpost-2"></i>সত্যাবচন</div>
                      <div className="mb-3 p-3 bg-light rounded-3" style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
                        <p className="mb-2">আমি ঘোষণা করছি যে, এই আবেদন ফর্মে প্রদত্ত সকল তথ্য আমার জ্ঞান ও বিশ্বাসের ভিত্তিতে সত্য ও সঠিক। কোনো তথ্য মিথ্যা বা ভুল প্রমাণিত হলে আমার আবেদন যেকোনো পর্যায়ে বাতিল করা যেতে পারে এবং আমাকে অযোগ্য ঘোষণা করা যেতে পারে।</p>
                        <p className="mb-0">আমি আরও ঘোষণা করছি যে, আমি প্রশিক্ষণ কার্যক্রম ও নির্বাচন কমিটির সিদ্ধান্ত সমূহের সকল নিয়মকানুন মেনে চলব।</p>
                      </div>
                      <div className="mb-4 p-3 bg-light rounded-3" style={{ fontSize: '0.85rem', lineHeight: 1.7, border: '1px solid #dee2e6' }}>
                        <p className="mb-2"><strong>DECLARATION</strong></p>
                        <p className="mb-2">I hereby declare that the information provided in this application form is true and correct to the best of my knowledge and belief. I understand that if any information provided is found to be false or incorrect, my application may be cancelled at any stage and I may be disqualified.</p>
                        <p className="mb-0">I further declare that I will abide by all the rules and regulations of the training program and the decisions of the selection committee.</p>
                      </div>
                      <div className="mb-4">
                        <div className="form-check">
                          <input className={`form-check-input ${errors.undertaking_agreed ? 'is-invalid' : ''}`} type="checkbox" id="undertakingCheck" checked={undertakingAgreed}
                            onChange={e => { setUndertakingAgreed(e.target.checked); if (errors.undertaking_agreed) setErrors(p => ({ ...p, undertaking_agreed: null })); }} />
                          <label className="form-check-label fw-medium" htmlFor="undertakingCheck">
                            আমি সত্যাবচন ও শর্তাবলী মেনে নিচ্ছি
                          </label>
                          {errors.undertaking_agreed && <div className="invalid-feedback">{errors.undertaking_agreed}</div>}
                        </div>
                      </div>

                      {errors.form && <div className="alert alert-danger py-2 small">{errors.form}</div>}
                      {Object.entries(errors).filter(([k]) => !['form', 'course_selected', 'undertaking_agreed'].includes(k)).length > 0 && (
                        <div className="alert alert-danger py-2 small">
                          <strong>নিচের ক্ষেত্রগুলি ঠিক করুন:</strong>
                          <ul className="mb-0 mt-1 ps-3">
                            {Object.entries(errors).filter(([k]) => !['form', 'course_selected', 'undertaking_agreed'].includes(k)).map(([k, v]) => <li key={k}>{v}</li>)}
                          </ul>
                        </div>
                      )}

                      <div className="d-flex justify-content-between mt-4 pt-3 border-top align-items-center">
                        <button type="button" className="btn btn-outline-secondary px-4" onClick={() => setStep('register')}>
                          <i className="bi bi-arrow-left me-1"></i>পেছনে
                        </button>
                        <div className="d-flex align-items-center gap-3">
                          <small className="text-muted"><i className="bi bi-info-circle me-1"></i>জমা দেওয়ার পর তথ্য পরিবর্তন করা যাবে না</small>
                          <button type="submit" className="btn btn-success btn-lg px-4" disabled={submitting}>
                            {submitting ? (
                              <><span className="spinner-border spinner-border-sm me-1"></span>জমা দেওয়া হচ্ছে...</>
                            ) : (
                              <><i className="bi bi-check-circle me-1"></i>জমা দিন</>
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
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
            <div className="modal-content position-relative">
              <button type="button" className="btn-close position-absolute top-0 end-0 m-2" onClick={handleCloseOtp} aria-label="বন্ধ করুন"></button>
              <div className="modal-body text-center p-4">
                <div className="alert alert-success py-2 mb-3">
                  <i className="bi bi-check-circle-fill me-1"></i>
                  নিবন্ধন সফল হয়েছে!
                </div>
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
