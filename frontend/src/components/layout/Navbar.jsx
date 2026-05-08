import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import LanguageSwitcher from '../common/LanguageSwitcher';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-light bg-light px-3 shadow-sm">
      <span className="navbar-brand mb-0 h6">
        {t('site.subtitle', 'বাংলাদেশ সড়ক পরিবহন কর্তৃপক্ষ (BRTC)')}
      </span>
      {user && (
        <div className="d-flex align-items-center gap-2">
          <LanguageSwitcher dropdown />
          <span className="text-muted small">
            <i className="bi bi-person-circle me-1"></i>
            {user.full_name_bn || user.email}
          </span>
          <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>
      )}
    </nav>
  );
}
