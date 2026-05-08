import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useTranslation } from '../../../hooks/useTranslation';
import { taka, pct } from '../../../utils/numberFormatter';
import BudgetForm from './BudgetForm';

export default function BudgetManagement() {
  const { t } = useTranslation();
  const [budgets, setBudgets] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [fiscalYear, setFiscalYear] = useState('');
  const [centerFilter, setCenterFilter] = useState('');

  const fiscalYears = ['২০২৪-২০২৫', '২০২৫-২০২৬', '২০২৬-২০২৭', '২০২৭-২০২৮'];

  const fetchBudgets = useCallback(async () => {
    try {
      const params = {};
      if (fiscalYear) params.fiscal_year = fiscalYear;
      if (centerFilter) params.center = centerFilter;
      const res = await hoService.listBudgets(params);
      setBudgets(res.data.results || res.data || []);
    } catch (err) {
      toast.error(t('budget.loadError', 'বাজেট তথ্য লোড করতে ব্যর্থ'));
    } finally {
      setLoading(false);
    }
  }, [fiscalYear, centerFilter, t]);

  useEffect(() => {
    hoService.listCenters({ status: 'active' }).then(res => {
      setCenters(res.data.results || res.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const handleEdit = (b) => {
    setEditBudget(b);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditBudget(null);
    setShowForm(true);
  };

  const handleSaved = () => {
    fetchBudgets();
  };

  const exportReport = () => {
    const header = `${t('budget.center', 'কেন্দ্র')},${t('budget.fiscalYear', 'অর্থবছর')},${t('budget.allocated', 'বরাদ্দ')},${t('budget.expended', 'ব্যয়')},${t('budget.utilization', 'ব্যবহার')}`;
    const rows = budgets.map(b => `${b.center_code || b.center},${b.fiscal_year},${b.allocated_amount},${b.expended_amount},${b.utilization_pct || 0}%`);
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `budget_report_${fiscalYear || 'all'}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">{t('budget.title', 'বাজেট ব্যবস্থাপনা')}</h5>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary btn-sm" onClick={exportReport}>
            <i className="bi bi-download me-1"></i>{t('common.export', 'এক্সপোর্ট')}
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleNew}>
            <i className="bi bi-plus-lg me-1"></i>{t('budget.new', 'নতুন বাজেট')}
          </button>
        </div>
      </div>

      <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label mb-0" style={{ fontSize: 12 }}>{t('budget.fiscalYear', 'অর্থবছর')}</label>
              <select className="form-select form-select-sm" value={fiscalYear} onChange={e => setFiscalYear(e.target.value)}>
                <option value="">{t('common.all', 'সব')}</option>
                {fiscalYears.map(fy => <option key={fy} value={fy}>{fy}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label mb-0" style={{ fontSize: 12 }}>{t('budget.center', 'কেন্দ্র')}</label>
              <select className="form-select form-select-sm" value={centerFilter} onChange={e => setCenterFilter(e.target.value)}>
                <option value="">{t('common.all', 'সব')}</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name_bn}</option>)}
              </select>
            </div>
            <div className="col-md-4 d-flex gap-2">
              <button className="btn btn-sm btn-outline-secondary flex-grow-1" onClick={fetchBudgets}>
                <i className="bi bi-search me-1"></i>{t('common.search', 'অনুসন্ধান')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ fontSize: 13 }}>{t('budget.center', 'কেন্দ্র')}</th>
                <th style={{ fontSize: 13 }}>{t('budget.fiscalYear', 'অর্থবছর')}</th>
                <th style={{ fontSize: 13 }}>{t('budget.allocated', 'বরাদ্দ')}</th>
                <th style={{ fontSize: 13 }}>{t('budget.expended', 'ব্যয়')}</th>
                <th style={{ fontSize: 13 }}>{t('budget.utilization', 'ব্যবহার')}</th>
                <th style={{ fontSize: 13 }}>{t('common.actions', 'অপশন')}</th>
              </tr>
            </thead>
            <tbody>
              {budgets.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-secondary py-4">{t('common.noData', 'কোন তথ্য নেই')}</td>
                </tr>
              )}
              {budgets.map(b => {
                const p = b.utilization_pct || 0;
                const alertClass = p > 90 ? 'bg-danger bg-opacity-10 border-danger' : p > 75 ? 'bg-warning bg-opacity-10' : '';
                return (
                  <tr key={b.id} className={alertClass}>
                    <td style={{ fontSize: 13 }}>{b.center_name || b.center_code}</td>
                    <td style={{ fontSize: 13 }}>{b.fiscal_year}</td>
                    <td style={{ fontSize: 13 }}>{taka(b.allocated_amount)}</td>
                    <td style={{ fontSize: 13 }}>{taka(b.expended_amount)}</td>
                    <td style={{ fontSize: 13 }}>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress flex-grow-1" style={{ height: 6, borderRadius: 3 }}>
                          <div
                            className={`progress-bar ${p > 90 ? 'bg-danger' : p > 75 ? 'bg-warning' : 'bg-primary'}`}
                            style={{ width: `${Math.min(p, 100)}%` }}
                          />
                        </div>
                        <span className={p > 90 ? 'text-danger fw-bold' : ''}>{pct(p)}</span>
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => handleEdit(b)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <BudgetForm
        show={showForm}
        onClose={() => { setShowForm(false); setEditBudget(null); }}
        onSaved={handleSaved}
        budget={editBudget}
        centers={centers}
        fiscalYears={fiscalYears}
      />
    </div>
  );
}
