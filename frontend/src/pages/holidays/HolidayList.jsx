import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';
import { formatDate } from '../../utils/dateFormatter';

export default function HolidayList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ date: '', description_bn: '', description_en: '', is_government_holiday: true });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/batches/holidays/', { params: { page, page_size: pageSize } });
      if (data.results) {
        setHolidays(data.results);
        setTotal(data.count);
      } else {
        setHolidays(data);
        setTotal(data.length || 0);
      }
    } catch { toast.error('ছুটির তালিকা লোড করতে ব্যর্থ'); }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => {
    setEditing(null);
    setForm({ date: '', description_bn: '', description_en: '', is_government_holiday: true });
    setShowModal(true);
  };

  const openEdit = (h) => {
    setEditing(h);
    setForm({ date: h.date, description_bn: h.description_bn, description_en: h.description_en, is_government_holiday: h.is_government_holiday });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/batches/holidays/${editing.id}/`, form);
        toast.success('ছুটি আপডেট করা হয়েছে');
      } else {
        await api.post('/batches/holidays/', form);
        toast.success('ছুটি যোগ করা হয়েছে');
      }
      setShowModal(false);
      fetch();
    } catch (e) {
      toast.error(Object.values(e.response?.data || {}).flat().join(', '));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('ছুটির দিনটি মুছে ফেলবেন?')) return;
    try {
      await api.delete(`/batches/holidays/${id}/`);
      toast.success('ছুটি মুছে ফেলা হয়েছে');
      fetch();
    } catch { toast.error('মুছতে ব্যর্থ'); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border" /></div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">ছুটির দিন ব্যবস্থাপনা</h4>
        <button className="btn btn-primary" onClick={openCreate}><i className="bi bi-plus-lg me-1"></i>নতুন ছুটি</button>
      </div>

      <div className="card shadow-sm table-card" style={{ borderRadius: 12, border: 'none' }}>
        <div className="table-responsive">
          <table className="b-table w-100">
            <thead>
              <tr>
                <th>#</th>
                <th>তারিখ</th>
                <th>বিবরণ (বাংলা)</th>
                <th>বিবরণ (ইংরেজি)</th>
                <th>সরকারি ছুটি</th>
                <th className="text-center">কর্ম</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-4"><div className="spinner-border spinner-border-sm me-2" />লোড হচ্ছে...</td></tr>
              ) : holidays.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-secondary py-4">কোন ছুটির দিন পাওয়া যায়নি</td></tr>
              ) : (
                holidays.map((h, i) => (
                  <tr key={h.id}>
                    <td className="fw-semibold">{i + 1}</td>
                    <td>{formatDate(h.date)}</td>
                    <td>{h.description_bn}</td>
                    <td>{h.description_en || '-'}</td>
                    <td>
                      <span className={`status-dot dot-${h.is_government_holiday ? 'active' : 'inactive'}`}></span>
                      <span style={{fontSize:13,color:'#334155'}}>{h.is_government_holiday ? 'হ্যাঁ' : 'না'}</span>
                    </td>
                    <td className="act-col">
                      <div className="dropdown act-dropdown">
                        <button className="dropdown-toggle" data-bs-toggle="dropdown" type="button" data-bs-strategy="fixed">
                          <i className="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                          <li><button className="dropdown-item" onClick={() => openEdit(h)}><i className="bi bi-pencil me-2"></i>সম্পাদনা</button></li>
                          <li><hr className="dropdown-divider my-1" /></li>
                          <li><button className="dropdown-item text-danger" onClick={() => handleDelete(h.id)}><i className="bi bi-trash me-2"></i>মুছুন</button></li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                ))
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
                <h5 className="modal-title">{editing ? 'ছুটি সম্পাদনা' : 'নতুন ছুটি'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">তারিখ</label>
                  <input type="date" className="form-control" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">বিবরণ (বাংলা)</label>
                  <input className="form-control" value={form.description_bn} onChange={e => setForm(f => ({ ...f, description_bn: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">বিবরণ (ইংরেজি)</label>
                  <input className="form-control" value={form.description_en} onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))} />
                </div>
                <div className="form-check">
                  <input type="checkbox" className="form-check-input" id="isGovt" checked={form.is_government_holiday} onChange={e => setForm(f => ({ ...f, is_government_holiday: e.target.checked }))} />
                  <label className="form-check-label" htmlFor="isGovt">সরকারি ছুটি</label>
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
