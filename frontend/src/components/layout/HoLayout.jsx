import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { canViewModule } from '../../utils/permissions';
import useStore from '../../store/useStore';
import Breadcrumbs from '../ho/Breadcrumbs';
import NotificationDropdown from '../ho/NotificationDropdown';
import LanguageSwitcher from '../common/LanguageSwitcher';
import hoService from '../../services/hoService';

const NAV_LINKS = [
  { to: '/ho/dashboard', labelKey: 'nav.dashboard', labelBn: 'ড্যাশবোর্ড', icon: 'bi-speedometer2', module: null },
  { to: '/ho/centers', labelKey: 'nav.centers', labelBn: 'কেন্দ্র সমূহ', icon: 'bi-building', module: 'centers' },
  { to: '/ho/courses', labelKey: 'nav.courses', labelBn: 'কোর্স', icon: 'bi-book', module: 'courses' },
  { to: '/ho/trainers', labelKey: 'nav.trainers', labelBn: 'প্রশিক্ষক', icon: 'bi-person-workspace', module: 'trainers' },
  { to: '/ho/assessors', labelKey: 'nav.assessors', labelBn: 'মূল্যায়নকারী', icon: 'bi-person-check', module: 'assessors' },
  { to: '/ho/circulars', labelKey: 'nav.circulars', labelBn: 'সার্কুলার', icon: 'bi-megaphone', module: null },
  { to: '/ho/finance', labelKey: 'nav.finance', labelBn: 'অর্থ ব্যবস্থাপনা', icon: 'bi-cash-coin', module: 'financial' },
  { to: '/ho/approvals', labelKey: 'nav.approvals', labelBn: 'অনুমোদন', icon: 'bi-check2-circle', module: null },
  { to: '/ho/reports', labelKey: 'nav.reports', labelBn: 'প্রতিবেদন', icon: 'bi-file-earmark-bar-graph', module: 'reports' },
  { to: '/ho/users', labelKey: 'nav.users', labelBn: 'ব্যবহারকারী', icon: 'bi-people', module: 'users' },
  { to: '/ho/system', labelKey: 'nav.system', labelBn: 'সিস্টেম', icon: 'bi-gear', module: null },
];

const FINANCE_SUB = [
  { to: '/ho/finance', labelKey: 'navSub.financeDashboard', label: 'ড্যাশবোর্ড' },
  { to: '/ho/finance/budgets', labelKey: 'navSub.financeBudgets', label: 'বাজেট' },
  { to: '/ho/finance/vouchers', labelKey: 'navSub.financeVouchers', label: 'ভাউচার' },
  { to: '/ho/finance/soe', labelKey: 'navSub.financeSoe', label: 'ব্যয় বিবরণী' },
  { to: '/ho/finance/trial-balance', labelKey: 'navSub.financeTrialBalance', label: 'ট্রায়াল ব্যালেন্স' },
];

const SYSTEM_SUB = [
  { to: '/ho/system', labelKey: 'navSub.systemSettings', label: 'সেটিংস' },
  { to: '/ho/system/email-templates', labelKey: 'navSub.systemEmailTemplates', label: 'ইমেইল টেমপ্লেট' },
  { to: '/ho/system/sms-templates', labelKey: 'navSub.systemSmsTemplates', label: 'এসএমএস টেমপ্লেট' },
  { to: '/ho/system/integrations', labelKey: 'navSub.systemIntegrations', label: 'ইন্টিগ্রেশন' },
  { to: '/ho/system/health', labelKey: 'navSub.systemHealth', label: 'সিস্টেম হেলথ' },
  { to: '/ho/system/certificate-template', labelKey: 'navSub.systemCertificateTemplate', label: 'সার্টিফিকেট টেমপ্লেট' },
];

export default function HoLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { sidebarOpen, toggleSidebar, pendingApprovals, setPendingApprovals } = useStore();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    if (isMobile) useStore.getState().setSidebarOpen(false);
  }, [isMobile]);

  useEffect(() => {
    hoService.listCirculars({ status: 'published', page_size: 1 }).then(res => {
      const count = res.data?.count || 0;
      setPendingApprovals(count);
    }).catch(() => {});
  }, [setPendingApprovals]);

  const pathPrefix = (p) => location.pathname.startsWith(p);

  const toggleMenu = (key) => setExpandedMenus(prev => ({ ...prev, [key]: !prev[key] }));

  const isFinanceActive = pathPrefix('/ho/finance');
  const isSystemActive = pathPrefix('/ho/system');

  const handleLogout = () => {
    logout();
    toast.success(t('site.logoutSuccess', 'লগআউট সফল'));
    navigate('/login');
  };

  const filteredLinks = NAV_LINKS.filter(l => {
    if (!l.module) return true;
    return canViewModule(user, l.module);
  });

  const sidebarWidth = sidebarOpen ? 250 : 0;

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* Sidebar overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div className="position-fixed top-0 start-0 w-100 h-100" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1039 }}
          onClick={() => useStore.getState().setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`d-flex flex-column text-white flex-shrink-0 position-${isMobile ? 'fixed' : 'sticky'} ${isMobile ? 'start-0' : ''}`}
        style={{
          width: sidebarWidth, minHeight: '100vh', overflow: 'hidden auto',
          background: 'linear-gradient(180deg, #1a1d23 0%, #212529 100%)',
          transition: 'width 0.25s ease', zIndex: 1040,
          transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'none',
        }}>
        {/* Brand */}
        <div className="d-flex align-items-center gap-2 px-3 py-3 border-bottom border-secondary border-opacity-25" style={{ minHeight: 64 }}>
          <div className="d-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-25" style={{ width: 36, height: 36 }}>
            <i className="bi bi-building-gear fs-5 text-primary"></i>
          </div>
          <div className="flex-grow-1" style={{ lineHeight: 1.2 }}>
            <div className="fw-bold" style={{ fontSize: 14 }}>{t('site.hoTitle', 'হেড অফিস')}</div>
            <div className="text-white-50" style={{ fontSize: 11 }}>BRTC</div>
          </div>
          <button className="btn btn-sm text-white-50 p-0" onClick={toggleSidebar}>
            <i className="bi bi-x-lg" style={{ fontSize: 12 }}></i>
          </button>
        </div>

        {/* Navigation */}
        <nav className="nav flex-column pt-2 px-2 flex-grow-1" style={{ overflowX: 'hidden', overflowY: 'auto' }}>
          {filteredLinks.map((l) => {
            const isActive = l.to === '/ho/dashboard'
              ? location.pathname === '/ho/dashboard'
              : pathPrefix(l.to);
            const hasSub = l.to === '/ho/finance' || l.to === '/ho/system';
            const isExpanded = (l.to === '/ho/finance' && isFinanceActive) || expandedMenus[l.to];
            return (
              <div key={l.to}>
                <NavLink
                  to={!hasSub ? l.to : '#'}
                  end={l.to === '/ho/dashboard'}
                  onClick={(e) => {
                    if (hasSub) { e.preventDefault(); toggleMenu(l.to); }
                  }}
                  className={`d-flex align-items-center gap-3 px-3 py-2 mb-1 text-decoration-none rounded-3 ${isActive ? 'text-white' : 'text-white-50'}`}
                  style={{ background: isActive ? 'linear-gradient(135deg, #0d6efd, #0a58ca)' : 'transparent', fontSize: 14, cursor: 'pointer' }}>
                  <i className={`bi ${l.icon} fs-6`} style={{ width: 20 }}></i>
                  <span className="flex-grow-1">{t(l.labelKey, l.labelBn)}</span>
                  {l.to === '/ho/approvals' && pendingApprovals > 0 && (
                    <span className="badge bg-danger rounded-pill" style={{ fontSize: 10 }}>{pendingApprovals}</span>
                  )}
                  {hasSub && (
                    <i className={`bi bi-chevron-${isExpanded ? 'down' : 'right'} transition`} style={{ fontSize: 10 }}></i>
                  )}
                </NavLink>
                {hasSub && isExpanded && (
                  <div className="ms-3 border-start border-secondary border-opacity-25 ps-2 mb-1">
                    {(l.to === '/ho/finance' ? FINANCE_SUB : SYSTEM_SUB).map(sub => (
                      <NavLink key={sub.to} to={sub.to} end
                        className={({ isActive }) =>
                          `d-flex align-items-center gap-2 px-3 py-1 mb-1 text-decoration-none rounded-2 ${isActive ? 'text-white bg-primary bg-opacity-25' : 'text-white-50'}`
                        }
                        style={{ fontSize: 12 }}>
                        <i className="bi bi-dot"></i>
                        <span>{t(sub.labelKey, sub.label)}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User profile in sidebar footer */}
        {user && (
          <div className="px-3 py-3 border-top border-secondary border-opacity-25">
            <div className="d-flex align-items-center gap-2">
              <div className="rounded-circle bg-primary bg-opacity-25 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 36, height: 36 }}>
                <i className="bi bi-person text-primary"></i>
              </div>
              <div className="flex-grow-1" style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 12 }} className="fw-semibold">{user.full_name_bn || user.email}</div>
                <div className="text-white-50" style={{ fontSize: 10 }}>{user.email}</div>
              </div>
              <div className="dropdown">
                <button className="btn btn-sm text-white-50 p-0" data-bs-toggle="dropdown">
                  <i className="bi bi-three-dots-vertical"></i>
                </button>
                <ul className="dropdown-menu dropdown-menu-end" style={{ fontSize: 13 }}>
                  <li><button className="dropdown-item" onClick={() => navigate('/ho/dashboard')}><i className="bi bi-person me-2"></i>প্রোফাইল</button></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><button className="dropdown-item text-danger" onClick={handleLogout}><i className="bi bi-box-arrow-right me-2"></i>লগআউট</button></li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>
        {/* Header */}
        <header className="bg-white px-3 shadow-sm d-flex align-items-center" style={{ minHeight: 64 }}>
          <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => useStore.getState().setSidebarOpen(!sidebarOpen)}>
            <i className="bi bi-list"></i>
          </button>
          <Breadcrumbs />
          <div className="ms-auto d-flex align-items-center gap-2">
            {pendingApprovals > 0 && (
              <button className="btn btn-sm btn-outline-warning position-relative" onClick={() => navigate('/ho/approvals')}>
                <i className="bi bi-exclamation-circle"></i>
                <span className="ms-1 d-none d-md-inline" style={{ fontSize: 12 }}>{pendingApprovals}</span>
              </button>
            )}
            <NotificationDropdown />
            <div className="vr mx-1"></div>
            <LanguageSwitcher dropdown />
            <div className="dropdown">
              <button className="btn btn-sm d-flex align-items-center gap-2 text-secondary" data-bs-toggle="dropdown"
                style={{ textDecoration: 'none' }}>
                <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                  <i className="bi bi-person text-primary"></i>
                </div>
                <span className="d-none d-md-inline" style={{ fontSize: 13 }}>
                  {user?.full_name_bn || user?.email || ''}
                </span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end" style={{ fontSize: 13 }}>
                <li><span className="dropdown-item-text text-secondary"><small>{user?.email}</small></span></li>
                <li><hr className="dropdown-divider" /></li>
                <li><button className="dropdown-item" onClick={handleLogout}><i className="bi bi-box-arrow-right me-2"></i>লগআউট</button></li>
              </ul>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-3 bg-light flex-grow-1" style={{ overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
