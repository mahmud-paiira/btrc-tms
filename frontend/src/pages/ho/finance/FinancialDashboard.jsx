import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useTranslation } from '../../../hooks/useTranslation';
import { taka } from '../../../utils/numberFormatter';

export default function FinancialDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [utilization, setUtilization] = useState([]);
  const [soeRecent, setSoeRecent] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, utilRes, budgetRes] = await Promise.all([
        hoService.getVoucherStats(),
        hoService.getBudgetUtilization({}),
        hoService.listBudgets({ ordering: '-fiscal_year', limit: 5 }),
      ]);
      setStats(statsRes.data);
      setUtilization(utilRes.data);
      setBudgets(budgetRes.data.results || budgetRes.data);

      const soeRes = await hoService.getSoEReport({});
      setSoeRecent(soeRes.data.items?.slice(-5) || []);
    } catch (err) {
      toast.error(t('finance.loadError', 'অর্থ সংক্রান্ত তথ্য লোড করতে ব্যর্থ'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
        <div className="spinner-border text-primary" />
      </div>
    );
  }

  const cardStyle = {
    borderRadius: 12,
    border: 'none',
    transition: 'transform 0.15s, box-shadow 0.15s',
    cursor: 'pointer',
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0">{t('finance.title', 'অর্থ ব্যবস্থাপনা')}</h4>
        <button className="btn btn-outline-primary btn-sm" onClick={fetchData}>
          <i className="bi bi-arrow-clockwise me-1"></i>{t('common.refresh', 'রিফ্রেশ')}
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card p-3 shadow-sm" style={cardStyle} onClick={() => navigate('/ho/finance/budgets')}>
            <div className="d-flex justify-content-between">
              <div>
                <small className="text-secondary">{t('finance.totalBudget', 'মোট বাজেট')}</small>
                <h4 className="fw-bold text-primary mb-0">{taka(stats?.total_budget || 0)}</h4>
              </div>
              <div className="bg-primary bg-opacity-10 p-3 rounded-3">
                <i className="bi bi-piggy-bank fs-4 text-primary"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3 shadow-sm" style={cardStyle} onClick={() => navigate('/ho/finance/soe')}>
            <div className="d-flex justify-content-between">
              <div>
                <small className="text-secondary">{t('finance.totalExpenditure', 'মোট ব্যয়')}</small>
                <h4 className="fw-bold text-danger mb-0">{taka(stats?.total_expenditure || 0)}</h4>
              </div>
              <div className="bg-danger bg-opacity-10 p-3 rounded-3">
                <i className="bi bi-arrow-up-short fs-4 text-danger"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3 shadow-sm" style={cardStyle}>
            <div className="d-flex justify-content-between">
              <div>
                <small className="text-secondary">{t('finance.remaining', 'অবশিষ্ট')}</small>
                <h4 className="fw-bold text-success mb-0">{taka(stats?.remaining_budget || 0)}</h4>
              </div>
              <div className="bg-success bg-opacity-10 p-3 rounded-3">
                <i className="bi bi-pie-chart fs-4 text-success"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3 shadow-sm" style={cardStyle} onClick={() => navigate('/ho/finance/vouchers')}>
            <div className="d-flex justify-content-between">
              <div>
                <small className="text-secondary">{t('finance.pendingApprovals', 'অনুমোদন অপেক্ষমান')}</small>
                <h4 className="fw-bold text-warning mb-0">{stats?.pending_approvals || 0}</h4>
              </div>
              <div className="bg-warning bg-opacity-10 p-3 rounded-3">
                <i className="bi bi-clock-history fs-4 text-warning"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
            <div className="card-header bg-white py-3" style={{ borderRadius: '12px 12px 0 0' }}>
              <h6 className="fw-bold mb-0">{t('finance.budgetUtilization', 'কেন্দ্র ভিত্তিক বাজেট ব্যবহার')}</h6>
            </div>
            <div className="card-body" style={{ maxHeight: 350, overflowY: 'auto' }}>
              {utilization.length === 0 && (
                <p className="text-secondary text-center py-4">{t('common.noData', 'কোন তথ্য নেই')}</p>
              )}
              {utilization.map((u, i) => (
                <div key={i} className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span style={{ fontSize: 13 }}>{u.center_name}</span>
                    <span className={u.utilization_pct > 90 ? 'text-danger fw-bold' : u.utilization_pct > 75 ? 'text-warning' : ''} style={{ fontSize: 13 }}>
                      {u.utilization_pct}%
                    </span>
                  </div>
                  <div className="progress" style={{ height: 8, borderRadius: 4 }}>
                    <div
                      className={`progress-bar ${u.utilization_pct > 90 ? 'bg-danger' : u.utilization_pct > 75 ? 'bg-warning' : 'bg-primary'}`}
                      style={{ width: `${Math.min(u.utilization_pct, 100)}%` }}
                    />
                  </div>
                  <div className="d-flex justify-content-between text-secondary" style={{ fontSize: 11 }}>
                    <span>{taka(u.allocated_amount)}</span>
                    <span>{taka(u.expended_amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
            <div className="card-header bg-white py-3" style={{ borderRadius: '12px 12px 0 0' }}>
              <h6 className="fw-bold mb-0">{t('finance.recentSoE', 'সাম্প্রতিক ব্যয় বিবরণী')}</h6>
            </div>
            <div className="card-body" style={{ maxHeight: 350, overflowY: 'auto' }}>
              {soeRecent.length === 0 && (
                <p className="text-secondary text-center py-4">{t('common.noData', 'কোন তথ্য নেই')}</p>
              )}
              {soeRecent.map((s, i) => (
                <div key={i} className="d-flex justify-content-between align-items-center py-2 border-bottom border-light">
                  <div>
                    <div className="fw-semibold" style={{ fontSize: 13 }}>{s.voucher_no}</div>
                    <small className="text-secondary">{s.voucher_date} - {s.center_name}</small>
                  </div>
                  <div className="text-danger fw-bold" style={{ fontSize: 13 }}>{taka(s.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mt-2">
        <div className="col-12">
          <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
            <div className="card-header bg-white py-3" style={{ borderRadius: '12px 12px 0 0' }}>
              <h6 className="fw-bold mb-0">{t('finance.quickActions', 'দ্রুত অপারেশন')}</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3 col-6">
                  <button className="btn btn-outline-primary w-100 py-3" onClick={() => navigate('/ho/finance/budgets')}>
                    <i className="bi bi-piggy-bank fs-4 d-block mb-1"></i>
                    <small>{t('finance.budgets', 'বাজেট')}</small>
                  </button>
                </div>
                <div className="col-md-3 col-6">
                  <button className="btn btn-outline-success w-100 py-3" onClick={() => navigate('/ho/finance/vouchers')}>
                    <i className="bi bi-receipt fs-4 d-block mb-1"></i>
                    <small>{t('finance.vouchers', 'ভাউচার')}</small>
                  </button>
                </div>
                <div className="col-md-3 col-6">
                  <button className="btn btn-outline-info w-100 py-3" onClick={() => navigate('/ho/finance/soe')}>
                    <i className="bi bi-file-text fs-4 d-block mb-1"></i>
                    <small>{t('finance.soe', 'ব্যয় বিবরণী')}</small>
                  </button>
                </div>
                <div className="col-md-3 col-6">
                  <button className="btn btn-outline-secondary w-100 py-3" onClick={() => navigate('/ho/finance/trial-balance')}>
                    <i className="bi bi-journal-text fs-4 d-block mb-1"></i>
                    <small>{t('finance.trialBalance', 'ট্রায়াল ব্যালেন্স')}</small>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
