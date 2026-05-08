import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import OCRUpload from '../../components/common/OCRUpload';
import publicService from '../../services/publicService';
import { checkOCRStatus } from '../../services/ocrService';
import ApplySuccess from './ApplySuccess';
import './RegistrationForm.css';

const STEPS = ['এনআইডি আপলোড', 'ফর্ম পূরণ', 'যাচাই ও জমা'];

export default function RegistrationForm() {
  const { public_url } = useParams();
  const [step, setStep] = useState(0);
  const [ocrData, setOcrData] = useState(null);
  const [ocrAvailable, setOcrAvailable] = useState(true);
  const [ocrError, setOcrError] = useState(null);
  const [form, setForm] = useState({
    name_bn: '',
    name_en: '',
    father_name_bn: '',
    mother_name_bn: '',
    date_of_birth: '',
    nid: '',
    phone: '',
    email: '',
    present_address: '',
    permanent_address: '',
    education_qualification: '',
    profile_image: null,
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [nidChecking, setNidChecking] = useState(false);
  const [nidExists, setNidExists] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  useEffect(() => {
    checkOCRStatus().then((result) => {
      setOcrAvailable(result.available);
      if (!result.available) {
        setOcrError(result.message);
      }
    });
  }, []);

  const handleOcrExtracted = (data) => {
    setOcrError(null);
    setOcrData(data);
    setForm((prev) => ({
      ...prev,
      nid: data.nid || prev.nid,
      name_bn: data.name_bn || prev.name_bn,
      father_name_bn: data.father_name || prev.father_name_bn,
      mother_name_bn: data.mother_name || prev.mother_name_bn,
      date_of_birth: data.date_of_birth
        ? formatDob(data.date_of_birth)
        : prev.date_of_birth,
      present_address: data.address || prev.present_address,
    }));
    setStep(1);
  };

  const formatDob = (raw) => {
    const parts = raw.match(/(\d{2})[\s/.-]*(\d{2})[\s/.-]*(\d{4})/);
    if (parts) return `${parts[3]}-${parts[2]}-${parts[1]}`;
    return raw;
  };

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

  const validateStep1 = () => {
    const errs = {};
    if (!form.name_bn.trim()) errs.name_bn = 'নাম বাংলায় লিখুন';
    if (!form.father_name_bn.trim()) errs.father_name_bn = 'পিতার নাম লিখুন';
    if (!form.mother_name_bn.trim()) errs.mother_name_bn = 'মাতার নাম লিখুন';
    if (!form.date_of_birth) errs.date_of_birth = 'জন্ম তারিখ নির্বাচন করুন';
    if (!form.nid.trim()) errs.nid = 'এনআইডি নম্বর দিন';
    if (!form.phone.trim()) errs.phone = 'মোবাইল নম্বর দিন';
    else if (!/^01\d{9}$/.test(form.phone)) errs.phone = '১১ ডিজিটের বৈধ নম্বর দিন (01XXXXXXXXX)';
    if (!form.present_address.trim()) errs.present_address = 'বর্তমান ঠিকানা লিখুন';
    if (!form.education_qualification.trim()) errs.education_qualification = 'শিক্ষাগত যোগ্যতা লিখুন';

    if (form.date_of_birth) {
      const dob = new Date(form.date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 18) errs.date_of_birth = 'বয়স কমপক্ষে ১৮ বছর হতে হবে';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNidBlur = async () => {
    if (form.nid.length >= 10) {
      setNidChecking(true);
      try {
        const { data } = await publicService.checkNid(form.nid);
        setNidExists(data.exists);
        if (data.exists) {
          setErrors((prev) => ({ ...prev, nid: 'এই এনআইডি দিয়ে ইতিমধ্যে আবেদন করা হয়েছে' }));
        }
      } catch {
        // silent
      } finally {
        setNidChecking(false);
      }
    }
  };

  const goToStep2 = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('circular_url', public_url);
      Object.entries(form).forEach(([key, val]) => {
        if (val !== null && val !== undefined) {
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

  const renderOcrStep = () => (
    <>
      {!ocrAvailable && (
        <div className="alert alert-warning d-flex align-items-center gap-2">
          <i className="bi bi-exclamation-triangle fs-4"></i>
          <span>
            {ocrError || 'OCR সার্ভার উপলব্ধ নেই'} — দয়া করে ম্যানুয়ালি তথ্য পূরণ করুন।
            <button
              className="btn btn-sm btn-outline-warning ms-2"
              onClick={() => { setStep(1); setOcrError(null); }}
            >
              ফর্মে যান
            </button>
          </span>
        </div>
      )}
      <OCRUpload
        onExtracted={handleOcrExtracted}
        onBack={() => window.history.back()}
        disabled={!ocrAvailable}
        onError={setOcrError}
      />
    </>
  );

  const renderField = (name, label, opts = {}) => {
    const { type = 'text', placeholder = '', required = true, col = 'col-12' } = opts;
    return (
      <div className={col}>
        <label className="form-label">
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </label>
        {type === 'textarea' ? (
          <textarea
            className={`form-control ${errors[name] ? 'is-invalid' : ''}`}
            name={name}
            value={form[name]}
            onChange={handleChange}
            rows={3}
            placeholder={placeholder}
          />
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
              <input className="form-control" type="file" accept="image/*" name="profile_image" onChange={handleChange} />
            )}
          </div>
        ) : (
          <input
            type={type}
            className={`form-control ${errors[name] ? 'is-invalid' : ''}`}
            name={name}
            value={form[name]}
            onChange={handleChange}
            onBlur={name === 'nid' ? handleNidBlur : undefined}
            placeholder={placeholder}
            readOnly={opts.readOnly}
          />
        )}
        {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
        {name === 'nid' && nidChecking && (
          <small className="text-info"><i className="bi bi-arrow-repeat me-1"></i>যাচাই করা হচ্ছে...</small>
        )}
      </div>
    );
  };

  const renderFormStep = () => (
    <div>
      <div className="row g-3">
        <div className="col-12">
          <h5 className="section-title">ব্যক্তিগত তথ্য</h5>
          <hr />
        </div>
        {renderField('name_bn', 'নাম (বাংলায়)', { col: 'col-md-6' })}
        {renderField('name_en', 'নাম (ইংরেজিতে)', { required: false, col: 'col-md-6' })}
        {renderField('father_name_bn', 'পিতার নাম', { col: 'col-md-6' })}
        {renderField('mother_name_bn', 'মাতার নাম', { col: 'col-md-6' })}
        {renderField('date_of_birth', 'জন্ম তারিখ', { type: 'date', col: 'col-md-4' })}
        {renderField('nid', 'এনআইডি নম্বর', {
          col: 'col-md-4',
          placeholder: '১০ বা ১৭ ডিজিট',
          readOnly: !!(ocrData?.nid),
        })}
        {renderField('phone', 'মোবাইল নম্বর', {
          col: 'col-md-4',
          placeholder: '01XXXXXXXXX',
        })}

        <div className="col-12 mt-3">
          <h5 className="section-title">যোগাযোগ ও ঠিকানা</h5>
          <hr />
        </div>
        {renderField('email', 'ইমেইল', { type: 'email', required: false, col: 'col-md-6' })}
        {renderField('present_address', 'বর্তমান ঠিকানা', { type: 'textarea', col: 'col-md-6' })}
        {renderField('permanent_address', 'স্থায়ী ঠিকানা', { type: 'textarea', required: false, col: 'col-md-6' })}

        <div className="col-12 mt-3">
          <h5 className="section-title">অন্যান্য তথ্য</h5>
          <hr />
        </div>
        {renderField('education_qualification', 'শিক্ষাগত যোগ্যতা', { type: 'textarea', col: 'col-md-6' })}
        {renderField('profile_image', 'প্রোফাইল ছবি', { type: 'file', required: false, col: 'col-md-6' })}
      </div>

      <div className="d-flex justify-content-between mt-4">
        <button className="btn btn-outline-secondary" onClick={() => setStep(0)}>
          <i className="bi bi-arrow-left me-1"></i>পেছনে
        </button>
        <button className="btn btn-primary" onClick={goToStep2}>
          পরবর্তী<i className="bi bi-arrow-right ms-1"></i>
        </button>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div>
      <div className="review-card p-4 border rounded mb-4">
        <h5 className="section-title mb-3">আপনার দেয়া তথ্য</h5>
        <table className="table table-bordered review-table">
          <tbody>
            {[
              ['নাম (বাংলায়)', form.name_bn],
              ['নাম (ইংরেজিতে)', form.name_en || '—'],
              ['পিতার নাম', form.father_name_bn],
              ['মাতার নাম', form.mother_name_bn],
              ['জন্ম তারিখ', form.date_of_birth],
              ['এনআইডি নম্বর', form.nid],
              ['মোবাইল', form.phone],
              ['ইমেইল', form.email || '—'],
              ['বর্তমান ঠিকানা', form.present_address],
              ['স্থায়ী ঠিকানা', form.permanent_address || '—'],
              ['শিক্ষাগত যোগ্যতা', form.education_qualification],
            ].map(([label, val]) => (
              <tr key={label}>
                <th className="text-nowrap" style={{ width: 180 }}>{label}</th>
                <td>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {photoPreview && (
          <div className="mt-2">
            <strong>প্রোফাইল ছবি:</strong>
            <img src={photoPreview} alt="Profile" className="d-block mt-1 rounded" style={{ width: 100, height: 100, objectFit: 'cover' }} />
          </div>
        )}
      </div>

      {errors.form && (
        <div className="alert alert-danger">{errors.form}</div>
      )}

      <div className="d-flex justify-content-between">
        <button className="btn btn-outline-secondary" onClick={() => setStep(1)}>
          <i className="bi bi-pencil me-1"></i>সম্পাদনা
        </button>
        <button
          className="btn btn-success btn-lg"
          onClick={handleSubmit}
          disabled={submitting}
        >
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

      <p className="text-muted small mt-3 text-center">
        <i className="bi bi-info-circle me-1"></i>
        জমা দেওয়ার পর তথ্য পরিবর্তন করা যাবে না
      </p>
    </div>
  );

  return (
    <div className="registration-page">
      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h3 className="text-center mb-4">প্রশিক্ষণে আবেদন</h3>

                {/* Steps Indicator */}
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
                  {step === 0 && renderOcrStep()}
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
