import { describe, it, expect } from 'vitest';
import { formatDate } from './date';

describe('date.formatDate (lib/utils/date.ts)', () => {
  it('returns a dash for missing/invalid input', () => {
    expect(formatDate(undefined)).toBe('-');
    expect(formatDate(null)).toBe('-');
    expect(formatDate('not-a-date')).toBe('-');
  });

  it('formats with the default en-US short month style', () => {
    expect(formatDate('2023-01-15')).toBe('Jan 15, 2023');
  });

  it('supports DD/MM/YYYY token formats', () => {
    expect(formatDate('2023-01-15', 'DD/MM/YYYY')).toBe('15/01/2023');
    expect(formatDate('2023-03-05', 'YYYY-MM-DD')).toBe('2023-03-05');
  });
});
