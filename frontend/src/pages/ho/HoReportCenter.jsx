import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';
import { useTranslation } from '../../hooks/useTranslation';
import { REPORT_TYPES } from './reports/reportConfig';
import ReportBuilder from './reports/ReportBuilder';
import ScheduledReports from './reports/ScheduledReports';

export default function HoReportCenter() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [centers, setCenters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showSchedules, setShowSchedules] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      hoService.listCenters({ status: 'active', page_size: 50 }),
      hoService.listCourses({ status: 'active', page_size: 50 }),
      hoService.listBatches?.({ page_size: 50 }).catch(() => ({ data: [] })) || Promise.resolve({ data: [] }),
    ]).then(([cRes, coRes, bRes]) => {
      setCenters(cRes.data.results || cRes.data || []);
      setCourses(coRes.data.results || coRes.data || []);
      setBatches(bRes?.data?.results || bRes?.data || []);
    }).catch(() => {});
  }, []);

  const fetchRecent = useCallback(async () => {
    try {
      const res = await hoService.listReports({ page_size: 10 });
      setReports(res.data.results || res.data || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecent(); }, [fetchRecent]);

  const handleCardClick = async (rt) => {
    setSelectedType(rt);
    setPreviewLoading(true);
    setPreview(null);
    try {
      const res = await hoService.getHOReport(rt.key);
      setPreview(res.data);
    } catch (err) {
      toast.error(t('report.loadError', 'প্রতিবেদন লোড ব্যর্থ'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!selectedType) return;
    try {
      const res = await hoService.exportHOReport(selectedType.key, { export: format });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedType.key}_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv'}`;
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('report.exported', 'এক্সপোর্ট করা হয়েছে'));
    } catch {
      toast.error(t('report.exportError', 'এক্সপোর্ট ব্যর্থ'));
    }
  };

  const handleDownload = async (report) => {
    try {
      const res = await hoService.downloadReport(report.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.title}.${report.file?.split('.').pop() || 'csv'}`;
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t('report.downloadError', 'ডাউনলোড ব্যর্থ'));
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0">{t('report.title', 'প্রতিবেদন কেন্দ্র')}</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-info btn-sm" onClick={() => setShowSchedules(true)}>
            <i className="bi bi-clock-history me-1"></i>{t('report.scheduled', 'নির্ধারিত')}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowBuilder(true)}>
            <i className="bi bi-plus-lg me-1"></i>{t('report.new', 'নতুন প্রতিবেদন')}
          </button>
        </div>
      </div>

      <div className="row g-3">
        {REPORT_TYPES.map(rt => {
          const isSelected = selectedType?.key === rt.key;
          return (
            <div key={rt.key} className="col-md-4 col-lg-3">
              <div className={`card h-100 shadow-sm ${isSelected ? 'border-primary' : ''}`}
                style={{
                  borderRadius: 12, border: isSelected ? '2px solid' : '1px solid #dee2e6',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onClick={() => handleCardClick(rt)}>
                <div className="card-body p-3">
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <div className="rounded-3 d-flex align-items-center justify-content-center"
                      style={{ width: 40, height: 40, background: `${rt.color}15` }}>
                      <i className={`bi ${rt.icon} fs-5`} style={{ color: rt.color }}></i>
                    </div>
                    <div>
                      <div className="fw-semibold" style={{ fontSize: 13 }}>{rt.labelBn}</div>
                      <small className="text-secondary">{rt.labelEn}</small>
                    </div>
                  </div>
                  <p className="text-secondary mb-0" style={{ fontSize: 11 }}>{rt.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Panel */}
      {selectedType && (
        <div className="card shadow-sm mt-3" style={{ borderRadius: 12, border: 'none' }}>
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0">
              <i className={`bi ${selectedType.icon} me-2`} style={{ color: selectedType.color }}></i>
              {preview?.title || selectedType.labelBn}
            </h6>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-success btn-sm" onClick={() => handleExport('csv')}>
                <i className="bi bi-filetype-csv me-1"></i>CSV
              </button>
              <button className="btn btn-outline-primary btn-sm" onClick={() => handleExport('excel')}>
                <i className="bi bi-file-earmark-excel me-1"></i>Excel
              </button>
              <button className="btn btn-outline-danger btn-sm" onClick={() => handleExport('pdf')}>
                <i className="bi bi-filetype-pdf me-1"></i>PDF
              </button>
            </div>
          </div>
          <div className="card-body" style={{ maxHeight: 500, overflowY: 'auto' }}>
            {previewLoading ? (
              <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : preview ? (
              <div>
                <div className="table-responsive">
                  <table className="table table-sm table-bordered table-hover">
                    <thead className="table-light sticky-top">
                      <tr>{(preview.headers || []).map((h, i) => <th key={i} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {(preview.rows || []).map((row, ri) => (
                        <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={{ fontSize: 12 }}>{cell}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Recent Reports */}
      <div className="card shadow-sm mt-3" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-header bg-white py-3">
          <h6 className="fw-bold mb-0">{t('report.recent', 'সাম্প্রতিক প্রতিবেদন')}</h6>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-4"><div className="spinner-border spinner-border-sm" /></div>
          ) : reports.length === 0 ? (
            <div className="text-center text-secondary py-4">
              <i className="bi bi-inbox fs-3"></i>
              <p className="mt-1">{t('common.noData', 'কোন তথ্য নেই')}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ fontSize: 13 }}>{t('report.title', 'শিরোনাম')}</th>
                    <th style={{ fontSize: 13 }}>{t('report.type', 'ধরণ')}</th>
                    <th style={{ fontSize: 13 }}>{t('common.status', 'অবস্থা')}</th>
                    <th style={{ fontSize: 13 }}>{t('report.date', 'তারিখ')}</th>
                    <th style={{ fontSize: 13 }}>{t('common.actions', 'অপশন')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontSize: 13 }}>{r.title}</td>
                      <td><span className="badge bg-info">{r.report_type_display || r.report_type}</span></td>
                      <td>
                        {r.is_ready ? <span className="badge bg-success">প্রস্তুত</span>
                          : r.error_message ? <span className="badge bg-danger">ব্যর্থ</span>
                          : <span className="badge bg-warning">প্রক্রিয়াধীন</span>}
                      </td>
                      <td style={{ fontSize: 12 }}>{r.created_at?.slice(0, 16) || '-'}</td>
                      <td>
                        {r.is_ready && (
                          <button className="btn btn-sm btn-outline-success" onClick={() => handleDownload(r)}>
                            <i className="bi bi-download"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ReportBuilder show={showBuilder} onClose={() => setShowBuilder(false)}
        centers={centers} courses={courses} batches={batches} />
      <ScheduledReports show={showSchedules} onClose={() => setShowSchedules(false)} />
    </div>
  );
}
