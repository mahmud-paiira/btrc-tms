import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useTranslation } from '../../../hooks/useTranslation';
import { formatDate } from '../../../utils/numberFormatter';

const TABS = ['Overview', 'Login History', 'Audit Log'];

export default function UserDetail({ show, onClose, onEdit, user }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('Overview');
  const [loginLogs, setLoginLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && user) {
      setTab('Overview');
      setLoginLogs([]);
      setAuditLogs([]);
    }
  }, [show, user]);

  const loadLoginHistory = async () => {
    if (loginLogs.length > 0) return;
    setLoading(true);
    try {
      const res = await hoService.getLoginHistory(user.id);
      setLoginLogs(res.data || []);
    } catch { toast.error(t('users.loginHistoryError', 'লগইন ইতিহাস লোড ব্যর্থ')); }
    finally { setLoading(false); }
  };

  const loadAuditLog = async () => {
    if (auditLogs.length > 0) return;
    setLoading(true);
    try {
      const res = await hoService.getUserAuditLog(user.id);
      setAuditLogs(res.data || []);
    } catch { toast.error(t('users.auditLogError', 'অডিট লগ লোড ব্যর্থ')); }
    finally { setLoading(false); }
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (newTab === 'Login History') loadLoginHistory();
    if (newTab === 'Audit Log') loadAuditLog();
  };

  if (!user) return null;

  return (
    <Modal show={show} onHide={onClose} centered size="xl">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-person-badge me-2"></i>{user.full_name_bn}
          <small className="text-secondary ms-2">({user.email})</small>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ul className="nav nav-tabs mb-3">
          {TABS.map(tabName => (
            <li key={tabName} className="nav-item">
              <button className={`nav-link ${tab === tabName ? 'active fw-bold' : ''}`}
                onClick={() => handleTabChange(tabName)} style={{ fontSize: 13 }}>{tabName}</button>
            </li>
          ))}
        </ul>

        {tab === 'Overview' && (
          <div className="row g-3">
            <div className="col-md-4 text-center">
              {user.profile_image_url ? (
                <img src={user.profile_image_url} alt="" className="rounded-circle"
                  style={{ width: 120, height: 120, objectFit: 'cover' }} />
              ) : (
                <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center mx-auto"
                  style={{ width: 120, height: 120 }}>
                  <i className="bi bi-person fs-1 text-primary"></i>
                </div>
              )}
              <div className="mt-2">
                <span className={`badge ${user.is_active ? 'bg-success' : 'bg-secondary'}`}>
                  {user.is_active ? t('common.active', 'সক্রিয়') : t('common.inactive', 'নিষ্ক্রিয়')}
                </span>
                <span className="badge bg-info ms-1">{user.user_type_display}</span>
              </div>
            </div>
            <div className="col-md-8">
              <div className="row g-2">
                <div className="col-6"><small className="text-secondary d-block">{t('users.nameBn', 'নাম (বাংলায়)')}</small><span>{user.full_name_bn}</span></div>
                <div className="col-6"><small className="text-secondary d-block">{t('users.nameEn', 'নাম (ইংরেজিতে)')}</small><span>{user.full_name_en}</span></div>
                <div className="col-6"><small className="text-secondary d-block">ইমেইল</small><span>{user.email}</span></div>
                <div className="col-6"><small className="text-secondary d-block">{t('users.phone', 'ফোন')}</small><span>{user.phone}</span></div>
                <div className="col-6"><small className="text-secondary d-block">এনআইডি</small><span>{user.nid}</span></div>
                <div className="col-6"><small className="text-secondary d-block">{t('users.role', 'ভূমিকা')}</small><span>{user.role_name || '-'}</span></div>
                <div className="col-6"><small className="text-secondary d-block">{t('budget.center', 'কেন্দ্র')}</small><span>{user.center_name || '-'}</span></div>
                <div className="col-6"><small className="text-secondary d-block">{t('users.lastLogin', 'সর্বশেষ লগইন')}</small><span>{user.last_login ? formatDate(user.last_login) : '-'}</span></div>
                <div className="col-6"><small className="text-secondary d-block">{t('users.createdAt', 'তৈরির তারিখ')}</small><span>{user.created_at ? formatDate(user.created_at) : '-'}</span></div>
              </div>
            </div>
          </div>
        )}

        {tab === 'Login History' && (
          <div>
            {loading ? (
              <div className="text-center py-4"><div className="spinner-border spinner-border-sm" /></div>
            ) : loginLogs.length === 0 ? (
              <p className="text-secondary text-center py-4">{t('common.noData', 'কোন তথ্য নেই')}</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th style={{ fontSize: 12 }}>{t('users.time', 'সময়')}</th>
                      <th style={{ fontSize: 12 }}>{t('users.ip', 'আইপি')}</th>
                      <th style={{ fontSize: 12 }}>{t('users.status', 'অবস্থা')}</th>
                      <th style={{ fontSize: 12 }}>{t('users.userAgent', 'ইউজার এজেন্ট')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginLogs.map((log, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 12 }}>{formatDate(log.login_time)}</td>
                        <td style={{ fontSize: 12 }}>{log.ip_address || '-'}</td>
                        <td>
                          <span className={`badge ${log.is_success ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: 11 }}>
                            {log.is_success ? t('common.success', 'সফল') : t('common.failed', 'ব্যর্থ')}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.user_agent || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'Audit Log' && (
          <div>
            {loading ? (
              <div className="text-center py-4"><div className="spinner-border spinner-border-sm" /></div>
            ) : auditLogs.length === 0 ? (
              <p className="text-secondary text-center py-4">{t('common.noData', 'কোন তথ্য নেই')}</p>
            ) : (
              <div className="table-responsive" style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table className="table table-sm table-bordered">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th style={{ fontSize: 12 }}>{t('users.time', 'সময়')}</th>
                      <th style={{ fontSize: 12 }}>{t('users.action', 'কর্ম')}</th>
                      <th style={{ fontSize: 12 }}>{t('users.description', 'বিবরণ')}</th>
                      <th style={{ fontSize: 12 }}>{t('users.ip', 'আইপি')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 12 }}>{formatDate(log.created_at)}</td>
                        <td style={{ fontSize: 12 }}><span className="badge bg-secondary">{log.action}</span></td>
                        <td style={{ fontSize: 12 }}>{log.description}</td>
                        <td style={{ fontSize: 12 }}>{log.ip_address || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={() => { onClose(); setTimeout(() => onEdit?.(user), 100); }}>
          <i className="bi bi-pencil me-1"></i>{t('common.edit', 'সম্পাদনা')}
        </Button>
        <Button variant="secondary" onClick={onClose}>{t('common.close', 'বন্ধ')}</Button>
      </Modal.Footer>
    </Modal>
  );
}
