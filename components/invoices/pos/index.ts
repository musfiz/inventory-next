// POS invoice components — barrel export

export { PosOrderInvoiceThermal } from './PosOrderInvoiceThermal';
export type { PosOrderInvoiceThermalProps, PosInvoicePaperWidth, PosInvoiceCopyLabel } from './PosOrderInvoiceThermal';

export { PosOrderInvoiceA4 } from './PosOrderInvoiceA4';
export type { PosOrderInvoiceA4Props } from './PosOrderInvoiceA4';

export { PosOrderPrintMenu } from './PosOrderPrintMenu';

// Legacy export — keep existing callers working
export { default as PurchaseOrderPosInvoice } from './PurchaseOrderPosInvoice';
