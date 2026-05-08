import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useTranslation } from '../../../hooks/useTranslation';
import { taka, formatDate } from '../../../utils/numberFormatter';

const VOUCHER_TYPES = [
  { value: 'journal', label: 'জার্নাল' },
  { value: 'payment', label: 'পেমেন্ট' },
  { value: 'contra', label: 'কন্ট্রা' },
];

const STATUS_BADGE = {
  draft: 'bg-secondary',
  verified: 'bg-info',
  approved: 'bg-success',
};

const STATUS_LABEL = {
  draft: 'খসড়া',
  verified: 'যাচাইকৃত',
  approved: 'অনুমোদিত',
};

function VoucherFormModal({ show, onClose, onSaved, voucher, centers }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    voucher_type: 'journal',
    amount: 0,
    description: '',
    center: '',
    voucher_date: new Date().toISOString().split('T')[0],
    items: [{ account_head: '', debit_amount: 0, credit_amount: 0, description: '' }],
  });

  useEffect(() => {
    if (voucher) {
      setForm({
        voucher_type: voucher.voucher_type || 'journal',
        amount: voucher.amount || 0,
        description: voucher.description || '',
        center: voucher.center || '',
        voucher_date: voucher.voucher_date || new Date().toISOString().split('T')[0],
        items: (voucher.items || []).length > 0
          ? voucher.items.map(i => ({
              account_head: i.account_head || '',
              debit_amount: i.debit_amount || 0,
              credit_amount: i.credit_amount || 0,
              description: i.description || '',
            }))
          : [{ account_head: '', debit_amount: 0, credit_amount: 0, description: '' }],
      });
    } else {
      setForm({
        voucher_type: 'journal',
        amount: 0,
        description: '',
        center: '',
        voucher_date: new Date().toISOString().split('T')[0],
        items: [{ account_head: '', debit_amount: 0, credit_amount: 0, description: '' }],
      });
    }
  }, [voucher, show]);

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { account_head: '', debit_amount: 0, credit_amount: 0, description: '' }],
    }));
  };

  const removeItem = (idx) => {
    if (form.items.length <= 1) return;
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const updateItem = (idx, field, value) => {
    setForm(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      const totalDebit = items.reduce((s, it) => s + Number(it.debit_amount || 0), 0);
      const totalCredit = items.reduce((s, it) => s + Number(it.credit_amount || 0), 0);
      return { ...prev, items, amount: Math.max(totalDebit, totalCredit) };
    });
  };

  const totalDebit = form.items.reduce((s, it) => s + Number(it.debit_amount || 0), 0);
  const totalCredit = form.items.reduce((s, it) => s + Number(it.credit_amount || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!balanced) {
      toast.warning(t('voucher.notBalanced', 'ডেবিট ও ক্রেডিট এর সমষ্টি সমান হতে হবে'));
      return;
    }
    if (!form.items.some(i => i.account_head)) {
      toast.warning(t('voucher.needItems', 'কমপক্ষে একটি আইটেমে হিসাব শিরোনাম দিন'));
      return;
    }
    setLoading(true);
    try {
      const payload = {
        voucher_type: form.voucher_type,
        amount: totalDebit,
        description: form.description,
        center: Number(form.center) || null,
        voucher_date: form.voucher_date,
        items: form.items.filter(i => i.account_head).map(i => ({
          account_head: i.account_head,
          debit_amount: Number(i.debit_amount || 0),
          credit_amount: Number(i.credit_amount || 0),
          description: i.description,
        })),
      };
      if (voucher) {
        payload.voucher_no = voucher.voucher_no;
        await hoService.updateVoucher(voucher.id, payload);
        toast.success(t('voucher.updated', 'ভাউচার হালনাগাদ করা হয়েছে'));
      } else {
        await hoService.createVoucher(payload);
        toast.success(t('voucher.created', 'ভাউচার তৈরি করা হয়েছে'));
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.items?.[0]?.account_head?.[0] || err.response?.data?.items?.[0] || t('voucher.saveError', 'সংরক্ষণ ব্যর্থ');
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered size="xl">
      <Modal.Header closeButton>
        <Modal.Title>
          {voucher ? t('voucher.edit', 'ভাউচার সম্পাদনা') : t('voucher.create', 'নতুন ভাউচার')}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <Form.Group>
                <Form.Label className="fw-semibold">{t('voucher.type', 'ধরণ')} *</Form.Label>
                <Form.Select value={form.voucher_type} onChange={e => setForm({ ...form, voucher_type: e.target.value })}>
                  {VOUCHER_TYPES.map(vt => <option key={vt.value} value={vt.value}>{vt.label}</option>)}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-3">
              <Form.Group>
                <Form.Label className="fw-semibold">{t('voucher.date', 'তারিখ')} *</Form.Label>
                <Form.Control type="date" value={form.voucher_date} onChange={e => setForm({ ...form, voucher_date: e.target.value })} required />
              </Form.Group>
            </div>
            <div className="col-md-3">
              <Form.Group>
                <Form.Label className="fw-semibold">{t('budget.center', 'কেন্দ্র')}</Form.Label>
                <Form.Select value={form.center} onChange={e => setForm({ ...form, center: e.target.value })}>
                  <option value="">{t('common.none', 'ছাড়া')}</option>
                  {centers.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name_bn}</option>)}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-3">
              <Form.Group>
                <Form.Label className="fw-semibold">{t('voucher.amount', 'মোট অর্থ')}</Form.Label>
                <Form.Control type="text" value={taka(form.amount)} readOnly disabled />
              </Form.Group>
            </div>
          </div>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">{t('voucher.description', 'বিবরণ')}</Form.Label>
            <Form.Control as="textarea" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </Form.Group>

          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="fw-semibold">{t('voucher.items', 'ভাউচার আইটেম')}</span>
            <Button size="sm" variant="outline-primary" onClick={addItem}>
              <i className="bi bi-plus-lg me-1"></i>{t('voucher.addItem', 'আইটেম যোগ')}
            </Button>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered" style={{ fontSize: 13 }}>
              <thead className="table-light">
                <tr>
                  <th style={{ width: '30%' }}>{t('voucher.accountHead', 'হিসাব শিরোনাম')}</th>
                  <th style={{ width: '18%' }}>{t('voucher.debit', 'ডেবিট')}</th>
                  <th style={{ width: '18%' }}>{t('voucher.credit', 'ক্রেডিট')}</th>
                  <th style={{ width: '24%' }}>{t('voucher.itemDesc', 'বিবরণ')}</th>
                  <th style={{ width: '10%' }}></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <Form.Control
                        size="sm" type="text" placeholder={t('voucher.accountHeadPlaceholder', 'যেমন: বেতন')}
                        value={item.account_head}
                        onChange={e => updateItem(idx, 'account_head', e.target.value)}
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm" type="number" step="0.01" min="0"
                        value={item.debit_amount}
                        onChange={e => updateItem(idx, 'debit_amount', e.target.value)}
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm" type="number" step="0.01" min="0"
                        value={item.credit_amount}
                        onChange={e => updateItem(idx, 'credit_amount', e.target.value)}
                      />
                    </td>
                    <td>
                      <Form.Control
                        size="sm" type="text"
                        value={item.description}
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                      />
                    </td>
                    <td className="text-center">
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeItem(idx)} disabled={form.items.length <= 1}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="table-light">
                <tr>
                  <td className="fw-bold">{t('voucher.total', 'সর্বমোট')}</td>
                  <td className="fw-bold text-danger">{taka(totalDebit)}</td>
                  <td className="fw-bold text-success">{taka(totalCredit)}</td>
                  <td colSpan={2}>
                    <span className={`fw-bold ${balanced ? 'text-success' : 'text-danger'}`}>
                      {balanced ? '✓ ' + t('voucher.balanced', 'সমতা আছে') : '✗ ' + t('voucher.unbalanced', 'অসমতা')}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel', 'বাতিল')}</Button>
          <Button variant="primary" type="submit" disabled={loading || !balanced}>
            {loading ? <span className="spinner-border spinner-border-sm me-1" /> : null}
            {t('common.save', 'সংরক্ষণ')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default function VoucherWorkflow() {
  const { t } = useTranslation();
  const { user } = { user: JSON.parse(localStorage.getItem('user') || '{}') };
  const [vouchers, setVouchers] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editVoucher, setEditVoucher] = useState(null);
  const [viewTab, setViewTab] = useState('maker');
  const [detailVoucher, setDetailVoucher] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const userRole = user?.user_type || 'head_office';

  useEffect(() => {
    hoService.listCenters({ status: 'active' }).then(res => {
      setCenters(res.data.results || res.data || []);
    }).catch(() => {});
  }, []);

  const fetchVouchers = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.voucher_type = typeFilter;
      const res = await hoService.listVouchers(params);
      setVouchers(res.data.results || res.data || []);
    } catch (err) {
      toast.error(t('voucher.loadError', 'ভাউচার তথ্য লোড করতে ব্যর্থ'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, t]);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  const handleVerify = async (id) => {
    try {
      await hoService.verifyVoucher(id);
      toast.success(t('voucher.verified', 'ভাউচার যাচাই করা হয়েছে'));
      fetchVouchers();
    } catch (err) {
      toast.error(err.response?.data?.error || t('voucher.verifyError', 'যাচাই ব্যর্থ'));
    }
  };

  const handleApprove = async (id) => {
    try {
      await hoService.approveVoucher(id);
      toast.success(t('voucher.approved', 'ভাউচার অনুমোদন করা হয়েছে'));
      fetchVouchers();
    } catch (err) {
      toast.error(err.response?.data?.error || t('voucher.approveError', 'অনুমোদন ব্যর্থ'));
    }
  };

  const canEdit = (v) => v.status === 'draft' && userRole === 'head_office';

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0">{t('voucher.title', 'ভাউচার ওয়ার্কফ্লো')}</h5>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditVoucher(null); setShowForm(true); }}>
          <i className="bi bi-plus-lg me-1"></i>{t('voucher.new', 'নতুন ভাউচার')}
        </button>
      </div>

      <div className="card shadow-sm mb-3" style={{ borderRadius: 12, border: 'none' }}>
        <div className="card-body">
          <div className="d-flex gap-2 mb-3">
            <button className={`btn btn-sm ${viewTab === 'maker' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setViewTab('maker')}>
              <i className="bi bi-pencil-square me-1"></i>{t('voucher.maker', 'নির্মাতা')}
            </button>
            <button className={`btn btn-sm ${viewTab === 'checker' ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setViewTab('checker')}>
              <i className="bi bi-check-circle me-1"></i>{t('voucher.checker', 'যাচাইকারী')}
            </button>
            <button className={`btn btn-sm ${viewTab === 'approver' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => setViewTab('approver')}>
              <i className="bi bi-shield-check me-1"></i>{t('voucher.approver', 'অনুমোদনকারী')}
            </button>
          </div>
          <div className="row g-2">
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">{t('common.allStatus', 'সব অবস্থা')}</option>
                <option value="draft">খসড়া</option>
                <option value="verified">যাচাইকৃত</option>
                <option value="approved">অনুমোদিত</option>
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="">{t('common.allTypes', 'সব ধরণ')}</option>
                {VOUCHER_TYPES.map(vt => <option key={vt.value} value={vt.value}>{vt.label}</option>)}
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
                <th style={{ fontSize: 13 }}>{t('voucher.no', 'ভাউচার নং')}</th>
                <th style={{ fontSize: 13 }}>{t('voucher.type', 'ধরণ')}</th>
                <th style={{ fontSize: 13 }}>{t('voucher.date', 'তারিখ')}</th>
                <th style={{ fontSize: 13 }}>{t('budget.center', 'কেন্দ্র')}</th>
                <th style={{ fontSize: 13 }}>{t('voucher.amount', 'পরিমাণ')}</th>
                <th style={{ fontSize: 13 }}>{t('voucher.status', 'অবস্থা')}</th>
                {(viewTab === 'checker' || viewTab === 'approver') && <th style={{ fontSize: 13 }}>{t('voucher.workflow', 'ওয়ার্কফ্লো')}</th>}
                <th style={{ fontSize: 13 }}>{t('common.actions', 'অপশন')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="text-center py-4"><div className="spinner-border spinner-border-sm" /></td></tr>
              )}
              {!loading && vouchers.length === 0 && (
                <tr><td colSpan={8} className="text-center text-secondary py-4">{t('common.noData', 'কোন তথ্য নেই')}</td>
                </tr>
              )}
              {!loading && vouchers.map(v => {
                const wf = v.workflow_status || [];
                const rowBg = v.status === 'draft' ? '' : v.status === 'verified' ? 'table-info' : 'table-success';
                return (
                  <tr key={v.id} className={rowBg}>
                    <td style={{ fontSize: 13 }}>{v.voucher_no}</td>
                    <td><span className="badge bg-secondary">{v.voucher_type_display}</span></td>
                    <td style={{ fontSize: 13 }}>{v.voucher_date}</td>
                    <td style={{ fontSize: 13 }}>{v.center_name || '-'}</td>
                    <td style={{ fontSize: 13 }}>{taka(v.amount)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[v.status] || 'bg-secondary'}`}>
                        {STATUS_LABEL[v.status] || v.status}
                      </span>
                    </td>
                    {(viewTab === 'checker' || viewTab === 'approver') && (
                      <td style={{ fontSize: 12 }}>
                        <div className="d-flex gap-1">
                          <span className={`badge ${wf.includes('maker') ? 'bg-success' : 'bg-secondary'}`}>M</span>
                          <span className={`badge ${wf.includes('checker') ? 'bg-info' : 'bg-secondary'}`}>C</span>
                          <span className={`badge ${wf.includes('approver') ? 'bg-primary' : 'bg-secondary'}`}>A</span>
                        </div>
                      </td>
                    )}
                    <td>
                      <div className="d-flex gap-1">
                        {viewTab === 'maker' && canEdit(v) && (
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setEditVoucher(v); setShowForm(true); }}>
                            <i className="bi bi-pencil"></i>
                          </button>
                        )}
                        {viewTab === 'checker' && v.status === 'draft' && (
                          <button className="btn btn-sm btn-outline-info" onClick={() => handleVerify(v.id)}>
                            <i className="bi bi-check-circle me-1"></i>{t('voucher.verify', 'যাচাই')}
                          </button>
                        )}
                        {viewTab === 'approver' && v.status === 'verified' && (
                          <button className="btn btn-sm btn-outline-success" onClick={() => handleApprove(v.id)}>
                            <i className="bi bi-shield-check me-1"></i>{t('voucher.approve', 'অনুমোদন')}
                          </button>
                        )}
                        <button className="btn btn-sm btn-outline-primary" onClick={() => setDetailVoucher(v)}>
                          <i className="bi bi-eye"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <VoucherFormModal
        show={showForm}
        onClose={() => { setShowForm(false); setEditVoucher(null); }}
        onSaved={fetchVouchers}
        voucher={editVoucher}
        centers={centers}
      />

      <Modal show={!!detailVoucher} onHide={() => setDetailVoucher(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t('voucher.detail', 'ভাউচার বিবরণ')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailVoucher && (
            <div>
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <small className="text-secondary d-block">{t('voucher.no', 'ভাউচার নং')}</small>
                  <span className="fw-bold">{detailVoucher.voucher_no}</span>
                </div>
                <div className="col-md-4">
                  <small className="text-secondary d-block">{t('voucher.type', 'ধরণ')}</small>
                  <span className="fw-bold">{detailVoucher.voucher_type_display}</span>
                </div>
                <div className="col-md-4">
                  <small className="text-secondary d-block">{t('voucher.status', 'অবস্থা')}</small>
                  <span className={`badge ${STATUS_BADGE[detailVoucher.status]}`}>{STATUS_LABEL[detailVoucher.status]}</span>
                </div>
                <div className="col-md-4">
                  <small className="text-secondary d-block">{t('voucher.date', 'তারিখ')}</small>
                  <span>{detailVoucher.voucher_date}</span>
                </div>
                <div className="col-md-4">
                  <small className="text-secondary d-block">{t('budget.center', 'কেন্দ্র')}</small>
                  <span>{detailVoucher.center_name || '-'}</span>
                </div>
                <div className="col-md-4">
                  <small className="text-secondary d-block">{t('voucher.createdBy', 'তৈরি করেছেন')}</small>
                  <span>{detailVoucher.created_by_name || '-'}</span>
                </div>
              </div>
              {detailVoucher.description && (
                <p className="text-secondary mb-3">{detailVoucher.description}</p>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDetailVoucher(null)}>{t('common.close', 'বন্ধ')}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
