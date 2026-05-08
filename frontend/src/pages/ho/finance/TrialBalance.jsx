import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useTranslation } from '../../../hooks/useTranslation';
import { taka } from '../../../utils/numberFormatter';

export default function TrialBalance() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ledgerAccount, setLedgerAccount] = useState('');
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [showLedger, setShowLedger] = useState(false);

  useEffect(() => {
    hoService.getTrialBalance().then(res => {
      setItems(res.data || []);
    }).catch(() => {
      toast.error(t('trialBalance.loadError', 'ট্রায়াল ব্যালেন্স লোড করতে ব্যর্থ'));
    }).finally(() => setLoading(false));
  }, [t]);

  const totalDebit = items.reduce((s, i) => s + Number(i.total_debit || 0), 0);
  const totalCredit = items.reduce((s, i) => s + Number(i.total_credit || 0), 0);

  const viewLedger = async (account) => {
    setLedgerAccount(account);
    setLedgerLoading(true);
    try {
      const res = await hoService.getLedger(account);
      setLedgerEntries(res.data || []);
      setShowLedger(true);
    } catch (err) {
      toast.error(t('ledger.loadError', 'লেজার লোড করতে ব্যর্থ'));
    } finally {
      setLedgerLoading(false);
    }
  };

  const exportExcel = () => {
    const header = `${t('trialBalance.accountHead', 'হিসাব শিরোনাম')},${t('trialBalance.debit', 'ডেবিট')},${t('trialBalance.credit', 'ক্রেডিট')},${t('trialBalance.balance', 'ব্যালেন্স')}`;
    const rows = items.map(i => `${i.account_head},${i.total_debit},${i.total_credit},${i.balance}`);
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'trial_balance.csv';
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
        <h5 className="fw-bold mb-0">{t('trialBalance.title', 'ট্রায়াল ব্যালেন্স')}</h5>
        <button className="btn btn-outline-primary btn-sm" onClick={exportExcel}>
          <i className="bi bi-download me-1"></i>{t('common.export', 'এক্সপোর্ট')}
        </button>
      </div>

      <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body p-3">
          <div className="d-flex justify-content-between align-items-center">
            <span className="fw-bold">{t('trialBalance.summary', 'সারসংক্ষেপ')}</span>
            <div className="d-flex gap-4">
              <div>
                <small className="text-secondary d-block">{t('trialBalance.totalDebit', 'মোট ডেবিট')}</small>
                <span className="fw-bold text-danger">{taka(totalDebit)}</span>
              </div>
              <div>
                <small className="text-secondary d-block">{t('trialBalance.totalCredit', 'মোট ক্রেডিট')}</small>
                <span className="fw-bold text-success">{taka(totalCredit)}</span>
              </div>
              <div>
                <small className="text-secondary d-block">{t('trialBalance.difference', 'পার্থক্য')}</small>
                <span className={`fw-bold ${totalDebit === totalCredit ? 'text-success' : 'text-danger'}`}>
                  {totalDebit === totalCredit ? '✓ ' + t('trialBalance.matched', 'সমান') : taka(Math.abs(totalDebit - totalCredit))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm" style={{ borderRadius: 12, border: 'none' }}>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ fontSize: 13 }}>{t('trialBalance.accountHead', 'হিসাব শিরোনাম')}</th>
                <th style={{ fontSize: 13 }} className="text-end">{t('trialBalance.debit', 'ডেবিট')}</th>
                <th style={{ fontSize: 13 }} className="text-end">{t('trialBalance.credit', 'ক্রেডিট')}</th>
                <th style={{ fontSize: 13 }} className="text-end">{t('trialBalance.balance', 'ব্যালেন্স')}</th>
                <th style={{ fontSize: 13 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-secondary py-4">{t('common.noData', 'কোন তথ্য নেই')}</td>
                </tr>
              )}
              {items.map((item, idx) => {
                const balance = Number(item.balance || 0);
                return (
                  <tr key={idx}>
                    <td style={{ fontSize: 13 }} className="fw-semibold">{item.account_head}</td>
                    <td style={{ fontSize: 13 }} className="text-end text-danger">{taka(item.total_debit)}</td>
                    <td style={{ fontSize: 13 }} className="text-end text-success">{taka(item.total_credit)}</td>
                    <td style={{ fontSize: 13 }} className={`text-end fw-bold ${balance > 0 ? 'text-danger' : balance < 0 ? 'text-success' : ''}`}>
                      {taka(Math.abs(balance))} {balance >= 0 ? 'Dr' : 'Cr'}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => viewLedger(item.account_head)}>
                        <i className="bi bi-journal-text me-1"></i>{t('trialBalance.ledger', 'লেজার')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {items.length > 0 && (
              <tfoot className="table-light">
                <tr>
                  <td className="fw-bold">{t('trialBalance.total', 'সর্বমোট')}</td>
                  <td className="fw-bold text-end text-danger">{taka(totalDebit)}</td>
                  <td className="fw-bold text-end text-success">{taka(totalCredit)}</td>
                  <td className="fw-bold text-end">{taka(Math.abs(totalDebit - totalCredit))}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showLedger && (
        <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('ledger.title', 'লেজার')}: {ledgerAccount}</h5>
                <button type="button" className="btn-close" onClick={() => setShowLedger(false)} />
              </div>
              <div className="modal-body">
                {ledgerLoading ? (
                  <div className="text-center py-3"><div className="spinner-border spinner-border-sm" /></div>
                ) : ledgerEntries.length === 0 ? (
                  <p className="text-secondary text-center">{t('common.noData', 'কোন তথ্য নেই')}</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered">
                      <thead className="table-light">
                        <tr>
                          <th style={{ fontSize: 12 }}>{t('soe.date', 'তারিখ')}</th>
                          <th style={{ fontSize: 12 }}>{t('soe.voucherNo', 'ভাউচার নং')}</th>
                          <th style={{ fontSize: 12 }}>{t('soe.description', 'বিবরণ')}</th>
                          <th style={{ fontSize: 12 }} className="text-end">{t('voucher.debit', 'ডেবিট')}</th>
                          <th style={{ fontSize: 12 }} className="text-end">{t('voucher.credit', 'ক্রেডিট')}</th>
                          <th style={{ fontSize: 12 }} className="text-end">{t('ledger.balance', 'ব্যালেন্স')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerEntries.map((e, i) => (
                          <tr key={i}>
                            <td style={{ fontSize: 12 }}>{e.voucher_date}</td>
                            <td style={{ fontSize: 12 }}>{e.voucher_no}</td>
                            <td style={{ fontSize: 12 }}>{e.description}</td>
                            <td className="text-end text-danger" style={{ fontSize: 12 }}>{taka(e.debit_amount)}</td>
                            <td className="text-end text-success" style={{ fontSize: 12 }}>{taka(e.credit_amount)}</td>
                            <td className="text-end fw-bold" style={{ fontSize: 12 }}>{taka(e.running_balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowLedger(false)}>{t('common.close', 'বন্ধ')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
