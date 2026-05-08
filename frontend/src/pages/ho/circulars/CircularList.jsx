import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import CircularDetail from './CircularDetail';
import CircularForm from './CircularForm';

const STATUS_BG = { draft: 'secondary', published: 'success', closed: 'danger', completed: 'info' };

export default function CircularList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [centerFilter, setCenterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [centers, setCenters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search: search || undefined, page, page_size: pageSize };
      if (centerFilter) params.center = centerFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await hoService.listCirculars(params);
      const data = res.data;
      setItems(data.results || data);
      setTotalCount(data.count ?? data.length ?? 0);
    } catch { toast.error('সার্কুলার তালিকা লোড করতে ব্যর্থ');
    } finally { setLoading(false); }
  }, [search, centerFilter, statusFilter, page]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [search, centerFilter, statusFilter]);

  useEffect(() => {
    hoService.listCenters({ status: 'active' }).then(r => {
      setCenters(r.data.results || r.data || []);
    }).catch(() => {});
  }, []);

  const handlePublish = async (id) => {
    try {
      await hoService.publishCircular(id);
      toast.success('সার্কুলার প্রকাশিত হয়েছে');
      fetchItems();
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      toast.error(e.response?.data?.error || 'প্রকাশ করতে ব্যর্থ');
    }
  };

  const handleClose = async (id) => {
    try {
      await hoService.closeCircular(id);
      toast.success('সার্কুলার বন্ধ করা হয়েছে');
      fetchItems();
      if (selected?.id === id) setSelected(null);
    } catch (e) {
      toast.error(e.response?.data?.error || 'বন্ধ করতে ব্যর্থ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('সার্কুলারটি মুছে ফেলবেন? এটি অপরিবর্তনীয়।')) return;
    try {
      await hoService.deleteCircular(id);
      toast.success('সার্কুলার মুছে ফেলা হয়েছে');
      fetchItems();
      if (selected?.id === id) setSelected(null);
    } catch { toast.error('মুছতে ব্যর্থ'); }
  };

  const openEdit = (item) => {
    setEditing(item);
    setShowForm(true);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0 fw-bold">সার্কুলার ব্যবস্থাপনা</h5>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <i className="bi bi-plus-lg me-1"></i>নতুন সার্কুলার
        </button>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-4">
          <input className="form-control form-control-sm" placeholder="শিরোনাম অনুসারে সার্চ..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="col-md-3">
          <select className="form-select form-select-sm" value={centerFilter} onChange={e => setCenterFilter(e.target.value)}>
            <option value="">সব কেন্দ্র</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name_bn}</option>)}
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select form-select-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">সব অবস্থা</option>
            <option value="draft">খসড়া</option>
            <option value="published">প্রকাশিত</option>
            <option value="closed">বন্ধ</option>
            <option value="completed">সমাপ্ত</option>
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
                        <th>শিরোনাম</th>
                        <th>কেন্দ্র</th>
                        <th>কোর্স</th>
                        <th>আবেদনের তারিখ</th>
                        <th>প্রশিক্ষণের তারিখ</th>
                        <th>আসন</th>
                        <th>অবশিষ্ট</th>
                        <th>অবস্থা</th>
                        <th className="text-center">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(c => (
                        <tr key={c.id} className={selected?.id === c.id ? 'table-primary' : ''}
                          style={{ cursor: 'pointer' }} onClick={() => setSelected(c)}>
                          <td className="fw-semibold">{c.title_bn}</td>
                          <td>{c.center_code}</td>
                          <td>{c.course_code}</td>
                          <td style={{ fontSize: 12 }}>{c.application_start_date} → {c.application_end_date}</td>
                          <td style={{ fontSize: 12 }}>{c.training_start_date} → {c.training_end_date}</td>
                          <td className="text-center">{c.total_seats}</td>
                          <td className="text-center">{c.remaining_seats}</td>
                          <td><span className={`badge bg-${STATUS_BG[c.status]}`}>{c.status_display}</span></td>
                          <td className="text-center">
                            <div className="btn-group btn-group-sm" onClick={e => e.stopPropagation()}>
                              <button className="btn btn-outline-info" title="বিস্তারিত" onClick={() => setSelected(c)}>
                                <i className="bi bi-eye"></i>
                              </button>
                              {c.status === 'draft' && (
                                <>
                                  <button className="btn btn-outline-primary" title="সম্পাদনা" onClick={() => openEdit(c)}>
                                    <i className="bi bi-pencil"></i>
                                  </button>
                                  <button className="btn btn-outline-success" title="প্রকাশ" onClick={() => handlePublish(c.id)}>
                                    <i className="bi bi-send"></i>
                                  </button>
                                  <button className="btn btn-outline-danger" title="মুছুন" onClick={() => handleDelete(c.id)}>
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </>
                              )}
                              {c.status === 'published' && (
                                <button className="btn btn-outline-warning" title="বন্ধ করুন" onClick={() => handleClose(c.id)}>
                                  <i className="bi bi-stop"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr><td colSpan={9} className="text-center text-muted py-4">কোনো সার্কুলার পাওয়া যায়নি</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="card-footer d-flex justify-content-between align-items-center text-muted small">
              <span>মোট: {totalCount}টি সার্কুলার</span>
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
            <CircularDetail circularId={selected.id} onClose={() => setSelected(null)} onRefresh={fetchItems} />
          </div>
        )}
      </div>

      {showForm && (
        <CircularForm
          editData={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onDone={() => { setShowForm(false); setEditing(null); fetchItems(); }}
        />
      )}
    </div>
  );
}
