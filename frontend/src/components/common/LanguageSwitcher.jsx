import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

export default function LanguageSwitcher({ dropdown = false, size = 'sm' }) {
  const { lang, toggleLang } = useTranslation();

  if (dropdown) {
    return (
      <button className={`btn btn-outline-secondary btn-${size} d-flex align-items-center gap-1`} onClick={toggleLang} title={lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}>
        <i className={`bi ${lang === 'bn' ? 'bi-globe' : 'bi-globe2'} me-1`}></i>
        <span>{lang === 'bn' ? 'EN' : 'বাং'}</span>
      </button>
    );
  }

  return (
    <div className="form-check form-switch d-inline-block mb-0">
      <input
        className="form-check-input"
        type="checkbox"
        id="langSwitch"
        checked={lang === 'en'}
        onChange={toggleLang}
      />
      <label className="form-check-label small" htmlFor="langSwitch">
        {lang === 'bn' ? (
          <><span className="fw-bold">বাং</span> | <span className="text-muted">EN</span></>
        ) : (
          <><span className="text-muted">বাং</span> | <span className="fw-bold">EN</span></>
        )}
      </label>
    </div>
  );
}
