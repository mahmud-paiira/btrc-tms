import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useTranslation } from '../../../hooks/useTranslation';
import { REPORT_TYPES } from './reportConfig';

export default function ScheduledReports({ show, onClose }) {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (show) fetchSchedules();
  }, [show]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await hoService.listScheduledReports();
      setSchedules(res.data.results || res.data || []);
    } catch {
      toast.error(t('report.loadSchedulesError', 'নির্ধারিত প্রতিবেদন লোড ব্যর্থ'));
    } finally {
      setLoading(false);
    }
  };

  const toggleSchedule = async (s) => {
    try {
      await hoService.updateScheduledReport(s.id, { is_active: !s.is_active });
      toast.success(s.is_active ? t('report.disabled', 'নিষ্ক্রিয় করা হয়েছে') : t('report.enabled', 'সক্রিয় করা হয়েছে'));
      fetchSchedules();
    } catch {
      toast.error(t('report.updateError', 'আপডেট ব্যর্থ'));
    }
  };

  const deleteSchedule = async (id) => {
    try {
      await hoService.deleteScheduledReport(id);
      toast.success(t('report.deleted', 'মুছে ফেলা হয়েছে'));
      fetchSchedules();
    } catch {
      toast.error(t('report.deleteError', 'মুছতে ব্যর্থ'));
    }
  };

  const freqLabel = { daily: 'প্রতিদিন', weekly: 'সাপ্তাহিক', monthly: 'মাসিক' };

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title><i className="bi bi-clock-history me-2"></i>{t('report.scheduledReports', 'নির্ধারিত প্রতিবেদন')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
        ) : schedules.length === 0 ? (
          <div className="text-center text-secondary py-5">
            <i className="bi bi-inbox fs-1"></i>
            <p className="mt-2">{t('report.noSchedules', 'কোন নির্ধারিত প্রতিবেদন নেই')}</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="table-light">
                <tr>
                  <th style={{ fontSize: 13 }}>{t('report.title', 'শিরোনাম')}</th>
                  <th style={{ fontSize: 13 }}>{t('report.frequency', 'ফ্রিকোয়েন্সি')}</th>
                  <th style={{ fontSize: 13 }}>{t('report.recipients', 'প্রাপক')}</th>
                  <th style={{ fontSize: 13 }}>{t('report.format', 'ফরম্যাট')}</th>
                  <th style={{ fontSize: 13 }}>{t('report.lastRun', 'শেষ চালানো')}</th>
                  <th style={{ fontSize: 13 }}>{t('common.status', 'অবস্থা')}</th>
                  <th style={{ fontSize: 13 }}>{t('common.actions', 'অপশন')}</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(s => {
                  const rt = REPORT_TYPES.find(r => r.key === s.report_type);
                  return (
                    <tr key={s.id}>
                      <td style={{ fontSize: 13 }}>
                        {rt && <i className={`bi ${rt.icon} me-1`} style={{ color: rt.color }}></i>}
                        {s.title}
                      </td>
                      <td style={{ fontSize: 13 }}><span className="badge bg-info">{freqLabel[s.frequency] || s.frequency}</span></td>
                      <td style={{ fontSize: 12 }}>{s.recipients?.length > 30 ? s.recipients.slice(0, 30) + '...' : s.recipients}</td>
                      <td style={{ fontSize: 13 }}><span className="badge bg-secondary">{s.export_format?.toUpperCase()}</span></td>
                      <td style={{ fontSize: 12 }}>{s.last_run_at ? new Date(s.last_run_at).toLocaleDateString() : '-'}</td>
                      <td>
                        <span className={`badge ${s.is_active ? 'bg-success' : 'bg-secondary'}`}>
                          {s.is_active ? t('common.active', 'সক্রিয়') : t('common.inactive', 'নিষ্ক্রিয়')}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-outline-warning" onClick={() => toggleSchedule(s)}>
                            <i className={`bi ${s.is_active ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => deleteSchedule(s.id)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>{t('common.close', 'বন্ধ')}</Button>
      </Modal.Footer>
    </Modal>
  );
}
