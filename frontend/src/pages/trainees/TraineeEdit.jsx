import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';

export default function TraineeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [trainee, setTrainee] = useState(null);
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState({
    batch: '',
    bank_account_no: '',
    bank_name: '',
    bank_branch: '',
    nominee_name: '',
    nominee_relation: '',
    nominee_phone: '',
  });

  useEffect(() => {
    Promise.all([
      api.get(`/trainees/${id}/`),
      api.get('/batches/batches/', { params: { page_size: 999 } }),
    ]).then(([traineeRes, batchRes]) => {
      const t = traineeRes.data;
      setTrainee(t);
      setBatches(batchRes.data.results || batchRes.data || []);
      setForm({
        batch: t.batch || '',
        bank_account_no: t.bank_account_no || '',
        bank_name: t.bank_name || '',
        bank_branch: t.bank_branch || '',
        nominee_name: t.nominee_name || '',
        nominee_relation: t.nominee_relation || '',
        nominee_phone: t.nominee_phone || '',
      });
    }).catch(() => {
      toast.error('তথ্য লোড করতে ব্যর্থ');
      navigate('/center-admin/trainees');
    }).finally(() => setLoading(false));
  }, [id, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/trainees/${id}/`, form);
      toast.success('সফলভাবে আপডেট হয়েছে');
      navigate('/center-admin/trainees');
    } catch (err) {
      const msg = err.response?.data?.detail || 'আপডেট ব্যর্থ';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border" /></div>;

  return (
    <div>
      <div className="d-flex align-items-center mb-3 gap-2">
        <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/center-admin/trainees')} style={{ width: 36, height: 36 }}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <h4 className="fw-bold mb-0">প্রশিক্ষণার্থী সম্পাদনা</h4>
      </div>

      {trainee && (
        <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: 12 }}>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4"><strong>রেজি. নং:</strong> {trainee.registration_no}</div>
              <div className="col-md-4"><strong>নাম:</strong> {trainee.user_name}</div>
              <div className="col-md-4"><strong>কেন্দ্র:</strong> {trainee.center_name}</div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: 12 }}>
          <div className="card-body">
            <h6 className="fw-bold mb-3"><i className="bi bi-diagram-3 me-2 text-primary"></i>ব্যাচ ও অবস্থা</h6>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">ব্যাচ</label>
                <select name="batch" className="form-select" value={form.batch} onChange={handleChange}>
                  <option value="">-- নির্বাচন করুন --</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name_bn || b.batch_name_en || `ব্যাচ #${b.batch_no}`}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: 12 }}>
          <div className="card-body">
            <h6 className="fw-bold mb-3"><i className="bi bi-bank me-2 text-primary"></i>ব্যাংক তথ্য</h6>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">অ্যাকাউন্ট নম্বর</label>
                <input name="bank_account_no" className="form-control" value={form.bank_account_no} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">ব্যাংকের নাম</label>
                <input name="bank_name" className="form-control" value={form.bank_name} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">শাখা</label>
                <input name="bank_branch" className="form-control" value={form.bank_branch} onChange={handleChange} />
              </div>
            </div>
          </div>
        </div>

        <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: 12 }}>
          <div className="card-body">
            <h6 className="fw-bold mb-3"><i className="bi bi-person me-2 text-primary"></i>মনোনীত ব্যক্তি</h6>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">নাম</label>
                <input name="nominee_name" className="form-control" value={form.nominee_name} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">সম্পর্ক</label>
                <input name="nominee_relation" className="form-control" value={form.nominee_relation} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">মোবাইল</label>
                <input name="nominee_phone" className="form-control" value={form.nominee_phone} onChange={handleChange} />
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary px-4" disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check-lg me-1"></i>}
            সংরক্ষণ
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/center-admin/trainees')}>বাতিল</button>
        </div>
      </form>
    </div>
  );
}
