import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';
import useStore from '../../store/useStore';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const centerAdminLinks = [
  {
    section: 'main',
    items: [
      { to: '/', icon: 'bi-speedometer2', labelKey: 'nav.dashboard', labelBn: 'ড্যাশবোর্ড' },
      { to: '/center-admin/applications', icon: 'bi-file-earmark-text', labelKey: 'nav.applications', labelBn: 'আবেদন পর্যালোচনা' },
    ],
  },
  {
    section: 'academic',
    items: [
      { to: '/center-admin/batches', icon: 'bi-layers', labelKey: 'nav.batches', labelBn: 'ব্যাচসমূহ' },
      { to: '/center-admin/trainees', icon: 'bi-people', labelKey: 'nav.trainees', labelBn: 'প্রশিক্ষণার্থী' },
      { to: '/center-admin/trainers', icon: 'bi-person-badge', labelKey: 'nav.trainers', labelBn: 'প্রশিক্ষক' },
      { to: '/center-admin/assessors', icon: 'bi-person-check', labelKey: 'nav.assessors', labelBn: 'মূল্যায়নকারী' },
      { to: '/center-admin/courses', icon: 'bi-book', labelKey: 'nav.courses', labelBn: 'কোর্সসমূহ' },
    ],
  },
  {
    section: 'operations',
    items: [
      { to: '/center-admin/certificates/issue', icon: 'bi-award', labelKey: 'nav.certificates', labelBn: 'সার্টিফিকেট' },
      { to: '/center-admin/jobs/tracking', icon: 'bi-briefcase', labelKey: 'nav.jobs', labelBn: 'চাকরি ট্র্যাকিং' },
      { to: '/center-admin/reports', icon: 'bi-file-earmark-bar-graph', labelKey: 'nav.reports', labelBn: 'প্রতিবেদন' },
    ],
  },
  {
    section: 'scheduling',
    items: [
      { to: '/center-admin/shifts', icon: 'bi-arrow-left-right', labelKey: 'nav.shifts', labelBn: 'শিফট' },
      { to: '/center-admin/holidays', icon: 'bi-calendar-x', labelKey: 'nav.holidays', labelBn: 'ছুটির দিন' },
      { to: '/center-admin/allowances', icon: 'bi-wallet2', labelKey: 'nav.allowances', labelBn: 'ভাতা' },
    ],
  },
];

const trainerLinks = [
  {
    section: 'main',
    items: [
      { to: '/trainer/dashboard', icon: 'bi-speedometer2', labelKey: 'nav.dashboard', labelBn: 'ড্যাশবোর্ড' },
    ],
  },
  {
    section: 'academic',
    items: [
      { to: '/trainer/batches', icon: 'bi-layers', labelKey: 'nav.myBatches', labelBn: 'আমার ব্যাচ' },
      { to: '/trainer/schedule', icon: 'bi-calendar-week', labelKey: 'nav.schedule', labelBn: 'সময়সূচি' },
    ],
  },
];

const assessorLinks = [
  {
    section: 'main',
    items: [
      { to: '/assessor/dashboard', icon: 'bi-speedometer2', labelKey: 'nav.dashboard', labelBn: 'ড্যাশবোর্ড' },
    ],
  },
  {
    section: 'academic',
    items: [
      { to: '/assessor/batches', icon: 'bi-layers', labelKey: 'nav.myBatches', labelBn: 'আমার ব্যাচ' },
    ],
  },
];

export default function Layout() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const sidebarOpen = useStore(s => s.sidebarOpen);
  const setSidebarOpen = useStore(s => s.setSidebarOpen);
  const isMobile = window.innerWidth < 768;
  const location = useLocation();

  useEffect(() => {
    const h = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [setSidebarOpen]);

  const collapsed = !sidebarOpen && !isMobile;

  if (!user) return <Navigate to="/login" replace />;
  if (user.user_type === 'head_office') return <Navigate to="/ho/dashboard" replace />;

  const sidebarLinks = user.user_type === 'trainer' ? trainerLinks : user.user_type === 'assessor' ? assessorLinks : centerAdminLinks;

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar
        links={sidebarLinks}
        brand={{
          icon: 'bi-truck',
          titleKey: 'site.title',
          titleBn: 'BRTC TMS',
          subKey: 'site.subtitle',
          subBn: 'প্রশিক্ষণ ব্যবস্থাপনা',
        }}
      />
      
      <div className={`page-content${collapsed ? ' sidebar-collapsed' : ''}`}>
        <Navbar 
          breadcrumb={[
            { label: t('nav.center', 'কেন্দ্র'), to: '/' },
            { label: location.pathname.split('/').pop() }
          ]} 
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
