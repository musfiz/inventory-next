'use client';

import { useState } from 'react';
import { Printer, Loader2 } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { notify } from '@/lib/notifications';
import barcodeService from '@/services/barcodeService';
import type { ProductBarcode } from '@/services/barcodeService';

const PRINT_STYLES = `
  @page { size: A4; margin: 5mm; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: avoid; }
  .sticker-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3mm;
    padding: 3mm;
  }
  .sticker {
    border: 1px dashed #bbb;
    padding: 3mm;
    text-align: center;
    page-break-inside: avoid;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 64mm;
  }
  .sticker-barcode-value {
    font-size: 9px;
    margin-top: 1.5mm;
    color: #444;
    font-family: "Courier New", monospace;
    letter-spacing: 0.5px;
  }
  @media print {
    .sticker { border: none; }
  }
`;

function generateBarcodeSVG(value: string, format: 'EAN13' | 'CODE128'): string | null {
  const container = document.createElement('div');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  container.appendChild(svg);
  document.body.appendChild(container);
  try {
    JsBarcode(svg, value, {
      format,
      width: 1.5,
      height: 40,
      displayValue: false,
      margin: 0,
      background: '#ffffff',
    });
    return svg.outerHTML;
  } catch {
    return null;
  } finally {
    document.body.removeChild(container);
  }
}

interface BarcodeStickerPrintProps {
  productId?: string | number;
  productName?: string;
  /** If provided, print this single barcode directly (no API fetch) */
  barcodeData?: ProductBarcode;
  onComplete?: () => void;
}

const STICKERS_PER_PAGE = 12; // 3 cols × 4 rows

export function BarcodeStickerPrint({
  productId,
  productName,
  barcodeData,
  onComplete,
}: BarcodeStickerPrintProps) {
  const [loading, setLoading] = useState(false);

  function buildStickerHtml(list: ProductBarcode[]): string {
    const all: string[] = [];

    for (const bc of list) {
      const fmt = bc.type === 'EAN13' ? 'EAN13' : 'CODE128';
      const svg = generateBarcodeSVG(bc.barcode, fmt);
      all.push(`
        <div class="sticker">
          ${svg ?? ''}
          <div class="sticker-barcode-value">${escapeHtml(bc.barcode)}</div>
        </div>
      `);
    }

    // Split into pages of STICKERS_PER_PAGE
    const pages: string[] = [];
    for (let i = 0; i < all.length; i += STICKERS_PER_PAGE) {
      const chunk = all.slice(i, i + STICKERS_PER_PAGE);
      pages.push(`<div class="page"><div class="sticker-grid">${chunk.join('')}</div></div>`);
    }

    return pages.join('\n');
  }

  function openPrintWindow(htmlBody: string, title: string) {
    const html = `
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>${PRINT_STYLES}</style>
        </head>
        <body>${htmlBody}</body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (!win) {
      notify.error('Pop-up blocked \u2014 please allow pop-ups to print.');
      return false;
    }
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
      win.close();
    }, 300);
    return true;
  }

  const handlePrint = async () => {
    // ── barcodeData mode: print 12 copies of the single barcode ──
    if (barcodeData) {
      const copies: ProductBarcode[] = Array.from({ length: STICKERS_PER_PAGE }, () => barcodeData);
      const body = buildStickerHtml(copies);
      openPrintWindow(body, `Barcode Stickers \u2013 ${productName ?? ''}`);
      onComplete?.();
      return;
    }

    // ── productId mode: fetch all barcodes for the product ──
    if (!productId) return;

    setLoading(true);
    try {
      let list = await barcodeService.getBarcodes(productId);

      if (list.length === 0) {
        try {
          await barcodeService.generateBulkBarcodes({
            product_id: String(productId),
            type: 'CODE128',
          });
          list = await barcodeService.getBarcodes(productId);
        } catch (genErr: any) {
          notify.error(genErr?.response?.data?.message || 'Failed to generate barcodes');
          setLoading(false);
          onComplete?.();
          return;
        }
      }

      if (list.length === 0) {
        notify.error('No barcodes found for this product');
        setLoading(false);
        onComplete?.();
        return;
      }

      const body = buildStickerHtml(list);
      openPrintWindow(body, `Barcode Stickers \u2013 ${productName ?? ''}`);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to load barcodes');
    } finally {
      setLoading(false);
      onComplete?.();
    }
  };

  return (
    <button
      onClick={handlePrint}
      disabled={loading}
      title="Print Barcode Stickers"
      aria-label="Print Barcode Stickers"
      className="p-1 rounded text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 cursor-pointer disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Printer className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

export default BarcodeStickerPrint;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
