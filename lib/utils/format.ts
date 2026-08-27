// Report Formatting Utilities
// Canonical source for currency, date, number, and percent formatting in reports.

const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: '\u09F3',
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
};

const DEFAULT_LOCALE = 'en-BD';

export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = 'BDT',
  decimals: number = 2,
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount ?? 0;
  if (isNaN(num)) return `${CURRENCY_SYMBOLS[currency] ?? ''}0.00`;

  const symbol = CURRENCY_SYMBOLS[currency] ?? '';
  const formatted = Math.abs(num).toLocaleString(DEFAULT_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${num < 0 ? '-' : ''}${symbol}${formatted}`;
}

export function formatNumber(n: number | null | undefined, decimals: number = 0): string {
  const num = n ?? 0;
  if (isNaN(num)) return '0';
  return num.toLocaleString(DEFAULT_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(n: number | null | undefined, decimals: number = 1): string {
  const num = n ?? 0;
  if (isNaN(num)) return '0%';
  return `${num.toFixed(decimals)}%`;
}

export function formatDate(
  date: string | Date | null | undefined,
  format: 'short' | 'long' | 'datetime' | 'iso' = 'short',
): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-GB');
    case 'long':
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    case 'datetime':
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'iso':
      return d.toISOString().split('T')[0];
    default:
      return d.toLocaleDateString('en-GB');
  }
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function firstDayOfMonthISO(): string {
  return new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = formatDate(startDate, 'short');
  const end = formatDate(endDate, 'short');
  if (start === end) return start;
  return `${start} \u2013 ${end}`;
}

export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatQty(n: number | null | undefined): string {
  const num = n ?? 0;
  if (isNaN(num)) return '0';
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
}

const MONEY_LOCALE = 'en-IN';

export function formatMoney(amount: number | null | undefined): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  const symbol = CURRENCY_SYMBOLS.BDT;
  const formatted = Math.round(num).toLocaleString(MONEY_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${symbol}${formatted}`;
}

export function formatMoneyDecimal(amount: number | null | undefined): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  const symbol = CURRENCY_SYMBOLS.BDT;
  const formatted = num.toLocaleString(MONEY_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}
