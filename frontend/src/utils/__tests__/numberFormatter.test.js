import { describe, it, expect } from 'vitest';
import {
  convertToBanglaDigits,
  toEnglishDigits,
  formatNumber,
  formatCurrency,
  formatPercentage,
} from '../numberFormatter';

describe('convertToBanglaDigits', () => {
  it('converts digits to Bangla', () => {
    expect(convertToBanglaDigits(123)).toBe('১২৩');
    expect(convertToBanglaDigits(0)).toBe('০');
    expect(convertToBanglaDigits(9876543210)).toBe('৯৮৭৬৫৪৩২১০');
  });

  it('handles string numbers', () => {
    expect(convertToBanglaDigits('456')).toBe('৪৫৬');
  });

  it('preserves non-digit characters', () => {
    expect(convertToBanglaDigits('১২৩/৪৫৬')).toBe('১২৩/৪৫৬');
  });

  it('returns empty for null/undefined', () => {
    expect(convertToBanglaDigits(null)).toBe('');
    expect(convertToBanglaDigits(undefined)).toBe('');
  });
});

describe('toEnglishDigits', () => {
  it('converts Bangla digits to English', () => {
    expect(toEnglishDigits('১২৩')).toBe('123');
    expect(toEnglishDigits('০')).toBe('0');
  });

  it('preserves non-digit characters', () => {
    expect(toEnglishDigits('১২৩/৪৫৬')).toBe('123/456');
  });

  it('returns empty for null/undefined', () => {
    expect(toEnglishDigits(null)).toBe('');
    expect(toEnglishDigits(undefined)).toBe('');
  });
});

describe('formatNumber', () => {
  it('formats number with Indian-style commas in English', () => {
    expect(formatNumber(1234567, 'en')).toBe('12,34,567');
    expect(formatNumber(1000, 'en')).toBe('1,000');
  });

  it('formats number in Bangla', () => {
    const result = formatNumber(1234567, 'bn');
    expect(result).toContain('১২');
    expect(result).toContain('৩৪');
    expect(result).toContain('৫৬৭');
  });

  it('handles zero', () => {
    expect(formatNumber(0, 'en')).toBe('0');
    expect(formatNumber(0, 'bn')).toBe('০');
  });

  it('returns empty for null/undefined', () => {
    expect(formatNumber(null)).toBe('');
    expect(formatNumber(undefined)).toBe('');
  });

  it('handles string numbers', () => {
    expect(formatNumber('5000', 'en')).toBe('5,000');
  });
});

describe('formatCurrency', () => {
  it('formats currency with BDT symbol', () => {
    expect(formatCurrency(50000, 'en')).toBe('৳ 50,000');
    expect(formatCurrency(0, 'en')).toBe('৳ 0');
  });

  it('formats currency in Bangla', () => {
    const result = formatCurrency(50000, 'bn');
    expect(result).toContain('৳');
    expect(result).toContain('০');
  });

  it('returns empty for null/undefined', () => {
    expect(formatCurrency(null)).toBe('');
    expect(formatCurrency(undefined)).toBe('');
  });
});

describe('formatPercentage', () => {
  it('formats percentage in English', () => {
    expect(formatPercentage(75.5, 'en')).toBe('75.5%');
    expect(formatPercentage(100, 'en')).toBe('100%');
    expect(formatPercentage(0, 'en')).toBe('0%');
  });

  it('formats percentage in Bangla', () => {
    expect(formatPercentage(75, 'bn')).toBe('৭৫%');
    expect(formatPercentage(100, 'bn')).toBe('১০০%');
  });

  it('returns empty for null/undefined', () => {
    expect(formatPercentage(null)).toBe('');
    expect(formatPercentage(undefined)).toBe('');
  });
});
