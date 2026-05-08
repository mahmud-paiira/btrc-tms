import React, { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';

const TABS = [
  { key: 'trainers', label: 'প্রশিক্ষক', icon: 'bi-person-badge' },
  { key: 'assessors', label: 'মূল্যায়নকারী', icon: 'bi-person-check' },
  { key: 'applications', label: 'আবেদন', icon: 'bi-file-earmark-text' },
];

const STATUS_BADGE = { pending: 'warning', approved: 'success', rejected: 'danger' };

export default function HoApprovalManagement() {
  const [activeTab, setActiveTab] = useState('trainers');
  const [trainers, setTrainers] = useState([]);
  const [assessors, setAssessors] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState({});
  const [processing, setProcessing] = useState({});

  const fetchData = useCallback(async (tab) => {
    setLoading(true);
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

  useState(() => { fetchData(activeTab); }, [activeTab, fetchData]);

  const handleAction = async (type, id, action) => {
    setProcessing((p) => ({ ...p, [`${type}_${id}`]: true }));
    try {
      const remark = remarks[id] || '';
      if (type === 'trainer') {
        await hoService.approveTrainer(id, { action, remarks: remark });
      } else if (type === 'assessor') {
        await hoService.approveAssessor(id, { action, remarks: remark });
      } else if (type === 'application') {
        await hoService.updateApplicationStatus(id, { status: action === 'approve' ? 'selected' : 'rejected', remarks: remark });
      }
      toast.success(`${action === 'approve' ? 'অনুমোদিত' : 'বাতিল'} হয়েছে`);
      setRemarks((p) => { const n = { ...p }; delete n[id]; return n; });
      fetchData(activeTab);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'অপারেশন ব্যর্থ');
    } finally {
      setProcessing((p) => ({ ...p, [`${type}_${id}`]: false }));
    }
  };

  const renderTable = (items, type, fields) => (
    <div className="table-responsive">
      <table className="table table-hover align-middle">
        <thead className="table-dark">
          <tr>
            {fields.map((f) => <th key={f.key}>{f.label}</th>)}
            <th className="text-center">কার্যক্রম</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={fields.length + 1} className="text-center text-muted py-4">কোন আইটেম নেই</td></tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                {fields.map((f) => <td key={f.key}>{f.render ? f.render(item) : item[f.key] || '—'}</td>)}
                <td>
                  <div className="d-flex flex-column gap-1" style={{ minWidth: 180 }}>
                    <div className="d-flex gap-1">
                      <button className="btn btn-sm btn-success flex-fill"
                        onClick={() => handleAction(type, item.id, 'approve')}
                        disabled={processing[`${type}_${item.id}`]}>
                        <i className="bi bi-check-lg me-1"></i>অনুমোদন
                      </button>
                      <button className="btn btn-sm btn-danger flex-fill"
                        onClick={() => handleAction(type, item.id, 'reject')}
                        disabled={processing[`${type}_${item.id}`]}>
                        <i className="bi bi-x-lg me-1"></i>বাতিল
                      </button>
                    </div>
                    <input className="form-control form-control-sm" placeholder="মন্তব্য..."
                      value={remarks[item.id] || ''}
                      onChange={(e) => setRemarks((p) => ({ ...p, [item.id]: e.target.value }))} />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ fontFamily: 'NikoshBAN, sans-serif' }}>
      <h4 className="mb-4">অনুমোদন ব্যবস্থাপনা</h4>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        {TABS.map((tab) => (
          <li className="nav-item" key={tab.key}>
            <button className={`nav-link ${activeTab === tab.key ? 'active fw-bold' : ''}`}
              onClick={() => setActiveTab(tab.key)}>
              <i className={`bi ${tab.icon} me-1`}></i>{tab.label}
            </button>
          </li>
        ))}
      </ul>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body p-0">
            {activeTab === 'trainers' && renderTable(trainers, 'trainer', [
              { key: 'trainer_no', label: 'আইডি' },
              { key: 'user_full_name_bn', label: 'নাম', render: (t) => t.user?.full_name_bn || t.user?.email || '—' },
              { key: 'user_phone', label: 'মোবাইল', render: (t) => t.user?.phone || '—' },
              { key: 'expertise_area', label: 'দক্ষতা' },
            ])}
            {activeTab === 'assessors' && renderTable(assessors, 'assessor', [
              { key: 'assessor_no', label: 'আইডি' },
              { key: 'user_full_name_bn', label: 'নাম', render: (a) => a.user?.full_name_bn || a.user?.email || '—' },
              { key: 'user_phone', label: 'মোবাইল', render: (a) => a.user?.phone || '—' },
              { key: 'expertise_area', label: 'দক্ষতা' },
            ])}
            {activeTab === 'applications' && renderTable(applications, 'application', [
              { key: 'application_no', label: 'আবেদন নং' },
              { key: 'name_bn', label: 'নাম' },
              { key: 'nid', label: 'এনআইডি' },
              { key: 'phone', label: 'মোবাইল' },
            ])}
          </div>
        </div>
      )}
    </div>
  );
}
