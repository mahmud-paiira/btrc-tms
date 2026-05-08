import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from '../../hooks/useTranslation';
import LanguageSwitcher from '../common/LanguageSwitcher';

export default function TraineeLayout() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    localStorage.clear();
    toast.success(t('site.logoutSuccess', 'লগআউট সফল'));
    navigate('/trainee/login');
  };

  const links = [
    { to: '/trainee/dashboard', label: t('nav.dashboard', 'ড্যাশবোর্ড'), icon: 'bi-speedometer2' },
    { to: '/trainee/schedule', label: t('nav.schedule', 'সময়সূচি'), icon: 'bi-calendar-week' },
    { to: '/trainee/attendance', label: t('nav.attendance', 'উপস্থিতি'), icon: 'bi-check-circle' },
    { to: '/trainee/assessment', label: t('nav.assessment', 'মূল্যায়ন'), icon: 'bi-clipboard-data' },
    { to: '/trainee/certificate', label: t('nav.certificate', 'সার্টিফিকেট'), icon: 'bi-award' },
    { to: '/trainee/profile', label: t('nav.profile', 'প্রোফাইল'), icon: 'bi-person-gear' },
  ];

  return (
    <div className="d-flex flex-column min-vh-100">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <NavLink className="navbar-brand" to="/trainee/dashboard">
            <i className="bi bi-mortarboard-fill me-2"></i>{t('site.traineeTitle', 'BRTC প্রশিক্ষণার্থী')}
          </NavLink>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#traineeNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="traineeNav">
            <ul className="navbar-nav me-auto">
              {links.map((l) => (
                <li className="nav-item" key={l.to}>
                  <NavLink
                    to={l.to}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    <i className={`bi ${l.icon} me-1`}></i>{l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="d-flex gap-2 align-items-center">
              <LanguageSwitcher dropdown />
              <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-1"></i>{t('site.logout', 'লগআউট')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container-fluid py-4 px-4 flex-grow-1 bg-light">
        <Outlet />
      </div>
    </div>
  );
}
