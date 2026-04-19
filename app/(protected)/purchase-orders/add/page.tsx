'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Edit, X, Minus } from 'lucide-react';
import CustomSelect from '@/components/ui/custom-select';
import CustomDatePicker from '@/components/ui/date-picker';
import { notify, confirm } from '@/lib/notifications';
import purchaseOrderService from '@/services/purchaseOrderService';
import { supplierService, warehouseService, productService, productVariationService, commonService } from '@/services';

export default function AddPurchasePage() {
  const [formData, setFormData] = useState<any>({
    tenant_id: undefined,
    po_number: '',
    supplier_id: undefined,
    warehouse_id: undefined,
    order_date: '',
    expected_delivery_date: '',
    status: 'draft',
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [focusItemIndex, setFocusItemIndex] = useState<number | null>(null);

  const formRef = useRef<HTMLFormElement | null>(null);
  const poNumberRef = useRef<HTMLInputElement | null>(null);

  const [supplierOptionsDefault, setSupplierOptionsDefault] = useState<any[]>([]);
  const [warehouseOptionsDefault, setWarehouseOptionsDefault] = useState<any[]>([]);
  const [productOptionsDefault, setProductOptionsDefault] = useState<any[]>([]);

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
      if (p?.cost_price !== undefined) {
        handleItemChange(index, 'unit_cost', p.cost_price);
      }
      if (p?.sku) {
        handleItemChange(index, 'sku', p.sku);
      }
    } catch (err) {
      // ignore
    }
  };

  // Fetch variation details and set unit cost when variation selected
  const onVariationSelect = async (index: number, variationId?: string, variationLabel?: string) => {
    handleItemChange(index, 'variation_id', variationId);
    handleItemChange(index, 'variation_name', variationLabel || '');
    if (!variationId) return;
    try {
      const v: any = await productVariationService.getVariation(String(variationId));
      if (v?.cost_price !== undefined) {
        handleItemChange(index, 'unit_cost', v.cost_price);
      }
    } catch (err) {
      // ignore
    }
  };

  const computeTotal = () => {
    return items.reduce((sum, it) => {
      const q = Number(it.quantity_ordered) || 0;
      const u = Number(it.unit_cost) || 0;
      return sum + q * u;
    }, 0);
  };

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
          product_name: undefined,
          variation_id: undefined,
          variation_name: undefined,
          quantity_ordered: 1,
          unit_cost: 0,
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
      return (list || []).map((s: any) => ({ value: s.id, label: s.name || s.company_name || s.id }));
    } catch (err) {
      return [];
    }
  };

  const loadWarehouses = async (input = '') => {
    try {
      const list: any = await commonService.getWarehousesByTenant({ search: input });
      return (list || []).map((w: any) => ({ value: w.id, label: w.name || w.code || w.id }));
    } catch (err) {
      return [];
    }
  };

  const loadProducts = async (input = '') => {
    try {
      const res: any = await productService.getProducts({ search: input, per_page: 10 });
      const list = res?.data || res || [];
      return (Array.isArray(list) ? list : list.data || []).map((p: any) => ({ value: p.id, label: p.name || p.sku || p.id }));
    } catch (err) {
      return [];
    }
  };

  const validate = () => {
    const e: Record<string, string[]> = {};
    if (!formData.po_number || !String(formData.po_number).trim())
      e.po_number = ['PO Number is required'];
    if (!formData.supplier_id) e.supplier_id = ['Supplier is required'];
    if (!formData.warehouse_id) e.warehouse_id = ['Warehouse is required'];
    if (!formData.order_date) e.order_date = ['Order date is required'];
    if (items.length === 0) e.items = ['At least one item is required'];
    items.forEach((it, idx) => {
      if (!it.product_id) e[`items.${idx}.product_id`] = [`Product required for item ${idx + 1}`];
      if (!it.quantity_ordered || Number(it.quantity_ordered) <= 0)
        e[`items.${idx}.quantity_ordered`] = [
          `Quantity must be greater than 0 for item ${idx + 1}`,
        ];
    });
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
          found.quantity_ordered = Number(found.quantity_ordered || 0) + Number(it.quantity_ordered || 0);
        } else {
          acc.push({
            __key: key,
            product_id: it.product_id,
            variation_id: it.variation_id,
            quantity_ordered: Number(it.quantity_ordered || 0),
            unit_cost: parseFloat(String(it.unit_cost) || '0'),
          });
        }
        return acc;
      }, [] as any[]);

      const payload: any = {
        ...formData,
        items: collapsed.map(({ __key, ...rest }) => rest),
      };
      await purchaseOrderService.storePurchaseOrder(payload);
      notify.success('Purchase order created');
      setFormData({
        tenant_id: undefined,
        po_number: '',
        supplier_id: undefined,
        warehouse_id: undefined,
        order_date: '',
        expected_delivery_date: '',
        status: 'draft',
      });
      setItems([]);
    } catch (err: any) {
      const respErrors = err?.response?.data?.errors;
      if (respErrors) {
        setErrors(respErrors);
        notify.error('Please fix the validation errors below');
        // scroll to form and focus first relevant field
        setTimeout(() => {
          formRef.current?.scrollIntoView({ behavior: 'smooth' });
          const keys = Object.keys(respErrors);
          if (keys.includes('po_number')) {
            poNumberRef.current?.focus();
          }
        }, 80);
      } else {
        notify.error(err?.response?.data?.message || 'Failed to create purchase order');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
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

      <form ref={formRef} onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-md p-4 space-y-3">
        {Object.keys(errors).length > 0 && (
          <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded">
            <div className="font-medium text-sm">Validation errors</div>
            <ul className="text-xs mt-1">
              {Object.entries(errors).slice(0, 6).map(([k, v]) => (
                <li key={k}>{v?.[0] || k}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm">PO Number</label>
            <input
              ref={poNumberRef}
              value={formData.po_number}
              onChange={e => handleInputChange('po_number', e.target.value)}
              placeholder="Order Number"
              className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${hasFieldError('po_number') ? 'border-red-500' : 'border-gray-300'}`}
            />
            {hasFieldError('po_number') && (
              <p className="text-red-600 text-xs mt-1">{getFieldError('po_number')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm">Supplier</label>
            <CustomSelect
              loadOptions={loadSuppliers}
              value={formData.supplier_id ? { value: formData.supplier_id, label: '' } : null}
              onChange={(o: any) => {
                handleInputChange('supplier_id', o?.value);
              }}
              defaultOptions={supplierOptionsDefault}
              placeholder="Select supplier"
            />
            {hasFieldError('supplier_id') && (
              <p className="text-red-600 text-xs mt-1">{getFieldError('supplier_id')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm">Warehouse</label>
            <CustomSelect
              loadOptions={loadWarehouses}
              value={formData.warehouse_id ? { value: formData.warehouse_id, label: '' } : null}
              onChange={(o: any) => {
                handleInputChange('warehouse_id', o?.value);
              }}
              defaultOptions={warehouseOptionsDefault}
              placeholder="Select warehouse"
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
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="ordered">Ordered</option>
            </select>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-3">Order Items</h3>
          {hasFieldError('items') && (
            <p className="text-red-600 text-xs mb-2">{getFieldError('items')}</p>
          )}
          
          {/* Invoice-style table header */}
          <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                <div className="col-span-3">Product</div>
                <div className="col-span-3">Variation</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-1 text-right">Line Total</div>
                <div className="col-span-1 text-center">Action</div>
              </div>
            </div>
            
            {/* Scrollable items body */}
            <div className="max-h-96 overflow-auto">
              {items.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No items added. Click "Add Item" to begin.
                </div>
              )}
              {items.map((it, idx) => (
                <div key={idx} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="grid grid-cols-12 gap-2 px-3 py-3 items-center">
                    <div className="col-span-3">
                      <CustomSelect
                        loadOptions={loadProducts}
                        value={it.product_id ? { value: it.product_id, label: it.product_name || '' } : null}
                        onChange={(o: any) => onProductSelect(idx, o?.value, o?.label)}
                        defaultOptions={productOptionsDefault}
                        placeholder="Select product"
                      />
                      {errors[`items.${idx}.product_id`] && (
                        <p className="text-red-600 text-xs mt-1">{errors[`items.${idx}.product_id`][0]}</p>
                      )}
                    </div>
                    
                    <div className="col-span-3">
                      <CustomSelect
                        loadOptions={async (input: string) => {
                          if (!it.product_id) return [];
                          try {
                            const res: any = await productVariationService.getVariations({ product_id: it.product_id, search: input });
                            const list = res?.data ?? res ?? [];
                            const variations = Array.isArray(list) ? list : (list.data || list);
                            return (variations || []).map((v: any) => ({ value: v.id, label: v.name || v.sku || v.id }));
                          } catch (err) {
                            return [];
                          }
                        }}
                        value={it.variation_id ? { value: it.variation_id, label: it.variation_name || '' } : null}
                        onChange={(o: any) => onVariationSelect(idx, o?.value, o?.label)}
                        placeholder="Variation"
                        isDisabled={!it.product_id}
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.0001"
                        value={it.quantity_ordered}
                        onChange={e => handleItemChange(idx, 'quantity_ordered', e.target.value)}
                        className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                        placeholder="0"
                      />
                      {errors[`items.${idx}.quantity_ordered`] && (
                        <p className="text-red-600 text-xs mt-1">{errors[`items.${idx}.quantity_ordered`][0]}</p>
                      )}
                    </div>
                    
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        value={it.unit_cost}
                        onChange={e => handleItemChange(idx, 'unit_cost', e.target.value)}
                        className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="col-span-1 text-right text-sm font-medium dark:text-gray-200">
                      {((Number(it.quantity_ordered) || 0) * (Number(it.unit_cost) || 0)).toFixed(2)}
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
                  <div className="flex justify-end">
                    <div className="w-64">
                      <div className="flex justify-between py-2 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                        <span className="font-medium dark:text-gray-200">{computeTotal().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-t border-gray-300 dark:border-gray-600 text-base font-bold">
                        <span className="dark:text-gray-200">Total:</span>
                        <span className="text-blue-600 dark:text-blue-400">{computeTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
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
                po_number: '',
                supplier_id: undefined,
                warehouse_id: undefined,
                order_date: '',
                expected_delivery_date: '',
                status: 'draft',
              });
              setItems([]);
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
