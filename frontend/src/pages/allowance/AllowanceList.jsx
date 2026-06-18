import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import allowanceService from '../../services/allowanceService';
import batchService from '../../services/batchService';
import { useTranslation } from '../../hooks/useTranslation';

const STATUS_BADGE = {
  calculated: 'secondary',
  approved: 'success',
  disbursed: 'primary',
};

export default function AllowanceList() {
  const { t } = useTranslation();
  const [allowances, setAllowances] = useState([]);
  const [batches, setBatches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchBatches = useCallback(async () => {
    try {
      const { data } = await batchService.list({ page_size: 100 });
      setBatches(data.results || []);
    } catch { /* ignore */ }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await allowanceService.listCategories();
      setCategories(data.results || data);
    } catch { /* ignore */ }
  }, []);

  const fetchAllowances = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedBatch) params.batch = selectedBatch;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedStatus) params.status = selectedStatus;
      const { data } = await allowanceService.listAllowances(params);
      setAllowances(data.results || data);
    } catch { toast.error('ভাতার তালিকা লোড করতে ব্যর্থ'); }
    setLoading(false);
  }, [selectedBatch, selectedCategory, selectedStatus]);

  useEffect(() => { fetchBatches(); fetchCategories(); }, [fetchBatches, fetchCategories]);
  useEffect(() => { fetchAllowances(); }, [fetchAllowances]);

  const handleGenerate = async () => {
    if (!selectedBatch) { toast.error('ব্যাচ নির্বাচন করুন'); return; }
    try {
      const { data } = await allowanceService.generateAllowances({ batch: selectedBatch });
      toast.success(data.message);
      fetchAllowances();
    } catch (e) { toast.error('জেনারেট করতে ব্যর্থ'); }
  };

  const handleCalculate = async () => {
    if (!selectedBatch) { toast.error('ব্যাচ নির্বাচন করুন'); return; }
    try {
      const { data } = await allowanceService.calculateBatch({ batch: selectedBatch });
      toast.success(data.message);
      fetchAllowances();
    } catch (e) { toast.error('গণনা করতে ব্যর্থ'); }
  };

  const handleApprove = async (id) => {
    try {
      await allowanceService.approveAllowance(id, {});
      toast.success('অনুমোদন করা হয়েছে');
      fetchAllowances();
    } catch (e) { toast.error('অনুমোদন ব্যর্থ'); }
  };

  const handleDisburse = async (id) => {
    try {
      await allowanceService.disburseAllowance(id);
      toast.success('বিতরণ করা হয়েছে');
      fetchAllowances();
    } catch (e) { toast.error('বিতরণ ব্যর্থ'); }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">প্রশিক্ষণার্থী ভাতা</h4>
        <div>
          <button className="btn btn-outline-primary me-2" onClick={handleGenerate}><i className="bi bi-plus-circle me-1"></i>জেনারেট</button>
          <button className="btn btn-outline-secondary" onClick={handleCalculate}><i className="bi bi-calculator me-1"></i>গণনা</button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-4">
              <select className="form-select" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
                <option value="">সকল ব্যাচ</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name_bn}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                <option value="">সকল শ্রেণী</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name_bn}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                <option value="">সকল অবস্থা</option>
                <option value="calculated">গণনাকৃত</option>
                <option value="approved">অনুমোদিত</option>
                <option value="disbursed">বিতরণকৃত</option>
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary w-100" onClick={fetchAllowances}>ফিল্টার</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <table className="table table-bordered align-middle mb-0">
            <thead className="bg-light">
              <tr>
                <th>#</th>
                <th>প্রশিক্ষণার্থী</th>
                <th>রেজি. নং</th>
                <th>ব্যাচ</th>
                <th>শ্রেণী</th>
                <th>উপস্থিতি</th>
                <th>গণনাকৃত</th>
                <th>অনুমোদিত</th>
                <th>অবস্থা</th>
                <th>কর্ম</th>
              </tr>
            </thead>
            <tbody>
              {allowances.map((a, i) => (
                <tr key={a.id}>
                  <td>{i + 1}</td>
                  <td>{a.trainee_name}</td>
                  <td>{a.registration_no}</td>
                  <td>{a.batch}</td>
                  <td>{a.category_name}</td>
                  <td>{a.attended_sessions}/{a.total_sessions}</td>
                  <td>{a.calculated_amount} টাকা</td>
                  <td>{a.approved_amount ? `${a.approved_amount} টাকা` : '-'}</td>
                  <td><span className={`badge bg-${STATUS_BADGE[a.status] || 'secondary'}`}>{a.status}</span></td>
                  <td>
                    {a.status === 'calculated' && (
                      <button className="btn btn-sm btn-outline-success me-1" onClick={() => handleApprove(a.id)}><i className="bi bi-check-lg"></i></button>
                    )}
                    {a.status === 'approved' && (
                      <button className="btn btn-sm btn-outline-primary" onClick={() => handleDisburse(a.id)}><i className="bi bi-cash"></i></button>
                    )}
                  </td>
                </tr>
              ))}
              {allowances.length === 0 && (
                <tr><td colSpan={10} className="text-center text-muted py-4">কোন ভাতা পাওয়া যায়নি</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
