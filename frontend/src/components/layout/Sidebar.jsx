import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';
import LanguageSwitcher from '../common/LanguageSwitcher';

const centerAdminLinks = [
  { to: '/', labelKey: 'nav.dashboard', labelBn: 'ড্যাশবোর্ড', icon: 'bi-speedometer2' },
  { to: '/center-admin/applications', labelKey: 'nav.applications', labelBn: 'আবেদন পর্যালোচনা', icon: 'bi-file-earmark-text' },
  { to: '/center-admin/batches', labelKey: 'nav.batches', labelBn: 'ব্যাচসমূহ', icon: 'bi-layers' },
  { to: '/center-admin/trainees', labelKey: 'nav.trainees', labelBn: 'প্রশিক্ষণার্থী', icon: 'bi-people' },
  { to: '/center-admin/trainers', labelKey: 'nav.trainers', labelBn: 'প্রশিক্ষক', icon: 'bi-person-badge' },
  { to: '/center-admin/courses', labelKey: 'nav.courses', labelBn: 'কোর্সসমূহ', icon: 'bi-book' },
  { to: '/center-admin/reports', labelKey: 'nav.reports', labelBn: 'প্রতিবেদন', icon: 'bi-file-earmark-bar-graph' },
];

const trainerLinks = [
  { to: '/', labelKey: 'nav.dashboard', labelBn: 'ড্যাশবোর্ড', icon: 'bi-speedometer2' },
  { to: '/trainer/schedule', labelKey: 'nav.schedule', labelBn: 'সময়সূচি', icon: 'bi-calendar-week' },
  { to: '/center-admin/batches', labelKey: 'nav.batches', labelBn: 'ব্যাচসমূহ', icon: 'bi-layers' },
];

const assessorLinks = [
  { to: '/', labelKey: 'nav.dashboard', labelBn: 'ড্যাশবোর্ড', icon: 'bi-speedometer2' },
  { to: '/center-admin/batches', labelKey: 'nav.batches', labelBn: 'ব্যাচসমূহ', icon: 'bi-layers' },
  { to: '/center-admin/applications', labelKey: 'nav.applications', labelBn: 'আবেদন', icon: 'bi-file-earmark-text' },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userType = user?.user_type;

  const links =
    userType === 'trainer' ? trainerLinks :
    userType === 'assessor' ? assessorLinks :
    centerAdminLinks;

  return (
    <div className="d-flex flex-column text-white" style={{ width: 250, minHeight: '100vh', background: 'linear-gradient(180deg, #1a1d23 0%, #212529 100%)' }}>
      <div className="d-flex align-items-center gap-2 px-3 py-3 border-bottom border-secondary border-opacity-25" style={{ minHeight: 64 }}>
        <div className="d-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-25" style={{ width: 36, height: 36 }}>
          <i className="bi bi-truck fs-5 text-primary"></i>
        </div>
        <div className="flex-grow-1" style={{ lineHeight: 1.2 }}>
          <div className="fw-bold" style={{ fontSize: 14 }}>{t('site.titleShort', 'BRTC TMS')}</div>
          <div className="text-white-50" style={{ fontSize: 11 }}>{t('site.subtitle', 'প্রশিক্ষণ ব্যবস্থাপনা')}</div>
        </div>
        <LanguageSwitcher />
      </div>
      <nav className="nav flex-column pt-2 px-2">
        {links.map(({ to, labelKey, labelBn, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `sidebar-nav-link d-flex align-items-center gap-3 px-3 py-2 mb-1 text-decoration-none rounded-3 ${isActive ? 'text-white' : 'text-white-50'}`
            }
            style={({ isActive }) => ({
              background: isActive ? 'linear-gradient(135deg, #0d6efd, #0a58ca)' : 'transparent',
            })}
          >
            <i className={`bi ${icon} fs-6`} style={{ width: 20 }}></i>
            <span style={{ fontSize: 14 }}>{t(labelKey, labelBn)}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto px-3 py-3 border-top border-secondary border-opacity-25">
        <LanguageSwitcher dropdown />
      </div>
    </div>
  );
}
