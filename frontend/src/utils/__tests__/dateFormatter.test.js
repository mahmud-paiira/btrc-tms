import { describe, it, expect } from 'vitest';
import {
  getBanglaMonthName,
  getBanglaWeekday,
  formatDate,
  formatDateTime,
  formatDateShort,
} from '../dateFormatter';

describe('getBanglaMonthName', () => {
  it('returns correct Bangla month', () => {
    expect(getBanglaMonthName(0)).toBe('জানুয়ারি');
    expect(getBanglaMonthName(5)).toBe('জুন');
    expect(getBanglaMonthName(11)).toBe('ডিসেম্বর');
  });

  it('returns empty for invalid month', () => {
    expect(getBanglaMonthName(-1)).toBe('');
    expect(getBanglaMonthName(12)).toBe('');
  });
});

describe('getBanglaWeekday', () => {
  it('returns long weekday name', () => {
    expect(getBanglaWeekday(0)).toBe('রবিবার');
    expect(getBanglaWeekday(5)).toBe('শুক্রবার');
    expect(getBanglaWeekday(6)).toBe('শনিবার');
  });

  it('returns short weekday name', () => {
    expect(getBanglaWeekday(0, true)).toBe('রবি');
    expect(getBanglaWeekday(4, true)).toBe('বৃহ');
  });

  it('returns empty for invalid day', () => {
    expect(getBanglaWeekday(-1)).toBe('');
    expect(getBanglaWeekday(7)).toBe('');
  });
});

describe('formatDate', () => {
  it('formats date in Bangla', () => {
    const d = new Date(2024, 0, 15);
    expect(formatDate(d, 'bn')).toBe('১৫ জানুয়ারি ২০২৪');
  });

  it('formats date in English', () => {
    const d = new Date(2024, 0, 15);
    expect(formatDate(d, 'en')).toBe('15 Jan 2024');
  });

  it('handles date string input', () => {
    expect(formatDate('2024-06-15', 'bn')).toContain('জুন');
    expect(formatDate('2024-06-15', 'en')).toContain('Jun');
  });

  it('returns empty for null/undefined', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });

  it('returns raw string for invalid dates', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatDateTime', () => {
  it('formats datetime in Bangla', () => {
    const d = new Date(2024, 0, 15, 9, 30);
    const result = formatDateTime(d, 'bn');
    expect(result).toContain('জানুয়ারি');
    expect(result).toContain('পূর্বাহ্ন');
  });

  it('formats datetime in English', () => {
    const d = new Date(2024, 0, 15, 14, 30);
    const result = formatDateTime(d, 'en');
    expect(result).toContain('Jan');
    expect(result).toContain('PM');
  });

  it('returns empty for null/undefined', () => {
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime(undefined)).toBe('');
  });
});

describe('formatDateShort', () => {
  it('formats date in Bangla digits', () => {
    const d = new Date(2024, 0, 15);
    expect(formatDateShort(d, 'bn')).toBe('১৫/০১/২০২৪');
  });

  it('formats date in English', () => {
    const d = new Date(2024, 0, 15);
    expect(formatDateShort(d, 'en')).toBe('15/01/2024');
  });

  it('handles date string input', () => {
    expect(formatDateShort('2024-12-25', 'en')).toBe('25/12/2024');
  });

  it('returns empty for null/undefined', () => {
    expect(formatDateShort(null)).toBe('');
    expect(formatDateShort(undefined)).toBe('');
  });
});
