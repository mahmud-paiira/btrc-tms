import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LanguageContext = createContext();

const STORAGE_KEY = 'brtc_lang';
const FALLBACK_LANG = 'bn';

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || FALLBACK_LANG;
    } catch {
      return FALLBACK_LANG;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', 'ltr');
    document.body.style.fontFamily = lang === 'bn'
      ? "'NikoshBAN', 'Noto Sans Bengali', system-ui, sans-serif"
      : "system-ui, -apple-system, 'Segoe UI', Roboto, 'Times New Roman', serif";
    document.body.style.fontSize = lang === 'bn' ? '20px' : '16px';
    document.body.style.direction = 'ltr';
    document.body.style.textAlign = 'left';
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLang(prev => prev === 'bn' ? 'en' : 'bn');
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export default LanguageContext;
