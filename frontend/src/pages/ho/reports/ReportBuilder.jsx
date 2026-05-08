import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useTranslation } from '../../../hooks/useTranslation';
import { REPORT_TYPES } from './reportConfig';

export default function ReportBuilder({ show, onClose, centers, courses, batches }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [form, setForm] = useState({
    report_type: '',
    from_date: '',
    to_date: '',
    centers: [],
    courses: [],
    batches: [],
    schedule: false,
    schedule_frequency: 'weekly',
    schedule_recipients: '',
    schedule_format: 'pdf',
  });

  useEffect(() => {
    if (show) {
      setForm(prev => ({ ...prev, report_type: '' }));
      setPreviewData(null);
    }
  }, [show]);

  const handlePreview = async () => {
    if (!form.report_type) {
      toast.warning(t('report.selectType', 'প্রতিবেদনের ধরণ নির্বাচন করুন'));
      return;
    }
    setLoading(true);
    try {
      const params = {};
      if (form.from_date) params.from_date = form.from_date;
      if (form.to_date) params.to_date = form.to_date;
      if (form.centers.length) params.centers = form.centers.join(',');
      if (form.courses.length) params.courses = form.courses.join(',');
      if (form.batches.length) params.batches = form.batches.join(',');
      const reportKey = form.report_type;
      const res = await hoService.getHOReport(reportKey, params);
      setPreviewData(res.data);
    } catch (err) {
      toast.error(t('report.previewError', 'পূর্বরূপ লোড ব্যর্থ'));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!form.report_type) return;
    try {
      const params = { export: format };
      if (form.from_date) params.from_date = form.from_date;
      if (form.to_date) params.to_date = form.to_date;
      if (form.centers.length) params.centers = form.centers.join(',');
      if (form.courses.length) params.courses = form.courses.join(',');
      if (form.batches.length) params.batches = form.batches.join(',');
      const res = await hoService.exportHOReport(form.report_type, params);
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${form.report_type}_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv'}`;
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('report.exported', 'প্রতিবেদন এক্সপোর্ট করা হয়েছে'));
    } catch (err) {
      toast.error(t('report.exportError', 'এক্সপোর্ট ব্যর্থ'));
    }
  };

  const handleSchedule = async () => {
    try {
      await hoService.createScheduledReport({
        report_type: form.report_type,
        title: REPORT_TYPES.find(r => r.key === form.report_type)?.labelBn || form.report_type,
        frequency: form.schedule_frequency,
        recipients: form.schedule_recipients,
        export_format: form.schedule_format,
        parameters: {
          from_date: form.from_date,
          to_date: form.to_date,
          centers: form.centers,
          courses: form.courses,
          batches: form.batches,
        },
      });
      toast.success(t('report.scheduled', 'প্রতিবেদন নির্ধারণ করা হয়েছে'));
      onClose();
    } catch (err) {
      toast.error(t('report.scheduleError', 'নির্ধারণ ব্যর্থ'));
    }
  };

  const selectedReport = REPORT_TYPES.find(r => r.key === form.report_type);

  return (
    <Modal show={show} onHide={onClose} centered size="xl">
      <Modal.Header closeButton>
        <Modal.Title>
          {form.report_type && selectedReport ? (
            <span><i className={`bi ${selectedReport.icon} me-2`}></i>{selectedReport.labelBn}</span>
          ) : t('report.generate', 'প্রতিবেদন তৈরি')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row g-4">
          <div className="col-md-5">
            <div className="mb-3">
              <label className="fw-semibold mb-1">{t('report.type', 'প্রতিবেদনের ধরণ')}</label>
              <select className="form-select" value={form.report_type}
                onChange={e => setForm({ ...form, report_type: e.target.value, schedule: false })}>
                <option value="">{t('common.select', 'নির্বাচন করুন')}</option>
                {REPORT_TYPES.map(rt => (
                  <option key={rt.key} value={rt.key}>{rt.labelBn}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="fw-semibold mb-1">{t('report.dateRange', 'তারিখ সীমা')}</label>
              <div className="row g-2">
                <div className="col-6">
                  <input type="date" className="form-control form-control-sm" value={form.from_date}
                    onChange={e => setForm({ ...form, from_date: e.target.value })} />
                </div>
                <div className="col-6">
                  <input type="date" className="form-control form-control-sm" value={form.to_date}
                    onChange={e => setForm({ ...form, to_date: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="fw-semibold mb-1">{t('budget.center', 'কেন্দ্র')}</label>
              <select className="form-select form-select-sm" multiple size={3} value={form.centers}
                onChange={e => setForm({ ...form, centers: Array.from(e.target.selectedOptions, o => o.value) })}>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name_bn}</option>)}
              </select>
            </div>

            <div className="mb-3">
              <label className="fw-semibold mb-1">{t('course.title', 'কোর্স')}</label>
              <select className="form-select form-select-sm" multiple size={3} value={form.courses}
                onChange={e => setForm({ ...form, courses: Array.from(e.target.selectedOptions, o => o.value) })}>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name_bn}</option>)}
              </select>
            </div>

            <div className="mb-3">
              <label className="fw-semibold mb-1">{t('batch.title', 'ব্যাচ')}</label>
              <select className="form-select form-select-sm" multiple size={3} value={form.batches}
                onChange={e => setForm({ ...form, batches: Array.from(e.target.selectedOptions, o => o.value) })}>
                {batches.map(b => <option key={b.id} value={b.id}>{b.batch_no} - {b.batch_name_bn}</option>)}
              </select>
            </div>

            <button className="btn btn-outline-primary w-100 mb-2" onClick={handlePreview} disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-eye me-1"></i>}
              {t('report.preview', 'পূর্বরূপ')}
            </button>

            <div className="d-flex gap-2">
              <button className="btn btn-outline-success flex-grow-1 btn-sm" onClick={() => handleExport('csv')}>
                <i className="bi bi-filetype-csv me-1"></i>CSV
              </button>
              <button className="btn btn-outline-primary flex-grow-1 btn-sm" onClick={() => handleExport('excel')}>
                <i className="bi bi-file-earmark-excel me-1"></i>Excel
              </button>
              <button className="btn btn-outline-danger flex-grow-1 btn-sm" onClick={() => handleExport('pdf')}>
                <i className="bi bi-filetype-pdf me-1"></i>PDF
              </button>
            </div>

            <hr />
            <div className="form-check mb-2">
              <input className="form-check-input" type="checkbox" id="scheduleCheck"
                checked={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.checked })} />
              <label className="form-check-label fw-semibold" htmlFor="scheduleCheck">
                {t('report.scheduleReport', 'নির্ধারিত প্রতিবেদন')}
              </label>
            </div>
            {form.schedule && (
              <div className="border rounded-3 p-3 bg-light">
                <div className="mb-2">
                  <label className="form-label mb-0" style={{ fontSize: 12 }}>{t('report.frequency', 'ফ্রিকোয়েন্সি')}</label>
                  <select className="form-select form-select-sm" value={form.schedule_frequency}
                    onChange={e => setForm({ ...form, schedule_frequency: e.target.value })}>
                    <option value="daily">{t('report.daily', 'প্রতিদিন')}</option>
                    <option value="weekly">{t('report.weekly', 'সাপ্তাহিক')}</option>
                    <option value="monthly">{t('report.monthly', 'মাসিক')}</option>
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label mb-0" style={{ fontSize: 12 }}>{t('report.recipients', 'ইমেইল প্রাপক')}</label>
                  <input className="form-control form-control-sm" type="text" value={form.schedule_recipients}
                    onChange={e => setForm({ ...form, schedule_recipients: e.target.value })}
                    placeholder="email1@brtc.gov.bd, email2@brtc.gov.bd" />
                </div>
                <div className="mb-2">
                  <label className="form-label mb-0" style={{ fontSize: 12 }}>{t('report.exportFormat', 'ফরম্যাট')}</label>
                  <select className="form-select form-select-sm" value={form.schedule_format}
                    onChange={e => setForm({ ...form, schedule_format: e.target.value })}>
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-sm w-100" onClick={handleSchedule}>
                  <i className="bi bi-clock me-1"></i>{t('report.saveSchedule', 'নির্ধারণ সংরক্ষণ')}
                </button>
              </div>
            )}
          </div>

          <div className="col-md-7">
            {previewData ? (
              <div>
                <h6 className="fw-bold mb-2">{previewData.title}</h6>
                <div className="table-responsive" style={{ maxHeight: 500, overflowY: 'auto' }}>
                  <table className="table table-sm table-bordered table-hover">
                    <thead className="table-light sticky-top">
                      <tr>
                        {(previewData.headers || []).map((h, i) => (
                          <th key={i} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(previewData.rows || []).map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci} style={{ fontSize: 12 }}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="d-flex flex-column align-items-center justify-content-center text-secondary"
                style={{ minHeight: 400 }}>
                <i className="bi bi-file-earmark-bar-graph fs-1 mb-2"></i>
                <p>{t('report.noPreview', 'পূর্বরূপ দেখতে ফিল্টার নির্বাচন করে "পূর্বরূপ" বাটনে ক্লিক করুন')}</p>
              </div>
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>{t('common.close', 'বন্ধ')}</Button>
        <Button variant="primary" onClick={() => window.print()} disabled={!previewData}>
          <i className="bi bi-printer me-1"></i>{t('common.print', 'প্রিন্ট')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
