// Compatibility re-export. The original PayReceipt.tsx lived at
// components/invoices/PayReceipt.tsx and was a single A4 template.
// It has been split into components/invoices/pay-receipt/ to make
// room for thermal (80mm/58mm) variants without changing the public
// import path. Existing callers that `import { PayReceipt } from
// '@/components/invoices/PayReceipt'` continue to work; they get the
// same A4 component.

export { PayReceiptA4 as PayReceipt } from './pay-receipt/PayReceiptA4';
export { PayReceiptA4 } from './pay-receipt/PayReceiptA4';
export type { PayReceiptCommonProps } from './pay-receipt/shared';
