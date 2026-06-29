import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';

export default function ShiftList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name_bn: '', name_en: '', start_time: '', end_time: '', is_active: true });
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/batches/shifts/', { params: { page, page_size: pageSize } });
      if (data.results) {
        setShifts(data.results);
        setTotal(data.count);
      } else {
        setShifts(data);
        setTotal(data.length || 0);
      }
    } catch { toast.error('শিফট তালিকা লোড করতে ব্যর্থ'); }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name_bn: '', name_en: '', start_time: '', end_time: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ name_bn: s.name_bn, name_en: s.name_en, start_time: s.start_time, end_time: s.end_time, is_active: s.is_active });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/batches/shifts/${editing.id}/`, form);
        toast.success('শিফট আপডেট করা হয়েছে');
      } else {
        await api.post('/batches/shifts/', form);
        toast.success('শিফট তৈরি করা হয়েছে');
      }
      setShowModal(false);
      fetch();
    } catch (e) {
      toast.error(Object.values(e.response?.data || {}).flat().join(', '));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('শিফটটি মুছে ফেলবেন?')) return;
    try {
      await api.delete(`/batches/shifts/${id}/`);
      toast.success('শিফট মুছে ফেলা হয়েছে');
      fetch();
    } catch { toast.error('মুছতে ব্যর্থ'); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border" /></div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">শিফট ব্যবস্থাপনা</h4>
        <button className="btn btn-primary" onClick={openCreate}><i className="bi bi-plus-lg me-1"></i>নতুন শিফট</button>
      </div>

      <div className="card shadow-sm table-card" style={{ borderRadius: 12, border: 'none' }}>
        <div className="table-responsive">
          <table className="b-table w-100">
            <thead>
              <tr>
                <th>#</th>
                <th>নাম (বাংলা)</th>
                <th>নাম (ইংরেজি)</th>
                <th>শুরুর সময়</th>
                <th>শেষের সময়</th>
                <th>সক্রিয়</th>
                <th className="text-center">কর্ম</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4"><div className="spinner-border spinner-border-sm me-2" />লোড হচ্ছে...</td></tr>
              ) : shifts.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-secondary py-4">কোন শিফট পাওয়া যায়নি</td></tr>
              ) : (
                shifts.flatMap((s, i) => {
                  const isOpen = expandedId === s.id;
                  return [
                    <tr key={s.id} className={`b-row${isOpen ? ' b-row--active' : ''}`}>
                      <td className="fw-semibold">{i + 1}</td>
                      <td>{s.name_bn}</td>
                      <td>{s.name_en}</td>
                      <td>{s.start_time}</td>
                      <td>{s.end_time}</td>
                      <td>
                        <span className={`status-dot dot-${s.is_active ? 'active' : 'inactive'}`}></span>
                        <span style={{fontSize:13,color:'#334155'}}>{s.is_active ? 'হ্যাঁ' : 'না'}</span>
                      </td>
                      <td className="text-center">
                        <button className="btn btn-sm btn-outline-secondary border-0 me-1" onClick={() => navigate(`/center-admin/shifts/${s.id}`)} title="বিস্তারিত"><i className="bi bi-eye"></i></button>
                        <button className={`btn btn-sm btn-outline-secondary border-0 exp-btn${isOpen ? ' act-btn--active' : ''}`} onClick={() => setExpandedId(isOpen ? null : s.id)}>
                          <i className="bi bi-three-dots-vertical"></i>
                        </button>
                      </td>
                    </tr>,
                    isOpen && (
                      <tr key={`exp-${s.id}`} className="exp-row">
                        <td colSpan={7}>
                          <div className="exp-panel">
                            <button className="act-btn" onClick={() => openEdit(s)}><i className="bi bi-pencil me-1"></i>সম্পাদনা</button>
                            <button className="act-btn text-danger" onClick={() => handleDelete(s.id)}><i className="bi bi-trash me-1"></i>মুছুন</button>
                          </div>
                        </td>
                      </tr>
                    )
                  ];
                })
              )}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div className="b-pagination d-flex justify-content-between align-items-center py-2 px-3">
            <span className="page-info">দেখানো হচ্ছে {Math.min((page - 1) * pageSize + 1, total)}-{Math.min(page * pageSize, total)} এর {total}</span>
            <div className="d-flex gap-1">
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <i className="bi bi-chevron-left"></i>
              </button>
              <button className="page-btn" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(page + 1)}>
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'শিফট সম্পাদনা' : 'নতুন শিফট'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">নাম (বাংলা)</label>
                  <input className="form-control" value={form.name_bn} onChange={e => setForm(f => ({ ...f, name_bn: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">নাম (ইংরেজি)</label>
                  <input className="form-control" value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} />
                </div>
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label">শুরুর সময়</label>
                    <input type="time" className="form-control" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label">শেষের সময়</label>
                    <input type="time" className="form-control" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
                  </div>
                </div>
                <div className="form-check">
                  <input type="checkbox" className="form-check-input" id="isActive" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  <label className="form-check-label" htmlFor="isActive">সক্রিয়</label>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>বাতিল</button>
                <button className="btn btn-primary" onClick={handleSave}>{editing ? 'হালনাগাদ' : 'তৈরি করুন'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
