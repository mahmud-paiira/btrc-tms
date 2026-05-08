import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import jobService from '../../services/jobService';
import { useTranslation } from '../../hooks/useTranslation';
import './JobPlacement.css';

const defaultForm = {
  batch: '',
  trainee: '',
  employment_type: 'wages_employment',
  employer_name: '',
  employer_address: '',
  designation_bn: '',
  designation_en: '',
  salary: '',
  start_date: new Date().toISOString().split('T')[0],
  contact_person: '',
  contact_phone: '',
};

export default function JobPlacementForm() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [batches, setBatches] = useState([]);
  const [trainees, setTrainees] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  const EMPLOYMENT_TYPES = [
    { value: 'self_employment', label: t('job.employmentTypes.self', 'স্ব-কর্মসংস্থান'), icon: 'bi-person-workspace' },
    { value: 'wages_employment', label: t('job.employmentTypes.wages', 'মজুরি-কর্মসংস্থান'), icon: 'bi-cash-stack' },
    { value: 'up_skill_employment', label: t('job.employmentTypes.upSkill', 'আপ-স্কিল কর্মসংস্থান'), icon: 'bi-graph-up-arrow' },
  ];

  const fetchBatches = useCallback(async () => {
    try {
      const { data } = await jobService.getBatches({ status: 'completed' });
      setBatches(data.results || data || []);
    } catch {
      toast.error(t('job.placement.batchLoadFailed', 'ব্যাচ তালিকা লোড করতে ব্যর্থ'));
    }
  }, [t]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const fetchTrainees = useCallback(async () => {
    if (!form.batch) {
      setTrainees([]);
      return;
    }
    try {
      const { data } = await jobService.getCertifiedTrainees(form.batch);
      const eligible = (data.trainees || []).filter((tr) => tr.eligible);
      setTrainees(eligible);
    } catch {
      toast.error(t('job.placement.traineeLoadFailed', 'প্রশিক্ষণার্থী তালিকা লোড করতে ব্যর্থ'));
      setTrainees([]);
    }
  }, [form.batch, t]);

  useEffect(() => { fetchTrainees(); }, [fetchTrainees]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.trainee) {
      toast.warning(t('job.placement.selectTrainee', 'প্রশিক্ষণার্থী নির্বাচন করুন'));
      return;
    }
    if (!form.employer_name.trim()) {
      toast.warning(t('job.placement.enterEmployer', 'নিয়োগকর্তার নাম লিখুন'));
      return;
    }
    if (!form.designation_bn.trim()) {
      toast.warning(t('job.placement.enterDesignation', 'পদবী লিখুন'));
      return;
    }
    if (!form.salary || parseFloat(form.salary) <= 0) {
      toast.warning(t('job.placement.enterValidSalary', 'বৈধ বেতন দিন'));
      return;
    }

    setSubmitting(true);
    try {
      await jobService.createJob({
        batch: parseInt(form.batch),
        trainee: parseInt(form.trainee),
        employment_type: form.employment_type,
        employer_name: form.employer_name.trim(),
        employer_address: form.employer_address.trim(),
        designation_bn: form.designation_bn.trim(),
        designation_en: form.designation_en.trim(),
        salary: parseFloat(form.salary),
        start_date: form.start_date,
        contact_person: form.contact_person.trim(),
        contact_phone: form.contact_phone.trim(),
      });
      toast.success(t('job.placement.saveSuccess', 'চাকরি স্থাপন সফলভাবে যোগ করা হয়েছে'));
      setForm(defaultForm);
    } catch (err) {
      const msg = err.response?.data?.error
        || err.response?.data?.detail
        || Object.values(err.response?.data || {}).flat().join(', ')
        || t('job.placement.saveFailed', 'সংরক্ষণ করতে ব্যর্থ');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="job-placement-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button className="btn btn-outline-secondary btn-sm me-2" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left me-1"></i>{t('site.back', 'পেছনে')}
          </button>
          <h4 className="d-inline-block mb-0 align-middle">
            <i className="bi bi-briefcase me-2"></i>{t('job.placement.title', 'চাকরি স্থাপন')}
          </h4>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-8">
          <form onSubmit={handleSubmit}>
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-primary text-white">
                <h6 className="mb-0"><i className="bi bi-person-badge me-2"></i>{t('job.placement.selectTraineeSection', 'প্রশিক্ষণার্থী নির্বাচন')}</h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold">{t('job.placement.batch', 'ব্যাচ')}</label>
                    <select className="form-select" name="batch" value={form.batch} onChange={handleChange} required>
                      <option value="">{t('site.select', '-- নির্বাচন করুন --')}</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batch_name_bn || b.batch_no}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">{t('job.placement.qualifiedTrainees', 'যোগ্য প্রশিক্ষণার্থী')}</label>
                    <select className="form-select" name="trainee" value={form.trainee} onChange={handleChange} required disabled={!form.batch}>
                      <option value="">{t('site.select', '-- নির্বাচন করুন --')}</option>
                      {trainees.map((tr) => (
                        <option key={tr.trainee_id} value={tr.trainee_id}>
                          {tr.trainee_name} ({tr.trainee_reg_no})
                        </option>
                      ))}
                    </select>
                    {!form.batch && <small className="text-muted">{t('job.placement.selectBatchFirst', 'প্রথমে ব্যাচ নির্বাচন করুন')}</small>}
                  </div>
                </div>
              </div>
            </div>

            <div className="card shadow-sm mb-4">
              <div className="card-header bg-primary text-white">
                <h6 className="mb-0"><i className="bi bi-briefcase me-2"></i>{t('job.placement.employmentType', 'কর্মসংস্থানের ধরণ')}</h6>
              </div>
              <div className="card-body">
                <div className="d-flex gap-3">
                  {EMPLOYMENT_TYPES.map((et) => (
                    <div className="form-check form-check-inline" key={et.value}>
                      <input
                        className="form-check-input"
                        type="radio"
                        name="employment_type"
                        id={`et_${et.value}`}
                        value={et.value}
                        checked={form.employment_type === et.value}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor={`et_${et.value}`}>
                        <i className={`bi ${et.icon} me-1`}></i>{et.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card shadow-sm mb-4">
              <div className="card-header bg-primary text-white">
                <h6 className="mb-0"><i className="bi bi-building me-2"></i>{t('job.placement.employerInfo', 'নিয়োগকর্তার তথ্য')}</h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold">{t('job.placement.employerName', 'নিয়োগকর্তার নাম')} <span className="text-danger">*</span></label>
                    <input className="form-control" name="employer_name" value={form.employer_name} onChange={handleChange} placeholder={t('job.placement.employerNamePlaceholder', 'যেমন: ABC কোম্পানি লিমিটেড')} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">{t('job.placement.address', 'ঠিকানা')}</label>
                    <input className="form-control" name="employer_address" value={form.employer_address} onChange={handleChange} placeholder={t('job.placement.addressPlaceholder', 'নিয়োগকর্তার ঠিকানা')} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">{t('job.placement.designationBn', 'পদবী (বাংলায়)')} <span className="text-danger">*</span></label>
                    <input className="form-control" name="designation_bn" value={form.designation_bn} onChange={handleChange} placeholder={t('job.placement.designationBnPlaceholder', 'যেমন: জুনিয়র সফটওয়্যার ইঞ্জিনিয়ার')} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">{t('job.placement.designationEn', 'পদবী (ইংরেজিতে)')}</label>
                    <input className="form-control" name="designation_en" value={form.designation_en} onChange={handleChange} placeholder="e.g. Junior Software Engineer" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold">{t('job.placement.salary', 'বেতন')} <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text">{t('job.placement.currency', '৳')}</span>
                      <input type="number" className="form-control" name="salary" value={form.salary} onChange={handleChange} min={0} step={0.01} required />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold">{t('job.placement.startDate', 'শুরুর তারিখ')}</label>
                    <input type="date" className="form-control" name="start_date" value={form.start_date} onChange={handleChange} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold">{t('job.placement.contactPerson', 'যোগাযোগ ব্যক্তি')}</label>
                    <input className="form-control" name="contact_person" value={form.contact_person} onChange={handleChange} placeholder={t('job.placement.contactPersonPlaceholder', 'যোগাযোগ ব্যক্তির নাম')} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold">{t('job.placement.contactPhone', 'যোগাযোগের মোবাইল')}</label>
                    <input className="form-control" name="contact_phone" value={form.contact_phone} onChange={handleChange} placeholder={t('job.placement.contactPhonePlaceholder', '০১XXXXXXXXX')} />
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2 justify-content-end">
              <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>{t('site.cancel', 'বাতিল')}</button>
              <button type="submit" className="btn btn-primary px-4" disabled={submitting}>
                {submitting ? (
                  <><span className="spinner-border spinner-border-sm me-1"></span>{t('job.placement.saving', 'সংরক্ষণ হচ্ছে...')}</>
                ) : (
                  <><i className="bi bi-check-lg me-1"></i>{t('job.placement.place', 'স্থাপন করুন')}</>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-info text-white">
              <h6 className="mb-0"><i className="bi bi-info-circle me-2"></i>{t('job.placement.guidelines', 'নির্দেশিকা')}</h6>
            </div>
            <div className="card-body">
              <ul className="mb-0 small">
                <li className="mb-2">{t('job.placement.guide1', 'শুধুমাত্র সার্টিফিকেট প্রাপ্ত প্রশিক্ষণার্থীদের জন্য চাকরি স্থাপন যোগ করা যাবে।')}</li>
                <li className="mb-2">{t('job.placement.guide2', 'কর্মসংস্থানের ধরণ সঠিকভাবে নির্বাচন করুন।')}</li>
                <li className="mb-2">{t('job.placement.guide3', 'প্রতিটি প্রশিক্ষণার্থীর জন্য আলাদা এন্ট্রি তৈরি করতে হবে।')}</li>
                <li>{t('job.placement.guide4', 'চাকরি স্থাপনের পর ৩, ৬, ও ১২ মাস পর ট্র্যাকিং করতে হবে।')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
