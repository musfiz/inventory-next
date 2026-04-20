'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Edit, X, Minus } from 'lucide-react';
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

export default function AddPurchasePage() {
  const authUser = useAuthStore(s => s.user);
  const [formData, setFormData] = useState<any>({
    tenant_id: undefined,
    supplier_id: undefined,
    warehouse_id: undefined,
    order_date: '',
    expected_delivery_date: '',
    status: 'draft',
  });

  const STATUS_LIST = [
    'draft',
    'pending',
    'approved',
    'ordered',
    'partial',
    'received',
    'completed',
    'cancelled',
  ];
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [focusItemIndex, setFocusItemIndex] = useState<number | null>(null);

  const formRef = useRef<HTMLFormElement | null>(null);

  const [supplierOptionsDefault, setSupplierOptionsDefault] = useState<any[]>([]);
  const [warehouseOptionsDefault, setWarehouseOptionsDefault] = useState<any[]>([]);
  const [productOptionsDefault, setProductOptionsDefault] = useState<any[]>([]);
  const [note, setNote] = useState<string>('');
  const [discount, setDiscount] = useState<string | number>('0');
  const [vat, setVat] = useState<string | number>('0');
  const [shipping, setShipping] = useState<string | number>('0');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('percent');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'partial' | 'paid' | 'overdue'>('pending');
  const { isSuperAdmin } = usePermissions();
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [defaultTenantOptions, setDefaultTenantOptions] = useState<any[]>([]);

  const loadTenantOptions = async (input = '') => {
    try {
      const tenants: any = await commonService.getTenantsForDropdown({ search: input });
      const options = (tenants || []).map((t: any) => ({ value: t.id, label: t.business_name }));
      if (!input && defaultTenantOptions.length === 0) setDefaultTenantOptions(options);
      return options;
    } catch (err) {
      return [];
    }
  };

  // Fetch product details and set unit cost when product selected
  const onProductSelect = async (index: number, productId?: string, productLabel?: string) => {
    handleItemChange(index, 'product_id', productId);
    handleItemChange(index, 'product_name', productLabel || '');
    // Clear variation when product changes
    handleItemChange(index, 'variation_id', undefined);
    handleItemChange(index, 'variation_name', undefined);

    if (!productId) return;
    try {
      const p: any = await productService.getProduct(String(productId));
      // Do not auto-fill cost/price here; user will enter cost manually
      if (p?.sku) {
        handleItemChange(index, 'sku', p.sku);
      }
      // preload variations for this product so variation dropdown shows immediately
      try {
        const resVar: any = await productVariationService.getVariations({
          product_id: productId,
          per_page: 50,
        });
        const listVar = resVar?.data || resVar || [];
        const variations = (Array.isArray(listVar) ? listVar : listVar.data || []).map(
          (v: any) => ({ value: v.id, label: v.name || v.sku || v.id })
        );
        // store variations list on the item so the variation select can show defaultOptions
        handleItemChange(index, 'variationOptions', variations);
        // if there's exactly one variation, auto-select it
        if (variations.length === 1) {
          const single = variations[0];
          handleItemChange(index, 'variation_id', single.value);
          handleItemChange(index, 'variation_name', single.label);
          // intentionally do not populate price automatically for variations
        }
      } catch (err) {
        // ignore variation preload errors
      }
    } catch (err) {
      // ignore
    }
  };

  // Fetch variation details and set unit cost when variation selected
  const onVariationSelect = async (
    index: number,
    variationId?: string,
    variationLabel?: string
  ) => {
    handleItemChange(index, 'variation_id', variationId);
    handleItemChange(index, 'variation_name', variationLabel || '');
    if (!variationId) return;
    try {
      const v: any = await productVariationService.getVariation(String(variationId));
      // intentionally do not auto-set cost/price; user will input cost manually
    } catch (err) {
      // ignore
    }
  };

  const computeSubtotal = () => {
    return items.reduce((sum, it) => {
      const q = Number(it.quantity_ordered) || 0;
      const u = Number(it.cost_price) || 0; // use cost_price for total
      return sum + q * u;
    }, 0);
  };

  const computeGrandTotal = () => {
    const subtotal = computeSubtotal();
    const disc = Number(discount) || 0;
    const discountAmount = discountType === 'percent' ? (subtotal * (disc / 100)) : disc;
    const vatPercent = Number(vat) || 0;
    const vatAmount = (subtotal - discountAmount) * (vatPercent / 100);
    const shippingAmount = Number(shipping) || 0;
    return subtotal - discountAmount + vatAmount + shippingAmount;
  };

  // Precompute values for display
  const subtotalValue = computeSubtotal();
  const discValue = Number(discount) || 0;
  const discountAmountValue = discountType === 'percent' ? subtotalValue * (discValue / 100) : discValue;
  const vatPercentValue = Number(vat) || 0;
  const vatAmountValue = (subtotalValue - discountAmountValue) * (vatPercentValue / 100);
  const shippingAmountValue = Number(shipping) || 0;
  const grandTotalValue = subtotalValue - discountAmountValue + vatAmountValue + shippingAmountValue;

  const handleItemChange = (index: number, key: string, value: any) => {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)));
    // clear item-specific error when changed
    const itemField = `items.${index}.${key}`;
    if (errors[itemField]) {
      const { [itemField]: _, ...rest } = errors;
      setErrors(rest);
    }
  };

  useEffect(() => {
    if (focusItemIndex === null) return;
    // clear focus index after a short delay so autoFocus prop is only applied once
    const t = setTimeout(() => setFocusItemIndex(null), 200);
    return () => clearTimeout(t);
  }, [focusItemIndex]);

  // Helpers
  const handleAddItem = () => {
    setItems(prev => {
      const next = [
        ...prev,
        {
          product_id: undefined,
          product_name: '',
          variation_id: undefined,
          variation_name: '',
          quantity_ordered: 1,
          cost_price: 0,
          price: 0,
        },
      ];
      setFocusItemIndex(next.length - 1);
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      const { [key]: _, ...rest } = errors;
      setErrors(rest);
    }
  };

  const hasFieldError = (field: string) => {
    return !!errors[field];
  };

  const getFieldError = (field: string) => {
    return errors[field]?.[0] || '';
  };

  // Loaders for selects
  const loadSuppliers = async (input = '') => {
    try {
      const list: any = await supplierService.getSuppliers({ search: input });
      return (list || []).map((s: any) => ({
        value: s.id,
        label: s.name || s.company_name || s.id,
      }));
    } catch (err) {
      return [];
    }
  };

  const loadWarehouses = async (input = '') => {
    try {
      const tenant_id = isSuperAdmin ? formData.tenant_id : authUser?.tenant_id;
      if (!tenant_id) return [];
      const params: any = { search: input, tenant_id };
      const list: any = await commonService.getWarehousesByTenant(params);
      return (list || []).map((w: any) => ({ value: w.id, label: w.name || w.code || w.id }));
    } catch (err) {
      return [];
    }
  };

  const loadProducts = async (input = '') => {
    try {
      const res: any = await productService.getProducts({ search: input, per_page: 10 });
      const list = res?.data || res || [];
      return (Array.isArray(list) ? list : list.data || []).map((p: any) => ({
        value: p.id,
        label: p.name || p.sku || p.id,
      }));
    } catch (err) {
      return [];
    }
  };

  // preload some product options so dropdown shows on focus
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res: any = await productService.getProducts({ per_page: 20 });
        const list = res?.data || res || [];
        const items = (Array.isArray(list) ? list : list.data || []).map((p: any) => ({
          value: p.id,
          label: p.name || p.sku || p.id,
        }));
        if (mounted) setProductOptionsDefault(items);
      } catch (err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // preload supplier and warehouse options so selected value shows label immediately
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s: any = await supplierService.getSuppliers({ per_page: 50 });
        const suppliers = (Array.isArray(s) ? s : s.data || []).map((su: any) => ({
          value: su.id,
          label: su.name || su.company_name || su.id,
        }));
        if (mounted) setSupplierOptionsDefault(suppliers);
      } catch (err) {
        // ignore
      }

      try {
        const tenant_id = isSuperAdmin ? undefined : authUser?.tenant_id;
        if (tenant_id) {
          const w: any = await commonService.getWarehousesByTenant({ tenant_id, per_page: 50 });
          const warehouses = (Array.isArray(w) ? w : w.data || []).map((wh: any) => ({
            value: wh.id,
            label: wh.name || wh.code || wh.id,
          }));
          if (mounted) setWarehouseOptionsDefault(warehouses);
        }
      } catch (err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isSuperAdmin) loadTenantOptions('');
  }, [isSuperAdmin]);

  // refresh warehouse defaults when tenant changes so tenant-scoped warehouses appear
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!formData.tenant_id) {
        // clear warehouse options when tenant not selected
        if (mounted) setWarehouseOptionsDefault([]);
        return;
      }
      try {
        const w: any = await commonService.getWarehousesByTenant({ tenant_id: formData.tenant_id, per_page: 50 });
        const warehouses = (Array.isArray(w) ? w : w.data || []).map((wh: any) => ({
          value: wh.id,
          label: wh.name || wh.code || wh.id,
        }));
        if (mounted) setWarehouseOptionsDefault(warehouses);
      } catch (err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [formData.tenant_id]);

  const validate = () => {
    const e: Record<string, string[]> = {};
    if (!formData.supplier_id) e.supplier_id = ['Supplier is required'];
    if (!formData.warehouse_id) e.warehouse_id = ['Warehouse is required'];
    if (!formData.order_date) e.order_date = ['Order date is required'];
    if (items.length === 0) e.items = ['At least one item is required'];
    items.forEach((it, idx) => {
      if (!it.product_id) e[`items.${idx}.product_id`] = [``];
      if (!it.quantity_ordered || Number(it.quantity_ordered) <= 0)
        e[`items.${idx}.quantity_ordered`] = [
          `Quantity must be greater than 0 for item ${idx + 1}`,
        ];
    });
    // detect duplicate product+variation combinations
    const seen: Record<string, number[]> = {};
    items.forEach((it, idx) => {
      const key = `${it.product_id || ''}:${it.variation_id || ''}`;
      if (!seen[key]) seen[key] = [];
      seen[key].push(idx);
    });
    const duplicateGroups = Object.values(seen).filter(a => a.length > 1);
    if (duplicateGroups.length > 0) {
      e.items = ['Duplicate items detected. Please remove or merge duplicates.'];
      // mark each duplicated item with an empty message so only the field border shows
      duplicateGroups.forEach(group => {
        group.forEach(i => {
          e[`items.${i}.product_id`] = e[`items.${i}.product_id`] || [''];
        });
      });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setIsLoading(true);
      // collapse duplicate product+variation into single line (sum quantities)
      const collapsed = items.reduce((acc: any[], it: any) => {
        const key = `${it.product_id || ''}:${it.variation_id || ''}`;
        const found = acc.find(a => a.__key === key);
        if (found) {
          found.quantity_ordered =
            Number(found.quantity_ordered || 0) + Number(it.quantity_ordered || 0);
        } else {
          acc.push({
            __key: key,
            product_id: it.product_id,
            variation_id: it.variation_id,
            quantity_ordered: Number(it.quantity_ordered || 0),
            price: parseFloat(String(it.cost_price) || '0'),
          });
        }
        return acc;
      }, [] as any[]);

      const payload: any = {
        ...formData,
        items: collapsed.map(({ __key, ...rest }) => rest),
        note: note,
        payment_status: paymentStatus,
        discount: Number(discount) || 0,
        discount_type: discountType,
        discount_amount: discountAmountValue,
        discount_percentage: discountType === 'percent' ? Number(discount) || 0 : null,
        vat: Number(vat) || 0,
        shipping: Number(shipping) || 0,
        sub_total: subtotalValue,
        vat_amount: vatAmountValue,
        total_amount: Number(Math.round(grandTotalValue).toFixed(2)),
      };
      await purchaseOrderService.storePurchaseOrder(payload);
      notify.success('Purchase order created');
      setFormData({
        tenant_id: undefined,
        supplier_id: undefined,
        warehouse_id: undefined,
        order_date: '',
        expected_delivery_date: '',
        status: 'draft',
      });
      setItems([]);
      setNote('');
      setPaymentStatus('pending');
      setDiscount('');
      setVat('');
      setShipping('');
    } catch (err: any) {
      const respErrors = err?.response?.data?.errors;
      if (respErrors) {
        setErrors(respErrors);
        // scroll to form and focus first relevant field
        setTimeout(() => {
          formRef.current?.scrollIntoView({ behavior: 'smooth' });
          const keys = Object.keys(respErrors);
          // focus first error field if present (po_number removed from UI)
        }, 80);
      } else {
        notify.error(err?.response?.data?.message || 'Failed to create purchase order');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">Purchase Orders — Add</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddItem}
            className="px-3 py-1.5 bg-green-600 text-white rounded text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-md p-4 space-y-1"
      >
        {isSuperAdmin && (
          <div>
            <label className="block text-sm">Tenant</label>
            <CustomSelect
              className={'w-64 text-xs'}
              value={selectedTenant}
              onChange={(o: any) => {
                setSelectedTenant(o);
                handleInputChange('tenant_id', o?.value);
                if (errors.tenant_id) {
                  const { tenant_id, ...rest } = errors;
                  setErrors(rest);
                }
              }}
              loadOptions={loadTenantOptions}
              defaultOptions={defaultTenantOptions}
              placeholder="Select tenant"
              isInvalid={!!errors.tenant_id}
            />
            {errors.tenant_id && <p className="text-red-600 text-xs mt-1">{errors.tenant_id[0] || errors.tenant_id}</p>}
          </div>
        )}
        {/* validation alert removed from header per request */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={e => setPaymentStatus(e.target.value as any)}
              className="w-full px-2 py-1 text-sm border rounded-sm dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            >
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div>
            <label className="block text-sm">Supplier</label>
            <CustomSelect
              loadOptions={loadSuppliers}
              value={
                formData.supplier_id
                  ? supplierOptionsDefault.find((o: any) => o.value === formData.supplier_id) || {
                    value: formData.supplier_id,
                    label: '',
                  }
                  : null
              }
              onChange={(o: any) => {
                handleInputChange('supplier_id', o?.value);
              }}
              defaultOptions={supplierOptionsDefault}
              placeholder="Select supplier"
              isInvalid={hasFieldError('supplier_id')}
            />
            {hasFieldError('supplier_id') && (
              <p className="text-red-600 text-xs mt-1">{getFieldError('supplier_id')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm">Warehouse</label>
            <CustomSelect
              loadOptions={loadWarehouses}
              value={
                formData.warehouse_id
                  ? warehouseOptionsDefault.find((o: any) => o.value === formData.warehouse_id) || {
                    value: formData.warehouse_id,
                    label: '',
                  }
                  : null
              }
              onChange={(o: any) => {
                handleInputChange('warehouse_id', o?.value);
              }}
              defaultOptions={warehouseOptionsDefault}
              placeholder="Select warehouse"
              isInvalid={hasFieldError('warehouse_id')}
            />
            {hasFieldError('warehouse_id') && (
              <p className="text-red-600 text-xs mt-1">{getFieldError('warehouse_id')}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm">Order Date</label>
            <CustomDatePicker
              value={formData.order_date}
              onChange={v => handleInputChange('order_date', v)}
              className={`${hasFieldError('order_date') ? 'border-red-500' : ''}`}
            />
            {hasFieldError('order_date') && (
              <p className="text-red-600 text-xs mt-1">{getFieldError('order_date')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm">Expected Delivery</label>
            <CustomDatePicker
              value={formData.expected_delivery_date}
              onChange={v => setFormData({ ...formData, expected_delivery_date: v })}
            />
          </div>

          <div>
            <label className="block text-sm">Status</label>
            <select
              value={formData.status}
              onChange={e => handleInputChange('status', e.target.value)}
              className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
            >
              {STATUS_LIST.map(s => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-1">Order Items</h3>
          {hasFieldError('items') && (
            <p className="text-red-600 text-xs mb-2">{getFieldError('items')}</p>
          )}

          {/* Invoice-style table header */}
          <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
              <div className="grid grid-cols-24 gap-2 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 text-center">
                <div className="col-span-8">Product</div>
                <div className="col-span-7">Variation</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-4">Cost Price</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-1 text-center">Action</div>
              </div>
            </div>

            {/* Scrollable items body */}
            <div className="max-h-34 overflow-auto">
              {items.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No items added. Click "Add Item" to begin.
                </div>
              )}
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="grid grid-cols-24 gap-2 px-1.5 py-1.5 items-center">
                    <div className="col-span-8">
                      <CustomSelect
                        loadOptions={loadProducts}
                        value={
                          it.product_id
                            ? { value: it.product_id, label: it.product_name || '' }
                            : null
                        }
                        onChange={(o: any) => onProductSelect(idx, o?.value, o?.label)}
                        defaultOptions={productOptionsDefault}
                        placeholder="Select product"
                        isInvalid={!!errors[`items.${idx}.product_id`]}
                      />
                      {getFieldError(`items.${idx}.product_id`) && (
                        <p className="text-red-600 text-xs mt-1">
                          {getFieldError(`items.${idx}.product_id`)}
                        </p>
                      )}
                    </div>

                    <div className="col-span-7">
                      <CustomSelect
                        loadOptions={async (input: string) => {
                          if (!it.product_id) return [];
                          try {
                            const res: any = await productVariationService.getVariations({
                              product_id: it.product_id,
                              search: input,
                            });
                            const list = res?.data ?? res ?? [];
                            const variations = Array.isArray(list) ? list : list.data || list;
                            return (variations || []).map((v: any) => ({
                              value: v.id,
                              label: v.name || v.sku || v.id,
                            }));
                          } catch (err) {
                            return [];
                          }
                        }}
                        value={
                          it.variation_id
                            ? { value: it.variation_id, label: it.variation_name || '' }
                            : null
                        }
                        onChange={(o: any) => onVariationSelect(idx, o?.value, o?.label)}
                        defaultOptions={it.variationOptions || []}
                        placeholder="Variation"
                        isDisabled={!it.product_id}
                        isInvalid={!!errors[`items.${idx}.variation_id`]}
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        step="1"
                        value={it.quantity_ordered}
                        onChange={e => handleItemChange(idx, 'quantity_ordered', e.target.value)}
                        onFocus={e => (e.target as HTMLInputElement).select()}
                        className={`w-full px-2 py-1.25 text-sm text-right font-semibold rounded-sm border focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors[`items.${idx}.quantity_ordered`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                        placeholder="0"
                      />
                      {getFieldError(`items.${idx}.quantity_ordered`) && (
                        <p className="text-red-600 text-xs mt-1">
                          {getFieldError(`items.${idx}.quantity_ordered`)}
                        </p>
                      )}
                    </div>

                    <div className="col-span-4">
                      <input
                        type="number"
                        step="0.01"
                        value={it.cost_price}
                        onChange={e => handleItemChange(idx, 'cost_price', e.target.value)}
                        onFocus={e => (e.target as HTMLInputElement).select()}
                        className={`w-full px-2 py-1.25 text-sm text-right font-semibold rounded-sm border focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors[`items.${idx}.cost_price`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="col-span-2 text-right text-sm font-medium dark:text-gray-200">
                      {((Number(it.quantity_ordered) || 0) * (Number(it.cost_price) || 0)).toFixed(0)}
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="w-7 h-7 inline-flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded-sm transition-colors"
                        aria-label="Remove item"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Invoice summary section */}
            {items.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-600">
                <div className="px-3 py-3">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="md:w-2/3">
                      <div className="mb-2 flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="discountTypeTop"
                            checked={discountType === 'percent'}
                            onChange={() => setDiscountType('percent')}
                            className="form-radio"
                          />
                          <span>Discount as percent</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="discountTypeTop"
                            checked={discountType === 'amount'}
                            onChange={() => setDiscountType('amount')}
                            className="form-radio"
                          />
                          <span>Discount as amount</span>
                        </label>
                      </div>

                      <label className="block text-sm mb-1">Note</label>
                      <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Add a note for this purchase order"
                        rows={2}
                        className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />                     
                    </div>

                    <div className="md:w-64 w-full">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                          <span className="font-medium dark:text-gray-200">{subtotalValue.toFixed(0)}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                          <input
                            type="number"
                            step="0.01"
                            value={discount as any}
                            onChange={e => setDiscount(e.target.value)}
                            onFocus={e => (e.target as HTMLInputElement).select()}
                            className="w-28 px-2 py-1 text-sm border rounded-sm dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600 text-right focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>


                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">VAT (%):</span>
                          <input
                            type="number"
                            step="0.01"
                            value={vat as any}
                            onChange={e => setVat(e.target.value)}
                            onFocus={e => (e.target as HTMLInputElement).select()}
                            className="w-28 px-2 py-1 text-sm border rounded-sm dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600 text-right focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>


                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Shipping:</span>
                          <input
                            type="number"
                            step="0.01"
                            value={shipping as any}
                            onChange={e => setShipping(e.target.value)}
                            onFocus={e => (e.target as HTMLInputElement).select()}
                            className="w-28 px-2 py-1 text-sm border rounded-sm dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600 text-right focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>

                        <div className="flex justify-between py-2 border-t border-gray-300 dark:border-gray-600 text-base font-bold">
                          <span className="dark:text-gray-200">Total:</span>
                          <span className="text-blue-600 dark:text-blue-400">{grandTotalValue.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isLoading}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Edit className="w-4 h-4" />
            {isLoading ? 'Creating...' : 'Create Purchase Order'}
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
                tenant_id: undefined,
                supplier_id: undefined,
                warehouse_id: undefined,
                order_date: '',
                expected_delivery_date: '',
                status: 'draft',
              });
              setItems([]);
              setNote('');
              setPaymentStatus('pending');
              setDiscount('');
              setVat('');
              setShipping('');
            }}
            className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
