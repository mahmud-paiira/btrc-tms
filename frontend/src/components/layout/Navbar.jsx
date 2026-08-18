import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import useStore from '../../store/useStore';
import LanguageSwitcher from '../common/LanguageSwitcher';

const breadcrumbIcons = {
  home: 'bi-house-door',
  dashboard: 'bi-speedometer2',
  centers: 'bi-building',
  courses: 'bi-book',
  trainers: 'bi-person-workspace',
  assessors: 'bi-person-check',
  circulars: 'bi-megaphone',
  approvals: 'bi-check2-circle',
  reports: 'bi-file-earmark-bar-graph',
  users: 'bi-people',
  'master-data': 'bi-database',
  finance: 'bi-cash-coin',
  system: 'bi-gear',
};

export default function Navbar({ breadcrumb, extra }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const toggleSidebar = useStore(s => s.toggleSidebar);

  const handleLogout = () => {
    const isTrainee = user?.user_type === 'trainee';
    logout();
    navigate(isTrainee ? '/trainee/login' : '/login');
  };

  const currentPage = breadcrumb && breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1] : null;
  const pageKey = currentPage?.label ? Object.entries({
    dashboard: 'ড্যাশবোর্ড',
    centers: 'কেন্দ্র সমূহ',
    courses: 'কোর্স',
    trainers: 'প্রশিক্ষক',
    assessors: 'মূল্যায়নকারী',
    circulars: 'সার্কুলার',
    approvals: 'অনুমোদন ব্যবস্থাপনা',
    reports: 'প্রতিবেদন',
    users: 'ব্যবহারকারী',
    'master-data': 'মাস্টার ডাটা',
    finance: 'অর্থ ব্যবস্থাপনা',
    system: 'সিস্টেম',
  }).find(([, v]) => v === currentPage.label)?.[0] : null;
  const pageIcon = breadcrumbIcons[pageKey] || 'bi-file-earmark';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          <i className="bi bi-list"></i>
        </button>
        <div className="d-flex align-items-center gap-2">
          {currentPage && (
            <div className="d-none d-md-flex align-items-center gap-2">
              <div className="d-flex align-items-center justify-content-center rounded"
                style={{ width: 28, height: 28, background: 'var(--primary-light)', color: 'var(--primary)' }}>
                <i className={`bi ${pageIcon}`} style={{ fontSize: 13 }}></i>
              </div>
              <span className="fw-semibold" style={{ fontSize: 14, color: 'var(--text-heading)', whiteSpace: 'nowrap' }}>
                {currentPage.label}
              </span>
            </div>
          )}
          {breadcrumb && breadcrumb.length > 1 && (
            <nav aria-label="breadcrumb" className="d-none d-lg-block">
              <ol className="breadcrumb mb-0">
                {breadcrumb.slice(0, -1).map((cr, i) => (
                  <li key={i} className="breadcrumb-item">
                    {cr.to ? (
                      <a href={cr.to} className="text-decoration-none d-flex align-items-center gap-1"
                        style={{ fontSize: 11, color: '#9ca3af' }}>
                        {i === 0 && <i className="bi bi-house-door" style={{ fontSize: 10 }}></i>}
                        {cr.label}
                      </a>
                    ) : cr.label}
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </div>
      </div>

      <div className="topbar-center">
        {extra}
      </div>

      <div className="topbar-right">
        <LanguageSwitcher dropdown />
        {user && (
          <div className="dropdown">
            <button className="btn d-flex align-items-center gap-2 user-btn" data-bs-toggle="dropdown">
              <div className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: 26, height: 26, background: 'var(--primary-light)', color: 'var(--primary)' }}>
                <i className="bi bi-person" style={{ fontSize: 12 }}></i>
              </div>
              <span className="d-none d-md-inline" style={{ fontSize: 12, fontWeight: 500 }}>
                {user.full_name_bn || user.email}
              </span>
              <i className="bi bi-chevron-down" style={{ fontSize: 9, opacity: 0.5 }}></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li><span className="dropdown-item-text text-secondary"><small>{user.email}</small></span></li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <a className="dropdown-item" href="/user-manual.html" target="_blank" rel="noopener noreferrer">
                  <i className="bi bi-book me-2"></i>{t('site.userManual', 'ব্যবহারকারী ম্যানুয়াল')}
                </a>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li><button className="dropdown-item text-danger" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-2"></i>{t('site.logout', 'লগআউট')}
              </button></li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
