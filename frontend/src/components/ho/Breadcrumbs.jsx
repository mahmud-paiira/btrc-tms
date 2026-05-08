import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

const LABEL_MAP = {
  dashboard: 'ড্যাশবোর্ড',
  centers: 'কেন্দ্র সমূহ',
  courses: 'কোর্স',
  trainers: 'প্রশিক্ষক',
  assessors: 'মূল্যায়নকারী',
  circulars: 'সার্কুলার',
  finance: 'অর্থ ব্যবস্থাপনা',
  budgets: 'বাজেট',
  vouchers: 'ভাউচার',
  soe: 'ব্যয় বিবরণী',
  'trial-balance': 'ট্রায়াল ব্যালেন্স',
  users: 'ব্যবহারকারী',
  approvals: 'অনুমোদন',
  reports: 'প্রতিবেদন',
  system: 'সিস্টেম',
  'email-templates': 'ইমেইল টেমপ্লেট',
  'sms-templates': 'এসএমএস টেমপ্লেট',
  integrations: 'ইন্টিগ্রেশন',
  health: 'সিস্টেম হেলথ',
  'certificate-template': 'সার্টিফিকেট টেমপ্লেট',
};

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  if (!pathname.startsWith('/ho')) return null;

  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="breadcrumb" style={{ fontSize: 12 }}>
      <ol className="breadcrumb mb-0 bg-transparent p-0">
        <li className="breadcrumb-item">
          <Link to="/ho/dashboard" className="text-decoration-none text-secondary">
            <i className="bi bi-house-door me-1"></i>
          </Link>
        </li>
        {segments.slice(1).map((seg, i) => {
          const isLast = i === segments.slice(1).length - 1;
          const href = '/' + segments.slice(0, i + 2).join('/');
          const label = LABEL_MAP[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
          return isLast ? (
            <li key={seg} className="breadcrumb-item active fw-semibold" aria-current="page" style={{ color: '#0d6efd' }}>
              {t(`nav.${seg}`, label)}
            </li>
          ) : (
            <li key={seg} className="breadcrumb-item">
              <Link to={href} className="text-decoration-none text-secondary">{t(`nav.${seg}`, label)}</Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
