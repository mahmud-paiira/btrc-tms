import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import publicService from '../../services/publicService';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

export default function TraineeLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await publicService.loginPublic({ identifier, password });
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      api.defaults.headers.Authorization = `Bearer ${data.access_token}`;

      const user = data.user;

      if (user.user_type !== 'trainee') {
        toast.error(t('auth.traineeOnly', 'এই পোর্টাল শুধুমাত্র প্রশিক্ষণার্থীদের জন্য।'));
        localStorage.clear();
        setLoading(false);
        return;
      }

      localStorage.setItem('user', JSON.stringify(user));
      refreshUser();
      toast.success(t('auth.loginSuccess', 'সফলভাবে লগইন হয়েছে'));
      navigate('/trainee/dashboard');
    } catch {
      toast.error(t('auth.loginFailed', 'মোবাইল/এনআইডি বা পাসওয়ার্ড ভুল।'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetting(true);
    try {
      await api.post('/auth/password-reset/', { email: resetEmail });
      toast.success(t('auth.resetLinkSent', 'পাসওয়ার্ড রিসেট লিংক ইমেইলে পাঠানো হয়েছে।'));
      setShowForgot(false);
    } catch {
      toast.error(t('auth.resetFailed', 'ইমেইল পাঠাতে ব্যর্থ। সঠিক ইমেইল দিন।'));
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="login-page login-page-trainee">
      <div className="login-grid" />
      <div className="login-card login-card-trainee">
        <div className="text-center">
          <div className="login-logo login-logo-trainee">
            <i className="bi bi-people-fill" />
          </div>
          <h1 className="login-title">
            {t('auth.traineePortal', 'প্রশিক্ষণার্থী পোর্টাল')}
          </h1>
          <p className="login-subtitle">
            {t('auth.traineeLoginSubtitle', 'BRTC ট্রেনিং ম্যানেজমেন্ট সিস্টেম')}
          </p>
        </div>

        {!showForgot ? (
          <form onSubmit={handleLogin}>
            <div className="login-input-group">
              <i className="bi bi-phone login-input-icon" />
              <input
                type="text"
                className="form-control"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t('auth.identifierPlaceholder', 'মোবাইল / এনআইডি / ইমেইল')}
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
              <button
                type="button"
                className="login-link-btn login-link-btn-trainee"
                onClick={() => setShowForgot(true)}
              >
                {t('auth.forgotPassword', 'পাসওয়ার্ড ভুলে গেছেন?')}
              </button>
            </div>

            <button className="login-btn login-btn-trainee" disabled={loading}>
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
        ) : (
          <form onSubmit={handleForgotPassword}>
            <div className="text-center mb-3">
              <i className="bi bi-key-fill fs-1 text-warning" />
              <p className="login-subtitle mt-2">
                {t('auth.enterEmail', 'আপনার ইমেইল ঠিকানা দিন')}
              </p>
            </div>

            <div className="login-input-group">
              <i className="bi bi-envelope login-input-icon" />
              <input
                type="email"
                className="form-control"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder', 'ইমেইল ঠিকানা')}
                required
              />
            </div>

            <button className="login-btn login-btn-trainee" disabled={resetting}>
              {resetting ? (
                <span className="d-flex align-items-center justify-content-center gap-2">
                  <span className="login-spinner" />
                  {t('auth.sending', 'পাঠানো হচ্ছে...')}
                </span>
              ) : (
                <><i className="bi bi-send me-2" />{t('auth.sendResetLink', 'রিসেট লিংক পাঠান')}</>
              )}
            </button>

            <div className="text-center mt-3">
              <button
                type="button"
                className="login-link-btn login-link-btn-trainee"
                onClick={() => setShowForgot(false)}
              >
                <i className="bi bi-arrow-left me-1" />
                {t('auth.backToLogin', 'লগইনে ফিরে যান')}
              </button>
            </div>
          </form>
        )}

        <div className="login-divider">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
