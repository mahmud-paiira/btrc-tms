import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';
import { useTranslation } from '../../hooks/useTranslation';
import { REPORT_TYPES } from './reports/reportConfig';
import { formatDate } from '../../utils/dateFormatter';
import { convertToBanglaDigits, formatNumber } from '../../utils/numberFormatter';
import ReportBuilder from './reports/ReportBuilder';
import ScheduledReports from './reports/ScheduledReports';

export default function HoReportCenter() {
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
  const [exporting, setExporting] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ from_date: '', to_date: '', centers: [], courses: [], batches: [] });

  useEffect(() => {
    Promise.all([
      hoService.listCenters({ status: 'active', page_size: 200 }),
      hoService.listCourses({ status: 'active', page_size: 200 }),
      hoService.listBatches?.({ page_size: 200 }).catch(() => ({ data: [] })) || Promise.resolve({ data: [] }),
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

  const buildParams = () => {
    const params = {};
    if (filters.from_date) params.from_date = filters.from_date;
    if (filters.to_date) params.to_date = filters.to_date;
    if (filters.centers.length) params.centers = filters.centers.join(',');
    if (filters.courses.length) params.courses = filters.courses.join(',');
    if (filters.batches.length) params.batches = filters.batches.join(',');
    return params;
  };

  const loadPreview = async (rt) => {
    setSelectedType(rt);
    setPreviewLoading(true);
    setPreview(null);
    try {
      const res = await hoService.getHOReport(rt.key, buildParams());
      setPreview(res.data);
    } catch {
      toast.error(t('report.loadError', 'প্রতিবেদন লোড ব্যর্থ'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCardClick = (rt) => {
    if (selectedType?.key === rt.key) {
      setSelectedType(null);
      setPreview(null);
    } else {
      loadPreview(rt);
    }
  };

  const handleExport = async (rt, format) => {
    const fmt = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
    setExporting(`${rt.key}-${fmt}`);
    try {
      const res = await hoService.exportHOReport(rt.key, { ...buildParams(), export: format });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${rt.key}_${new Date().toISOString().slice(0, 10)}.${fmt}`;
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('report.exported', 'এক্সপোর্ট করা হয়েছে'));
    } catch {
      toast.error(t('report.exportError', 'এক্সপোর্ট ব্যর্থ'));
    } finally {
      setExporting(null);
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

  const filteredTypes = REPORT_TYPES.filter(rt =>
    !search || rt.labelBn.includes(search) || rt.labelEn.toLowerCase().includes(search.toLowerCase()) || rt.key.includes(search)
  );

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    if (selectedType) loadPreview(selectedType);
  };

  return (
    <div className="px-4 py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h4 className="fw-bold mb-1">
            <i className="bi bi-bar-chart-steps me-2 text-primary"></i>{t('report.title', 'প্রতিবেদন কেন্দ্র')}
          </h4>
          <p className="text-muted mb-0 small">বিভিন্ন ধরণের প্রতিবেদন তৈরি, পূর্বরূপ ও এক্সপোর্ট করুন</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-info shadow-sm" onClick={() => setShowSchedules(true)}>
            <i className="bi bi-clock-history me-1"></i>{t('report.scheduled', 'নির্ধারিত')}
            {reports.filter(r => !r.is_ready && !r.error_message).length > 0 && (
              <span className="badge bg-warning text-dark ms-1">{formatNumber(reports.filter(r => !r.is_ready && !r.error_message).length)}</span>
            )}
          </button>
          <button className="btn btn-primary shadow-sm" onClick={() => setShowBuilder(true)}>
            <i className="bi bi-plus-lg me-1"></i>{t('report.new', 'নতুন প্রতিবেদন')}
          </button>
        </div>
      </div>

      <div className="input-group mb-3" style={{ maxWidth: 400 }}>
        <span className="input-group-text bg-white border-end-0">
          <i className="bi bi-search text-muted"></i>
        </span>
        <input className="form-control border-start-0 ps-0" placeholder="প্রতিবেদনের নাম লিখুন..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="row g-3 mb-3">
        {filteredTypes.map(rt => {
          const isSelected = selectedType?.key === rt.key;
          const exportKey = (fmt) => `${rt.key}-${fmt}`;
          return (
            <div key={rt.key} className="col-xl-3 col-lg-4 col-md-6">
              <div className={`card h-100 ${isSelected ? 'border-primary' : ''}`}
                style={{
                  borderRadius: 10, border: isSelected ? '2px solid #1b6b3b' : '1px solid #dee2e6',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                <div className="card-body p-3 pb-2" onClick={() => handleCardClick(rt)}>
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 38, height: 38, background: `${rt.color}15` }}>
                      <i className={`bi ${rt.icon} fs-5`} style={{ color: rt.color }}></i>
                    </div>
                    <div className="min-w-0">
                      <div className="fw-semibold text-truncate" style={{ fontSize: 13 }}>{rt.labelBn}</div>
                      <small className="text-secondary text-truncate d-block">{rt.labelEn}</small>
                    </div>
                  </div>
                  <p className="text-secondary mb-0" style={{ fontSize: 11, lineHeight: 1.4 }}>{rt.desc}</p>
                </div>
                <div className="card-footer bg-white border-0 pt-0 pb-2 px-3 d-flex gap-1 flex-wrap">
                  <button className={`btn btn-sm flex-fill ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`}
                    style={{ fontSize: 11 }} onClick={(e) => { e.stopPropagation(); loadPreview(rt); }}>
                    <i className="bi bi-eye me-1"></i>পূর্বরূপ
                  </button>
                  <div className="btn-group btn-group-sm flex-fill">
                    <button className="btn btn-outline-success" style={{ fontSize: 11 }}
                      onClick={(e) => { e.stopPropagation(); !exporting && handleExport(rt, 'csv'); }}
                      disabled={exporting === exportKey('csv')}>
                      {exporting === exportKey('csv') ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-filetype-csv"></i>}
                    </button>
                    <button className="btn btn-outline-primary" style={{ fontSize: 11 }}
                      onClick={(e) => { e.stopPropagation(); !exporting && handleExport(rt, 'excel'); }}
                      disabled={exporting === exportKey('xlsx')}>
                      {exporting === exportKey('xlsx') ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-file-earmark-excel"></i>}
                    </button>
                    <button className="btn btn-outline-danger" style={{ fontSize: 11 }}
                      onClick={(e) => { e.stopPropagation(); !exporting && handleExport(rt, 'pdf'); }}
                      disabled={exporting === exportKey('pdf')}>
                      {exporting === exportKey('pdf') ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-filetype-pdf"></i>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filteredTypes.length === 0 && (
          <div className="col-12 text-center text-secondary py-5">
            <i className="bi bi-search fs-2"></i>
            <p className="mt-2">"{search}" এর জন্য কোন প্রতিবেদন পাওয়া যায়নি</p>
          </div>
        )}
      </div>

      {selectedType && (
        <div className="card shadow-sm mb-3" style={{ borderRadius: 10, border: '1px solid #1b6b3b' }}>
          <div className="card-header bg-white py-2 d-flex flex-wrap justify-content-between align-items-center gap-2"
            style={{ borderBottom: '2px solid #1b6b3b' }}>
            <h6 className="fw-bold mb-0">
              <i className={`bi ${selectedType.icon} me-2`} style={{ color: selectedType.color }}></i>
              {preview?.title ? convertToBanglaDigits(preview.title) : selectedType.labelBn}
            </h6>
            <div className="d-flex gap-2 align-items-center">
              <span className="text-muted small">{preview?.rows?.length ? formatNumber(preview.rows.length) : ''}</span>
              <button className="btn btn-outline-success btn-sm" onClick={() => handleExport(selectedType, 'csv')}
                disabled={exporting === `${selectedType.key}-csv`}>
                {exporting === `${selectedType.key}-csv` ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-filetype-csv me-1"></i>}CSV
              </button>
              <button className="btn btn-outline-primary btn-sm" onClick={() => handleExport(selectedType, 'excel')}
                disabled={exporting === `${selectedType.key}-xlsx`}>
                {exporting === `${selectedType.key}-xlsx` ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-file-earmark-excel me-1"></i>}Excel
              </button>
              <button className="btn btn-outline-danger btn-sm" onClick={() => handleExport(selectedType, 'pdf')}
                disabled={exporting === `${selectedType.key}-pdf`}>
                {exporting === `${selectedType.key}-pdf` ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-filetype-pdf me-1"></i>}PDF
              </button>
            </div>
          </div>
          <div className="card-body py-2 px-3" style={{ background: '#f8f9fa' }}>
            <div className="row g-2 align-items-end">
              <div className="col-md-3">
                <label className="form-label small mb-0">শুরুর তারিখ</label>
                <input type="date" className="form-control form-control-sm" value={filters.from_date}
                  onChange={(e) => handleFilterChange('from_date', e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label small mb-0">শেষ তারিখ</label>
                <input type="date" className="form-control form-control-sm" value={filters.to_date}
                  onChange={(e) => handleFilterChange('to_date', e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label small mb-0">কেন্দ্র</label>
                <select className="form-select form-select-sm" value={filters.centers}
                  onChange={(e) => handleFilterChange('centers', e.target.value ? [e.target.value] : [])}>
                  <option value="">সব কেন্দ্র</option>
                  {centers.map(c => <option key={c.id} value={c.id}>{c.name_bn}</option>)}
                </select>
              </div>
              <div className="col-md-3 d-flex gap-1 align-items-end">
                <button className="btn btn-primary btn-sm flex-grow-1" onClick={applyFilters}>
                  <i className="bi bi-arrow-repeat me-1"></i>লোড
                </button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => {
                  setFilters({ from_date: '', to_date: '', centers: [], courses: [], batches: [] });
                  if (selectedType) loadPreview(selectedType);
                }}>
                  <i className="bi bi-x-circle"></i>
                </button>
              </div>
            </div>
          </div>
          <div className="card-body" style={{ maxHeight: 520, overflowY: 'auto' }}>
            {previewLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary mb-2" style={{ width: 40, height: 40 }} />
                <p className="text-muted small">প্রতিবেদন লোড হচ্ছে...</p>
              </div>
            ) : preview ? (
              <div className="table-responsive">
                <table className="b-table w-100">
                  <thead>
                    <tr>{(preview.headers || []).map((h, i) => <th key={i} style={{ fontSize: 12, whiteSpace: 'nowrap', textTransform: 'none' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {(preview.rows || []).length === 0 ? (
                      <tr><td colSpan={(preview.headers || []).length || 1} className="text-center text-secondary py-4">কোন তথ্য নেই</td></tr>
                    ) : (
                      (preview.rows || []).map((row, ri) => (
                        <tr key={ri}>{row.map((cell, ci) => <td key={ci} style={{ fontSize: 12 }}>{convertToBanglaDigits(cell)}</td>)}</tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="card shadow-sm" style={{ borderRadius: 10, border: 'none' }}>
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center"
          style={{ borderBottom: '2px solid #1b6b3b' }}>
          <h6 className="fw-bold mb-0"><i className="bi bi-clock-history me-2 text-primary"></i>{t('report.recent', 'সাম্প্রতিক প্রতিবেদন')}</h6>
          <button className="btn btn-sm btn-outline-primary" onClick={() => setShowSchedules(true)}>
            <i className="bi bi-clock me-1"></i>নির্ধারিত
          </button>
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
              <table className="b-table w-100">
                <thead>
                  <tr>
                    <th style={{ fontSize: 12 }}>{t('report.title', 'শিরোনাম')}</th>
                    <th style={{ fontSize: 12 }}>{t('report.type', 'ধরণ')}</th>
                    <th style={{ fontSize: 12 }}>{t('common.status', 'অবস্থা')}</th>
                    <th style={{ fontSize: 12 }}>{t('report.date', 'তারিখ')}</th>
                    <th className="text-center">{t('common.actions', 'অপশন')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => {
                    const rt = REPORT_TYPES.find(t => t.key === r.report_type);
                    return (
                      <tr key={r.id}>
                        <td style={{ fontSize: 12 }}><span className="fw-semibold">{convertToBanglaDigits(r.title)}</span></td>
                        <td>
                          <span className="badge d-inline-flex align-items-center gap-1" style={{ background: `${rt?.color || '#6c757d'}15`, color: rt?.color || '#6c757d', fontSize: 11 }}>
                            {rt && <i className={`bi ${rt.icon}`}></i>}{r.report_type_display || r.report_type}
                          </span>
                        </td>
                        <td>
                          {r.is_ready ? <span className="badge bg-success">প্রস্তুত</span>
                            : r.error_message ? <span className="badge bg-danger">ব্যর্থ</span>
                            : <span className="badge bg-warning text-dark">প্রক্রিয়াধীন</span>}
                        </td>
                        <td style={{ fontSize: 11 }}>{r.created_at ? formatDate(r.created_at) : '-'}</td>
                        <td className="text-center">
                          {r.is_ready && (
                            <button className="btn btn-sm btn-outline-success" onClick={() => handleDownload(r)} title="ডাউনলোড">
                              <i className="bi bi-download"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ReportBuilder show={showBuilder} onClose={() => { setShowBuilder(false); fetchRecent(); }}
        centers={centers} courses={courses} batches={batches} />
      <ScheduledReports show={showSchedules} onClose={() => { setShowSchedules(false); fetchRecent(); }} />
    </div>
  );
}
