// ── Invoice templates ─────────────────────────────────────────────────────────
export { SalesOrderInvoiceA4 } from './SalesOrderInvoiceA4';
export { SalesOrderInvoiceThermal } from './SalesOrderInvoiceThermal';

export { PosOrderInvoiceA4 } from './PosOrderInvoiceA4';
export { PosOrderInvoiceThermal } from './PosOrderInvoiceThermal';
export type { PosOrderInvoiceThermalProps, PosInvoicePaperWidth, PosInvoiceCopyLabel } from './PosOrderInvoiceThermal';

export { PayReceiptA4 } from './PayReceiptA4';
export { PayReceiptThermal } from './PayReceiptThermal';

export { default as PurchaseOrderInvoice } from './PurchaseOrderInvoice';
export { default as PurchaseOrderThermal } from './PurchaseOrderThermal';

export { SalesReturnCreditNote, PosRefundCreditNote } from './CreditNote';
export { CreditNoteA4 } from './CreditNoteA4';
export { CreditNoteThermal } from './CreditNoteThermal';

// Purchase Return (Return to Vendor) — the debit note sent with returned goods.
export { DebitNoteA4 } from './DebitNoteA4';
export type { DebitNoteA4Props, DebitNoteCopyLabel } from './DebitNoteA4';
export { DebitNoteThermal } from './DebitNoteThermal';
export type { DebitNoteThermalProps, DebitNoteThermalPaperWidth } from './DebitNoteThermal';

// ── Shared utilities ──────────────────────────────────────────────────────────
export { fmt, fmtDateTime, buildQrUrl } from './shared';
export type { PayReceiptCommonProps, PrintOrderItem } from './shared';
