import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import allowanceService from '../../services/allowanceService';
import { useTranslation } from '../../hooks/useTranslation';

export default function AllowanceCategoryList() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ name_bn: '', name_en: '', amount_per_session: '', is_active: true });
  const navigate = useNavigate();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await allowanceService.listCategories();
      setCategories(data.results || data);
    } catch { toast.error('ভাতার শ্রেণী লোড করতে ব্যর্থ'); }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name_bn: '', name_en: '', amount_per_session: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ name_bn: c.name_bn, name_en: c.name_en, amount_per_session: c.amount_per_session, is_active: c.is_active });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await allowanceService.updateCategory(editing.id, form);
        toast.success('ভাতার শ্রেণী আপডেট করা হয়েছে');
      } else {
        await allowanceService.createCategory(form);
        toast.success('ভাতার শ্রেণী তৈরি করা হয়েছে');
      }
      setShowModal(false);
      fetch();
    } catch (e) {
      toast.error(Object.values(e.response?.data || {}).flat().join(', '));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('ভাতার শ্রেণীটি মুছে ফেলবেন?')) return;
    try {
      await allowanceService.deleteCategory(id);
      toast.success('ভাতার শ্রেণী মুছে ফেলা হয়েছে');
      fetch();
    } catch { toast.error('মুছতে ব্যর্থ'); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border" /></div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">ভাতার শ্রেণী</h4>
        <button className="btn btn-primary" onClick={openCreate}><i className="bi bi-plus-lg me-1"></i>নতুন শ্রেণী</button>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <table className="b-table w-100">
            <thead>
              <tr>
                <th>#</th>
                <th>নাম (বাংলা)</th>
                <th>নাম (ইংরেজি)</th>
                <th>প্রতি সেশনে ভাতা</th>
                <th>সক্রিয়</th>
                <th className="text-center">কর্ম</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-secondary py-4">কোন ভাতার শ্রেণী পাওয়া যায়নি</td></tr>
              ) : (
                categories.flatMap((c, i) => [
                  <tr key={c.id} className="b-row">
                    <td>{i + 1}</td>
                    <td>{c.name_bn}</td>
                    <td>{c.name_en}</td>
                    <td>{c.amount_per_session} টাকা</td>
                    <td>
                      <span className={`status-dot dot-${c.is_active ? 'active' : 'inactive'}`}></span>
                      <span>{c.is_active ? 'হ্যাঁ' : 'না'}</span>
                    </td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-outline-secondary border-0 me-1" onClick={() => navigate(`/allowance-categories/${c.id}`)} title="বিস্তারিত"><i className="bi bi-eye"></i></button>
                      <button className={`btn btn-sm btn-outline-secondary border-0 exp-btn${expandedId === c.id ? ' act-btn--active' : ''}`} onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                        <i className="bi bi-three-dots-vertical"></i>
                      </button>
                    </td>
                  </tr>,
                  expandedId === c.id && (
                    <tr key={`${c.id}-exp`} className="exp-row">
                      <td colSpan={6}>
                        <div className="exp-panel">
                          <button className="act-btn" onClick={() => openEdit(c)}><i className="bi bi-pencil me-1"></i>সম্পাদনা</button>
                          <button className="act-btn" onClick={() => handleDelete(c.id)}><i className="bi bi-trash me-1"></i>মুছুন</button>
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

      {showModal && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'শ্রেণী সম্পাদনা' : 'নতুন ভাতার শ্রেণী'}</h5>
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
                <div className="mb-3">
                  <label className="form-label">প্রতি সেশনে ভাতা (টাকা)</label>
                  <input type="number" step="0.01" className="form-control" value={form.amount_per_session} onChange={e => setForm(f => ({ ...f, amount_per_session: e.target.value }))} />
                </div>
                <div className="form-check">
                  <input type="checkbox" className="form-check-input" id="isActiveCat" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  <label className="form-check-label" htmlFor="isActiveCat">সক্রিয়</label>
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
