import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import batchService from '../../services/batchService';
import WeekPlanBuilder from '../../components/batches/WeekPlanBuilder';
import { useTranslation } from '../../hooks/useTranslation';

const DAYS_OF_WEEK = [
  { value: 6, label: 'শনিবার' },
  { value: 0, label: 'রবিবার' },
  { value: 1, label: 'সোমবার' },
  { value: 2, label: 'মঙ্গলবার' },
  { value: 3, label: 'বুধবার' },
  { value: 4, label: 'বৃহস্পতিবার' },
  { value: 5, label: 'শুক্রবার' },
];

export default function BatchCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);

  const [circulars, setCirculars] = useState([]);
  const [courses, setCourses] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batchId, setBatchId] = useState(editId || null);
  const [weekPlans, setWeekPlans] = useState([]);
  const [form, setForm] = useState({
    circular: '',
    course: '',
    batch_name_bn: '',
    batch_name_en: '',
    total_seats: 30,
    start_date: '',
    end_date: '',
    custom_batch_no: '',
  });

  const fetchDeps = useCallback(async () => {
    try {
      const [circRes, courseRes] = await Promise.all([
        api.get('/circulars/center-admin/', { params: { page_size: 100 } }),
        api.get('/courses/', { params: { page_size: 100 } }),
      ]);
      setCirculars(circRes.data.results || circRes.data || []);
      setCourses(courseRes.data.results || courseRes.data || []);
    } catch {
      toast.error(t('batch.create.empty', 'প্রাথমিক তথ্য লোড করতে ব্যর্থ'));
    }
  }, []);

  useEffect(() => { fetchDeps(); }, [fetchDeps]);

  const fetchBatch = useCallback(async () => {
    if (!editId) return;
    setLoading(true);
    try {
      const { data } = await batchService.get(editId);
      setForm({
        circular: data.circular || '',
        course: data.course || '',
        batch_name_bn: data.batch_name_bn || '',
        batch_name_en: data.batch_name_en || '',
        total_seats: data.total_seats || 30,
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        custom_batch_no: data.custom_batch_no || '',
      });
      const wpRes = await batchService.getWeekPlans(editId);
      setWeekPlans(wpRes.data.results || wpRes.data || []);
    } catch {
      toast.error(t('batch.create.infoLoadFailed', 'ব্যাচ তথ্য লোড করতে ব্যর্থ'));
    } finally {
      setLoading(false);
    }
  }, [editId]);

  useEffect(() => { fetchBatch(); }, [fetchBatch]);

  const fetchTrainers = useCallback(async () => {
    try {
      const { data } = await api.get('/trainers/', {
        params: { approval_status: 'approved', page_size: 200 },
      });
      setTrainers(data.results || data || []);
    } catch {
      toast.error(t('batch.create.trainerLoadFailed', 'প্রশিক্ষক তালিকা লোড করতে ব্যর্থ'));
    }
  }, []);

  useEffect(() => { fetchTrainers(); }, [fetchTrainers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCircularChange = (e) => {
    const circId = e.target.value;
    const circ = circulars.find((c) => c.id === parseInt(circId));
    setForm((prev) => ({
      ...prev,
      circular: circId,
      course: circ?.course || '',
      ...(circ?.training_start_date && !editId ? { start_date: circ.training_start_date } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.circular || !form.course || !form.batch_name_bn || !form.start_date || !form.end_date || !form.total_seats) {
      toast.warning(t('batch.create.required', 'প্রয়োজনীয় সকল ক্ষেত্র পূরণ করুন'));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        circular: parseInt(form.circular),
        course: parseInt(form.course),
        total_seats: parseInt(form.total_seats),
        center: undefined,
      };

      let data;
      if (isEdit) {
        const res = await batchService.update(editId, payload);
        data = res.data;
        toast.success(t('batch.create.updateSuccess', 'ব্যাচ আপডেট করা হয়েছে'));
      } else {
        const res = await batchService.create(payload);
        data = res.data;
        setBatchId(data.id);
        toast.success(t('batch.create.createSuccess', 'ব্যাচ তৈরি করা হয়েছে। এখন সাপ্তাহিক পরিকল্পনা যোগ করুন।'));
      }
    } catch (err) {
      const msg = err.response?.data?.error ||
        Object.values(err.response?.data || {}).flat().join(', ') ||
        t('batch.create.saveFailed', 'সংরক্ষণ করতে ব্যর্থ');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWeekPlansChange = (plans) => {
    setWeekPlans(plans);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button className="btn btn-outline-secondary btn-sm me-2" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left me-1"></i>{t('site.back', 'পেছনে')}
          </button>
          <h4 className="d-inline-block mb-0 align-middle">
            <i className={`bi ${isEdit ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
            {isEdit ? t('batch.create.titleEdit', 'ব্যাচ সম্পাদনা') : t('batch.create.titleNew', 'নতুন ব্যাচ তৈরি')}
          </h4>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <form onSubmit={handleSubmit}>
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-primary text-white">
                <h6 className="mb-0"><i className="bi bi-info-circle me-2"></i>{t('batch.create.info', 'ব্যাচের তথ্য')}</h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold">{t('batch.create.circular', 'সার্কুলার')} <span className="text-danger">*</span></label>
                    <select className="form-select" name="circular" value={form.circular} onChange={handleCircularChange} required>
                      <option value="">{t('site.select', '-- নির্বাচন করুন --')}</option>
                      {circulars.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title_bn || c.title_en} ({c.circular_no})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">{t('batch.create.course', 'কোর্স')} <span className="text-danger">*</span></label>
                    <select className="form-select" name="course" value={form.course} onChange={handleChange} required>
                      <option value="">{t('site.select', '-- নির্বাচন করুন --')}</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name_bn || c.name_en}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">{t('batch.create.nameBn', 'ব্যাচের নাম (বাংলায়)')} <span className="text-danger">*</span></label>
                    <input className="form-control" name="batch_name_bn" value={form.batch_name_bn} onChange={handleChange} placeholder={t('batch.create.nameBnPlaceholder', 'যেমন: বিআরটিসি ব্যাচ ২০২৬-০১')} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">{t('batch.create.nameEn', 'ব্যাচের নাম (ইংরেজিতে)')}</label>
                    <input className="form-control" name="batch_name_en" value={form.batch_name_en} onChange={handleChange} placeholder="e.g. BRTC Batch 2026-01" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold">{t('batch.create.startDate', 'শুরুর তারিখ')} <span className="text-danger">*</span></label>
                    <input type="date" className="form-control" name="start_date" value={form.start_date} onChange={handleChange} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold">{t('batch.create.endDate', 'শেষের তারিখ')} <span className="text-danger">*</span></label>
                    <input type="date" className="form-control" name="end_date" value={form.end_date} onChange={handleChange} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold">{t('batch.create.totalSeats', 'মোট আসন')} <span className="text-danger">*</span></label>
                    <input type="number" className="form-control" name="total_seats" value={form.total_seats} onChange={handleChange} min={1} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">{t('batch.create.customNo', 'কাস্টম ব্যাচ নং')}</label>
                    <input className="form-control" name="custom_batch_no" value={form.custom_batch_no} onChange={handleChange} placeholder={t('batch.create.customNoPlaceholder', 'ঐচ্ছিক: নিজস্ব নম্বর')} />
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2 justify-content-end">
              <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/center-admin/batches')}>
                {t('site.cancel', 'বাতিল')}
              </button>
              <button type="submit" className="btn btn-primary px-4" disabled={submitting}>
                {submitting ? (
                  <><span className="spinner-border spinner-border-sm me-1"></span>{t('batch.create.saving', 'সংরক্ষণ হচ্ছে...')}</>
                ) : (
                  <><i className="bi bi-check-lg me-1"></i>{isEdit ? t('batch.create.titleEdit', 'আপডেট') : t('batch.create.titleNew', 'তৈরি করুন')}</>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="col-lg-5">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-info text-white">
              <h6 className="mb-0"><i className="bi bi-info-circle me-2"></i>{t('batch.create.guidelines', 'নির্দেশিকা')}</h6>
            </div>
            <div className="card-body">
              <ul className="mb-0 small">
                <li className="mb-2">{t('batch.create.guide1', 'প্রথমে সার্কুলার নির্বাচন করলে কোর্স ও শুরুর তারিখ স্বয়ংক্রীয়ভাবে বসে যাবে।')}</li>
                <li className="mb-2">{t('batch.create.guide2', 'শেষের তারিখ শুরুর তারিখের পরে হতে হবে।')}</li>
                <li className="mb-2">{t('batch.create.guide3', 'ব্যাচ তৈরি হওয়ার পর সাপ্তাহিক পরিকল্পনা যুক্ত করতে হবে।')}</li>
                <li className="mb-2">{t('batch.create.guide4', 'সাপ্তাহিক পরিকল্পনার মোট ঘন্টা কোর্সের মোট ঘন্টার সাথে মিলতে হবে।')}</li>
                <li>{t('batch.create.guide5', 'ব্যাচ শুরু করতে সাপ্তাহিক পরিকল্পনা সম্পূর্ণ ও বৈধ হতে হবে।')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {batchId && (
        <div className="mt-4">
          <WeekPlanBuilder
            batchId={batchId}
            initialPlans={weekPlans}
            trainers={trainers}
            courseId={form.course}
            onPlansChange={handleWeekPlansChange}
          />
        </div>
      )}
    </div>
  );
}
