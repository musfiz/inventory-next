'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Barcode, ClipboardList, Minus, Package, Plus, Save, Trash2, X } from 'lucide-react';
import { ProductTreePanel } from '@/components/product-manage/product-tree';
import CustomSelect from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import { usePermissions } from '@/hooks/use-permissions';
import { notify } from '@/lib/notifications';
import { commonService } from '@/services';
import productVariationService from '@/services/productVariationService';
import { useProductVariations } from '@/services/queries/useProductVariations';
import { useAuthStore } from '@/stores/auth-store';

/** One row in the PO stock-entry list. UI-only until the receive-stock API is wired. */
interface EntryLine {
  key: string;
  variationId: string;
  productId: string;
  productName: string;
  variationName: string;
  sku: string;
  productCode: string | null;
  currentStock: number;
  qty: number;
}

function variationStockRows(v: any): any[] {
  if (Array.isArray(v?.stocks)) return v.stocks;
  if (v?.stock) return [v.stock];
  return [];
}

/** Warehouse-filtered on-hand qty; falls back to the summed total when no warehouse is picked. */
function stockQtyFor(v: any, warehouseId?: string | null): number {
  const rows = variationStockRows(v);
  if (rows.length === 0) return 0;
  if (warehouseId) {
    const row = rows.find(
      (s: any) =>
        String(s.warehouse_id ?? s.warehouse?.id ?? '') === String(warehouseId)
    );
    return row ? Number(row.quantity) || 0 : 0;
  }
  return rows.reduce((sum: number, s: any) => sum + (Number(s.quantity) || 0), 0);
}

export default function StockManagePage() {
  const router = useRouter();
  const { hasPermission, isSuperAdmin, isHydrated } = usePermissions();
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (isHydrated && !hasPermission('create-stock')) {
      router.push('/access-denied');
    }
  }, [hasPermission, isHydrated, router]);

  // ── Scope: business type (left tree). Tenant comes from the selected
  // product node — no separate tenant selector needed here. ────────────────
  const tenantBusinessTypeId = user?.tenant?.business_type?.id ?? null;
  const [businessTypeId, setBusinessTypeId] = useState<number | null>(null);
  const [treeTenantId, setTreeTenantId] = useState<string | null>(null);

  // ── Left tree selection ──────────────────────────────────────────────────
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // ── Entry context: warehouse + purchase order ────────────────────────────
  const [selectedWarehouse, setSelectedWarehouse] = useState<{ value: string; label: string } | null>(null);
  const [defaultWarehouseOptions, setDefaultWarehouseOptions] = useState<{ value: string; label: string }[]>([]);
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formErrors, setFormErrors] = useState<{ warehouse_id?: string; po_number?: string }>({});

  // ── Scanner + entry list ─────────────────────────────────────────────────
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [mergeDuplicates, setMergeDuplicates] = useState(true);
  const [lines, setLines] = useState<EntryLine[]>([]);
  const scanRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scanRef.current?.focus();
  }, []);

  // ── Warehouse options ────────────────────────────────────────────────────
  // Tenant scope comes from the left tree (product node → treeTenantId) for
  // super admin, or the logged-in user's own tenant otherwise.
  const effectiveTenantId = isSuperAdmin
    ? treeTenantId
    : user?.tenant_id
      ? String(user.tenant_id)
      : null;

  const tenantPickerNote = isSuperAdmin && !treeTenantId
    ? 'Select a tenant in the product tree to load warehouses'
    : 'Select warehouse';

  useEffect(() => {
    const prefetch = async () => {
      if (!effectiveTenantId) {
        setDefaultWarehouseOptions([]);
        return;
      }
      const list = await commonService
        .getWarehousesByTenant({ tenant_id: effectiveTenantId })
        .catch(() => []);
      setDefaultWarehouseOptions(
        (list || []).map((w: any) => ({ value: String(w.id), label: `${w.name} (${w.code})` }))
      );
    };
    if (isHydrated) void prefetch();
  }, [isHydrated, effectiveTenantId]);

  // Tenant scope changed (tree selection) — the old warehouse no longer applies.
  useEffect(() => {
    setSelectedWarehouse(null);
  }, [effectiveTenantId]);

  const loadWarehouseOptions = async (input: string) => {
    if (!effectiveTenantId) return [];
    const list = await commonService
      .getWarehousesByTenant({ search: input, tenant_id: effectiveTenantId })
      .catch(() => []);
    return (list || []).map((w: any) => ({ value: String(w.id), label: `${w.name} (${w.code})` }));
  };

  // ── Variations of the tree-selected product ──────────────────────────────
  const { data: selectedVariations = [], isLoading: loadingVariations } =
    useProductVariations(selectedProductId);

  const selectedProductName =
    (selectedVariations[0] as any)?.product?.name ?? '';

  // ── Entry list helpers ───────────────────────────────────────────────────
  const addOrMergeLine = (v: any, qtyToAdd = 1) => {
    const variationId = String(v.id);
    const currentStock = stockQtyFor(v, selectedWarehouse?.value);
    setLines(prev => {
      const existing = prev.find(l => l.variationId === variationId);
      if (existing && mergeDuplicates) {
        return prev.map(l =>
          l.variationId === variationId ? { ...l, qty: l.qty + qtyToAdd, currentStock } : l
        );
      }
      return [
        ...prev,
        {
          key: `${variationId}-${Date.now()}`,
          variationId,
          productId: String(v.product_id ?? v.product?.id ?? ''),
          productName: v.product?.name ?? selectedProductName ?? '—',
          variationName: v.name ?? '',
          sku: v.sku ?? '',
          productCode: v.product_code ?? null,
          currentStock,
          qty: qtyToAdd,
        },
      ];
    });
  };

  /** Barcode / product-code scan → resolve the variation, append to the list. */
  const handleScan = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = scanInput.trim();
    if (!code || scanning) return;
    setScanning(true);
    try {
      const res = await productVariationService.getVariations({ search: code, per_page: 10 });
      const items = Array.isArray(res) ? res : (res as any)?.data ?? [];
      const needle = code.toLowerCase();
      const match =
        items.find(
          (v: any) =>
            String(v.sku ?? '').toLowerCase() === needle ||
            String(v.product_code ?? '').toLowerCase() === needle
        ) ?? items[0];
      if (!match) {
        notify.error(`No variation found for "${code}"`);
        setLastScan(`No match for "${code}"`);
        return;
      }
      addOrMergeLine(match, 1);
      setLastScan(`Added ${match.sku ?? match.name ?? code}`);
      setScanInput('');
    } catch {
      notify.error('Scan lookup failed');
    } finally {
      setScanning(false);
      scanRef.current?.focus();
    }
  };

  const setLineQty = (key: string, qty: number) => {
    const safe = Number.isNaN(qty) ? 0 : Math.max(0, Math.floor(qty));
    setLines(prev => prev.map(l => (l.key === key ? { ...l, qty: safe } : l)));
  };

  const removeLine = (key: string) => setLines(prev => prev.filter(l => l.key !== key));
  const clearLines = () => {
    setLines([]);
    setLastScan(null);
  };

  const totalQty = useMemo(() => lines.reduce((sum, l) => sum + (Number(l.qty) || 0), 0), [lines]);

  // Refresh the snapshot of on-hand stock shown per line when the warehouse changes.
  useEffect(() => {
    if (lines.length === 0) return;
    setLines(prev =>
      prev.map(l => {
        const v = (selectedVariations as any[]).find(x => String(x.id) === l.variationId);
        return v ? { ...l, currentStock: stockQtyFor(v, selectedWarehouse?.value) } : l;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWarehouse?.value]);

  // ── Mock save (UI/UX only — receive-stock API wiring comes later) ────────
  const handleSave = () => {
    const errors: typeof formErrors = {};
    if (!selectedWarehouse) errors.warehouse_id = 'Warehouse is required';
    if (!poNumber.trim()) errors.po_number = 'PO number is required';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const active = lines.filter(l => Number(l.qty) > 0);
    if (active.length === 0) {
      notify.error('Scan or add at least one item with quantity > 0');
      return;
    }
    // Payload shape the future receive-stock endpoint will accept.
    const payload = {
      warehouse_id: selectedWarehouse!.value,
      po_number: poNumber.trim(),
      po_date: poDate,
      items: active.map(l => ({
        product_id: l.productId,
        variation_id: l.variationId,
        quantity: Number(l.qty),
      })),
    };
    console.log('[stock/manage] entry payload (preview, not sent):', payload);
    notify.success(
      `Stock entry ready: ${active.length} line(s), ${totalQty} unit(s) → ${selectedWarehouse!.label} / PO ${poNumber.trim()}`
    );
  };

  const payloadPreview = useMemo(
    () =>
      JSON.stringify(
        {
          warehouse_id: selectedWarehouse?.value ?? null,
          po_number: poNumber || null,
          po_date: poDate,
          items: lines.map(l => ({
            product_id: l.productId,
            variation_id: l.variationId,
            quantity: Number(l.qty) || 0,
          })),
        },
        null,
        2
      ),
    [selectedWarehouse, poNumber, poDate, lines]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Stock Entry
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">
            Purchase order receiving · scan product code → set quantity
          </span>
        </h1>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
            UI preview — save does not post yet
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-2 items-start">
        {/* Left: product tree (products → variations with stock qty) */}
        <div className="lg:sticky lg:top-2 lg:h-[calc(100vh-120px)] lg:overflow-hidden h-130">
          <ProductTreePanel
            businessTypeId={isSuperAdmin ? businessTypeId : tenantBusinessTypeId}
            onBusinessTypeChange={setBusinessTypeId}
            tenantId={treeTenantId}
            onTenantChange={setTreeTenantId}
            selectedProductId={selectedProductId}
            onSelectProduct={setSelectedProductId}
            onAddProduct={() => undefined}
            canCreate={false}
          />
        </div>

        {/* Right: entry panel */}
        <div className="min-h-105 lg:h-[calc(100vh-120px)] lg:overflow-y-auto flex flex-col gap-2">
          {/* Entry context: warehouse + PO (tenant comes from the product tree) */}
          <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Warehouse <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={selectedWarehouse}
                  onChange={(o: any) => {
                    setSelectedWarehouse(o);
                    if (o?.value && formErrors.warehouse_id) {
                      const { warehouse_id, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  loadOptions={loadWarehouseOptions}
                  defaultOptions={defaultWarehouseOptions}
                  placeholder={tenantPickerNote}
                  isDisabled={!effectiveTenantId}
                  isInvalid={!!formErrors.warehouse_id}
                  compact
                />
                {formErrors.warehouse_id && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.warehouse_id}</p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                  PO Number <span className="text-red-500">*</span>
                </label>
                <input
                  value={poNumber}
                  onChange={e => setPoNumber(e.target.value)}
                  placeholder="e.g. PO-2026-0001"
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {formErrors.po_number && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.po_number}</p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">PO Date</label>
                <CustomDatePicker
                  value={poDate}
                  onChange={setPoDate}
                />
              </div>
            </div>
          </div>

          {/* Scanner */}
          <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-3">
            <form onSubmit={handleScan} className="flex items-stretch gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={scanRef}
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  placeholder="Scan barcode / type SKU or product code, then Enter"
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                {scanInput && (
                  <button
                    type="button"
                    onClick={() => setScanInput('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400"
                    title="Clear"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={scanning}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded font-medium transition-colors"
              >
                {scanning ? 'Adding…' : 'Add'}
              </button>
            </form>
            <div className="mt-1.5 flex items-center justify-between flex-wrap gap-2">
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {lastScan ?? 'Scanner acts as keyboard — focus stays here after each scan.'}
              </p>
              <label className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mergeDuplicates}
                  onChange={e => setMergeDuplicates(e.target.checked)}
                  className="w-3.5 h-3.5"
                />
                Re-scan same item adds quantity
              </label>
            </div>
          </div>

          {/* Variations of the tree-selected product */}
          {selectedProductId && (
            <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-indigo-500" />
                  {selectedProductName || 'Selected product'}
                  <span className="text-xs font-normal text-gray-500">· click + to add a line</span>
                </h3>
                <button
                  onClick={() => setSelectedProductId(null)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
                  title="Clear selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {loadingVariations ? (
                <p className="text-xs text-gray-500 py-2">Loading variations…</p>
              ) : selectedVariations.length === 0 ? (
                <p className="text-xs text-gray-500 py-2">No variations for this product.</p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700/60 max-h-56 overflow-y-auto">
                  {selectedVariations.map((v: any) => {
                    const qty = stockQtyFor(v, selectedWarehouse?.value);
                    return (
                      <li key={String(v.id)} className="flex items-center gap-2 py-1.5 text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="font-mono font-medium text-gray-900 dark:text-gray-100">{v.sku}</span>
                          {v.name && <span className="text-gray-500 dark:text-gray-400"> · {v.name}</span>}
                          {v.product_code && (
                            <span className="block text-[11px] text-gray-400 font-mono">{v.product_code}</span>
                          )}
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${qty === 0
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : qty <= 10
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}
                        >
                          Stock: {qty}
                        </span>
                        <button
                          onClick={() => {
                            addOrMergeLine(v, 1);
                            setLastScan(`Added ${v.sku ?? v.name ?? ''}`);
                          }}
                          className="p-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                          title={`Add ${v.sku} to entry list`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Entry list */}
          <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-3 flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Entry Items
                <span className="ml-1.5 text-xs font-normal text-gray-500">
                  {lines.length} line(s) · {totalQty} unit(s)
                </span>
              </h3>
              {lines.length > 0 && (
                <button
                  onClick={clearLines}
                  className="text-[11px] px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Clear all
                </button>
              )}
            </div>

            {lines.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-gray-300 dark:border-gray-600 rounded">
                <Barcode className="w-6 h-6 mx-auto text-gray-300 dark:text-gray-600 mb-1.5" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Nothing here yet — scan a product code above or pick a product from the tree and press +.
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-gray-600 rounded overflow-hidden">
                <div className="overflow-x-auto max-h-[40vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-2 text-left text-[11px] font-semibold text-gray-700 dark:text-gray-300 w-10">#</th>
                        <th className="px-2 py-2 text-left text-[11px] font-semibold text-gray-700 dark:text-gray-300 min-w-[220px]">Product / Variation</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold text-gray-700 dark:text-gray-300 w-24">On hand</th>
                        <th className="px-2 py-2 text-left text-[11px] font-semibold text-gray-700 dark:text-gray-300 w-44">Quantity</th>
                        <th className="px-2 py-2 w-12" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                      {lines.map((l, idx) => (
                        <tr key={l.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                          <td className="px-2 py-1.5 text-gray-500 text-xs">{idx + 1}</td>
                          <td className="px-2 py-1.5">
                            <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{l.productName}</div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              <span className="font-mono">{l.sku}</span>
                              {l.variationName && ` · ${l.variationName}`}
                            </div>
                            {l.productCode && (
                              <div className="text-[11px] text-gray-400 font-mono">{l.productCode}</div>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {l.currentStock}
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setLineQty(l.key, l.qty - 1)}
                                className="p-1 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="Decrease"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={l.qty}
                                onChange={e => setLineQty(l.key, Number(e.target.value))}
                                onFocus={e => e.target.select()}
                                className="w-16 px-2 py-1 text-right text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                              />
                              <button
                                onClick={() => setLineQty(l.key, l.qty + 1)}
                                className="p-1 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="Increase"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              onClick={() => removeLine(l.key)}
                              className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Remove line"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-700/60">
                      <tr>
                        <td colSpan={3} className="px-2 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Total
                        </td>
                        <td className="px-2 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {totalQty} unit(s)
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium transition-colors"
              >
                <Save className="w-4 h-4" /> Save Entry
              </button>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {selectedWarehouse ? selectedWarehouse.label : 'No warehouse'} · {poNumber ? `PO ${poNumber}` : 'No PO'}
              </span>
            </div>

            {/* Payload preview for the future backend wiring */}
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                Payload preview (what the receive-stock API will accept)
              </summary>
              <pre className="mt-1 p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-x-auto text-[11px] text-gray-700 dark:text-gray-300">
                {payloadPreview}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
