import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';

export default function TrainerDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div style={{ fontFamily: 'NikoshBAN, sans-serif' }}>
      <div className="card bg-success text-white shadow-sm mb-4">
        <div className="card-body d-flex align-items-center gap-3">
          <div className="rounded-circle bg-white text-success d-flex align-items-center justify-content-center" style={{ width: 64, height: 64, fontSize: 28 }}>
            <i className="bi bi-person-badge-fill"></i>
          </div>
          <div>
            <h4 className="mb-1">{user?.full_name_bn || user?.full_name_en || user?.email}</h4>
            <p className="mb-0 opacity-75">
              <i className="bi bi-person-badge me-1"></i>{t('nav.trainer', 'প্রশিক্ষক')}
            </p>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4 col-6">
          <Link to="/center-admin/batches" className="card shadow-sm text-decoration-none text-dark h-100">
            <div className="card-body text-center py-4">
              <i className="bi bi-layers fs-1 text-primary"></i>
              <h6 className="mt-2 mb-0">{t('trainer.dashboard.myBatches', 'আমার ব্যাচ')}</h6>
              <small className="text-muted">{t('trainer.dashboard.myBatchesDesc', 'ব্যাচ তালিকা দেখুন')}</small>
            </div>
          </Link>
        </div>
        <div className="col-md-4 col-6">
          <Link to="/center-admin/batches" className="card shadow-sm text-decoration-none text-dark h-100">
            <div className="card-body text-center py-4">
              <i className="bi bi-calendar-check fs-1 text-success"></i>
              <h6 className="mt-2 mb-0">{t('trainer.dashboard.attendance', 'উপস্থিতি')}</h6>
              <small className="text-muted">{t('trainer.dashboard.attendanceDesc', 'উপস্থিতি চিহ্নিত করুন')}</small>
            </div>
          </Link>
        </div>
        <div className="col-md-4 col-6">
          <Link to="/trainer/schedule" className="card shadow-sm text-decoration-none text-dark h-100">
            <div className="card-body text-center py-4">
              <i className="bi bi-calendar-week fs-1 text-info"></i>
              <h6 className="mt-2 mb-0">{t('trainer.dashboard.schedule', 'সময়সূচি')}</h6>
              <small className="text-muted">{t('trainer.dashboard.scheduleDesc', 'সাপ্তাহিক রুটিন')}</small>
            </div>
          </Link>
        </div>
      </div>

      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        {t('trainer.dashboard.info', 'একটি ব্যাচ নির্বাচন করতে "আমার ব্যাচ" এ ক্লিক করুন, তারপর উপস্থিতি বা মূল্যায়ন অপশন ব্যবহার করুন।')}
      </div>
    </div>
  );
}
