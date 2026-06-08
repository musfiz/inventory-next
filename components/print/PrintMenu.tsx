'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Loader2, Printer, X } from 'lucide-react';
import { openPrint } from '@/lib/print/utils';
import { usePrintSettings } from '@/hooks/use-print-settings';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CopyLabel = 'customer' | 'merchant' | 'duplicate';

export interface PrintMenuProps {
  /**
   * Render the A4 invoice template.
   * Called on every render so it always reflects the latest data state.
   */
  renderA4: () => React.ReactNode;
  /**
   * Render the thermal template for a given paper width and copy label.
   */
  renderThermal: (width: '80mm' | '58mm', copyLabel: CopyLabel) => React.ReactNode;
  /**
   * Optional async callback called once before the first print of each
   * session. Use it to lazy-load the full document detail. Return false
   * (or throw) to abort the print.
   */
  ensureData?: () => Promise<boolean>;
  /**
   * When true, triggers a thermal print on mount (post-sale auto-print).
   */
  autoThermal?: boolean;
  /**
   * Hard-override the thermal paper size (e.g., from a payment API
   * response). Falls back to the tenant store setting when omitted.
   */
  paperSizeOverride?: '80mm' | '58mm';
  /**
   * Show a paper-width + copy-type picker modal before thermal printing.
   * Useful for payment receipts where the cashier picks the copy type.
   */
  withCopyModal?: boolean;
  /** Propagate a loading state from the parent (shows spinner overlay). */
  loading?: boolean;
  /** Document title injected into the print window's <title>. */
  documentTitle?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Unified, store-aware print action buttons.
 *
 * Architecture:
 *  - All print window mechanics (openPrint, PRINT_STYLES) live in lib/print/.
 *  - Printer type and paper size defaults come from usePrintSettings()
 *    which reads the Zustand tenant store (auto-synced for tenant users,
 *    manually set by super-admins via the profile page).
 *  - Three hidden divs (A4 / 80mm / 58mm) are always mounted so React
 *    refs stay valid when openPrint captures `.innerHTML`.
 *
 * Usage:
 * ```tsx
 * <PrintMenu
 *   documentTitle="Sales Order Invoice"
 *   renderA4={() => <SalesOrderInvoiceA4 order={data} />}
 *   renderThermal={(w, cl) => <SalesOrderInvoiceThermal order={data} width={w} copyLabel={cl} />}
 *   ensureData={loadFullDetail}
 * />
 * ```
 */
export function PrintMenu({
  renderA4,
  renderThermal,
  ensureData,
  autoThermal = false,
  paperSizeOverride,
  withCopyModal = false,
  loading: parentLoading = false,
  documentTitle = 'Invoice',
}: PrintMenuProps) {
  const { thermalPaperSize } = usePrintSettings();

  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copyLabel, setCopyLabel] = useState<CopyLabel>('customer');

  const a4Ref  = useRef<HTMLDivElement>(null);
  const t80Ref = useRef<HTMLDivElement>(null);
  const t58Ref = useRef<HTMLDivElement>(null);

  const isLoading = busy || parentLoading;

  // ── Helpers ──────────────────────────────────────────────────────────────

  const prepare = async (): Promise<boolean> => {
    if (!ensureData) return true;
    setBusy(true);
    try {
      return await ensureData();
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  };

  const resolvedPaperSize = paperSizeOverride ?? thermalPaperSize;

  const doPrint = (width: '80mm' | '58mm') => {
    const ref = width === '80mm' ? t80Ref : t58Ref;
    setTimeout(() => openPrint(ref, `${width} auto`, documentTitle), 80);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleA4 = async () => {
    const ok = await prepare();
    if (!ok) return;
    setTimeout(() => openPrint(a4Ref, 'A4', documentTitle), 80);
  };

  const handleThermal = async (width?: '80mm' | '58mm') => {
    const ok = await prepare();
    if (!ok) return;
    doPrint(width ?? resolvedPaperSize);
  };

  const handleThermalClick = () => {
    if (withCopyModal) {
      setShowModal(true);
    } else {
      void handleThermal();
    }
  };

  // ── Auto-print on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!autoThermal) return;
    const timer = setTimeout(() => void handleThermal(resolvedPaperSize), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoThermal, resolvedPaperSize]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Action buttons ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        {/* A4 */}
        <button
          onClick={handleA4}
          disabled={isLoading}
          title={`Print A4 ${documentTitle}`}
          aria-label={`Print A4 ${documentTitle}`}
          className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer disabled:opacity-50 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
        </button>

        {/* Thermal */}
        <button
          onClick={handleThermalClick}
          disabled={isLoading}
          title={`Print Thermal ${documentTitle}`}
          aria-label={`Print Thermal ${documentTitle}`}
          className="p-1 rounded text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 cursor-pointer disabled:opacity-50 transition-colors"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>

      {/* ── Hidden print areas (always mounted for stable refs) ─────────── */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <div ref={a4Ref}>{renderA4()}</div>
        <div ref={t80Ref}>{renderThermal('80mm', copyLabel)}</div>
        <div ref={t58Ref}>{renderThermal('58mm', copyLabel)}</div>
      </div>

      {/* ── Copy-type + width modal (pay receipt, optional) ─────────────── */}
      {withCopyModal && showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Thermal receipt options"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Thermal Receipt
            </h3>

            {/* Copy type */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Copy Type
              </label>
              <div className="flex gap-2">
                {(['customer', 'merchant', 'duplicate'] as CopyLabel[]).map(lbl => (
                  <button
                    key={lbl}
                    onClick={() => setCopyLabel(lbl)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                      copyLabel === lbl
                        ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                        : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-400'
                    }`}
                  >
                    {lbl.charAt(0).toUpperCase() + lbl.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Paper width */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Paper Width
              </label>
              <div className="flex gap-2">
                {(['80mm', '58mm'] as const).map(w => (
                  <button
                    key={w}
                    onClick={() => {
                      setShowModal(false);
                      void handleThermal(w);
                    }}
                    className="flex-1 py-2 rounded-md border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
