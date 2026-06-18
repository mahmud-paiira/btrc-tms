import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from '../../hooks/useTranslation';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await login(email, password);
      toast.success(t('auth.loginSuccess', 'সফলভাবে লগইন হয়েছে'));
      const role = data.user?.user_type;
      if (role === 'head_office') navigate('/ho/dashboard');
      else if (role === 'trainee') navigate('/trainee/dashboard');
      else if (role === 'trainer') navigate('/trainer/dashboard');
      else if (role === 'assessor') navigate('/assessor/dashboard');
      else navigate('/');
    } catch {
      toast.error(t('auth.loginFailed', 'ইমেইল বা পাসওয়ার্ড ভুল'));
    }
  };

  return (
    <div className="login-page">
      <div className="login-grid" />
      <div className="login-card">
        <div className="login-decoration login-decoration-1" />
        <div className="login-decoration login-decoration-2" />

        <div className="text-center">
          <div className="login-logo">
            <i className="bi bi-shield-lock" />
          </div>
          <h1 className="login-title">BRTC TMS</h1>
          <p className="login-subtitle">
            {t('auth.loginSubtitle', 'লগইন করে আপনার ড্যাশবোর্ডে প্রবেশ করুন')}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="login-input-group">
            <i className="bi bi-envelope login-input-icon" />
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder', 'ইমেইল ঠিকানা')}
              required
            />
          </div>

          <div className="login-input-group">
            <i className="bi bi-lock login-input-icon" />
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder', 'পাসওয়ার্ড')}
              required
            />
          </div>

          <div className="login-remember">
            <label>
              <input
                type="checkbox"
                className="form-check-input"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              {t('auth.rememberMe', 'মনে রাখুন')}
            </label>
            <button type="button" className="login-link-btn">
              {t('auth.forgotPassword', 'পাসওয়ার্ড ভুলে গেছেন?')}
            </button>
          </div>

          <button className="login-btn" disabled={loading}>
            {loading ? (
              <span className="d-flex align-items-center justify-content-center gap-2">
                <span className="login-spinner" />
                {t('auth.loggingIn', 'লগইন হচ্ছে...')}
              </span>
            ) : (
              t('auth.login', 'লগইন')
            )}
          </button>
        </form>

        <div className="login-divider">
          <LanguageSwitcher />
        </div>

        <div className="login-footer">
          <small>&copy; {new Date().getFullYear()} BRTC TMS. All rights reserved.</small>
        </div>
      </div>
    </div>
  );
}
