import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';
import api from '../../services/api';

const TABS = [
  { key: 'trainers', label: 'প্রশিক্ষক', icon: 'bi-person-badge', color: '#6366f1' },
  { key: 'assessors', label: 'মূল্যায়নকারী', icon: 'bi-person-check', color: '#0ea5e9' },
  { key: 'applications', label: 'আবেদন', icon: 'bi-file-earmark-text', color: '#10b981' },
];

export default function HoApprovalManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('trainers');
  const [trainers, setTrainers] = useState([]);
  const [assessors, setAssessors] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState({});
  const [processing, setProcessing] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(items.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchData = useCallback(async (tab) => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      if (tab === 'trainers') {
        const { data } = await hoService.listTrainers({ approval_status: 'pending', page_size: 100 });
        setTrainers(data.results || data || []);
      } else if (tab === 'assessors') {
        const { data } = await hoService.listAssessors({ approval_status: 'pending', page_size: 100 });
        setAssessors(data.results || data || []);
      } else if (tab === 'applications') {
        const { data } = await hoService.listApplications({ status: 'pending', page_size: 100 });
        setApplications(data.results || data || []);
      }
    } catch {
      toast.error('ডাটা লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(activeTab); }, [activeTab, fetchData]);

  const handleAction = async (type, id, action) => {
    const remark = remarks[id] || '';
    if (action === 'reject' && !remark.trim()) {
      toast.warning('বাতিলের কারণ উল্লেখ করা আবশ্যক');
      return;
    }
    setProcessing((p) => ({ ...p, [`${type}_${id}`]: true }));
    try {
      if (type === 'trainer') {
        if (action === 'approve') {
          await hoService.approveTrainer(id, { remarks: remark });
        } else {
          await hoService.rejectTrainer(id, { remarks: remark });
        }
      } else if (type === 'assessor') {
        if (action === 'approve') {
          await hoService.approveAssessor(id, { remarks: remark });
        } else {
          await hoService.rejectAssessor(id, { remarks: remark });
        }
      } else if (type === 'application') {
        await hoService.updateApplicationStatus(id, { status: action === 'approve' ? 'selected' : 'rejected', remarks: remark });
      }
      toast.success(`${action === 'approve' ? 'অনুমোদিত' : 'বাতিল'} হয়েছে`);
      setRemarks((p) => { const n = { ...p }; delete n[id]; return n; });
      fetchData(activeTab);
    } catch (err) {
      const msg = err.response?.data?.remarks?.[0] || err.response?.data?.detail || err.response?.data?.error || 'অপারেশন ব্যর্থ';
      toast.error(msg);
    } finally {
      setProcessing((p) => ({ ...p, [`${type}_${id}`]: false }));
    }
  };

  const handleExportExcel = async () => {
    try {
      const ids = [...selectedIds];
      const params = { status: 'pending', page_size: 9999 };
      if (ids.length > 0) params.ids = ids.join(',');
      const res = await hoService.exportApplicationsExcel(params);
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `applications_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('এক্সপোর্ট সম্পন্ন');
    } catch {
      toast.error('এক্সপোর্ট ব্যর্থ');
    }
  };

  const handleExportPdf = async () => {
    try {
      const ids = [...selectedIds];
      const params = { status: 'pending', page_size: 9999 };
      if (ids.length > 0) params.ids = ids.join(',');
      const res = await hoService.exportApplicationsPdf(params);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `applications_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('পিডিএফ এক্সপোর্ট সম্পন্ন');
    } catch {
      toast.error('পিডিএফ এক্সপোর্ট ব্যর্থ');
    }
  };

  const handlePrintList = async () => {
    const ids = selectedIds.size > 0 ? [...selectedIds] : items.map((i) => i.id);
    const target = (type === 'application' ? applications : type === 'trainer' ? trainers : assessors).filter((i) => ids.includes(i.id));
    if (target.length === 0) { toast.warning('কোনো আইটেম নির্বাচন করা হয়নি'); return; }
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>প্রিন্ট তালিকা</title>
      <style>
        body { font-family: 'Nikosh', 'Segoe UI', sans-serif; padding: 20px; }
        h2 { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #333; padding: 6px 10px; text-align: left; font-size: 13px; }
        th { background: #f0f0f0; }
        .text-center { text-align: center; }
      </style></head><body>
      <h2>${TABS.find((t) => t.key === activeTab)?.label || ''} তালিকা</h2>
      <table>
        <thead><tr>
          <th class="text-center">#</th>
          ${activeTab === 'applications' ? '<th>আবেদন নং</th><th>নাম</th><th>এনআইডি</th><th>মোবাইল</th>' :
            activeTab === 'trainers' ? '<th>আইডি</th><th>নাম</th><th>মোবাইল</th><th>দক্ষতা</th>' :
            '<th>আইডি</th><th>নাম</th><th>মোবাইল</th><th>দক্ষতা</th>'}
        </tr></thead>
        <tbody>
          ${target.map((item, idx) => {
            const fields = activeTab === 'applications'
              ? [item.application_no, item.name_bn, item.nid, item.phone]
              : activeTab === 'trainers'
                ? [item.trainer_no, item.user?.full_name_bn || item.user?.email || '—', item.user?.phone || '—', item.expertise_area]
                : [item.assessor_no, item.user?.full_name_bn || item.user?.email || '—', item.user?.phone || '—', item.expertise_area];
            return `<tr><td class="text-center">${idx + 1}</td>${fields.map((f) => `<td>${f || '—'}</td>`).join('')}</tr>`;
          }).join('')}
        </tbody>
      </table>
      <p style="text-align:center;margin-top:20px;color:#666;font-size:11px;">প্রিন্টের তারিখ: ${new Date().toLocaleDateString('bn-BD')}</p>
      <script>window.print();window.close();<\/script>
      </body></html>
    `);
    win.document.close();
  };

  const getTabData = () => {
    if (activeTab === 'trainers') return { items: trainers, type: 'trainer', fields: TAB_FIELDS.trainers };
    if (activeTab === 'assessors') return { items: assessors, type: 'assessor', fields: TAB_FIELDS.assessors };
    return { items: applications, type: 'application', fields: TAB_FIELDS.applications };
  };

  const { items, type, fields } = getTabData();
  const counts = {
    trainers: trainers.length,
    assessors: assessors.length,
    applications: applications.length,
  };

  const detailPath = (type, id) => {
    if (type === 'application') return `/ho/applications/${id}`;
    if (type === 'trainer') return `/ho/trainers/${id}`;
    return `/ho/assessors/${id}`;
  };

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="d-flex align-items-center justify-content-center rounded-3"
          style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <i className="bi bi-check2-circle text-white fs-4"></i>
        </div>
        <div>
          <h4 className="fw-bold mb-1" style={{ color: '#0f172a' }}>অনুমোদন ব্যবস্থাপনা</h4>
          <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>
            প্রশিক্ষক, মূল্যায়নকারী ও আবেদনকারীদের অনুমোদন ও ব্যবস্থাপনা
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        {TABS.map((tab) => (
          <div className="col-md-4" key={tab.key}>
            <div className={`card border-0 h-100 ${activeTab === tab.key ? 'shadow' : 'shadow-sm'}`}
              style={{ borderRadius: 16, cursor: 'pointer', transition: 'all 0.2s ease' }}
              onClick={() => setActiveTab(tab.key)}>
              <div className="card-body p-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="d-flex align-items-center justify-content-center rounded-2"
                    style={{ width: 44, height: 44, background: `${tab.color}15` }}>
                    <i className={`bi ${tab.icon} fs-5`} style={{ color: tab.color }}></i>
                  </div>
                  <div>
                    <div className="fw-bold" style={{ fontSize: '1.5rem', color: '#0f172a', lineHeight: 1.2 }}>
                      {counts[tab.key]}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{tab.label}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 gap-2" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
        {TABS.map((tab) => (
          <li className="nav-item" key={tab.key}>
            <button className={`nav-link d-flex align-items-center gap-2 ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              style={{
                borderRadius: 10,
                fontSize: '0.9rem',
                fontWeight: 500,
                padding: '8px 18px',
                ...(activeTab === tab.key
                  ? { background: tab.color, color: '#fff', border: 'none' }
                  : { color: '#475569', background: 'transparent' }),
              }}>
              <i className={`bi ${tab.icon}`}></i>
              {tab.label}
              <span className={`badge rounded-pill ${activeTab === tab.key ? 'bg-white text-dark' : 'bg-secondary bg-opacity-10 text-secondary'}`}
                style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                {counts[tab.key]}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* Selection Bar */}
      {selectedIds.size > 0 && (
        <div className="d-flex align-items-center gap-2 mb-3 p-2 bg-primary bg-opacity-10 rounded"
          style={{ border: '1px solid var(--bs-primary-border-subtle, #b6d4fe)' }}>
          <span className="fw-semibold small" style={{ color: '#0a58ca' }}>
            <i className="bi bi-check-circle-fill me-1"></i>
            {selectedIds.size} টি নির্বাচিত
          </span>
          <div className="ms-auto d-flex gap-2">
            <button className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
              onClick={handleExportExcel} style={{ borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
              <i className="bi bi-file-earmark-excel"></i> XLSX
            </button>
            <button className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
              onClick={handleExportPdf} style={{ borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
              <i className="bi bi-file-earmark-pdf"></i> PDF
            </button>
            <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
              onClick={handlePrintList} style={{ borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
              <i className="bi bi-printer"></i> প্রিন্ট
            </button>
            <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              onClick={() => setSelectedIds(new Set())} style={{ borderRadius: 8, fontSize: 12 }}>
              <i className="bi bi-x-lg"></i> বাতিল
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" style={{ color: '#6366f1' }} role="status" />
              <div className="mt-2 text-muted" style={{ fontSize: '0.85rem' }}>লোড হচ্ছে...</div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-5">
              <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                style={{ width: 64, height: 64, background: '#f1f5f9' }}>
                <i className="bi bi-check2-circle text-muted fs-3"></i>
              </div>
              <div className="fw-semibold mb-1" style={{ color: '#334155' }}>কোন অনুমোদন অপেক্ষমান নেই</div>
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                সকল {TABS.find(t => t.key === activeTab)?.label} অনুমোদিত
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="b-table w-100">
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" className="form-check-input" onChange={handleSelectAll}
                        checked={items.length > 0 && selectedIds.size === items.length} />
                    </th>
                    <th>#</th>
                    {fields.map((f) => <th key={f.key}>{f.label}</th>)}
                    <th className="text-center">কার্যক্রম</th>
                  </tr>
                </thead>
                <tbody>
                  {items.flatMap((item, idx) => {
                    const isOpen = expandedId === item.id;
                    const rows = [
                      <tr key={item.id} className={`b-row ${isOpen ? 'b-row--active' : ''}`} onClick={() => navigate(detailPath(type, item.id))}>
                        <td onClick={e => e.stopPropagation()}>
                          <input type="checkbox" className="form-check-input"
                            checked={selectedIds.has(item.id)}
                            onChange={() => handleSelectOne(item.id)} />
                        </td>
                        <td>{idx + 1}</td>
                        {fields.map((f) => (
                          <td key={f.key}>
                            {f.key === 'application_no' ? (
                              <button className="btn btn-link btn-sm p-0 text-start fw-semibold"
                                style={{ color: '#2563eb', textDecoration: 'none' }}
                                onClick={(e) => { e.stopPropagation(); navigate(`/ho/applications/${item.id}`); }}>
                                {item[f.key] || '—'}
                              </button>
                            ) : f.render ? f.render(item) : item[f.key] || '—'}
                          </td>
                        ))}
                        <td className="text-center" onClick={e => e.stopPropagation()}>
                          <div className="d-flex gap-1 justify-content-end">
                            <button className="act-btn" title="বিস্তারিত" onClick={() => navigate(detailPath(type, item.id))}>
                              <i className="bi bi-eye"></i>
                            </button>
                            <button className={`act-btn ${isOpen ? 'act-btn--active' : ''}`} title="কার্যক্রম"
                              onClick={() => setExpandedId(isOpen ? null : item.id)}>
                              <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-three-dots-vertical'}`}></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ];
                    if (isOpen) {
                      rows.push(
                        <tr key={`${item.id}-exp`} className="exp-row">
                          <td colSpan={3 + fields.length}>
                            <div className="exp-panel">
                              <button className="exp-btn exp-btn--success"
                                onClick={() => handleAction(type, item.id, 'approve')}
                                disabled={processing[`${type}_${item.id}`]}>
                                {processing[`${type}_${item.id}`] ? (
                                  <span className="spinner-border spinner-border-sm" />
                                ) : (
                                  <i className="bi bi-check-lg"></i>
                                )}
                                অনুমোদন
                              </button>
                              <button className="exp-btn exp-btn--danger"
                                onClick={() => handleAction(type, item.id, 'reject')}
                                disabled={processing[`${type}_${item.id}`]}>
                                <i className="bi bi-x-lg"></i>
                                বাতিল
                              </button>
                              <input className="form-control form-control-sm"
                                style={{ maxWidth: 240 }}
                                placeholder={type === 'application' ? 'মন্তব্য (বাতিলের জন্য আবশ্যক)...' : 'মন্তব্য (ঐচ্ছিক)...'}
                                value={remarks[item.id] || ''}
                                onChange={(e) => setRemarks((p) => ({ ...p, [item.id]: e.target.value }))} />
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return rows;
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const TAB_FIELDS = {
  trainers: [
    { key: 'trainer_no', label: 'আইডি' },
    { key: 'name', label: 'নাম', render: (t) => t.user?.full_name_bn || t.user?.email || '—' },
    { key: 'phone', label: 'মোবাইল', render: (t) => t.user?.phone || '—' },
    { key: 'expertise_area', label: 'দক্ষতা' },
  ],
  assessors: [
    { key: 'assessor_no', label: 'আইডি' },
    { key: 'name', label: 'নাম', render: (a) => a.user?.full_name_bn || a.user?.email || '—' },
    { key: 'phone', label: 'মোবাইল', render: (a) => a.user?.phone || '—' },
    { key: 'expertise_area', label: 'দক্ষতা' },
  ],
  applications: [
    { key: 'application_no', label: 'আবেদন নং' },
    { key: 'name_bn', label: 'নাম' },
    { key: 'nid', label: 'এনআইডি' },
    { key: 'phone', label: 'মোবাইল' },
  ],
};
