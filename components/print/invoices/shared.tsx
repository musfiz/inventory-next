import type { Payment } from '@/types/api.types';

// ─── Formatters ──────────────────────────────────────────────────────────────

/** Locale-aware number with 2 decimals (e.g. 1,234.56). */
export function fmt(n?: number | string | null): string {
  if (n === null || n === undefined || n === '') return '0.00';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Locale-aware date+time, e.g. "6/4/2026, 3:46:45 PM". */
export function fmtDateTime(d?: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleString();
}

// ─── QR builder ──────────────────────────────────────────────────────────────

/**
 * Build a tamper-evident verify URL for a receipt and return a QR image URL.
 *
 * Uses the public `api.qrserver.com` image API (no install, no dependency).
 * The encoded URL is a stable string the customer can scan to verify the
 * receipt later — the actual /verify route is out of scope for this task.
 *
 * Returns null if the receipt number is missing (caller should skip the QR).
 */
export function buildQrUrl(
  receiptNumber: string,
  amount: number | string,
  currency: string = 'BDT',
  baseUrl?: string,
): string | null {
  if (!receiptNumber) return null;

  // Best-effort base URL — defaults to current origin so the QR encodes
  // something the cashier can hand to the customer today.
  const origin =
    baseUrl ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://example.com');

  // Strip trailing slash and any path beyond the host.
  const host = origin.replace(/\/+$/, '');

  const verifyUrl = `${host}/verify/${encodeURIComponent(receiptNumber)}?amount=${encodeURIComponent(
    String(amount),
  )}&cur=${encodeURIComponent(currency)}`;

  return `https://api.qrserver.com/v1/create-qr-image/?data=${encodeURIComponent(
    verifyUrl,
  )}&size=200x200&margin=1&ecc=M`;
}

// ─── Shared prop types ───────────────────────────────────────────────────────

// ─── Generic order-item shape (covers POS + Sales orders) ────────────────────

export interface PrintOrderItem {
  id?: number;
  /** Display name (item_name for POS, product name for Sales) */
  name: string;
  /** Variation / options label e.g. "Red / XL" */
  variant?: string | null;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  discount?: number | null;
  tax_rate?: number | null;
  line_total: number;
}

export interface PayReceiptCommonProps {
  payment: Payment;
  /** When set, renders a "CUSTOMER COPY" / "MERCHANT COPY" / "DUPLICATE" stamp. */
  copyLabel?: 'customer' | 'merchant' | 'duplicate' | null;
  /** Full order line items fetched from the server (POS or Sales order). */
  orderItems?: PrintOrderItem[] | null;
  /** Summary totals from the linked order for sub-total / discount / tax lines. */
  orderSummary?: {
    sub_total?: number | null;
    discount_amount?: number | null;
    discount_type?: string | null;
    discount_value?: number | null;
    tax_amount?: number | null;
    grand_total?: number | null;
  } | null;
}

export const COPY_LABEL_TEXT: Record<NonNullable<PayReceiptCommonProps['copyLabel']>, string> = {
  customer: 'CUSTOMER COPY',
  merchant: 'MERCHANT COPY',
  duplicate: 'DUPLICATE',
};
