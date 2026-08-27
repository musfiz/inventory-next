import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDate,
  formatQty,
  formatMoney,
  formatMoneyDecimal,
  daysBetween,
  formatDateRange,
} from './format';

describe('formatCurrency', () => {
  it('formats zero with the currency symbol', () => {
    expect(formatCurrency(0, 'BDT')).toBe('৳0.00');
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('falls back to 0 for undefined/null/NaN input', () => {
    expect(formatCurrency(undefined, 'BDT')).toBe('৳0.00');
    expect(formatCurrency(null, 'USD')).toBe('$0.00');
    expect(formatCurrency('not-a-number', 'USD')).toBe('$0.00');
  });

  it('prefixes a minus sign for negative amounts', () => {
    expect(formatCurrency(-5, 'USD')).toBe('-$5.00');
  });

  it('respects the decimals argument', () => {
    expect(formatCurrency(1234.5, 'BDT', 0)).toBe('৳1,235');
  });
});

describe('formatNumber', () => {
  it('defaults to 0 for missing input', () => {
    expect(formatNumber(undefined)).toBe('0');
    expect(formatNumber(null)).toBe('0');
  });

  it('formats with fixed decimals', () => {
    expect(formatNumber(42.7, 2)).toBe('42.70');
    expect(formatNumber(42.7, 0)).toBe('43');
  });
});

describe('formatPercent', () => {
  it('appends a percent sign', () => {
    expect(formatPercent(50)).toBe('50.0%');
    expect(formatPercent(25.55, 1)).toBe('25.6%');
  });

  it('handles missing input', () => {
    expect(formatPercent(undefined)).toBe('0.0%');
  });
});

describe('formatDate', () => {
  it('returns a dash for missing/invalid dates', () => {
    expect(formatDate(undefined)).toBe('-');
    expect(formatDate(null)).toBe('-');
    expect(formatDate('invalid')).toBe('-');
  });

  it('formats ISO dates exactly', () => {
    expect(formatDate('2023-01-15', 'iso')).toBe('2023-01-15');
  });

  it('formats short (en-GB) dates', () => {
    expect(formatDate('2023-01-15', 'short')).toBe('15/01/2023');
  });
});

describe('formatQty', () => {
  it('drops decimals for whole numbers', () => {
    expect(formatQty(5)).toBe('5');
    expect(formatQty(0)).toBe('0');
  });

  it('keeps two decimals for fractional quantities', () => {
    expect(formatQty(5.5)).toBe('5.50');
  });
});

describe('formatMoney / formatMoneyDecimal', () => {
  it('formats BDT amounts using en-IN grouping', () => {
    expect(formatMoney(0)).toBe('৳0');
    expect(formatMoney(1000)).toBe('৳1,000');
    expect(formatMoneyDecimal(1000)).toBe('৳1,000.00');
  });
});

describe('daysBetween', () => {
  it('computes an inclusive day delta', () => {
    expect(daysBetween('2023-01-01', '2023-01-11')).toBe(10);
  });
});

describe('formatDateRange', () => {
  it('collapses a single-day range', () => {
    expect(formatDateRange('2023-01-15', '2023-01-15')).toBe('15/01/2023');
  });

  it('joins a multi-day range', () => {
    expect(formatDateRange('2023-01-01', '2023-01-15')).toBe('01/01/2023 – 15/01/2023');
  });
});
