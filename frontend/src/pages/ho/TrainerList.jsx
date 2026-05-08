import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';
import TrainerDetail from './TrainerDetail';
import TrainerApprovalModal from './TrainerApprovalModal';
import TrainerMapForm from './TrainerMapForm';

const STATUS_BG = { pending: 'warning', active: 'success', suspended: 'danger' };
const APPROVAL_BG = { pending: 'warning', approved: 'success', rejected: 'danger' };

const TABS = [
  { key: 'all', label: 'সকল প্রশিক্ষক' },
  { key: 'pending', label: 'অনুমোদন অপেক্ষা' },
  { key: 'active', label: 'সক্রিয়' },
  { key: 'suspended', label: 'স্থগিত' },
];

export default function TrainerList() {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showMapForm, setShowMapForm] = useState(false);
  const [centers, setCenters] = useState([]);
  const [centerFilter, setCenterFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search: search || undefined };
      if (tab === 'pending') params.approval_status = 'pending';
      else if (tab === 'active') params.status = 'active';
      else if (tab === 'suspended') params.status = 'suspended';
      if (centerFilter) params.mapping_center = centerFilter;
      const res = await hoService.listTrainers(params);
      setTrainers(res.data.results || res.data);
    } catch (e) {
      toast.error('প্রশিক্ষক তালিকা লোড করতে ব্যর্থ');
    } finally {
      setLoading(false);
    }
  }, [search, tab, centerFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    hoService.getTrainerCenters().then(r => setCenters(r.data)).catch(() => {});
  }, []);

  const handleAction = async (id, action) => {
    try {
      if (action === 'suspend') await hoService.suspendTrainer(id);
      else if (action === 'activate') await hoService.activateTrainer(id);
      toast.success('অবস্থা পরিবর্তন করা হয়েছে');
      fetchItems();
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      toast.error('ব্যর্থ হয়েছে');
    }
  };

  const handleApproveReject = (trainer) => {
    setSelected(trainer);
    setShowApprovalModal(true);
  };

  const onApprovalDone = () => {
    setShowApprovalModal(false);
    setSelected(null);
    fetchItems();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0 fw-bold">প্রশিক্ষক ব্যবস্থাপনা</h5>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary btn-sm" onClick={() => setShowMapForm(true)}>
            <i className="bi bi-link-45deg me-1"></i>ম্যাপিং
          </button>
          <button className="btn btn-outline-success btn-sm" onClick={() => hoService.exportTrainers().then(r => {
            const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = 'trainers.json'; a.click();
          })}>
            <i className="bi bi-download me-1"></i>এক্সপোর্ট
          </button>
        </div>
      </div>

      <ul className="nav nav-tabs mb-3">
        {TABS.map(t => (
          <li className="nav-item" key={t.key}>
            <button className={`nav-link ${tab === t.key ? 'active fw-semibold' : ''}`} onClick={() => { setTab(t.key); setSelected(null); }}>
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="row g-2 mb-3">
        <div className="col-md-4">
          <input className="form-control form-control-sm" placeholder="নাম, এনআইডি, ফোনে সার্চ..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="col-md-3">
          <select className="form-select form-select-sm" value={centerFilter} onChange={e => setCenterFilter(e.target.value)}>
            <option value="">সকল কেন্দ্র</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name_bn} ({c.code})</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <select className="form-select form-select-sm" value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
            <option value="">সকল কোর্স</option>
          </select>
        </div>
      </div>

      <div className="row">
        <div className={selected ? 'col-md-7' : 'col-12'}>
          <div className="card shadow-sm">
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-4"><div className="spinner-border spinner-border-sm me-2"></div>লোড হচ্ছে...</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                    <thead className="table-dark">
                      <tr>
                        <th>প্রশিক্ষক নং</th>
                        <th>নাম</th>
                        <th>এনআইডি</th>
                        <th>ফোন</th>
                        <th>অভিজ্ঞতা</th>
                        <th>অবস্থা</th>
                        <th>অনুমোদন</th>
                        <th className="text-center">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainers.map(t => (
                        <tr key={t.id} className={selected?.id === t.id ? 'table-primary' : ''}
                          style={{ cursor: 'pointer' }} onClick={() => setSelected(t)}>
                          <td className="fw-semibold">{t.trainer_no}</td>
                          <td>{t.user_email?.split('@')[0] || '-'}</td>
                          <td>{t.nid}</td>
                          <td>{t.user_phone || '-'}</td>
                          <td>{t.years_of_experience} বছর</td>
                          <td><span className={`badge bg-${STATUS_BG[t.status] || 'secondary'}`}>{t.status_display}</span></td>
                          <td><span className={`badge bg-${APPROVAL_BG[t.approval_status] || 'secondary'}`}>{t.approval_display}</span></td>
                          <td className="text-center">
                            <div className="btn-group btn-group-sm" onClick={e => e.stopPropagation()}>
                              <button className="btn btn-outline-info" title="বিস্তারিত" onClick={() => setSelected(t)}>
                                <i className="bi bi-eye"></i>
                              </button>
                              {t.approval_status === 'pending' && (
                                <button className="btn btn-outline-success" title="অনুমোদন" onClick={() => handleApproveReject(t)}>
                                  <i className="bi bi-check-lg"></i>
                                </button>
                              )}
                              {t.status === 'active' && (
                                <button className="btn btn-outline-warning" title="স্থগিত" onClick={() => handleAction(t.id, 'suspend')}>
                                  <i className="bi bi-pause"></i>
                                </button>
                              )}
                              {t.status === 'suspended' && t.approval_status === 'approved' && (
                                <button className="btn btn-outline-success" title="সক্রিয়" onClick={() => handleAction(t.id, 'activate')}>
                                  <i className="bi bi-play"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {trainers.length === 0 && (
                        <tr><td colSpan={8} className="text-center text-muted py-4">কোনো প্রশিক্ষক পাওয়া যায়নি</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="card-footer text-muted small">মোট: {trainers.length} জন প্রশিক্ষক</div>
          </div>
        </div>
        {selected && (
          <div className="col-md-5">
            <TrainerDetail trainerId={selected.id} onClose={() => setSelected(null)} onRefresh={fetchItems} />
          </div>
        )}
      </div>

      {showApprovalModal && selected && (
        <TrainerApprovalModal trainer={selected} onClose={() => setShowApprovalModal(false)} onDone={onApprovalDone} />
      )}
      {showMapForm && (
        <TrainerMapForm centers={centers} onClose={() => setShowMapForm(false)} onDone={() => { setShowMapForm(false); fetchItems(); }} />
      )}
    </div>
  );
}
