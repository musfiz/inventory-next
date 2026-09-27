'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { Barcode, ClipboardList, Minus, Package, Plus, Save, Trash2, X } from 'lucide-react';
import { ProductTreePanel } from '@/components/product-manage/product-tree';
import CustomSelect from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { notify } from '@/lib/notifications';
import productVariationService from '@/services/productVariationService';
import { purchaseOrderService, supplierService, commonService } from '@/services';
import { useProductVariations } from '@/services/queries/useProductVariations';
import { useAuthStore } from '@/stores/auth-store';

/** One row in the purchase entry list. */
interface EntryLine {
  key: string;
  variationId: string;
  productId: string;
  productName: string;
  variationName: string;
  brand: string;
  sku: string;
  productCode: string | null;
  currentStock: number;
  costPrice: number;
  qty: number;
}

type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

const STATUS_LIST = [
  'draft', 'pending', 'approved', 'ordered',
  'partial', 'received', 'completed', 'cancelled',
];

const PAYMENT_STATUS_LIST: { value: PaymentStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

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

export default function PurchaseManagePage() {
  const { isSuperAdmin, hasPermission, isHydrated } = usePermissions();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null;

  // Persist business type & tenant selections in localStorage so they
  // survive page refreshes — user picks them once, they stay.
  const STORAGE_KEY_BT = 'purchase-manage-business-type-id';
  const STORAGE_KEY_TENANT = 'purchase-manage-tenant-id';
  // Legacy keys from the old /stock/manage route — read once so existing
  // users keep their persisted selections after the move.
  const LEGACY_KEY_BT = 'stock-manage-business-type-id';
  const LEGACY_KEY_TENANT = 'stock-manage-tenant-id';

  const isStaleBusinessTypeId = (v: string) => /^\d+$/.test(v) && !/^[0-9a-f]{8}-/i.test(v);
  const readStored = (key: string, legacyKey?: string): string | null => {
    try {
      const raw = localStorage.getItem(key) ?? (legacyKey ? localStorage.getItem(legacyKey) : null);
      // Clear stale pre-UUID numeric business-type ids (e.g. "14") that now 404 on GET /business-types/{id}
      if (raw !== null && key.includes('business-type') && isStaleBusinessTypeId(raw)) {
        try { localStorage.removeItem(key); if (legacyKey) localStorage.removeItem(legacyKey); } catch {}
        return null;
      }
      return raw;
    } catch { return null; }
  };

  const [businessTypeId, setBusinessTypeId] = useState<string | number | null>(() => {
    const stored = readStored(STORAGE_KEY_BT, LEGACY_KEY_BT);
    return stored !== null ? stored : null;
  });
  const [treeTenantId, setTreeTenantId] = useState<string | null>(() => {
    return readStored(STORAGE_KEY_TENANT, LEGACY_KEY_TENANT);
  });

  const persistedSetBusinessTypeId = (id: string | number | null) => {
    setBusinessTypeId(id ? String(id) : null);
    try {
      if (id !== null) localStorage.setItem(STORAGE_KEY_BT, String(id));
      else localStorage.removeItem(STORAGE_KEY_BT);
    } catch { }
  };

  const persistedSetTreeTenantId = (id: string | null) => {
    setTreeTenantId(id);
    try {
      if (id !== null) localStorage.setItem(STORAGE_KEY_TENANT, id);
      else localStorage.removeItem(STORAGE_KEY_TENANT);
    } catch { }
  };

  // ── Left tree selection ──────────────────────────────────────────────────
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // ── Header fields (purchase-order/add style) ─────────────────────────────
  const [selectedSupplier, setSelectedSupplier] = useState<{ value: string; label: string } | null>(null);
  const [supplierDefaults, setSupplierDefaults] = useState<{ value: string; label: string }[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<{ value: string; label: string } | null>(null);
  const [defaultWarehouseOptions, setDefaultWarehouseOptions] = useState<{ value: string; label: string }[]>([]);
  const [supplierOrderNo, setSupplierOrderNo] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [status, setStatus] = useState('draft');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

  useEffect(() => {
    if (isHydrated && !hasPermission('create-purchase-order')) {
      router.push('/access-denied');
    }
  }, [hasPermission, isHydrated, router]);

  // ── Tenant + supplier + warehouse options ────────────────────────────────
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

  // Tenant scope changed (tree selection) — the old warehouse no longer applies.
  useEffect(() => {
    requestAnimationFrame(() => setSelectedWarehouse(null));
  }, [effectiveTenantId]);

  const loadWarehouseOptions = async (input: string) => {
    if (!effectiveTenantId) return [];
    const list = await commonService
      .getWarehousesByTenant({ search: input, tenant_id: effectiveTenantId })
      .catch(() => []);
    return (list || []).map((w: any) => ({ value: String(w.id), label: `${w.name} (${w.code})` }));
  };

  // Warehouses — SWR cached (dedupes StrictMode double-mount and tenant toggle). Single source for default list.
  const { data: warehousesData } = useSWR(
    isHydrated && effectiveTenantId ? (['warehouses', effectiveTenantId] as const) : null,
    () => commonService.getWarehousesByTenant({ tenant_id: effectiveTenantId! }).catch(() => []),
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );
  useEffect(() => {
    if (isSuperAdmin && !effectiveTenantId) {
      setDefaultWarehouseOptions([]);
      return;
    }
    if (!effectiveTenantId) return;
    if (warehousesData) {
      setDefaultWarehouseOptions(
        (warehousesData || []).map((w: any) => ({ value: String(w.id), label: `${w.name} (${w.code})` }))
      );
    }
  }, [warehousesData, effectiveTenantId, isSuperAdmin]);

  // Suppliers — SWR cached to avoid duplicate calls; tenant-scoped.
  const { data: suppliersData } = useSWR(
    isHydrated && effectiveTenantId ? (['suppliers', effectiveTenantId] as const) : null,
    () => supplierService.getSuppliers({ per_page: 50, tenant_id: effectiveTenantId! }).catch(() => []),
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  );
  useEffect(() => {
    if (!isHydrated) return;
    if (isSuperAdmin && !effectiveTenantId) {
      setSupplierDefaults([]);
      setSelectedSupplier(prev => (prev ? null : prev));
      return;
    }
    if (!effectiveTenantId || !suppliersData) return;
    const list = Array.isArray(suppliersData) ? suppliersData : (suppliersData as any)?.data || suppliersData || [];
    const opts = (Array.isArray(list) ? list : []).map((su: any) => ({
      value: String(su.id), label: su.name || su.company_name || su.id,
    }));
    setSupplierDefaults(opts);
    setSelectedSupplier(prev => (prev && !opts.some(o => String(o.value) === String(prev.value)) ? null : prev));
  }, [isHydrated, effectiveTenantId, isSuperAdmin, suppliersData]);

  const loadSuppliers = async (search = '') => {
    try {
      if (isSuperAdmin && !effectiveTenantId) return [];
      const params: any = { search, per_page: 50 };
      if (effectiveTenantId) params.tenant_id = effectiveTenantId;
      const data: any = await supplierService.getSuppliers(params);
      const list = Array.isArray(data) ? data : (data?.data || data || []);
      return (Array.isArray(list) ? list : []).map((s: any) => ({
        value: String(s.id), label: s.name || s.company_name || s.id,
      }));
    } catch { return []; }
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
          brand: v.brand?.name ?? '',
          sku: v.sku ?? '',
          productCode: v.product_code ?? null,
          currentStock,
          costPrice: Number(v.cost_price ?? v.price ?? 0) || 0,
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

  const setLineCost = (key: string, cost: number) => {
    const safe = Number.isNaN(cost) ? 0 : Math.max(0, cost);
    setLines(prev => prev.map(l => (l.key === key ? { ...l, costPrice: safe } : l)));
  };

  const removeLine = (key: string) => setLines(prev => prev.filter(l => l.key !== key));
  const clearLines = () => {
    setLines([]);
    setLastScan(null);
  };

  const totalQty = useMemo(() => lines.reduce((sum, l) => sum + (Number(l.qty) || 0), 0), [lines]);
  const grandTotal = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.costPrice) || 0), 0),
    [lines]
  );

  // Refresh the snapshot of on-hand stock shown per line when the warehouse changes.
  useEffect(() => {
    if (lines.length === 0) return;
    const next = lines.map(l => {
      const v = (selectedVariations as Array<{ id: string | number }>).find(x => String(x.id) === l.variationId);
      return v ? { ...l, currentStock: stockQtyFor(v, selectedWarehouse?.value) } : l;
    });
    requestAnimationFrame(() => {
      setLines(prev => {
        const same = prev.every((p, i) => p.currentStock === next[i].currentStock && p.key === next[i].key);
        return same ? prev : next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWarehouse?.value, lines.length]);

  // ── Purchase + receive API wiring ───
  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (isSuperAdmin && !treeTenantId) errors.tenant = 'Tenant selection required!';
    if (!selectedSupplier) errors.supplier_id = 'Supplier is required';
    if (!selectedWarehouse) errors.warehouse_id = 'Warehouse is required';
    if (!supplierOrderNo.trim()) errors.supplier_order_no = 'Chalan no is required';
    if (!orderDate) errors.order_date = 'Order date is required';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const active = lines.filter(l => Number(l.qty) > 0);
    if (active.length === 0) {
      notify.error('Scan or add at least one item with quantity > 0');
      return;
    }

    // Collapse identical product+variation rows by summing quantities
    const collapsed = active.reduce((acc: any[], l) => {
      const key = `${l.productId}:${l.variationId}`;
      const found = acc.find(a => a.__key === key);
      if (found) {
        found.quantity_ordered += Number(l.qty) || 0;
      } else {
        acc.push({
          __key: key,
          product_id: l.productId,
          variation_id: l.variationId,
          quantity_ordered: Number(l.qty) || 0,
          price: Number(l.costPrice) || 0,
        });
      }
      return acc;
    }, []);

    try {
      // 1) Create the PO (carries supplier_order_no from the chalan paper)
      const po = await purchaseOrderService.storePurchaseOrder({
        tenant_id: effectiveTenantId || undefined,
        supplier_id: selectedSupplier!.value,
        warehouse_id: selectedWarehouse!.value,
        supplier_order_no: supplierOrderNo.trim() || undefined,
        order_date: orderDate,
        expected_delivery_date: expectedDeliveryDate || undefined,
        status,
        payment_status: paymentStatus,
        grand_total: Number(grandTotal.toFixed(2)),
        items: collapsed.map(({ __key, ...rest }) => rest),
      });

      // 2) Receive the same items so stock lands immediately
      await purchaseOrderService.receiveStock(po.id, {
        warehouse_id: selectedWarehouse!.value,
        purchase_order_id: po.id,
        supplier_order_no: supplierOrderNo.trim() || undefined,
        items: collapsed.map(c => ({
          product_id: c.product_id,
          variation_id: c.variation_id,
          quantity: c.quantity_ordered,
        })),
      });

      notify.success(
        `Purchase saved: ${active.length} item(s), ${totalQty} unit(s) into ${selectedWarehouse!.label} (PO ${po.po_number})`
      );
      // Reset the form after successful save
      setLines([]);
      setSupplierOrderNo('');
      setLastScan(null);
    } catch (err: any) {
      console.error('[purchase/manage] save error:', err);
      if (err?.response?.data?.errors) {
        const transformed: { [k: string]: string } = {};
        Object.entries(err.response.data.errors).forEach(([k, v]: any) => {
          transformed[k] = Array.isArray(v) ? v.join(', ') : v;
        });
        setFormErrors(transformed);
      } else {
        notify.error(err?.response?.data?.message || 'Failed to save purchase');
      }
    }
  };

  const payloadPreview = useMemo(
    () =>
      JSON.stringify(
        {
          supplier_id: selectedSupplier?.value ?? null,
          warehouse_id: selectedWarehouse?.value ?? null,
          supplier_order_no: supplierOrderNo || null,
          order_date: orderDate || null,
          expected_delivery_date: expectedDeliveryDate || null,
          status,
          payment_status: paymentStatus,
          items: lines.map(l => ({
            product_id: l.productId,
            variation_id: l.variationId,
            quantity_ordered: Number(l.qty) || 0,
            price: Number(l.costPrice) || 0,
          })),
        },
        null,
        2
      ),
    [selectedSupplier, selectedWarehouse, supplierOrderNo, orderDate, expectedDeliveryDate, status, paymentStatus, lines]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Purchase Entry
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">
            Create PO from chalan · scan product code → set unit cost &amp; quantity
          </span>
        </h1>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
            Purchase entry — creates PO then receives stock
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-2 items-start">
        {/* Left: product tree (products → variations with stock qty) */}
        <div className="lg:sticky lg:top-2 lg:h-[calc(100vh-120px)] lg:overflow-hidden h-130">
          <ProductTreePanel
            businessTypeId={isSuperAdmin ? businessTypeId : tenantBusinessTypeId}
            onBusinessTypeChange={persistedSetBusinessTypeId}
            tenantId={treeTenantId}
            onTenantChange={persistedSetTreeTenantId}
            selectedProductId={selectedProductId}
            onSelectProduct={setSelectedProductId}
            onAddProduct={() => undefined}
            canCreate={false}
            formErrors={formErrors}
            onTenantErrorClear={() => {
              if (formErrors.tenant) {
                setFormErrors(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== 'tenant')));
              }
            }}
          />
        </div>

        {/* Right: entry panel */}
        <div className="min-h-105 lg:h-[calc(100vh-120px)] lg:overflow-y-auto flex flex-col gap-2">
          {/* Entry context: supplier + warehouse + chalan fields (tenant comes from the product tree) */}
          <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    value={selectedSupplier}
                    onChange={(o: any) => {
                      setSelectedSupplier(o);
                      if (o?.value && formErrors.supplier_id) {
                        setFormErrors(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== 'supplier_id')));
                      }
                    }}
                    loadOptions={loadSuppliers}
                    defaultOptions={supplierDefaults}
                    placeholder={isSuperAdmin && !effectiveTenantId ? 'Select tenant first' : 'Select supplier'}
                    isDisabled={isSuperAdmin && !effectiveTenantId}
                    isInvalid={!!formErrors.supplier_id}
                    compact
                    isClearable
                  />
                  {isSuperAdmin && !effectiveTenantId && !formErrors.supplier_id && (
                    <p className="text-amber-600 text-xs mt-1">Select a tenant in the product tree to list suppliers.</p>
                  )}
                  {formErrors.supplier_id && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.supplier_id}</p>
                  )}
                </div>
                {selectedSupplier && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSupplier(null);
                      setFormErrors(prev => {
                        const { supplier_id, ...rest } = prev;
                        return rest;
                      });
                    }}
                    className="mt-5 shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
                    title="Clear supplier"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Warehouse <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    value={selectedWarehouse}
                    onChange={(o: any) => {
                      setSelectedWarehouse(o);
                      if (o?.value && formErrors.warehouse_id) {
                        setFormErrors(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== 'warehouse_id')));
                      }
                    }}
                    loadOptions={loadWarehouseOptions}
                    defaultOptions={defaultWarehouseOptions}
                    placeholder="Select warehouse"
                    isDisabled={!effectiveTenantId}
                    isInvalid={!!formErrors.warehouse_id}
                    compact
                    isClearable
                  />
                  {formErrors.warehouse_id && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.warehouse_id}</p>
                  )}
                  {isSuperAdmin && !treeTenantId && !formErrors.tenant && (
                    <p className="text-amber-600 text-xs mt-1">{tenantPickerNote}</p>
                  )}
                  {formErrors.tenant && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.tenant}</p>
                  )}
                </div>
                {selectedWarehouse && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedWarehouse(null);
                      setFormErrors(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== 'warehouse_id')));
                    }}
                    className="mt-5 shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
                    title="Clear warehouse"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Supplier Order No <span className="text-red-500">*</span>
                </label>
                <input
                  value={supplierOrderNo}
                  onChange={e => {
                    setSupplierOrderNo(e.target.value);
                    if (e.target.value.trim() && formErrors.supplier_order_no) {
                      const next = { ...formErrors };
                      delete next.supplier_order_no;
                      setFormErrors(next);
                    }
                  }}
                  placeholder="Enter Chalan No"
                  className={`w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formErrors.supplier_order_no ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {formErrors.supplier_order_no && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.supplier_order_no}</p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Order Date <span className="text-red-500">*</span>
                </label>
                <CustomDatePicker
                  value={orderDate}
                  onChange={v => {
                    setOrderDate(v);
                    if (v && formErrors.order_date) {
                      const { order_date, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  className={formErrors.order_date ? 'border-red-500' : ''}
                />
                {formErrors.order_date && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.order_date}</p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Expected Delivery
                </label>
                <CustomDatePicker
                  value={expectedDeliveryDate}
                  onChange={setExpectedDeliveryDate}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={e => {
                      setStatus(e.target.value);
                      if (formErrors.status) {
                        setFormErrors(Object.fromEntries(Object.entries(formErrors).filter(([k]) => k !== 'status')));
                      }
                    }}
                    className={`w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${formErrors.status ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  >
                    {STATUS_LIST.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  {formErrors.status && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.status}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={e => {
                      setPaymentStatus(e.target.value as PaymentStatus);
                      if (formErrors.payment_status) {
                        setFormErrors(Object.fromEntries(Object.entries(formErrors).filter(([k]) => k !== 'payment_status')));
                      }
                    }}
                    className={`w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${formErrors.payment_status ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  >
                    {PAYMENT_STATUS_LIST.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {formErrors.payment_status && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.payment_status}</p>
                  )}
                </div>
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
                          <span className="font-mono font-medium text-gray-900 dark:text-gray-100">{v.brand?.name ? v.brand.name + ' - ' : ''}{v.name}</span>
                          <span className="block text-[11px] text-gray-500 dark:text-gray-400">{v.sku}{v.product_code ? ` · ${v.product_code}` : ''}</span>
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
                  {lines.length} line(s) · {totalQty} unit(s) · {grandTotal.toFixed(2)} total
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
                        <th className="px-2 py-2 text-left text-[11px] font-semibold text-gray-700 dark:text-gray-300 min-w-[200px]">Product / Barcode</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold text-gray-700 dark:text-gray-300 w-20">On hand</th>
                        <th className="px-2 py-2 text-left text-[11px] font-semibold text-gray-700 dark:text-gray-300 w-32">Quantity</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold text-gray-700 dark:text-gray-300 w-28">Unit Cost</th>
                        <th className="px-2 py-2 text-right text-[11px] font-semibold text-gray-700 dark:text-gray-300 w-28">Total</th>
                        <th className="px-2 py-2 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                      {lines.map((l, idx) => (
                        <tr key={l.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                          <td className="px-2 py-1.5 text-gray-500 text-xs">{idx + 1}</td>
                          <td className="px-2 py-1.5">
                            <div className="flex flex-col gap-0.5 text-xs">
                              <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{l.productName}{l.variationName ? ` - ${l.variationName}` : ''}</span>
                              <span className="font-mono text-[10px]">
                                <span className="text-blue-600 dark:text-blue-400 font-semibold">{l.brand}{l.sku ? " · " + l.sku : ""}{l.productCode ? " · " + l.productCode : ""}</span>
                              </span>
                            </div>
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
                                className="w-14 px-1 py-1 text-right text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
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
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={l.costPrice}
                              onChange={e => setLineCost(l.key, Number(e.target.value))}
                              onFocus={e => e.target.select()}
                              className="w-full px-2 py-1 text-right text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right text-xs font-bold text-gray-800 dark:text-gray-200">
                            {((Number(l.qty) || 0) * (Number(l.costPrice) || 0)).toFixed(2)}
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
                        <td></td>
                        <td className="px-2 py-2 text-right text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {grandTotal.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium transition-colors"
            >
              <Save className="w-4 h-4" /> Save Entry
            </button>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {selectedSupplier ? selectedSupplier.label : 'No supplier'} · {selectedWarehouse ? selectedWarehouse.label : 'No warehouse'}{supplierOrderNo ? ` · Chalan ${supplierOrderNo}` : ''}
            </span>
          </div>

          {/* Payload preview for the future backend wiring */}
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              Payload preview (what the purchase API will accept)
            </summary>
            <pre className="mt-1 p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-x-auto text-[11px] text-gray-700 dark:text-gray-300">
              {payloadPreview}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
