import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { canViewModule } from '../../utils/permissions';
import useStore from '../../store/useStore';
import LanguageSwitcher from '../common/LanguageSwitcher';
import hoService from '../../services/hoService';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const SECTIONS = [
  {
    section: 'main',
    items: [
      { to: '/ho/dashboard', icon: 'bi-speedometer2', labelKey: 'nav.dashboard', labelBn: 'ড্যাশবোর্ড', module: null },
    ],
  },
  {
    section: 'management',
    items: [
      { to: '/ho/centers', icon: 'bi-building', labelKey: 'nav.centers', labelBn: 'কেন্দ্র সমূহ', module: 'centers' },
      { to: '/ho/courses', icon: 'bi-book', labelKey: 'nav.courses', labelBn: 'কোর্স', module: 'courses' },
      { to: '/ho/trainers', icon: 'bi-person-workspace', labelKey: 'nav.trainers', labelBn: 'প্রশিক্ষক', module: 'trainers' },
      { to: '/ho/assessors', icon: 'bi-person-check', labelKey: 'nav.assessors', labelBn: 'মূল্যায়নকারী', module: 'assessors' },
      { to: '/ho/circulars', icon: 'bi-megaphone', labelKey: 'nav.circulars', labelBn: 'সার্কুলার', module: null },
      { to: '/ho/trainees', icon: 'bi-people', labelKey: 'nav.trainees', labelBn: 'প্রশিক্ষণার্থী', module: null },
      { to: '/ho/approvals', icon: 'bi-check2-circle', labelKey: 'nav.approvals', labelBn: 'অনুমোদন', module: null, badgeKey: 'pendingApprovals' },
      { to: '/ho/reports', icon: 'bi-file-earmark-bar-graph', labelKey: 'nav.reports', labelBn: 'প্রতিবেদন', module: 'reports' },
      { to: '/ho/users', icon: 'bi-people', labelKey: 'nav.users', labelBn: 'ব্যবহারকারী', module: 'users' },
      { to: '/ho/master-data', icon: 'bi-database', labelKey: 'nav.masterData', labelBn: 'মাস্টার ডাটা', module: null },
    ],
  },
  {
    section: 'portal',
    items: [
      { href: '/circulars', icon: 'bi-globe2', labelKey: 'nav.publicPortal', labelBn: 'পাবলিক পোর্টাল', external: true },
    ],
  },
  {
    section: 'system',
    items: [
      {
        to: '/ho/finance', icon: 'bi-cash-coin', labelKey: 'nav.finance', labelBn: 'অর্থ ব্যবস্থাপনা', module: 'financial',
        children: [
          { to: '/ho/finance', labelKey: 'navSub.financeDashboard', labelBn: 'ড্যাশবোর্ড' },
          { to: '/ho/finance/budgets', labelKey: 'navSub.financeBudgets', labelBn: 'বাজেট' },
          { to: '/ho/finance/vouchers', labelKey: 'navSub.financeVouchers', labelBn: 'ভাউচার' },
          { to: '/ho/finance/soe', labelKey: 'navSub.financeSoe', labelBn: 'ব্যয় বিবরণী' },
          { to: '/ho/finance/trial-balance', labelKey: 'navSub.financeTrialBalance', labelBn: 'ট্রায়াল ব্যালেন্স' },
          { to: '/ho/allowance-categories', icon: 'bi-wallet2', labelKey: 'nav.allowanceCategories', labelBn: 'ভাতার শ্রেণী' },
        ],
      },
      {
        to: '/ho/system', icon: 'bi-gear', labelKey: 'nav.system', labelBn: 'সিস্টেম', module: null,
        children: [
          { to: '/ho/system', labelKey: 'navSub.systemSettings', labelBn: 'সেটিংস' },
          { to: '/ho/system/email-templates', labelKey: 'navSub.systemEmailTemplates', labelBn: 'ইমেইল টেমপ্লেট' },
          { to: '/ho/system/sms-templates', labelKey: 'navSub.systemSmsTemplates', labelBn: 'এসএমএস টেমপ্লেট' },
          { to: '/ho/system/integrations', labelKey: 'navSub.systemIntegrations', labelBn: 'ইন্টিগ্রেশন' },
          { to: '/ho/system/health', labelKey: 'navSub.systemHealth', labelBn: 'সিস্টেম হেলথ' },
          { to: '/ho/system/certificate-template', labelKey: 'navSub.systemCertificateTemplate', labelBn: 'সার্টিফিকেট টেমপ্লেট' },
        ],
      },
    ],
  },
];

const BREADCRUMB_MAP = {
  dashboard: 'ড্যাশবোর্ড',
  centers: 'কেন্দ্র সমূহ',
  courses: 'কোর্স',
  trainers: 'প্রশিক্ষক',
  assessors: 'মূল্যায়নকারী',
  circulars: 'সার্কুলার',
  approvals: 'অনুমোদন ব্যবস্থাপনা',
  reports: 'প্রতিবেদন',
  users: 'ব্যবহারকারী',
  'master-data': 'মাস্টার ডাটা',
  finance: 'অর্থ ব্যবস্থাপনা',
  system: 'সিস্টেম',
};

export default function HoLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const sidebarOpen = useStore(s => s.sidebarOpen);
  const setSidebarOpen = useStore(s => s.setSidebarOpen);
  const pendingApprovals = useStore(s => s.pendingApprovals);
  const setPendingApprovals = useStore(s => s.setPendingApprovals);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const h = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [setSidebarOpen]);

  useEffect(() => {
    hoService.listCirculars({ status: 'published', page_size: 1 }).then(res => {
      const count = res.data?.count || 0;
      setPendingApprovals(count);
    }).catch(() => {});
  }, [setPendingApprovals]);

  // Build breadcrumb from path
  const pathParts = location.pathname.replace('/ho/', '').split('/').filter(Boolean);
  const breadcrumbs = [
    { to: '/ho/dashboard', label: 'হোম' },
    ...pathParts.map((part, i) => ({
      to: i < pathParts.length - 1 ? `/ho/${pathParts.slice(0, i + 1).join('/')}` : null,
      label: BREADCRUMB_MAP[part] || part,
    })),
  ];

  // Filter links by permissions
  const filteredSections = SECTIONS.map(sec => ({
    ...sec,
    items: sec.items.filter(item => {
      if (!item.module) return true;
      return canViewModule(user, item.module);
    }),
  })).filter(sec => sec.items.length > 0);

  // Add badge counts to nav items
  const sectionsWithBadges = filteredSections.map(sec => ({
    ...sec,
    items: sec.items.map(item => {
      if (item.badgeKey === 'pendingApprovals' && pendingApprovals > 0) {
        return { ...item, badge: pendingApprovals, badgeColor: 'bg-danger' };
      }
      return item;
    }),
  }));

  if (!user) return <Navigate to={`/ho/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;

  const collapsed = !sidebarOpen && !isMobile;

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <Sidebar
        links={sectionsWithBadges}
        brand={{
          icon: 'bi-building-gear',
          titleBn: t('site.hoTitle', 'হেড অফিস'),
          subBn: 'BRTC',
        }}
      />

      {/* Main content */}
      <div className={`page-content${collapsed ? ' sidebar-collapsed' : ''}`}>
        <Navbar 
          breadcrumb={breadcrumbs}
          extra={pendingApprovals > 0 && (
            <button className="btn btn-sm notif-btn position-relative" onClick={() => navigate('/ho/approvals')}>
              <i className="bi bi-exclamation-circle"></i>
              <span className="ms-1 d-none d-md-inline" style={{ fontSize: 12 }}>{pendingApprovals}</span>
            </button>
          )}
        />

        <main className="main-content">
          <div className="container-fluid">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
