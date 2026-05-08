import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from '../../hooks/useTranslation';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card shadow p-4" style={{ width: 400 }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">{t('auth.loginTitle', 'BRTC TMS – লগইন')}</h4>
          <LanguageSwitcher />
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">{t('auth.email', 'ইমেইল')}</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@brtc.gov.bd"
              required
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
          <button className="btn btn-primary w-100" disabled={loading}>
            {loading ? t('auth.loggingIn', 'অপেক্ষা করুন...') : t('auth.login', 'লগইন')}
          </button>
        </form>
      </div>
    </div>
  );
}
