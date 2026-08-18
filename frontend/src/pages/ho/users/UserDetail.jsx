import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useTranslation } from '../../../hooks/useTranslation';
import { formatDate } from '../../../utils/dateFormatter';
import { convertToBanglaDigits } from '../../../utils/numberFormatter';

const TABS = [
  { key: 'Overview', label: 'Overview', icon: 'bi-person' },
  { key: 'Login History', label: 'Login History', icon: 'bi-clock-history' },
  { key: 'Audit Log', label: 'Audit Log', icon: 'bi-journal-text' },
];

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
      {/* Header with back button */}
      <div className="profile-card mb-4">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/ho/users')}
          style={{ width: 36, height: 36, flexShrink: 0 }}>
          <i className="bi bi-arrow-left"></i>
        </button>

        {user.profile_image_url ? (
          <img src={user.profile_image_url} alt="" className="profile-avatar" />
        ) : (
          <div className="profile-avatar d-flex align-items-center justify-content-center"
            style={{ background: '#e0e7ff', color: '#6366f1', fontSize: 28 }}>
            <i className="bi bi-person-fill"></i>
          </div>
        )}

        <div className="profile-info">
          <h5>{user.full_name_bn}</h5>
          <div className="text-muted mb-2">{user.email}</div>
          <div className="d-flex flex-wrap gap-2">
            <span className={`badge ${user.is_active ? 'bg-success' : 'bg-secondary'}`}>
              {user.is_active ? t('common.active', 'সক্রিয়') : t('common.inactive', 'নিষ্ক্রিয়')}
            </span>
            <span className="badge bg-primary">{user.user_type_display}</span>
            {user.role_name && <span className="badge bg-secondary">{user.role_name}</span>}
          </div>
        </div>

        <div className="ms-auto" style={{ flexShrink: 0 }}>
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/ho/users/${id}/edit`)}>
            <i className="bi bi-pencil me-1"></i>সম্পাদনা
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="card-header p-0 border-bottom-0" style={{ background: '#f8fafc' }}>
          <ul className="nav nav-tabs card-header-tabs mx-2 mt-2">
            {TABS.map(tItem => (
              <li key={tItem.key} className="nav-item">
                <button
                  className={`nav-link ${tab === tItem.key ? 'active fw-semibold' : ''}`}
                  onClick={() => handleTabChange(tItem.key)}
                  style={{ fontSize: 13 }}>
                  <i className={`bi ${tItem.icon} me-1`}></i>
                  {tItem.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body">
          {tab === 'Overview' && (
            <div className="row g-4">
              <div className="col-md-6">
                <div className="info-row">
                  <span className="info-label">{t('users.nameBn', 'নাম (বাংলায়)')}</span>
                  <span className="info-value fw-semibold">{user.full_name_bn || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{t('users.nameEn', 'নাম (ইংরেজিতে)')}</span>
                  <span className="info-value">{user.full_name_en || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">ইমেইল</span>
                  <span className="info-value" style={{ color: 'var(--primary)' }}>{user.email || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{t('users.phone', 'ফোন')}</span>
                  <span className="info-value">{convertToBanglaDigits(user.phone) || '-'}</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="info-row">
                  <span className="info-label">এনআইডি</span>
                  <span className="info-value">{convertToBanglaDigits(user.nid) || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{t('budget.center', 'কেন্দ্র')}</span>
                  <span className="info-value">{user.center_name || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{t('users.lastLogin', 'সর্বশেষ লগইন')}</span>
                  <span className="info-value">{user.last_login ? formatDate(user.last_login) : '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{t('users.createdAt', 'তৈরির তারিখ')}</span>
                  <span className="info-value">{user.created_at ? formatDate(user.created_at) : '-'}</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'Login History' && (
            <div className="table-responsive">
              <table className="b-table align-middle">
                <thead>
                  <tr>
                    <th>{t('users.time', 'সময়')}</th>
                    <th>{t('users.ip', 'আইপি')}</th>
                    <th>{t('users.status', 'অবস্থা')}</th>
                    <th>{t('users.userAgent', 'ইউজার এজেন্ট')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loginLogs.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-muted py-4">কোন তথ্য নেই</td></tr>
                  ) : loginLogs.map((log, i) => (
                    <tr key={i}>
                      <td>{formatDate(log.login_time)}</td>
                      <td><code>{log.ip_address || '-'}</code></td>
                      <td>
                        <span className={`badge ${log.is_success ? 'bg-success' : 'bg-danger'}`}>
                          {log.is_success ? t('common.success', 'সফল') : t('common.failed', 'ব্যর্থ')}
                        </span>
                      </td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: '#64748b' }}>
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
              <table className="b-table align-middle">
                <thead>
                  <tr>
                    <th>{t('users.time', 'সময়')}</th>
                    <th>{t('users.action', 'কর্ম')}</th>
                    <th>{t('users.description', 'বিবরণ')}</th>
                    <th>{t('users.ip', 'আইপি')}</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-muted py-4">কোন তথ্য নেই</td></tr>
                  ) : auditLogs.map((log, i) => (
                    <tr key={i}>
                      <td>{formatDate(log.created_at)}</td>
                      <td><span className="badge bg-secondary">{log.action}</span></td>
                      <td style={{ fontSize: 13 }}>{log.description}</td>
                      <td><code>{log.ip_address || '-'}</code></td>
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
