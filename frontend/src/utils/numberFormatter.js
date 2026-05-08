// src/utils/numberFormatter.js

// Format currency in Taka (BDT)
export const taka = (amount) => {
  if (amount === undefined || amount === null) return '৳ 0';
  return new Intl.NumberFormat('bn-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount).replace('BDT', '৳');
};

// Format percentage
export const pct = (value) => {
  if (value === undefined || value === null) return '0%';
  return `${value}%`;
};

// Format date
export const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  return new Intl.DateTimeFormat('bn-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(d);
};

// Additional useful formatters (optional)
export const formatNumber = (number) => {
  if (number === undefined || number === null) return '0';
  return new Intl.NumberFormat('bn-BD').format(number);
};

export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  return new Intl.DateTimeFormat('bn-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
};

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export const convertToBanglaDigits = (str) => {
  if (str === undefined || str === null) return '';
  return String(str).replace(/\d/g, d => BANGLA_DIGITS[parseInt(d)] || d);
};
export const toEnglishDigits = (str) => {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[০-৯]/g, d => String(BANGLA_DIGITS.indexOf(d)));
};
export const formatPercentage = (value) => {
  if (value === undefined || value === null) return '0%';
  return `${Math.round(value)}%`;
};
export const formatCurrency = (value) => taka(value);

