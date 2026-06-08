import { notify } from '@/lib/notifications';
import { PRINT_STYLES } from './styles';

/**
 * Open a new browser window, inject the HTML from `ref.current.innerHTML`,
 * apply unified print styles, and trigger `window.print()`.
 *
 * @param ref        - React ref pointing to the hidden print-area div
 * @param paperSize  - CSS @page size value, e.g. "A4", "80mm auto", "58mm auto"
 * @param title      - Document title shown in the browser tab / print dialog
 */
export function openPrint(
  ref: React.RefObject<HTMLDivElement | null>,
  paperSize: string,
  title = 'Invoice',
): void {
  if (!ref.current) return;
  const html = ref.current.innerHTML;
  const win = window.open('', '_blank');
  if (!win) {
    notify.error('Pop-up blocked — please allow pop-ups to print invoices.');
    return;
  }
  win.document.write(
    `<!doctype html><html><head><title>${title}</title>` +
    `<style>${PRINT_STYLES}</style>` +
    `<style>@page{size:${paperSize};margin:0;}</style>` +
    `</head><body>${html}</body></html>`,
  );
  win.document.close();
  setTimeout(() => {
    win.focus();
    win.print();
    win.close();
  }, 250);
}

/**
 * Normalise the backend's thermal_paper_size value to a component-safe
 * width string.  The backend stores "53mm" and "58mm" interchangeably;
 * both map to "58mm".  Anything else (including undefined) defaults to
 * "80mm".
 */
export function normalizePaperSize(size?: string | null): '80mm' | '58mm' {
  if (size === '53mm' || size === '58mm') return '58mm';
  return '80mm';
}
