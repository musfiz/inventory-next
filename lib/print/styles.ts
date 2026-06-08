/**
 * Single source-of-truth CSS injected into every print window.
 * Covers both A4 (.invoice-content) and thermal (.pos-invoice-content) layouts.
 */
export const PRINT_STYLES = `
  /* ── Page setup ─────────────────────────────────────────────────────── */
  @page { margin: 0; }

  /* ── Base reset ──────────────────────────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: #fff;
    color: #1a1a2e;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body { font-family: 'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif; }
  img  { display: block; max-width: 100%; }
  table { border-collapse: collapse; }

  /* ── A4 wrapper (.invoice-content) ──────────────────────────────────── */
  .invoice-content {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 14mm 16mm;
    background: #fff;
    position: relative;
    overflow: hidden;
  }

  /* ── Thermal wrapper (.pos-invoice-content) ──────────────────────────── */
  .pos-invoice-content {
    margin: 0 auto;
    background: #fff;
    padding: 6mm 4mm;
  }

  /* ── Print media helpers ─────────────────────────────────────────────── */
  @media print {
    html, body { background: #fff !important; }
    table, tr, td, th { page-break-inside: avoid; }
  }
`;
