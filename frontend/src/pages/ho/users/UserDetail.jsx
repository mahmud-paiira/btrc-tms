import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useTranslation } from '../../../hooks/useTranslation';
import { formatDate } from '../../../utils/dateFormatter';
import { convertToBanglaDigits } from '../../../utils/numberFormatter';

const TABS = ['Overview', 'Login History', 'Audit Log'];

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [loginLogs, setLoginLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      try {
        const res = await hoService.getHOUser(id);
        setUser(res.data);
      } catch {
        toast.error('ব্যবহারকারী লোড করতে ব্যর্থ');
        navigate('/ho/users');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [id, navigate]);

  const loadLoginHistory = async () => {
    if (loginLogs.length > 0) return;
    setLoading(true);
    try {
      const res = await hoService.getLoginHistory(id);
      setLoginLogs(res.data || []);
    } catch { toast.error(t('users.loginHistoryError', 'লগইন ইতিহাস লোড ব্যর্থ')); }
    finally { setLoading(false); }
  };

  const loadAuditLog = async () => {
    if (auditLogs.length > 0) return;
    setLoading(true);
    try {
      const res = await hoService.getUserAuditLog(id);
      setAuditLogs(res.data || []);
    } catch { toast.error(t('users.auditLogError', 'অডিট লগ লোড ব্যর্থ')); }
    finally { setLoading(false); }
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (newTab === 'Login History') loadLoginHistory();
    if (newTab === 'Audit Log') loadAuditLog();
  };

  if (loading && !user) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
  }

  if (!user) return null;

  return (
    <div className="px-4 py-4">
      <div className="d-flex align-items-center gap-3 mb-4 bg-white p-3 rounded shadow-sm">
        <button className="btn btn-outline-secondary btn-sm rounded-circle p-2" onClick={() => navigate('/ho/users')} style={{ width: 36, height: 36 }}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <div>
          <h4 className="mb-0 fw-bold">{user.full_name_bn}</h4>
          <div className="text-muted small">{user.email}</div>
        </div>
        <div className="ms-auto d-flex gap-2">
          <span className={`badge ${user.is_active ? 'bg-success' : 'bg-secondary'} px-3 py-2 fs-6`}>
            {user.is_active ? t('common.active', 'সক্রিয়') : t('common.inactive', 'নিষ্ক্রিয়')}
          </span>
          <span className="badge bg-info px-3 py-2 fs-6">{user.user_type_display}</span>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white pt-3 border-0">
          <ul className="nav nav-tabs card-header-tabs">
            {TABS.map(tabName => (
              <li key={tabName} className="nav-item">
                <button className={`nav-link ${tab === tabName ? 'active fw-bold' : ''}`}
                  onClick={() => handleTabChange(tabName)}>{tabName}</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body p-4">
          {tab === 'Overview' && (
            <div className="row g-4">
              <div className="col-md-4 text-center">
                <div className="p-4 bg-light rounded-4">
                  {user.profile_image_url ? (
                    <img src={user.profile_image_url} alt="" className="rounded-circle shadow-sm mb-3"
                      style={{ width: 140, height: 140, objectFit: 'cover', border: '5px solid #fff' }} />
                  ) : (
                    <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center mx-auto mb-3 shadow-sm"
                      style={{ width: 140, height: 140, border: '5px solid #fff' }}>
                      <i className="bi bi-person fs-1 text-primary"></i>
                    </div>
                  )}
                  <h6 className="fw-bold mb-1">{user.full_name_bn}</h6>
                  <div className="text-muted small mb-3">{user.role_name || 'No Role Assigned'}</div>
                  <button className="btn btn-primary btn-sm w-100 rounded-pill" onClick={() => navigate(`/ho/users/${id}/edit`)}>
                    <i className="bi bi-pencil me-1"></i>সম্পাদনা
                  </button>
                </div>
              </div>
              <div className="col-md-8">
                <div className="row g-4">
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">{t('users.nameBn', 'নাম (বাংলায়)')}</small>
                    <div className="fw-bold">{user.full_name_bn}</div>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">{t('users.nameEn', 'নাম (ইংরেজিতে)')}</small>
                    <div className="fw-semibold">{user.full_name_en}</div>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">ইমেইল</small>
                    <div className="fw-semibold text-primary">{user.email}</div>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">{t('users.phone', 'ফোন')}</small>
                    <div className="fw-semibold">{convertToBanglaDigits(user.phone)}</div>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">এনআইডি</small>
                    <div className="fw-semibold">{convertToBanglaDigits(user.nid)}</div>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">{t('budget.center', 'কেন্দ্র')}</small>
                    <div className="fw-semibold">{user.center_name || '-'}</div>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">{t('users.lastLogin', 'সর্বশেষ লগইন')}</small>
                    <div className="fw-medium">{user.last_login ? formatDate(user.last_login) : '-'}</div>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted d-block mb-1">{t('users.createdAt', 'তৈরির তারিখ')}</small>
                    <div className="fw-medium">{user.created_at ? formatDate(user.created_at) : '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'Login History' && (
            <div className="table-responsive">
              <table className="table table-hover table-bordered align-middle">
                <thead className="table-light">
                  <tr>
                    <th>{t('users.time', 'সময়')}</th>
                    <th>{t('users.ip', 'আইপি')}</th>
                    <th>{t('users.status', 'অবস্থা')}</th>
                    <th>{t('users.userAgent', 'ইউজার এজেন্ট')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loginLogs.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-4 text-muted">কোন তথ্য নেই</td></tr>
                  ) : loginLogs.map((log, i) => (
                    <tr key={i}>
                      <td>{formatDate(log.login_time)}</td>
                      <td>{log.ip_address || '-'}</td>
                      <td>
                        <span className={`badge ${log.is_success ? 'bg-success' : 'bg-danger'}`}>
                          {log.is_success ? t('common.success', 'সফল') : t('common.failed', 'ব্যর্থ')}
                        </span>
                      </td>
                      <td className="small text-muted" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.user_agent || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Audit Log' && (
            <div className="table-responsive" style={{ maxHeight: 600, overflowY: 'auto' }}>
              <table className="table table-hover table-bordered align-middle">
                <thead className="table-light sticky-top">
                  <tr>
                    <th>{t('users.time', 'সময়')}</th>
                    <th>{t('users.action', 'কর্ম')}</th>
                    <th>{t('users.description', 'বিবরণ')}</th>
                    <th>{t('users.ip', 'আইপি')}</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-4 text-muted">কোন তথ্য নেই</td></tr>
                  ) : auditLogs.map((log, i) => (
                    <tr key={i}>
                      <td>{formatDate(log.created_at)}</td>
                      <td><span className="badge bg-secondary px-2">{log.action}</span></td>
                      <td className="small">{log.description}</td>
                      <td>{log.ip_address || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
