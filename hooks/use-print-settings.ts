import { useTenantStore } from '@/stores/tenant-store';
import { normalizePaperSize } from '@/lib/print/utils';

/**
 * Derives the current print configuration from the Zustand tenant store.
 * Consumed by PrintMenu and domain-specific print wrappers so that every
 * print action automatically honours the tenant's settings without any
 * additional API calls.
 *
 * @example
 * const { defaultPrinterType, thermalPaperSize, isThermal } = usePrintSettings();
 * // Use isThermal to decide whether to auto-print thermally after a sale.
 */
export function usePrintSettings() {
  const { tenantSettings } = useTenantStore();

  const defaultPrinterType = (tenantSettings?.default_printer_type ?? 'a4') as 'a4' | 'thermal';
  const thermalPaperSize   = normalizePaperSize(tenantSettings?.thermal_paper_size);
  const directPrint        = tenantSettings?.default_printer_enabled ?? false;

  const receiptHeader    = tenantSettings?.pos_receipt_header  ?? '';
  const receiptFooter    = tenantSettings?.pos_receipt_footer  ?? '';
  const logoUrl          = tenantSettings?.logo_url            ?? null;
  const logoPosition     = (tenantSettings?.pos_logo_position  ?? 'top') as 'top' | 'bottom';
  const showTaxBreakdown = tenantSettings?.pos_show_tax_breakdown ?? true;

  return {
    /** 'a4' | 'thermal' — the tenant's preferred print format */
    defaultPrinterType,
    /** Normalised thermal paper width: '80mm' | '58mm' */
    thermalPaperSize,
    /** Convenience booleans */
    isA4:      defaultPrinterType === 'a4',
    isThermal: defaultPrinterType === 'thermal',
    /** Whether to skip the print dialog and print immediately */
    directPrint,
    /** POS receipt customisation */
    receiptHeader,
    receiptFooter,
    logoUrl,
    logoPosition,
    showTaxBreakdown,
  };
}
