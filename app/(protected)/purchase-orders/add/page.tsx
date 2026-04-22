'use client';

import { useEffect, useState, useRef } from 'react';
import { ShoppingCart, Plus, Minus, Save, RotateCcw } from 'lucide-react';
import CustomSelect from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import { notify } from '@/lib/notifications';
import purchaseOrderService from '@/services/purchaseOrderService';
import {
  supplierService,
  productService,
  productVariationService,
  commonService,
} from '@/services';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';

// ─── Types ────────────────────────────────────────────────────────────────────

type DiscountType = 'amount' | 'percent';
type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

interface OrderItem {
  product_id?: string;
  product_name?: string;
  variation_id?: string;
  variation_name?: string;
  quantity_ordered: number;
  cost_price: number;
  variationOptions?: { value: string; label: string }[];
}

interface OrderForm {
  tenant_id?: string;
  supplier_id?: string;
  warehouse_id?: string;
  order_date: string;
  expected_delivery_date: string;
  status: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

// Shared class tokens used across form controls for visual consistency
const inputCls =
  'w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 ' +
  'rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 ' +
  'focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent';

const selectCls = inputCls; // same visual as text input

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddPurchaseOrderPage() {
  const authUser = useAuthStore(s => s.user);
  const { isSuperAdmin } = usePermissions();
  const formRef = useRef<HTMLFormElement | null>(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState<OrderForm>({
    tenant_id: undefined,
    supplier_id: undefined,
    warehouse_id: undefined,
    order_date: '',
    expected_delivery_date: '',
    status: 'draft',
  });

  const [items, setItems] = useState<OrderItem[]>([]);
  const [note, setNote] = useState('');
  const [discount, setDiscount] = useState('0');
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [vat, setVat] = useState('0');
  const [shipping, setShipping] = useState('0');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');

  // ── UI state ────────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  // ── Dropdown option caches ───────────────────────────────────────────────────
  const [supplierDefaults, setSupplierDefaults] = useState<any[]>([]);
  const [warehouseDefaults, setWarehouseDefaults] = useState<any[]>([]);
  const [productDefaults, setProductDefaults] = useState<any[]>([]);
  const [tenantDefaults, setTenantDefaults] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  // ─── Derived financial values ─────────────────────────────────────────────────

  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.quantity_ordered) || 0) * (Number(it.cost_price) || 0),
    0
  );

  const discountValue = Number(discount) || 0;
  const discountAmount = discountType === 'percent'
    ? (subtotal * discountValue) / 100
    : discountValue;

  const vatPercent = Number(vat) || 0;
  const vatAmount = ((subtotal - discountAmount) * vatPercent) / 100;

  const shippingCost = Number(shipping) || 0;
  const grandTotal = subtotal - discountAmount + vatAmount + shippingCost;

  // ─── Micro-helpers ────────────────────────────────────────────────────────────

  const err = (field: string) => errors[field]?.[0] || '';
  const hasErr = (field: string) => !!errors[field];

  const clearErr = (field: string) => {
    if (!errors[field]) return;
    const { [field]: _, ...rest } = errors;
    setErrors(rest);
  };

  // Prevent entering minus sign in numeric inputs
  const preventMinus = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-') e.preventDefault();
  };

  const setField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    clearErr(key);
  };

  const setItemField = (idx: number, key: string, value: any) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
    clearErr(`items.${idx}.${key}`);
  };

  // ─── Item handlers ────────────────────────────────────────────────────────────

  const addItem = () =>
    setItems(prev => [
      ...prev,
      {
        product_id: undefined, product_name: '', variation_id: undefined,
        variation_name: '', quantity_ordered: 1, cost_price: 0, variationOptions: []
      },
    ]);

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  // On product select: clear variation and preload variation options
  const onProductSelect = async (idx: number, productId?: string, label?: string) => {
    setItemField(idx, 'product_id', productId);
    setItemField(idx, 'product_name', label || '');
    setItemField(idx, 'variation_id', undefined);
    setItemField(idx, 'variation_name', undefined);
    setItemField(idx, 'variationOptions', []);

    if (!productId) return;

    try {
      const res: any = await productVariationService.getVariations({ product_id: productId, per_page: 50 });
      const list = res?.data || res || [];
      const opts = (Array.isArray(list) ? list : list.data || []).map((v: any) => ({
        value: v.id, label: v.name || v.sku || v.id,
      }));

      setItemField(idx, 'variationOptions', opts);

      // Auto-select when only one variation exists
      if (opts.length === 1) {
        setItemField(idx, 'variation_id', opts[0].value);
        setItemField(idx, 'variation_name', opts[0].label);
      }
    } catch { /* silent — variation preload failure is non-critical */ }
  };

  const onVariationSelect = (idx: number, variationId?: string, label?: string) => {
    setItemField(idx, 'variation_id', variationId);
    setItemField(idx, 'variation_name', label || '');
    // NOTE: cost_price is intentionally NOT auto-filled — user enters it manually
  };

  // ─── Async dropdown loaders ───────────────────────────────────────────────────

  const loadTenants = async (search = '') => {
    try {
      const data: any = await commonService.getTenantsForDropdown({ search });
      return (data || []).map((t: any) => ({ value: t.id, label: t.business_name }));
    } catch { return []; }
  };

  const loadSuppliers = async (search = '') => {
    try {
      const data: any = await supplierService.getSuppliers({ search });
      return (data || []).map((s: any) => ({
        value: s.id, label: s.name || s.company_name || s.id,
      }));
    } catch { return []; }
  };

  const loadWarehouses = async (search = '') => {
    try {
      const tenantId = isSuperAdmin ? formData.tenant_id : authUser?.tenant_id;
      if (!tenantId) return [];
      const data: any = await commonService.getWarehousesByTenant({ search, tenant_id: tenantId });
      return (data || []).map((w: any) => ({ value: w.id, label: w.name || w.code || w.id }));
    } catch { return []; }
  };

  const loadProducts = async (search = '') => {
    try {
      const res: any = await productService.getProducts({ search, per_page: 20 });
      const list = res?.data || res || [];
      return (Array.isArray(list) ? list : list.data || []).map((p: any) => ({
        value: p.id, label: p.name || p.sku || p.id,
      }));
    } catch { return []; }
  };

  const loadVariations = async (productId: string, search = '') => {
    try {
      const res: any = await productVariationService.getVariations({ product_id: productId, search });
      const list = res?.data ?? res ?? [];
      return (Array.isArray(list) ? list : list.data || list).map((v: any) => ({
        value: v.id, label: v.name || v.sku || v.id,
      }));
    } catch { return []; }
  };

  // ─── Effects: preload dropdown defaults ───────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Suppliers
      try {
        const s: any = await supplierService.getSuppliers({ per_page: 50 });
        if (mounted) setSupplierDefaults(
          (Array.isArray(s) ? s : s.data || []).map((su: any) => ({
            value: su.id, label: su.name || su.company_name || su.id,
          }))
        );
      } catch { /* ignore */ }

      // Products
      try {
        const p: any = await productService.getProducts({ per_page: 20 });
        const pl = p?.data || p || [];
        if (mounted) setProductDefaults(
          (Array.isArray(pl) ? pl : pl.data || []).map((pr: any) => ({
            value: pr.id, label: pr.name || pr.sku || pr.id,
          }))
        );
      } catch { /* ignore */ }

      // Warehouses (non-super-admin)
      if (!isSuperAdmin && authUser?.tenant_id) {
        try {
          const w: any = await commonService.getWarehousesByTenant({
            tenant_id: authUser.tenant_id, per_page: 50,
          });
          if (mounted) setWarehouseDefaults(
            (Array.isArray(w) ? w : w.data || []).map((wh: any) => ({
              value: wh.id, label: wh.name || wh.code || wh.id,
            }))
          );
        } catch { /* ignore */ }
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Load tenant options for super admin only
  useEffect(() => {
    if (!isSuperAdmin) return;
    let mounted = true;
    loadTenants('').then(opts => { if (mounted) setTenantDefaults(opts); });
    return () => { mounted = false; };
  }, [isSuperAdmin]);

  // Refresh warehouses whenever the tenant selection changes
  useEffect(() => {
    if (!formData.tenant_id) { setWarehouseDefaults([]); return; }
    let mounted = true;
    (async () => {
      try {
        const w: any = await commonService.getWarehousesByTenant({
          tenant_id: formData.tenant_id, per_page: 50,
        });
        if (mounted) setWarehouseDefaults(
          (Array.isArray(w) ? w : w.data || []).map((wh: any) => ({
            value: wh.id, label: wh.name || wh.code || wh.id,
          }))
        );
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, [formData.tenant_id]);

  // ─── Validation ───────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: Record<string, string[]> = {};

    if (!formData.supplier_id) e.supplier_id = ['Supplier is required'];
    if (!formData.warehouse_id) e.warehouse_id = ['Warehouse is required'];
    if (!formData.order_date) e.order_date = ['Order date is required'];
    if (items.length === 0) e.items = ['At least one item is required'];

    const costErrorItems: number[] = [];
    items.forEach((it, idx) => {
      if (!it.product_id) e[`items.${idx}.product_id`] = [''];
      if (!it.quantity_ordered || Number(it.quantity_ordered) <= 0)
        e[`items.${idx}.quantity_ordered`] = [`Item ${idx + 1}: quantity must be > 0`];

      // cost_price must be > 0
      if (Number(it.cost_price) <= 0) {
        e[`items.${idx}.cost_price`] = [''];
        costErrorItems.push(idx + 1);
      }
    });

    // Flag duplicate product + variation combos (only check items with product_id)
    const seen: Record<string, number[]> = {};
    items.forEach((it, idx) => {
      // Only check for duplicates if product is selected
      if (!it.product_id) return;

      // Create unique key from product_id + variation_id combination
      const key = `${it.product_id}:${it.variation_id || 'none'}`;
      if (!seen[key]) seen[key] = [];
      seen[key].push(idx);
    });

    // Mark all duplicate entries
    Object.values(seen)
      .filter(ids => ids.length > 1)
      .forEach(ids => {
        e.items = ['Duplicate items detected — remove or merge them.'];
        ids.forEach(i => {
          e[`items.${i}.product_id`] = [''];
          e[`items.${i}.variation_id`] = [''];
        });
      });

    // Show a single toast for unit cost errors (client-side)
    if (costErrorItems.length > 0) {
      notify.error(
        `Unit cost must be > 0 for item${costErrorItems.length > 1 ? 's' : ''}: ${costErrorItems.join(', ')}`
      );
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      // Collapse identical product+variation rows by summing quantities
      const collapsedItems = items.reduce((acc: any[], it) => {
        const key = `${it.product_id}:${it.variation_id || ''}`;
        const found = acc.find(a => a.__key === key);
        if (found) {
          found.quantity_ordered += Number(it.quantity_ordered) || 0;
        } else {
          acc.push({
            __key: key,
            product_id: it.product_id,
            variation_id: it.variation_id,
            quantity_ordered: Number(it.quantity_ordered) || 0,
            price: parseFloat(String(it.cost_price)) || 0,
          });
        }
        return acc;
      }, []);

      const payload = {
        ...formData,
        items: collapsedItems.map(({ __key, ...rest }) => rest),
        note,
        payment_status: paymentStatus,
        discount: discountValue,
        discount_type: discountType,
        discount_amount: discountAmount,
        discount_percentage: discountType === 'percent' ? discountValue : null,
        vat: vatPercent,
        shipping: shippingCost,
        sub_total: subtotal,
        vat_amount: vatAmount,
        total_amount: Number(Math.round(grandTotal).toFixed(2)),
      };

      await purchaseOrderService.storePurchaseOrder(payload);
      notify.success('Purchase order created successfully');
      handleReset();
    } catch (error: any) {
      const serverErrors = error?.response?.data?.errors;
      if (serverErrors) {
        setErrors(serverErrors);
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        notify.error(error?.response?.data?.message || 'Failed to create purchase order');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      tenant_id: undefined, supplier_id: undefined, warehouse_id: undefined,
      order_date: '', expected_delivery_date: '', status: 'draft'
    });
    setSelectedTenant(null);
    setItems([]);
    setNote('');
    setDiscount('0');
    setVat('0');
    setShipping('0');
    setPaymentStatus('pending');
    setErrors({});
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">

      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Add Purchase Order
        </h1>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-2" autoComplete="off">

        {/* ── Section 1: Order Details ──────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          {/* Tenant row — super admin only, rendered above the main fields */}
          {isSuperAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tenant
                </label>
                <CustomSelect
                  value={selectedTenant}
                  onChange={(o: any) => {
                    setSelectedTenant(o);
                    setField('tenant_id', o?.value);
                  }}
                  loadOptions={loadTenants}
                  defaultOptions={tenantDefaults}
                  placeholder="Select tenant"
                  isInvalid={hasErr('tenant_id')}
                />
                {hasErr('tenant_id') && <p className="mt-1 text-xs text-red-600">{err('tenant_id')}</p>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            {/* Supplier */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={
                  formData.supplier_id
                    ? (supplierDefaults.find(o => o.value === formData.supplier_id) ||
                      { value: formData.supplier_id, label: '' })
                    : null
                }
                onChange={(o: any) => setField('supplier_id', o?.value)}
                loadOptions={loadSuppliers}
                defaultOptions={supplierDefaults}
                placeholder="Select supplier"
                isInvalid={hasErr('supplier_id')}
              />
              {hasErr('supplier_id') && <p className="mt-1 text-xs text-red-600">{err('supplier_id')}</p>}
            </div>

            {/* Warehouse */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Warehouse <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={
                  formData.warehouse_id
                    ? (warehouseDefaults.find(o => o.value === formData.warehouse_id) ||
                      { value: formData.warehouse_id, label: '' })
                    : null
                }
                onChange={(o: any) => setField('warehouse_id', o?.value)}
                loadOptions={loadWarehouses}
                defaultOptions={warehouseDefaults}
                placeholder="Select warehouse"
                isInvalid={hasErr('warehouse_id')}
              />
              {hasErr('warehouse_id') && <p className="mt-1 text-xs text-red-600">{err('warehouse_id')}</p>}
            </div>

            {/* Order Date */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Order Date <span className="text-red-500">*</span>
              </label>
              <CustomDatePicker
                value={formData.order_date}
                onChange={v => setField('order_date', v)}
                className={hasErr('order_date') ? 'border-red-500' : ''}
              />
              {hasErr('order_date') && <p className="mt-1 text-xs text-red-600">{err('order_date')}</p>}
            </div>

            {/* Expected Delivery */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expected Delivery
              </label>
              <CustomDatePicker
                value={formData.expected_delivery_date}
                onChange={v => setField('expected_delivery_date', v)}
              />
            </div>

            {/* Order Status */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={e => setField('status', e.target.value)}
                className={selectCls}
              >
                {STATUS_LIST.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={e => setPaymentStatus(e.target.value as PaymentStatus)}
                className={selectCls}
              >
                {PAYMENT_STATUS_LIST.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* ── Section 2: Order Items ────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

          {/* Section header */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/60 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              Order Items
              {items.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded font-medium">
                  {items.length}
                </span>
              )}
            </h3>
            {hasErr('items') && <p className="text-xs text-red-600">{err('items')}</p>}
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-24 gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/40 border-b border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-8">Product</div>
            <div className="col-span-6">Variation</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-4 text-right">Unit Cost</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1 text-center">Del</div>
          </div>

          {/* Item rows */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                No items yet — click{' '}
                <span className="font-semibold text-gray-600 dark:text-gray-300">Add Item</span>{' '}
                to begin.
              </div>
            ) : (
              items.map((it, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-24 gap-2 px-1 py-1 items-center hover:bg-blue-50/40 dark:hover:bg-gray-700/30 transition-colors"
                >
                  {/* Row number badge */}
                  <div className="col-span-1 text-center">
                    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                      {idx + 1}
                    </span>
                  </div>

                  {/* Product */}
                  <div className="col-span-8">
                    <CustomSelect
                      value={it.product_id ? { value: it.product_id, label: it.product_name || '' } : null}
                      onChange={(o: any) => onProductSelect(idx, o?.value, o?.label)}
                      loadOptions={loadProducts}
                      defaultOptions={productDefaults}
                      placeholder="Select product"
                      isInvalid={hasErr(`items.${idx}.product_id`)}
                    />
                    {err(`items.${idx}.product_id`) && (
                      <p className="text-red-600 text-xs mt-0.5">{err(`items.${idx}.product_id`)}</p>
                    )}
                  </div>

                  {/* Variation */}
                  <div className="col-span-6">
                    <CustomSelect
                      value={it.variation_id ? { value: it.variation_id, label: it.variation_name || '' } : null}
                      onChange={(o: any) => onVariationSelect(idx, o?.value, o?.label)}
                      loadOptions={(search: string) =>
                        it.product_id ? loadVariations(it.product_id, search) : Promise.resolve([])
                      }
                      defaultOptions={it.variationOptions || []}
                      placeholder="Variation"
                      isDisabled={!it.product_id}
                      isInvalid={hasErr(`items.${idx}.variation_id`)}
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={it.quantity_ordered}
                      onChange={e => setItemField(idx, 'quantity_ordered', e.target.value)}
                      onKeyDown={preventMinus}
                      onFocus={e => e.target.select()}
                      placeholder="0"
                      className={`${inputCls} text-right font-semibold [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${hasErr(`items.${idx}.quantity_ordered`) ? 'border-red-500' : ''
                        }`}
                    />
                    {err(`items.${idx}.quantity_ordered`) && (
                      <p className="text-red-600 text-xs mt-0.5">{err(`items.${idx}.quantity_ordered`)}</p>
                    )}
                  </div>

                  {/* Unit cost — entered manually by user */}
                  <div className="col-span-4">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={it.cost_price}
                      onChange={e => setItemField(idx, 'cost_price', e.target.value)}
                      onKeyDown={preventMinus}
                      onFocus={e => e.target.select()}
                      placeholder="0.00"
                      className={`${inputCls} text-right font-semibold [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${hasErr(`items.${idx}.cost_price`) ? 'border-red-500' : ''}`}
                    />

                  </div>

                  {/* Line total (computed) */}
                  <div className="col-span-2 text-right pr-1">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      {((Number(it.quantity_ordered) || 0) * (Number(it.cost_price) || 0)).toFixed(0)}
                    </span>
                  </div>

                  {/* Delete button */}
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      title="Remove item"
                      className="inline-flex items-center justify-center w-6 h-6 bg-red-100 hover:bg-red-600 text-red-600 hover:text-white rounded-sm transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Invoice summary ──────────────────────────────────────────────────── */}
          {items.length > 0 && (
            <div className="border-t-2 border-blue-200 dark:border-blue-800 bg-gray-50 dark:bg-gray-700/40 px-4 py-4">
              <div className="flex flex-col md:flex-row md:items-start gap-4">

                {/* Left: discount type + notes */}
                <div className="flex-1 space-y-3">

                  {/* Discount type radio */}
                  <div className="flex items-center gap-5">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Discount:</span>
                    {(['percent', 'amount'] as DiscountType[]).map(type => (
                      <label key={type} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                          type="radio"
                          name="discountType"
                          checked={discountType === type}
                          onChange={() => setDiscountType(type)}
                          className="accent-blue-600"
                        />
                        {type === 'percent' ? 'Percentage (%)' : 'Fixed Amount'}
                      </label>
                    ))}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Add notes for this purchase order..."
                      rows={3}
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </div>

                {/* Right: financial summary card */}
                <div className="w-full md:w-60 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden shadow-sm shrink-0">

                  {/* Card header */}
                  <div className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold uppercase tracking-wide">
                    Summary
                  </div>

                  <div className="px-3 py-3 space-y-1 text-sm">

                    {/* Subtotal */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Subtotal</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{subtotal.toFixed(0)}</span>
                    </div>

                    {/* Discount input */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        Discount{discountType === 'percent' ? ' (%)' : ''}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={discount}
                        onChange={e => setDiscount(e.target.value)}
                        onKeyDown={preventMinus}
                        onFocus={e => e.target.select()}
                        className="w-24 px-2 py-1 text-xs text-right border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    {/* Computed discount amount */}
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-xs text-red-600 dark:text-red-400 px-1">
                        <span>↳ Amount deducted</span>
                        <span>-{discountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {/* VAT input */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">VAT (%)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={vat}
                        onChange={e => setVat(e.target.value)}
                        onKeyDown={preventMinus}
                        onFocus={e => e.target.select()}
                        className="w-24 px-2 py-1 text-xs text-right border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    {/* Computed VAT amount */}
                    {vatAmount > 0 && (
                      <div className="flex justify-between text-xs text-green-600 dark:text-green-400 px-1">
                        <span>↳ VAT amount</span>
                        <span>+{vatAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Shipping input */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Shipping</span>
                      <input
                        type="number"
                        step="0.01"
                        value={shipping}
                        onChange={e => setShipping(e.target.value)}
                        onKeyDown={preventMinus}
                        onFocus={e => e.target.select()}
                        className="w-24 px-2 py-1 text-xs text-right border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    {/* Grand total */}
                    <div className="flex justify-between items-center pt-2 mt-1 border-t-2 border-blue-300 dark:border-blue-700">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Grand Total</span>
                      <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                        {grandTotal.toFixed(0)}
                      </span>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Action buttons ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Creating...' : 'Create Purchase Order'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>

      </form>
    </div>
  );
}
