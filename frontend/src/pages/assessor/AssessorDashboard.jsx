import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';

export default function AssessorDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div style={{ fontFamily: 'NikoshBAN, sans-serif' }}>
      <div className="card bg-warning text-white shadow-sm mb-4">
        <div className="card-body d-flex align-items-center gap-3">
          <div className="rounded-circle bg-white text-warning d-flex align-items-center justify-content-center" style={{ width: 64, height: 64, fontSize: 28 }}>
            <i className="bi bi-person-check-fill"></i>
          </div>
          <div>
            <h4 className="mb-1">{user?.full_name_bn || user?.full_name_en || user?.email}</h4>
            <p className="mb-0 opacity-75">
              <i className="bi bi-person-check me-1"></i>{t('nav.assessor', 'মূল্যায়নকারী')}
            </p>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4 col-6">
          <Link to="/center-admin/batches" className="card shadow-sm text-decoration-none text-dark h-100">
            <div className="card-body text-center py-4">
              <i className="bi bi-layers fs-1 text-primary"></i>
              <h6 className="mt-2 mb-0">{t('assessor.dashboard.batches', 'ব্যাচ')}</h6>
              <small className="text-muted">{t('assessor.dashboard.batchesDesc', 'মূল্যায়নের জন্য ব্যাচ')}</small>
            </div>
          </Link>
        </div>
        <div className="col-md-4 col-6">
          <Link to="/center-admin/batches" className="card shadow-sm text-decoration-none text-dark h-100">
            <div className="card-body text-center py-4">
              <i className="bi bi-clipboard-data fs-1 text-warning"></i>
              <h6 className="mt-2 mb-0">{t('assessor.dashboard.assessment', 'মূল্যায়ন')}</h6>
              <small className="text-muted">{t('assessor.dashboard.assessmentDesc', 'মূল্যায়ন পরিচালনা')}</small>
            </div>
          </Link>
        </div>
        <div className="col-md-4 col-6">
          <Link to="/center-admin/applications" className="card shadow-sm text-decoration-none text-dark h-100">
            <div className="card-body text-center py-4">
              <i className="bi bi-file-earmark-text fs-1 text-info"></i>
              <h6 className="mt-2 mb-0">{t('assessor.dashboard.applications', 'আবেদন')}</h6>
              <small className="text-muted">{t('assessor.dashboard.applicationsDesc', 'আবেদন পর্যালোচনা')}</small>
            </div>
          </Link>
        </div>
      </div>

      <div className="alert alert-warning">
        <i className="bi bi-info-circle me-2"></i>
        {t('assessor.dashboard.info', 'একটি ব্যাচ নির্বাচন করতে "ব্যাচ" এ ক্লিক করুন, তারপর "মূল্যায়ন" বাটনে ক্লিক করে মূল্যায়ন পরিচালনা করুন।')}
      </div>
    </div>
  );
}
