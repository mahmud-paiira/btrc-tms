import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useTranslation } from '../../../hooks/useTranslation';

export default function BudgetForm({ show, onClose, onSaved, budget, centers, fiscalYears }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({
    center: '',
    fiscal_year: '',
    course: '',
    allocated_amount: '',
    notes: '',
  });

  useEffect(() => {
    if (budget) {
      setForm({
        center: budget.center || '',
        fiscal_year: budget.fiscal_year || '',
        course: budget.course || '',
        allocated_amount: budget.allocated_amount || '',
        notes: budget.notes || '',
      });
    } else {
      setForm({ center: '', fiscal_year: '', course: '', allocated_amount: '', notes: '' });
    }
  }, [budget, show]);

  useEffect(() => {
    hoService.listCourses({ status: 'active' }).then(res => {
      setCourses(res.data.results || res.data || []);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.center || !form.fiscal_year || !form.allocated_amount) {
      toast.warning(t('budget.requiredFields', 'কেন্দ্র, অর্থবছর ও বরাদ্দকৃত অর্থ আবশ্যক'));
      return;
    }
    setLoading(true);
    try {
      const payload = {
        center: Number(form.center),
        fiscal_year: form.fiscal_year,
        allocated_amount: Number(form.allocated_amount),
        notes: form.notes,
      };
      if (form.course) payload.course = Number(form.course);

      if (budget) {
        await hoService.updateBudget(budget.id, payload);
        toast.success(t('budget.updated', 'বাজেট হালনাগাদ করা হয়েছে'));
      } else {
        await hoService.createBudget(payload);
        toast.success(t('budget.created', 'বাজেট তৈরি করা হয়েছে'));
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.allocated_amount?.[0] || t('budget.saveError', 'সংরক্ষণ ব্যর্থ');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {budget ? t('budget.edit', 'বাজেট সম্পাদনা') : t('budget.create', 'নতুন বাজেট')}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="row g-3">
            <div className="col-md-6">
              <Form.Group>
                <Form.Label className="fw-semibold">{t('budget.center', 'কেন্দ্র')} *</Form.Label>
                <Form.Select value={form.center} onChange={e => setForm({ ...form, center: e.target.value })} required>
                  <option value="">{t('common.select', 'নির্বাচন করুন')}</option>
                  {centers.map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name_bn}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group>
                <Form.Label className="fw-semibold">{t('budget.fiscalYear', 'অর্থবছর')} *</Form.Label>
                <Form.Select value={form.fiscal_year} onChange={e => setForm({ ...form, fiscal_year: e.target.value })} required>
                  <option value="">{t('common.select', 'নির্বাচন করুন')}</option>
                  {fiscalYears.map(fy => (
                    <option key={fy} value={fy}>{fy}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group>
                <Form.Label className="fw-semibold">{t('budget.amount', 'বরাদ্দকৃত অর্থ')} *</Form.Label>
                <Form.Control
                  type="number" step="0.01" min="0"
                  value={form.allocated_amount}
                  onChange={e => setForm({ ...form, allocated_amount: e.target.value })}
                  required
                />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group>
                <Form.Label className="fw-semibold">{t('budget.course', 'কোর্স (ঐচ্ছিক)')}</Form.Label>
                <Form.Select value={form.course} onChange={e => setForm({ ...form, course: e.target.value })}>
                  <option value="">{t('common.none', 'ছাড়া')}</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name_bn}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-12">
              <Form.Group>
                <Form.Label className="fw-semibold">{t('budget.notes', 'মন্তব্য')}</Form.Label>
                <Form.Control
                  as="textarea" rows={2}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                />
              </Form.Group>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel', 'বাতিল')}</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner-border spinner-border-sm me-1" /> : null}
            {budget ? t('common.update', 'হালনাগাদ') : t('common.save', 'সংরক্ষণ')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
