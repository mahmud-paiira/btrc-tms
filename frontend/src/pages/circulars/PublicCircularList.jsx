import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import CircularCard from '../../components/common/CircularCard';
import circularService from '../../services/circularService';
import './PublicCircular.css';

function getCenterInfo(code) {
  const centers = {
    dhaka_tcu: { nameBn: 'ঢাকা প্রশিক্ষণ কেন্দ্র', nameEn: 'Dhaka Training Center', address: '১০৮, পুরানা পল্টন, ঢাকা-১০০০' },
    ctg_tcu: { nameBn: 'চট্টগ্রাম প্রশিক্ষণ কেন্দ্র', nameEn: 'Chattogram Training Center', address: 'আগ্রাবাদ, চট্টগ্রাম' },
    khl_tcu: { nameBn: 'খুলনা প্রশিক্ষণ কেন্দ্র', nameEn: 'Khulna Training Center', address: 'বয়রা, খুলনা' },
    rsh_tcu: { nameBn: 'রাজশাহী প্রশিক্ষণ কেন্দ্র', nameEn: 'Rajshahi Training Center', address: 'সপুরা, রাজশাহী' },
  };
  return centers[code.toLowerCase()] || { nameBn: 'প্রশিক্ষণ কেন্দ্র', nameEn: 'Training Center', address: '' };
}

export default function PublicCircularList() {
  const { center_code } = useParams();
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lang, setLang] = useState('bn');

  const isRtl = false;
  const center = getCenterInfo(center_code);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = 'ltr';
  }, [lang]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    circularService
      .getByCenterCode(center_code)
      .then((res) => {
        setCirculars(res.data.results || res.data);
      })
      .catch((err) => {
        setError(
          lang === 'bn'
            ? 'সার্কুলার লোড করতে সমস্যা হয়েছে'
            : 'Failed to load circulars',
        );
      })
      .finally(() => setLoading(false));
  }, [center_code, lang]);

  const t = {
    bn: {
      title: 'প্রশিক্ষণ সার্কুলার',
      subtitle: 'নিচের তালিকা থেকে আপনার পছন্দের কোর্সে আবেদন করুন',
      loading: 'লোড হচ্ছে...',
      noData: 'এই কেন্দ্রের জন্য কোনো সক্রিয় সার্কুলার নেই',
      footer: 'বাংলাদেশ সড়ক পরিবহন কর্তৃপক্ষ',
      copyright: 'সর্বস্বত্ব সংরক্ষিত',
      language: 'English',
    },
    en: {
      title: 'Training Circulars',
      subtitle: 'Apply for your desired course from the list below',
      loading: 'Loading...',
      noData: 'No active circulars found for this center',
      footer: 'Bangladesh Road Transport Authority',
      copyright: 'All rights reserved',
      language: 'বাংলা',
    },
  };

  const text = t[lang];

  return (
    <div className={`public-circular-page ${isRtl ? 'rtl' : 'ltr'}`}>
      <header className="circular-header">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center py-3">
            <div className="header-brand">
              {lang === 'bn' ? (
                <>
                  <h1 className="brand-title">বাংলাদেশ সড়ক পরিবহন কর্তৃপক্ষ</h1>
                  <p className="brand-subtitle mb-0">প্রশিক্ষণ ব্যবস্থাপনা সিস্টেম</p>
                </>
              ) : (
                <>
                  <h1 className="brand-title">Bangladesh Road Transport Authority</h1>
                  <p className="brand-subtitle mb-0">Training Management System</p>
                </>
              )}
            </div>
            <button
              className="btn btn-outline-light lang-toggle"
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
            >
              <i className="bi bi-globe me-1"></i>
              {text.language}
            </button>
          </div>
        </div>
      </header>

      <main className="container py-4">
        <div className="center-info mb-4">
          <h2 className="center-name">
            {lang === 'bn' ? center.nameBn : center.nameEn}
          </h2>
          <p className="center-address text-muted">
            <i className="bi bi-geo-alt me-1"></i>
            {center.address}
          </p>
        </div>

        <div className="page-heading mb-4">
          <h3>{text.title}</h3>
          <p className="text-muted">{text.subtitle}</p>
        </div>

        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">{text.loading}</span>
            </div>
            <p className="mt-2">{text.loading}</p>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && circulars.length === 0 && (
          <div className="text-center py-5">
            <i className="bi bi-inbox display-1 text-muted"></i>
            <p className="mt-3 text-muted">{text.noData}</p>
          </div>
        )}

        {!loading && !error && circulars.length > 0 && (
          <div className="row g-4">
            {circulars.map((circular) => (
              <div
                key={circular.public_url || circular.id}
                className="col-12 col-sm-6 col-lg-4"
              >
                <CircularCard
                  circular={circular}
                  lang={lang}
                  isRtl={isRtl}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="circular-footer">
        <div className="container py-4">
          <div className="row">
            <div className="col-md-6">
              <h5>{text.footer}</h5>
              <p className="mb-1">
                {lang === 'bn' ? center.nameBn : center.nameEn}
              </p>
              <p className="small text-muted">{center.address}</p>
            </div>
            <div className="col-md-6 text-md-end">
              <p className="mb-1">
                <i className="bi bi-telephone me-1"></i>
                +880-2-48114777
              </p>
              <p className="mb-1">
                <i className="bi bi-envelope me-1"></i>
                info@brtc.gov.bd
              </p>
              <p className="small text-muted mt-2 mb-0">
                &copy; {new Date().getFullYear()} {text.footer}. {text.copyright}.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
