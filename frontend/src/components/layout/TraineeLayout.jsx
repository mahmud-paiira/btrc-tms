import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';
import useStore from '../../store/useStore';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const links = [
  {
    section: 'main',
    items: [
      { to: '/trainee/dashboard', icon: 'bi-speedometer2', labelBn: 'ড্যাশবোর্ড' },
      { to: '/trainee/schedule', icon: 'bi-calendar-week', labelBn: 'সময়সূচি' },
      { to: '/trainee/attendance', icon: 'bi-check-circle', labelBn: 'উপস্থিতি' },
      { to: '/trainee/assessment', icon: 'bi-clipboard-data', labelBn: 'মূল্যায়ন' },
      { to: '/trainee/certificate', icon: 'bi-award', labelBn: 'সার্টিফিকেট' },
      { to: '/trainee/profile', icon: 'bi-person-gear', labelBn: 'প্রোফাইল' },
    ],
  },
];

export default function TraineeLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const sidebarOpen = useStore(s => s.sidebarOpen);
  const setSidebarOpen = useStore(s => s.setSidebarOpen);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();

  useEffect(() => {
    const h = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [setSidebarOpen]);

  if (!user) return <Navigate to="/trainee/login" replace />;

  const collapsed = !sidebarOpen && !isMobile;

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <Sidebar
        links={links}
        brand={{
          icon: 'bi-mortarboard-fill',
          titleKey: 'auth.traineePortal',
          titleBn: 'প্রশিক্ষণার্থী পোর্টাল',
          subKey: 'auth.traineeLoginSubtitle',
          subBn: 'BRTC ট্রেনিং ম্যানেজমেন্ট সিস্টেম',
        }}
        light
      />

      <div className={`page-content${collapsed ? ' sidebar-collapsed' : ''}`}>
        <Navbar
          breadcrumb={[
            { label: t('auth.traineePortal', 'প্রশিক্ষণার্থী'), to: '/trainee/dashboard' },
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