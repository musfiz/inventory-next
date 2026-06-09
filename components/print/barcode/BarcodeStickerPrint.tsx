'use client';

import { useState, useMemo } from 'react';
import { Printer, Loader2 } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { notify } from '@/lib/notifications';
import barcodeService from '@/services/barcodeService';
import type { ProductBarcode } from '@/services/barcodeService';
import { useTenantStore } from '@/stores/tenant-store';

function buildPrintStyles(settings: {
  printType: 'a4' | 'thermal';
  columns: number;
  labelWidth: string;
  labelHeight: string;
  thermalPaperSize: string;
}): string {
  const { printType, columns, labelWidth, labelHeight, thermalPaperSize } = settings;

  const pageSize = printType === 'thermal' ? `${thermalPaperSize} 297mm` : 'A4';
  const pageMargin = printType === 'thermal' ? '2mm' : '5mm';

  return `
    @page { size: ${pageSize}; margin: ${pageMargin}; }
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
      grid-template-columns: repeat(${columns}, 1fr);
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
      max-width: ${labelWidth};
      min-height: ${labelHeight};
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
}

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
  /** Force POS/thermal printing mode, ignoring barcode_print_type setting */
  posMode?: boolean;
  onComplete?: () => void;
}

export function BarcodeStickerPrint({
  productId,
  productName,
  barcodeData,
  posMode = false,
  onComplete,
}: BarcodeStickerPrintProps) {
  const [loading, setLoading] = useState(false);
  const { tenantSettings } = useTenantStore();

  const barcodePrintType = posMode
    ? 'thermal'
    : (tenantSettings?.barcode_print_type ?? 'a4') as 'a4' | 'thermal';
  const barcodeColumns = tenantSettings?.barcode_columns ?? 2;
  const barcodeLabelWidth = tenantSettings?.barcode_label_width ?? '50mm';
  const barcodeLabelHeight = tenantSettings?.barcode_label_height ?? '25mm';
  const thermalPaperSize = posMode
    ? (tenantSettings?.barcode_paper_size ?? '80mm')
    : (tenantSettings?.thermal_paper_size ?? '58mm');

  const printStyles = useMemo(() => buildPrintStyles({
    printType: barcodePrintType,
    columns: barcodeColumns,
    labelWidth: barcodeLabelWidth,
    labelHeight: barcodeLabelHeight,
    thermalPaperSize,
  }), [barcodePrintType, barcodeColumns, barcodeLabelWidth, barcodeLabelHeight, thermalPaperSize]);

  function buildStickerHtml(list: ProductBarcode[], perPage: number): string {
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

    const pages: string[] = [];
    for (let i = 0; i < all.length; i += perPage) {
      const chunk = all.slice(i, i + perPage);
      pages.push(`<div class="page"><div class="sticker-grid">${chunk.join('')}</div></div>`);
    }

    return pages.join('\n');
  }

  function openPrintWindow(htmlBody: string, styles: string, title: string) {
    const html = `
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>${styles}</style>
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
    // Read fresh settings from store on every print
    const { tenantSettings: ts } = useTenantStore.getState();
    const cols = ts?.barcode_columns ?? barcodeColumns;
    const lw = ts?.barcode_label_width ?? barcodeLabelWidth;
    const lh = ts?.barcode_label_height ?? barcodeLabelHeight;
    const pt = posMode ? 'thermal' : (ts?.barcode_print_type ?? barcodePrintType) as 'a4' | 'thermal';
    const ps = posMode
      ? (ts?.barcode_paper_size ?? '80mm')
      : (ts?.thermal_paper_size ?? thermalPaperSize);

    const ss = buildPrintStyles({ printType: pt, columns: cols, labelWidth: lw, labelHeight: lh, thermalPaperSize: ps });
    const perPage = cols * 4;

    // ── barcodeData mode: print copies of the single barcode ──
    if (barcodeData) {
      const copies: ProductBarcode[] = Array.from({ length: perPage }, () => barcodeData);
      const body = buildStickerHtml(copies, perPage);
      openPrintWindow(body, ss, `Barcode Stickers \u2013 ${productName ?? ''}`);
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

      const body = buildStickerHtml(list, perPage);
      openPrintWindow(body, ss, `Barcode Stickers \u2013 ${productName ?? ''}`);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to load barcodes');
    } finally {
      setLoading(false);
      onComplete?.();
    }
  };

  const btnTitle = posMode ? 'POS Print Barcode Sticker' : 'Print Barcode Stickers';
  const btnClass = posMode
    ? 'p-1 rounded text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 cursor-pointer disabled:opacity-50'
    : 'p-1 rounded text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 cursor-pointer disabled:opacity-50';

  return (
    <button
      onClick={handlePrint}
      disabled={loading}
      title={btnTitle}
      aria-label={btnTitle}
      className={btnClass}
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
