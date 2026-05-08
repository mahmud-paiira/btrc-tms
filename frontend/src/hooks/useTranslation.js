import { useCallback, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import enTranslations from '../locales/en.json';
import { convertToBanglaDigits as toBanglaDigits, toEnglishDigits } from '../utils/numberFormatter';
import { formatDate, formatDateShort } from '../utils/dateFormatter';

export { toBanglaDigits, toEnglishDigits, formatDate };

function resolveNested(obj, path) {
  return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

export function useTranslation() {
  const { lang, toggleLang } = useLanguage();

  const t = useCallback(
    (key, fallback) => {
      const enText = resolveNested(enTranslations, key);
      if (lang === 'bn') return fallback || enText || key;
      return enText || fallback || key;
    },
    [lang],
  );

  const helpers = useMemo(
    () => ({
      toBn: (val) => (lang === 'bn' ? toBanglaDigits(val) : val),
      fmtDate: (dateStr) => formatDate(dateStr, lang),
    }),
    [lang],
  );

  return { lang, toggleLang, t, ...helpers };
}

export default useTranslation;
