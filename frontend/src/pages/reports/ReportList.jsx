import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';
import { formatDate } from '../../utils/dateFormatter';

const REPORT_TYPES = [
  { value: 'trainee_list', label: 'প্রশিক্ষণার্থী তালিকা' },
  { value: 'attendance', label: 'উপস্থিতি প্রতিবেদন' },
  { value: 'assessment', label: 'মূল্যায়ন প্রতিবেদন' },
  { value: 'batch_status', label: 'ব্যাচ অবস্থা' },
  { value: 'certificate', label: 'সার্টিফিকেট প্রতিবেদন' },
  { value: 'placement', label: 'চাকরি প্রতিবেদন' },
];

export default function ReportList() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ report_type: 'trainee_list', date_from: '', date_to: '' });
  const [expandedId, setExpandedId] = useState(null);
  const navigate = useNavigate();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hoService.listReports();
      setReports(res.data.results || res.data || []);
    } catch {
      toast.error('প্রতিবেদন তালিকা লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleGenerate = async () => {
    if (!form.report_type) return;
    setGenerating(true);
    try {
      await hoService.generateReport({
        report_type: form.report_type,
        parameters: {
          date_from: form.date_from || undefined,
          date_to: form.date_to || undefined,
        },
      });
      toast.success('প্রতিবেদন তৈরি শুরু হয়েছে');
      fetchReports();
    } catch {
      toast.error('প্রতিবেদন তৈরি ব্যর্থ');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (id) => {
    try {
      const res = await hoService.downloadReport(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${id}.${res.headers['content-type']?.includes('pdf') ? 'pdf' : 'csv'}`;
      a.click();
    } catch {
      toast.error('ডাউনলোড ব্যর্থ');
    }
  };

  const handleRegenerate = async (id) => {
    try {
      await hoService.regenerateReport(id);
      toast.success('প্রতিবেদন পুনরায় তৈরি শুরু হয়েছে');
      fetchReports();
    } catch {
      toast.error('পুনরায় তৈরি ব্যর্থ');
    }
  };

  return (
    <div>
      <h4 className="mb-3 fw-bold"><i className="bi bi-file-earmark-bar-graph me-2"></i>প্রতিবেদন</h4>

      <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body">
          <h6 className="fw-semibold mb-3">নতুন প্রতিবেদন তৈরি করুন</h6>
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label" style={{ fontSize: 12 }}>প্রতিবেদনের ধরণ</label>
              <select className="form-select form-select-sm" value={form.report_type}
                onChange={e => setForm({ ...form, report_type: e.target.value })}>
                {REPORT_TYPES.map(rt => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label" style={{ fontSize: 12 }}>শুরুর তারিখ</label>
              <input className="form-control form-control-sm" type="date" value={form.date_from}
                onChange={e => setForm({ ...form, date_from: e.target.value })} />
            </div>
            <div className="col-md-3">
              <label className="form-label" style={{ fontSize: 12 }}>শেষ তারিখ</label>
              <input className="form-control form-control-sm" type="date" value={form.date_to}
                onChange={e => setForm({ ...form, date_to: e.target.value })} />
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary btn-sm w-100" onClick={handleGenerate} disabled={generating}>
                {generating ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-plus-circle me-1"></i>}
                তৈরি করুন
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm table-card">
        <div className="card-header bg-white fw-semibold">পূর্ববর্তী প্রতিবেদন</div>
        <div className="table-responsive">
          <table className="b-table w-100">
            <thead>
              <tr>
                <th>শিরোনাম</th>
                <th>ধরণ</th>
                <th>অবস্থা</th>
                <th>তৈরির তারিখ</th>
                <th className="text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-4"><div className="spinner-border spinner-border-sm me-2" />লোড হচ্ছে...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-secondary py-4">কোনো প্রতিবেদন নেই</td></tr>
              ) : (
                reports.flatMap(r => [
                  <tr key={r.id} className="b-row">
                    <td className="fw-semibold">{r.title || '-'}</td>
                    <td><span className="badge bg-info">{r.report_type}</span></td>
                    <td>
                      <span className={`status-dot dot-${r.is_ready ? 'success' : r.error_message ? 'danger' : 'warning'}`}></span>
                      <span>{r.is_ready ? 'প্রস্তুত' : r.error_message ? 'ব্যর্থ' : 'নির্মাণাধীন'}</span>
                    </td>
                    <td>{r.created_at ? formatDate(r.created_at) : '-'}</td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-outline-secondary border-0 me-1" onClick={() => handleDownload(r.id)} title="ডাউনলোড"><i className="bi bi-download"></i></button>
                      <button className={`btn btn-sm btn-outline-secondary border-0 exp-btn${expandedId === r.id ? ' act-btn--active' : ''}`} onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                        <i className="bi bi-three-dots-vertical"></i>
                      </button>
                    </td>
                  </tr>,
                  expandedId === r.id && (
                    <tr key={`${r.id}-exp`} className="exp-row">
                      <td colSpan={5}>
                        <div className="exp-panel">
                          {r.is_ready && (
                            <button className="act-btn" onClick={() => handleRegenerate(r.id)}><i className="bi bi-arrow-repeat me-1"></i>পুনরায় তৈরি</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                ])
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
