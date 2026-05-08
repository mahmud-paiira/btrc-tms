import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

export default function TraineeLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login/', { email, password });
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      api.defaults.headers.Authorization = `Bearer ${data.access}`;

      const userRes = await api.get('/auth/me/');
      const user = userRes.data;

      if (user.user_type !== 'trainee') {
        toast.error(t('auth.traineeOnly', 'এই পোর্টাল শুধুমাত্র প্রশিক্ষণার্থীদের জন্য।'));
        localStorage.clear();
        setLoading(false);
        return;
      }

      localStorage.setItem('user', JSON.stringify(user));
      toast.success(t('auth.loginSuccess', 'সফলভাবে লগইন হয়েছে'));
      navigate('/trainee/dashboard');
    } catch {
      toast.error(t('auth.loginFailed', 'ইমেইল বা পাসওয়ার্ড ভুল।'));
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
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow" style={{ maxWidth: 420, width: '100%' }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <h4 className="fw-bold" style={{ fontFamily: 'NikoshBAN, sans-serif' }}>{t('auth.traineePortal', 'প্রশিক্ষণার্থী পোর্টাল')}</h4>
            <p className="text-muted">{t('auth.traineeLoginSubtitle', 'BRTC ট্রেনিং ম্যানেজমেন্ট সিস্টেম')}</p>
            <LanguageSwitcher />
          </div>

          {!showForgot ? (
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label">{t('auth.email', 'ইমেইল')}</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">{t('auth.password', 'পাসওয়ার্ড')}</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary w-100 mb-2" disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                {t('auth.login', 'লগইন')}
              </button>
              <div className="text-center">
                <button type="button" className="btn btn-link btn-sm" onClick={() => setShowForgot(true)}>
                  {t('auth.forgotPassword', 'পাসওয়ার্ড ভুলে গেছেন?')}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <div className="mb-3">
                <label className="form-label">{t('auth.enterEmail', 'আপনার ইমেইল ঠিকানা দিন')}</label>
                <input
                  type="email"
                  className="form-control"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-warning w-100 mb-2" disabled={resetting}>
                {resetting ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                {t('auth.sendResetLink', 'রিসেট লিংক পাঠান')}
              </button>
              <div className="text-center">
                <button type="button" className="btn btn-link btn-sm" onClick={() => setShowForgot(false)}>
                  {t('auth.backToLogin', 'লগইনে ফিরে যান')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
