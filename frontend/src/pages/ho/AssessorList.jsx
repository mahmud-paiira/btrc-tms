import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../services/hoService';
import AssessorDetail from './AssessorDetail';
import TrainerToAssessorConversion from './TrainerToAssessorConversion';
import AssessorMapForm from './AssessorMapForm';

const STATUS_BG = { pending: 'warning', active: 'success', suspended: 'danger' };
const APPROVAL_BG = { pending: 'warning', approved: 'success', rejected: 'danger' };

const TABS = [
  { key: 'all', label: 'সকল মূল্যায়নকারী' },
  { key: 'pending', label: 'অনুমোদন অপেক্ষা' },
  { key: 'active', label: 'সক্রিয়' },
  { key: 'suspended', label: 'স্থগিত' },
];

function exportToCsv(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  for (const row of data) {
    csvRows.push(headers.map(h => {
      const v = row[h] ?? '';
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(','));
  }
  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
}

export default function AssessorList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showMapForm, setShowMapForm] = useState(false);
  const [showConversion, setShowConversion] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [ordering, setOrdering] = useState('-created_at');
  const [exporting, setExporting] = useState(false);
  const pageSize = 25;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search: search || undefined, page, ordering };
      if (tab === 'pending') params.approval_status = 'pending';
      else if (tab === 'active') params.status = 'active';
      else if (tab === 'suspended') params.status = 'suspended';
      const res = await hoService.listAssessors(params);
      const data = res.data;
      setItems(data.results || data);
      setTotalCount(data.count ?? data.length ?? 0);
    } catch { toast.error('তালিকা লোড করতে ব্যর্থ');
    } finally { setLoading(false); }
  }, [search, tab, page, ordering]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [search, tab, ordering]);

  const handleAction = async (id, action) => {
    try {
      if (action === 'suspend') await hoService.suspendAssessor(id);
      else if (action === 'activate') await hoService.activateAssessor(id);
      toast.success('অবস্থা পরিবর্তন করা হয়েছে');
      fetchItems();
      if (selected?.id === id) setSelected(null);
    } catch { toast.error('ব্যর্থ হয়েছে'); }
  };

  const toggleOrdering = (field) => {
    setOrdering(prev => prev === field ? `-${field}` : prev === `-${field}` ? field : field);
  };

  const orderIcon = (field) => {
    if (ordering === field) return ' ▲';
    if (ordering === `-${field}`) return ' ▼';
    return '';
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = { search: search || undefined };
      if (tab === 'pending') params.approval_status = 'pending';
      else if (tab === 'active') params.status = 'active';
      else if (tab === 'suspended') params.status = 'suspended';
      const res = await hoService.exportAssessors(params);
      const mapped = res.data.map(a => ({
        assessor_no: a.assessor_no, name_bn: a.name_bn, name_en: a.name_en,
        email: a.email, phone: a.phone, nid: a.nid,
        expertise_area: a.expertise_area, years_of_experience: a.years_of_experience,
        certification: a.certification, status: a.status,
        approval_status: a.approval_status, created_at: a.created_at,
      }));
      exportToCsv(mapped, `assessors_${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('CSV এক্সপোর্ট সম্পন্ন');
    } catch { toast.error('এক্সপোর্ট ব্যর্থ');
    } finally { setExporting(false); }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0 fw-bold">মূল্যায়নকারী ব্যবস্থাপনা</h5>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-info btn-sm" onClick={() => setShowConversion(true)}>
            <i className="bi bi-arrow-left-right me-1"></i>প্রশিক্ষক থেকে রূপান্তর
          </button>
          <button className="btn btn-outline-primary btn-sm" onClick={() => setShowMapForm(true)}>
            <i className="bi bi-link-45deg me-1"></i>ম্যাপিং
          </button>
          <button className="btn btn-outline-success btn-sm" onClick={handleExport} disabled={exporting}>
            <i className={`bi ${exporting ? 'bi-arrow-repeat spin' : 'bi-download'} me-1`}></i>{exporting ? 'এক্সপোর্ট হচ্ছে...' : 'CSV এক্সপোর্ট'}
          </button>
        </div>
      </div>

      <ul className="nav nav-tabs mb-3">
        {TABS.map(t => (
          <li className="nav-item" key={t.key}>
            <button className={`nav-link ${tab === t.key ? 'active fw-semibold' : ''}`}
              onClick={() => { setTab(t.key); setSelected(null); }}>{t.label}</button>
          </li>
        ))}
      </ul>

      <div className="row g-2 mb-3">
        <div className="col-md-6">
          <input className="form-control form-control-sm" placeholder="নাম, এনআইডি, ফোনে সার্চ..."
            value={search} onChange={e => setSearch(e.target.value)} />
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
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleOrdering('assessor_no')}>মূল্যায়নকারী নং{orderIcon('assessor_no')}</th>
                        <th>নাম</th>
                        <th>এনআইডি</th>
                        <th>ফোন</th>
                        <th style={{ cursor: 'pointer' }} onClick={() => toggleOrdering('years_of_experience')}>অভিজ্ঞতা{orderIcon('years_of_experience')}</th>
                        <th>অবস্থা</th>
                        <th>অনুমোদন</th>
                        <th className="text-center">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(a => (
                        <tr key={a.id} className={selected?.id === a.id ? 'table-primary' : ''}
                          style={{ cursor: 'pointer' }} onClick={() => setSelected(a)}>
                          <td className="fw-semibold">{a.assessor_no}</td>
                          <td>{a.user_email?.split('@')[0] || '-'}</td>
                          <td>{a.nid}</td>
                          <td>{a.user_phone || '-'}</td>
                          <td>{a.years_of_experience} বছর</td>
                          <td><span className={`badge bg-${STATUS_BG[a.status] || 'secondary'}`}>{a.status_display}</span></td>
                          <td><span className={`badge bg-${APPROVAL_BG[a.approval_status] || 'secondary'}`}>{a.approval_display}</span></td>
                          <td className="text-center">
                            <div className="btn-group btn-group-sm" onClick={e => e.stopPropagation()}>
                              <button className="btn btn-outline-info" title="বিস্তারিত" onClick={() => setSelected(a)}>
                                <i className="bi bi-eye"></i>
                              </button>
                              {a.status === 'active' && (
                                <button className="btn btn-outline-warning" title="স্থগিত" onClick={() => handleAction(a.id, 'suspend')}>
                                  <i className="bi bi-pause"></i>
                                </button>
                              )}
                              {a.status === 'suspended' && a.approval_status === 'approved' && (
                                <button className="btn btn-outline-success" title="সক্রিয়" onClick={() => handleAction(a.id, 'activate')}>
                                  <i className="bi bi-play"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr><td colSpan={8} className="text-center text-muted py-4">কোনো মূল্যায়নকারী পাওয়া যায়নি</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="card-footer d-flex justify-content-between align-items-center text-muted small">
              <span>মোট: {totalCount} জন মূল্যায়নকারী</span>
              {totalPages > 1 && (
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(p => Math.max(1, p - 1))}>পূর্ববর্তী</button>
                    </li>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let p;
                      if (totalPages <= 5) p = i + 1;
                      else if (page <= 3) p = i + 1;
                      else if (page >= totalPages - 2) p = totalPages - 4 + i;
                      else p = page - 2 + i;
                      return (
                        <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                          <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                        </li>
                      );
                    })}
                    <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(p => Math.min(totalPages, p + 1))}>পরবর্তী</button>
                    </li>
                  </ul>
                </nav>
              )}
            </div>
          </div>
        </div>
        {selected && (
          <div className="col-md-5">
            <AssessorDetail assessorId={selected.id} onClose={() => setSelected(null)} onRefresh={fetchItems} />
          </div>
        )}
      </div>

      {showConversion && (
        <TrainerToAssessorConversion onClose={() => setShowConversion(false)} onDone={() => { setShowConversion(false); fetchItems(); }} />
      )}
      {showMapForm && <AssessorMapForm onClose={() => setShowMapForm(false)} onDone={() => { setShowMapForm(false); fetchItems(); }} />}
    </div>
  );
}
