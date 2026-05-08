import { convertToBanglaDigits } from './numberFormatter';

const BANGLA_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

const BANGLA_WEEKDAYS_SHORT = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
const BANGLA_WEEKDAYS_LONG = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

const ENGLISH_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function getBanglaMonthName(month) {
  return BANGLA_MONTHS[month] || '';
}

export function getBanglaWeekday(day, short = false) {
  if (day < 0 || day > 6) return '';
  return short ? BANGLA_WEEKDAYS_SHORT[day] : BANGLA_WEEKDAYS_LONG[day];
}

export function formatDate(date, lang = 'bn') {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return date;

  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();

  if (lang === 'bn') {
    const bnDay = convertToBanglaDigits(day);
    const bnYear = convertToBanglaDigits(year);
    return `${bnDay} ${BANGLA_MONTHS[month]} ${bnYear}`;
  }

  return `${day} ${ENGLISH_MONTHS[month]} ${year}`;
}

export function formatDateTime(date, lang = 'bn') {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return date;

  const datePart = formatDate(d, lang);

  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const period = hours < 12 ? 'AM' : 'PM';
  const displayHour = hours % 12 || 12;

  if (lang === 'bn') {
    const bnHour = convertToBanglaDigits(displayHour);
    const bnMin = convertToBanglaDigits(minutes);
    const bnPeriod = hours < 12 ? 'পূর্বাহ্ন' : 'অপরাহ্ন';
    return `${datePart}, ${bnHour}:${bnMin} ${bnPeriod}`;
  }

  return `${datePart}, ${displayHour}:${minutes} ${period}`;
}

export function formatDateShort(date, lang = 'bn') {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return date;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const formatted = `${day}/${month}/${year}`;

  return lang === 'bn' ? convertToBanglaDigits(formatted) : formatted;
}
