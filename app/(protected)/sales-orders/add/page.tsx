'use client';

import { useEffect, useState, useRef } from 'react';
import { ShoppingCart, Plus, Minus, RotateCcw, DollarSign, CreditCard, Smartphone, Building2, FileText, BadgeCheck, MoreHorizontal } from 'lucide-react';
import CustomSelect from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import { notify } from '@/lib/notifications';
import salesOrderService from '@/services/salesOrderService';
import stockService from '@/services/stockService';
import {
  customerService,
  productService,
  productVariationService,
  commonService,
} from '@/services';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import { GiSave } from 'react-icons/gi';

// ─── Types ────────────────────────────────────────────────────────────────────

type DiscountType = 'amount' | 'percent';
type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';
type PaymentMethod = 'cash' | 'card' | 'bkash' | 'nagad' | 'rocket' | 'bank_transfer' | 'check' | 'credit' | 'other';

interface OrderItem {
  product_id?: string;
  product_name?: string;
  variation_id?: string;
  variation_name?: string;
  quantity: number;
  unit_price: number;
  variationOptions?: { value: string; label: string }[];
  stockQty?: number | null;   // null = not yet checked
  stockChecking?: boolean;     // true while API call in-flight
}

interface OrderForm {
  tenant_id?: string;
  customer_id?: string;
  warehouse_id?: string;
  order_date: string;
  due_date: string;
  status: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LIST = [
  'draft', 'pending', 'confirmed', 'processing',
  'ready', 'shipped', 'delivered', 'cancelled', 'returned',
];

const PAYMENT_STATUS_LIST: { value: PaymentStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: any; activeClass: string; idleClass: string }[] = [
  { value: 'cash', label: 'Cash', icon: DollarSign, activeClass: 'border-green-500  bg-green-500  text-white', idleClass: 'border-green-200  dark:border-green-800  text-green-600  dark:text-green-400  hover:bg-green-50  dark:hover:bg-green-900/20' },
  { value: 'card', label: 'Card', icon: CreditCard, activeClass: 'border-blue-500   bg-blue-500   text-white', idleClass: 'border-blue-200   dark:border-blue-800   text-blue-600   dark:text-blue-400   hover:bg-blue-50   dark:hover:bg-blue-900/20' },
  { value: 'bkash', label: 'bKash', icon: Smartphone, activeClass: 'border-pink-500   bg-pink-500   text-white', idleClass: 'border-pink-200   dark:border-pink-800   text-pink-600   dark:text-pink-400   hover:bg-pink-50   dark:hover:bg-pink-900/20' },
  { value: 'nagad', label: 'Nagad', icon: Smartphone, activeClass: 'border-orange-500 bg-orange-500 text-white', idleClass: 'border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20' },
  { value: 'rocket', label: 'Rocket', icon: Smartphone, activeClass: 'border-purple-500 bg-purple-500 text-white', idleClass: 'border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20' },
  { value: 'bank_transfer', label: 'Bank', icon: Building2, activeClass: 'border-teal-500   bg-teal-500   text-white', idleClass: 'border-teal-200   dark:border-teal-800   text-teal-600   dark:text-teal-400   hover:bg-teal-50   dark:hover:bg-teal-900/20' },
  { value: 'check', label: 'Check', icon: FileText, activeClass: 'border-amber-500  bg-amber-500  text-white', idleClass: 'border-amber-200  dark:border-amber-800  text-amber-600  dark:text-amber-400  hover:bg-amber-50  dark:hover:bg-amber-900/20' },
  { value: 'credit', label: 'Credit', icon: BadgeCheck, activeClass: 'border-indigo-500 bg-indigo-500 text-white', idleClass: 'border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20' },
  { value: 'other', label: 'Other', icon: MoreHorizontal, activeClass: 'border-gray-500  bg-gray-500   text-white', idleClass: 'border-gray-200   dark:border-gray-600   text-gray-500   dark:text-gray-400   hover:bg-gray-50   dark:hover:bg-gray-700/40' },
];

// Shared class tokens used across form controls for visual consistency
const inputCls =
  'w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 ' +
  'rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 ' +
  'focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent';

const selectCls = inputCls; // same visual as text input

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddSalesOrderPage() {
  const authUser = useAuthStore(s => s.user);
  const { isSuperAdmin, hasPermission, isHydrated } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!hasPermission('create-sales')) router.replace('/dashboard');
  }, [isHydrated, hasPermission, router]);

  const formRef = useRef<HTMLFormElement | null>(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState<OrderForm>({
    tenant_id: undefined,
    customer_id: undefined,
    warehouse_id: undefined,
    order_date: '',
    due_date: '',
    status: 'draft',
  });

  const [items, setItems] = useState<OrderItem[]>([]);
  const [note, setNote] = useState('');
  const [discount, setDiscount] = useState('0');
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [tax, setTax] = useState('0');
  const [shipping, setShipping] = useState('0');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tenderedAmount, setTenderedAmount] = useState('0');
  const [cardLastFour, setCardLastFour] = useState('');
  const [processingFee, setProcessingFee] = useState('0');
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileTxnId, setMobileTxnId] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [txnReference, setTxnReference] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [checkDate, setCheckDate] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // ── UI state ────────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  // ── Dropdown option caches ───────────────────────────────────────────────────
  const [customerDefaults, setCustomerDefaults] = useState<any[]>([]);
  const [warehouseDefaults, setWarehouseDefaults] = useState<any[]>([]);
  const [productDefaults, setProductDefaults] = useState<any[]>([]);
  const [tenantDefaults, setTenantDefaults] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  // ─── Derived financial values ─────────────────────────────────────────────────

  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0
  );

  const discountValue = Number(discount) || 0;
  const discountAmount = discountType === 'percent'
    ? (subtotal * discountValue) / 100
    : discountValue;

  const taxPercent = Number(tax) || 0;
  const taxAmount = ((subtotal - discountAmount) * taxPercent) / 100;

  const shippingCost = Number(shipping) || 0;
  const grandTotal = subtotal - discountAmount + taxAmount + shippingCost;
  const changeAmount = Math.max(0, (parseFloat(tenderedAmount) || 0) - (parseFloat(paidAmount) || 0));

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

  const addItem = () => {
    if (!formData.warehouse_id) {
      notify.warning('Please select a warehouse first');
      return;
    }
    setItems(prev => [
      ...prev,
      {
        product_id: undefined, product_name: '', variation_id: undefined,
        variation_name: '', quantity: 1, unit_price: 0, variationOptions: [],
        stockQty: null, stockChecking: false,
      },
    ]);
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  // ─── Stock check helper ───────────────────────────────────────────────────────

  const checkStock = async (idx: number, productId: string, variationId: string) => {
    if (!formData.warehouse_id) {
      notify.warning('Please select a warehouse first');
      return;
    }
    setItemField(idx, 'stockChecking', true);
    setItemField(idx, 'stockQty', null);
    try {
      const res: any = await stockService.getStocks({
        product_id: productId,
        variation_id: variationId,
        warehouse_id: formData.warehouse_id,
        per_page: 1,
      });
      const list = res?.data || res || [];
      const row = Array.isArray(list) ? list[0] : (list.data || [])[0];
      const qty = row ? (Number(row.quantity) || 0) : 0;
      setItemField(idx, 'stockQty', qty);
      if (qty === 0) {
        const item = items[idx];
        notify.warning(
          `Stock out: ${item?.product_name || 'Product'}${item?.variation_name ? ` – ${item.variation_name}` : ''}`
        );
        setItemField(idx, 'unit_price', 0);
      }
    } catch {
      setItemField(idx, 'stockQty', null);
    } finally {
      setItemField(idx, 'stockChecking', false);
    }
  };

  // On product select: clear variation/stock and preload variation options
  const onProductSelect = async (idx: number, productId?: string, label?: string) => {
    setItemField(idx, 'product_id', productId);
    setItemField(idx, 'product_name', label || '');
    setItemField(idx, 'variation_id', undefined);
    setItemField(idx, 'variation_name', undefined);
    setItemField(idx, 'variationOptions', []);
    setItemField(idx, 'stockQty', null);
    setItemField(idx, 'stockChecking', false);

    if (!productId) return;

    try {
      const res: any = await productVariationService.getVariations({ product_id: productId, per_page: 50 });
      const list = res?.data || res || [];
      const opts = (Array.isArray(list) ? list : list.data || []).map((v: any) => ({
        value: v.id, label: v.name || v.sku || v.id, selling_price: v.selling_price ?? v.price ?? 0,
      }));

      setItemField(idx, 'variationOptions', opts);

      // Auto-select when only one variation exists
      if (opts.length === 1) {
        setItemField(idx, 'variation_id', opts[0].value);
        setItemField(idx, 'variation_name', opts[0].label);
        if (opts[0].selling_price > 0) setItemField(idx, 'unit_price', opts[0].selling_price);
        checkStock(idx, productId, opts[0].value);
      }
    } catch { /* silent — variation preload failure is non-critical */ }
  };

  const onVariationSelect = async (idx: number, variationId?: string, label?: string, sellingPrice?: number) => {
    setItemField(idx, 'variation_id', variationId);
    setItemField(idx, 'variation_name', label || '');
    if (sellingPrice !== undefined && sellingPrice > 0) {
      setItemField(idx, 'unit_price', sellingPrice);
    }
    if (variationId) {
      // Read product_id from current state snapshot via setter callback
      setItems(prev => {
        const productId = prev[idx]?.product_id;
        if (productId) checkStock(idx, productId, variationId);
        return prev;
      });
    } else {
      setItemField(idx, 'stockQty', null);
      setItemField(idx, 'stockChecking', false);
    }
  };

  // ─── Async dropdown loaders ───────────────────────────────────────────────────

  const loadTenants = async (search = '') => {
    try {
      const data: any = await commonService.getTenantsForDropdown({ search });
      return (data || []).map((t: any) => ({ value: t.id, label: t.business_name }));
    } catch { return []; }
  };

  const loadCustomers = async (search = '') => {
    try {
      const data: any = await customerService.getCustomersDropdown();
      const filtered = search
        ? (data || []).filter((c: any) =>
          (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.company_name || '').toLowerCase().includes(search.toLowerCase())
        )
        : data || [];
      return filtered.map((c: any) => ({
        value: c.id, label: `${c.name}${c.company_name ? ` (${c.company_name})` : ''}`,
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
        value: v.id, label: v.name || v.sku || v.id, selling_price: v.selling_price ?? v.price ?? 0,
      }));
    } catch { return []; }
  };

  // ─── Effects: preload dropdown defaults ───────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Customers
      try {
        const c: any = await customerService.getCustomersDropdown();
        if (mounted) setCustomerDefaults(
          (Array.isArray(c) ? c : c.data || []).map((cu: any) => ({
            value: cu.id, label: `${cu.name}${cu.company_name ? ` (${cu.company_name})` : ''}`,
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

  // Auto-update payment status based on paid amount vs grand total
  useEffect(() => {
    const paid = parseFloat(paidAmount) || 0;
    if (paid <= 0) setPaymentStatus('pending');
    else if (paid < grandTotal) setPaymentStatus('partial');
    else setPaymentStatus('paid');
  }, [paidAmount, grandTotal]);

  // ─── Validation ───────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: Record<string, string[]> = {};

    if (!formData.customer_id) e.customer_id = ['Customer is required'];
    if (!formData.warehouse_id) e.warehouse_id = ['Warehouse is required'];
    if (!formData.order_date) e.order_date = ['Order date is required'];
    if (items.length === 0) e.items = ['At least one item is required'];

    const priceErrorItems: number[] = [];
    items.forEach((it, idx) => {
      if (!it.product_id) e[`items.${idx}.product_id`] = [''];
      if (!it.quantity || Number(it.quantity) <= 0)
        e[`items.${idx}.quantity`] = [`Item ${idx + 1}: quantity must be > 0`];

      // unit_price must be >= 0
      if (Number(it.unit_price) < 0) {
        e[`items.${idx}.unit_price`] = [''];
        priceErrorItems.push(idx + 1);
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

    // Show a single toast for unit price errors (client-side)
    if (priceErrorItems.length > 0) {
      notify.error(
        `Unit price must be >= 0 for item${priceErrorItems.length > 1 ? 's' : ''}: ${priceErrorItems.join(', ')}`
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
          found.quantity += Number(it.quantity) || 0;
        } else {
          acc.push({
            __key: key,
            product_id: it.product_id,
            variation_id: it.variation_id,
            quantity: Number(it.quantity) || 0,
            unit_price: parseFloat(String(it.unit_price)) || 0,
          });
        }
        return acc;
      }, []);

      const payload = {
        ...formData,
        items: collapsedItems.map(({ __key, ...rest }) => rest),
        notes: note,
        payment_status: paymentStatus,
        discount: discountValue,
        discount_type: discountType,
        discount_amount: discountAmount,
        discount_percentage: discountType === 'percent' ? discountValue : null,
        tax: taxPercent,
        shipping_charge: shippingCost,
        sub_total: subtotal,
        tax_amount: taxAmount,
        grand_total: Number(Math.round(grandTotal).toFixed(2)),
        payment_method: paymentMethod,
        paid_amount: parseFloat(paidAmount) || 0,
        payment_date: paymentDate || undefined,
        ...(paymentMethod === 'cash' && {
          tendered_amount: parseFloat(tenderedAmount) || 0,
          change_amount: changeAmount,
        }),
        ...(paymentMethod === 'card' && {
          card_last_four: cardLastFour || undefined,
          processing_fee: parseFloat(processingFee) || 0,
          transaction_reference: txnReference || undefined,
        }),
        ...(['bkash', 'nagad', 'rocket'].includes(paymentMethod) && {
          mobile_number: mobileNumber || undefined,
          mobile_transaction_id: mobileTxnId || undefined,
        }),
        ...(paymentMethod === 'bank_transfer' && {
          bank_name: bankName || undefined,
          bank_account: bankAccount || undefined,
          transaction_reference: txnReference || undefined,
        }),
        ...(paymentMethod === 'check' && {
          check_number: checkNumber || undefined,
          check_date: checkDate || undefined,
        }),
        ...(paymentNotes && { payment_notes: paymentNotes }),
      };

      await salesOrderService.storeSalesOrder(payload);
      notify.success('Sales order created successfully');
      handleReset();
    } catch (error: any) {
      const serverErrors = error?.response?.data?.errors;
      if (serverErrors) {
        setErrors(serverErrors);
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        notify.error(error?.response?.data?.message || 'Failed to create sales order');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      tenant_id: undefined, customer_id: undefined, warehouse_id: undefined,
      order_date: '', due_date: '', status: 'draft'
    });
    setSelectedTenant(null);
    setItems([]);
    setNote('');
    setDiscount('0');
    setTax('0');
    setShipping('0');
    setPaymentStatus('pending');
    setPaymentMethod('cash');
    setPaidAmount('0');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setTenderedAmount('0');
    setCardLastFour('');
    setProcessingFee('0');
    setMobileNumber('');
    setMobileTxnId('');
    setBankName('');
    setBankAccount('');
    setTxnReference('');
    setCheckNumber('');
    setCheckDate('');
    setPaymentNotes('');
    setErrors({});
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">

      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Add Sales Order
        </h1>
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

            {/* Customer */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={
                  formData.customer_id
                    ? (customerDefaults.find(o => o.value === formData.customer_id) ||
                      { value: formData.customer_id, label: '' })
                    : null
                }
                onChange={(o: any) => setField('customer_id', o?.value)}
                loadOptions={loadCustomers}
                defaultOptions={customerDefaults}
                placeholder="Select customer"
                isInvalid={hasErr('customer_id')}
              />
              {hasErr('customer_id') && <p className="mt-1 text-xs text-red-600">{err('customer_id')}</p>}
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

            {/* Due Date */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              <CustomDatePicker
                value={formData.due_date}
                onChange={v => setField('due_date', v)}
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
            <div className="flex items-center gap-2">
              {hasErr('items') && <p className="text-xs text-red-600">{err('items')}</p>}
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-24 gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/40 border-b border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-8">Product</div>
            <div className="col-span-6">Variation</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-4 text-right">Unit Price</div>
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

                  {/* Variation + stock badge */}
                  <div className="col-span-6">
                    <CustomSelect
                      value={it.variation_id ? { value: it.variation_id, label: it.variation_name || '' } : null}
                      onChange={(o: any) => onVariationSelect(idx, o?.value, o?.label, o?.selling_price)}
                      loadOptions={(search: string) =>
                        it.product_id ? loadVariations(it.product_id, search) : Promise.resolve([])
                      }
                      defaultOptions={it.variationOptions || []}
                      placeholder="Variation"
                      isDisabled={!it.product_id}
                      isInvalid={hasErr(`items.${idx}.variation_id`)}
                    />
                    {it.stockChecking && (
                      <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                        <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse" />
                        Checking…
                      </span>
                    )}
                    {!it.stockChecking && it.stockQty !== null && it.stockQty !== undefined && it.stockQty > 0 && (
                      <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        In Stock ({it.stockQty})
                      </span>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={it.quantity}
                      onChange={e => setItemField(idx, 'quantity', e.target.value)}
                      onKeyDown={preventMinus}
                      onFocus={e => e.target.select()}
                      placeholder="0"
                      className={`${inputCls} text-right font-semibold [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${hasErr(`items.${idx}.quantity`) ? 'border-red-500' : ''
                        }`}
                    />
                    {err(`items.${idx}.quantity`) && (
                      <p className="text-red-600 text-xs mt-0.5">{err(`items.${idx}.quantity`)}</p>
                    )}
                  </div>

                  {/* Unit price */}
                  <div className="col-span-4">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={it.unit_price}
                      onChange={e => setItemField(idx, 'unit_price', e.target.value)}
                      onKeyDown={preventMinus}
                      onFocus={e => e.target.select()}
                      placeholder="0.00"
                      disabled={!formData.warehouse_id || it.stockQty === 0}
                      className={`${inputCls} text-right font-semibold [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${hasErr(`items.${idx}.unit_price`) ? 'border-red-500' : ''} ${(!formData.warehouse_id || it.stockQty === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  {/* Line total (computed) */}
                  <div className="col-span-2 text-right pr-1">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      {((Number(it.quantity) || 0) * (Number(it.unit_price) || 0)).toFixed(0)}
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
                      placeholder="Add notes for this sales order..."
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

                    {/* Tax input */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Tax (%)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={tax}
                        onChange={e => setTax(e.target.value)}
                        onKeyDown={preventMinus}
                        onFocus={e => e.target.select()}
                        className="w-24 px-2 py-1 text-xs text-right border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    {/* Computed tax amount */}
                    {taxAmount > 0 && (
                      <div className="flex justify-between text-xs text-green-600 dark:text-green-400 px-1">
                        <span>↳ Tax amount</span>
                        <span>+{taxAmount.toFixed(2)}</span>
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

        {/* ── Section 3: Payment Details ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
            Payment Details
          </h3>

          {/* Two-column layout: left = method buttons (2/5), right = inputs (3/5) */}
          <div className="flex gap-3">

            {/* ── Left: Payment Method Buttons ─────────────────────────────── */}
            <div className="w-2/5 flex-shrink-0">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {PAYMENT_METHODS.map(method => {
                  const Icon = method.icon;
                  const isActive = paymentMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`flex flex-col items-center justify-center gap-0.5 px-1.5 py-2 rounded border-2 transition-all text-xs font-semibold ${isActive ? method.activeClass : method.idleClass}`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Right: All Inputs ─────────────────────────────────────────── */}
            <div className="w-3/5 min-w-0">

              {/* Amount paid + payment date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paidAmount}
                    onChange={e => setPaidAmount(e.target.value)}
                    onKeyDown={preventMinus}
                    onFocus={e => e.target.select()}
                    placeholder="0.00"
                    className="w-full px-2 py-1.5 text-sm font-semibold text-right text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-500 rounded-sm focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  {grandTotal > 0 && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Grand Total: <span className="font-semibold">{grandTotal.toFixed(0)}</span>
                      {(parseFloat(paidAmount) || 0) > 0 && (parseFloat(paidAmount) || 0) < grandTotal && (
                        <> &middot; Due: <span className="text-red-500 font-semibold">{(grandTotal - (parseFloat(paidAmount) || 0)).toFixed(0)}</span></>
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Date
                  </label>
                  <CustomDatePicker
                    value={paymentDate}
                    onChange={v => setPaymentDate(v)}
                  />
                </div>
              </div>

              {/* Cash: tendered amount + change */}
              {paymentMethod === 'cash' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                      Tendered Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tenderedAmount}
                      onChange={e => setTenderedAmount(e.target.value)}
                      onKeyDown={preventMinus}
                      onFocus={e => e.target.select()}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 text-sm font-semibold text-right text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-500 rounded-sm focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-green-600 dark:text-green-400 mb-1">
                      Change
                    </label>
                    <div className={`w-full px-2 py-1.5 text-sm font-bold text-right rounded-sm border-2 pointer-events-none ${changeAmount > 0
                      ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-500'
                      : 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                      }`}>
                      {changeAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {/* Card: last 4 digits + processing fee + reference */}
              {paymentMethod === 'card' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                      Card Last 4 Digits
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={cardLastFour}
                      onChange={e => setCardLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="1234"
                      className="w-full px-2 py-1.5 text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-500 rounded-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                      Processing Fee
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={processingFee}
                      onChange={e => setProcessingFee(e.target.value)}
                      onKeyDown={preventMinus}
                      onFocus={e => e.target.select()}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 text-sm font-semibold text-right text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-500 rounded-sm focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                      Transaction Reference
                    </label>
                    <input
                      type="text"
                      value={txnReference}
                      onChange={e => setTxnReference(e.target.value)}
                      placeholder="TXN-XXXX"
                      className="w-full px-2 py-1.5 text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-500 rounded-sm focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Mobile payments: bKash / Nagad / Rocket */}
              {['bkash', 'nagad', 'rocket'].includes(paymentMethod) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-pink-600 dark:text-pink-400 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      value={mobileNumber}
                      onChange={e => setMobileNumber(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-2 py-1.5 text-sm font-semibold text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-900/20 border-2 border-pink-400 dark:border-pink-500 rounded-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-pink-600 dark:text-pink-400 mb-1">
                      Transaction ID
                    </label>
                    <input
                      type="text"
                      value={mobileTxnId}
                      onChange={e => setMobileTxnId(e.target.value)}
                      placeholder="TXN ID"
                      className="w-full px-2 py-1.5 text-sm font-semibold text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-900/20 border-2 border-pink-400 dark:border-pink-500 rounded-sm focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Bank transfer */}
              {paymentMethod === 'bank_transfer' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-teal-600 dark:text-teal-400 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      placeholder="e.g. Dutch Bangla Bank"
                      className="w-full px-2 py-1.5 text-sm font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20 border-2 border-teal-400 dark:border-teal-500 rounded-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-teal-600 dark:text-teal-400 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={e => setBankAccount(e.target.value)}
                      placeholder="Account number"
                      className="w-full px-2 py-1.5 text-sm font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20 border-2 border-teal-400 dark:border-teal-500 rounded-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-teal-600 dark:text-teal-400 mb-1">
                      Transaction Reference
                    </label>
                    <input
                      type="text"
                      value={txnReference}
                      onChange={e => setTxnReference(e.target.value)}
                      placeholder="TXN-XXXX"
                      className="w-full px-2 py-1.5 text-sm font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20 border-2 border-teal-400 dark:border-teal-500 rounded-sm focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Check */}
              {paymentMethod === 'check' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                      Check Number
                    </label>
                    <input
                      type="text"
                      value={checkNumber}
                      onChange={e => setCheckNumber(e.target.value)}
                      placeholder="CHK-XXXX"
                      className="w-full px-2 py-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-500 rounded-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                      Check Date
                    </label>
                    <CustomDatePicker
                      value={checkDate}
                      onChange={v => setCheckDate(v)}
                    />
                  </div>
                </div>
              )}

              {/* Payment notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Notes <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder="Add any notes for this payment..."
                  rows={1}
                  className={`${inputCls} resize-none`}
                />
              </div>

            </div>{/* end right inputs */}
          </div>{/* end two-column flex */}
        </div>

        {/* ── Action buttons ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={isLoading || !formData.warehouse_id || items.some(it => it.stockQty === 0)}
            className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <GiSave className="w-4 h-4" />
            {isLoading ? 'Creating...' : 'Create Sales Order'}
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
