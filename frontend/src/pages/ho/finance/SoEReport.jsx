import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useTranslation } from '../../../hooks/useTranslation';
import { taka, formatDate } from '../../../utils/numberFormatter';

export default function SoEReport() {
  const { t } = useTranslation();
  const [centers, setCenters] = useState([]);
  const [items, setItems] = useState([]);
  const [totalExpenditure, setTotalExpenditure] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
    center_id: '',
    fiscal_year: '',
  });

  const fiscalYears = ['২০২৪-২০২৫', '২০২৫-২০২৬', '২০২৬-২০২৭', '২০২৭-২০২৮'];

  useEffect(() => {
    hoService.listCenters({ status: 'active' }).then(res => {
      setCenters(res.data.results || res.data || []);
    }).catch(() => {});
  }, []);

  const fetchSoE = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      if (filters.center_id) params.center_id = filters.center_id;
      if (filters.fiscal_year) params.fiscal_year = filters.fiscal_year;
      const res = await hoService.getSoEReport(params);
      setItems(res.data.items || []);
      setTotalExpenditure(res.data.total_expenditure || 0);
    } catch (err) {
      toast.error(t('soe.loadError', 'ব্যয় বিবরণী লোড করতে ব্যর্থ'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => { fetchSoE(); }, [fetchSoE]);

  const exportPdf = () => {
    const header = `${t('soe.date', 'তারিখ')},${t('soe.voucherNo', 'ভাউচার নং')},${t('soe.description', 'বিবরণ')},${t('soe.amount', 'পরিমাণ')},${t('soe.approvedBy', 'অনুমোদনকারী')},${t('budget.center', 'কেন্দ্র')}`;
    const rows = items.map(i => `${i.voucher_date},${i.voucher_no},"${i.description}",${i.amount},${i.approved_by || ''},${i.center_name || ''}`);
    const csv = '\uFEFF' + [header, ...rows, '', `${t('soe.total', 'সর্বমোট')}:,,,${totalExpenditure},,`].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SoE_${filters.from_date || 'all'}_${filters.to_date || 'all'}.csv`;
    link.click();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">{t('soe.title', 'ব্যয় বিবরণী (Statement of Expenditure)')}</h5>
        <button className="btn btn-outline-primary btn-sm" onClick={exportPdf}>
          <i className="bi bi-download me-1"></i>{t('common.export', 'এক্সপোর্ট')}
        </button>
      </div>

      <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-3">
              <label className="form-label mb-0" style={{ fontSize: 12 }}>{t('soe.fromDate', 'শুরুর তারিখ')}</label>
              <input type="date" className="form-control form-control-sm" value={filters.from_date} onChange={e => setFilters({ ...filters, from_date: e.target.value })} />
            </div>
            <div className="col-md-3">
              <label className="form-label mb-0" style={{ fontSize: 12 }}>{t('soe.toDate', 'শেষ তারিখ')}</label>
              <input type="date" className="form-control form-control-sm" value={filters.to_date} onChange={e => setFilters({ ...filters, to_date: e.target.value })} />
            </div>
            <div className="col-md-3">
              <label className="form-label mb-0" style={{ fontSize: 12 }}>{t('budget.center', 'কেন্দ্র')}</label>
              <select className="form-select form-select-sm" value={filters.center_id} onChange={e => setFilters({ ...filters, center_id: e.target.value })}>
                <option value="">{t('common.all', 'সব')}</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name_bn}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label mb-0" style={{ fontSize: 12 }}>{t('budget.fiscalYear', 'অর্থবছর')}</label>
              <select className="form-select form-select-sm" value={filters.fiscal_year} onChange={e => setFilters({ ...filters, fiscal_year: e.target.value })}>
                <option value="">{t('common.all', 'সব')}</option>
                {fiscalYears.map(fy => <option key={fy} value={fy}>{fy}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ fontSize: 13 }}>{t('soe.date', 'তারিখ')}</th>
                <th style={{ fontSize: 13 }}>{t('soe.voucherNo', 'ভাউচার নং')}</th>
                <th style={{ fontSize: 13 }}>{t('soe.description', 'বিবরণ')}</th>
                <th style={{ fontSize: 13 }}>{t('soe.amount', 'পরিমাণ')}</th>
                <th style={{ fontSize: 13 }}>{t('soe.approvedBy', 'অনুমোদনকারী')}</th>
                <th style={{ fontSize: 13 }}>{t('budget.center', 'কেন্দ্র')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="text-center py-4"><div className="spinner-border spinner-border-sm" /></td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={6} className="text-center text-secondary py-4">{t('common.noData', 'কোন তথ্য নেই')}</td></tr>
              )}
              {!loading && items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontSize: 13 }}>{item.voucher_date}</td>
                  <td style={{ fontSize: 13 }} className="fw-semibold">{item.voucher_no}</td>
                  <td style={{ fontSize: 13 }}>{item.description}</td>
                  <td style={{ fontSize: 13 }} className="text-danger fw-semibold">{taka(item.amount)}</td>
                  <td style={{ fontSize: 13 }}>{item.approved_by || '-'}</td>
                  <td style={{ fontSize: 13 }}>{item.center_name || '-'}</td>
                </tr>
              ))}
            </tbody>
            {!loading && items.length > 0 && (
              <tfoot className="table-light">
                <tr>
                  <td colSpan={3} className="fw-bold text-end">{t('soe.total', 'সর্বমোট')}:</td>
                  <td className="fw-bold text-danger">{taka(totalExpenditure)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
