'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { notify } from '@/lib/notifications';
import CustomSelect from '@/components/ui/custom-select';
import { stockService, commonService } from '@/services';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { Package2, RefreshCcw } from 'lucide-react';
import { GiSave } from 'react-icons/gi';

export default function StockAddPage() {
  const { isSuperAdmin, hasPermission, isHydrated } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!hasPermission('create-stocks')) router.replace('/dashboard');
  }, [isHydrated, hasPermission, router]);

  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [defaultTenantOptions, setDefaultTenantOptions] = useState<any[]>([]);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [defaultWarehouseOptions, setDefaultWarehouseOptions] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [defaultProductOptions, setDefaultProductOptions] = useState<any[]>([]);

  const [variations, setVariations] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [productByBrand, setproductByBrand] = useState<boolean>(false);

  // Confirmation modal state (used when productByBrand is active)
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmItems, setConfirmItems] = useState<Array<{ sku: string; name: string; productName: string; qty: number }>>([]);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  // Computed: check if product selection is allowed
  const canSelectProduct = () => {
    if (isSuperAdmin && !selectedTenant) return false;
    if (!selectedWarehouse) return false;
    return true;
  };

  const loadTenantOptions = async (input: string) => {
    if (!isSuperAdmin) return [];
    const tenants = await commonService.getTenantsForDropdown({ search: input });
    const options = tenants.map((t: any) => ({ value: t.id, label: t.business_name }));
    if (!input && defaultTenantOptions.length === 0) setDefaultTenantOptions(options);
    return options;
  };

  // Prefetch tenant options on mount for super admin
  useEffect(() => {
    if (isSuperAdmin) {
      loadTenantOptions('');
    }
  }, [isSuperAdmin]);

  const loadProductOptions = async (input: string) => {
    // Validation: ensure tenant (if superadmin) and warehouse are selected first
    const tenant_id = isSuperAdmin ? selectedTenant?.value : authUser?.tenant_id;
    if (isSuperAdmin && !selectedTenant) {
      notify.error('Please select a tenant first');
      return [];
    }
    if (!selectedWarehouse) {
      notify.error('Please select a warehouse first');
      return [];
    }

    const list = await commonService.getProductsForDropdown({ search: input }).catch(() => []);
    return (list || []).map((p: any) => ({ value: p.id, label: p.name }));
  };

  const loadWarehouseOptions = async (input: string) => {
    const tenant_id = isSuperAdmin ? selectedTenant?.value : authUser?.tenant_id;
    if (!tenant_id) return [];
    const params: any = { search: input, tenant_id };
    const list = await commonService.getWarehousesByTenant(params).catch(() => []);
    return (list || []).map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }));
  };

  const authUser = useAuthStore(s => s.user);

  // Prefetch warehouse options: for tenant users load their warehouses, for superadmin load when tenant selected
  useEffect(() => {
    const prefetch = async () => {
      if (!isSuperAdmin && authUser?.tenant_id) {
        const list = await commonService
          .getWarehousesByTenant({ tenant_id: authUser?.tenant_id })
          .catch(() => []);
        setDefaultWarehouseOptions(
          (list || []).map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))
        );
      }
    };
    prefetch();
  }, [isSuperAdmin, authUser?.tenant_id]);

  // Prefetch product options for initial dropdown (so users see items immediately)
  useEffect(() => {
    const prefetchProducts = async () => {
      const list = await commonService.getProductsForDropdown({}).catch(() => []);
      setDefaultProductOptions((list || []).map((p: any) => ({ value: p.id, label: p.name })));
    };
    prefetchProducts();
  }, []);

  // When superadmin selects a tenant, prefetch warehouses for that tenant
  useEffect(() => {
    const prefetchForTenant = async () => {
      if (isSuperAdmin && selectedTenant?.value) {
        const list = await commonService
          .getWarehousesByTenant({ tenant_id: selectedTenant.value })
          .catch(() => []);
        setDefaultWarehouseOptions(
          (list || []).map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }))
        );
      } else if (isSuperAdmin && !selectedTenant) {
        setDefaultWarehouseOptions([]);
      }
    };
    prefetchForTenant();
  }, [isSuperAdmin, selectedTenant]);

  useEffect(() => {
    // when product selected, load variations (backend handles brand logic via is_brand param)
    const load = async () => {
      if (!selectedProduct) return;
      try {
        const warehouseId = selectedWarehouse?.value;

        // Pass is_brand to backend - it will handle fetching all brand variations if true
        const items = await commonService
          .getVariationsByProduct(selectedProduct.value, {
            warehouse_id: warehouseId,
            is_brand: productByBrand
          } as any)
          .catch(() => []);

        setVariations(items || []);
        setStocks((items || []).map((v: any) => ({
          variation_id: v.id,
          quantity: 0,
          reserved_quantity: v.stock?.reserved_quantity ?? 0,
          min_quantity: v.stock?.min_quantity ?? null,
          max_quantity: v.stock?.max_quantity ?? null,
          reorder_point: v.stock?.reorder_point ?? null,
          last_cost: v.stock?.last_cost ?? null,
        })));
      } catch (err) {
        console.error('Failed to load variations', err);
        setVariations([]);
        setStocks([]);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct, selectedWarehouse, productByBrand]);

  const handleStockChange = (index: number, field: string, value: any) => {
    const copy = [...stocks];
    const numericFields = ['quantity', 'reserved_quantity', 'min_quantity', 'max_quantity', 'reorder_point', 'last_cost'];
    let newValue: any = value;
    if (numericFields.includes(field)) {
      // allow empty string to clear optional fields
      if (value === '' || value === null) newValue = '';
      else {
        const n = Number(value);
        newValue = Number.isNaN(n) ? 0 : n;
      }
    }
    copy[index] = { ...copy[index], [field]: newValue };
    setStocks(copy);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    // validation
    const errors: { [key: string]: string } = {};
    if (isSuperAdmin && !selectedTenant) {
      errors.tenant_id = 'Tenant is required';
    }
    if (!selectedWarehouse) {
      errors.warehouse_id = 'Warehouse is required';
    }
    if (!selectedProduct) {
      errors.product_id = 'Product is required';
    }

    // Check if selected product has variations
    if (selectedProduct && variations.length === 0) {
      notify.error('Selected product have no variation, please add a variation first!');
      return;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      // Reusable helper to build a single stock entry
      const buildEntry = (s: any, i: number) => ({
        variation_id: s.variation_id,
        product_id: variations[i]?.product_id || selectedProduct.value,
        warehouse_id: selectedWarehouse.value,
        quantity: s.quantity || 0,
        reserved_quantity: s.reserved_quantity || 0,
        min_quantity:
          s.min_quantity === undefined || s.min_quantity === null || s.min_quantity === ''
            ? 1
            : Number(s.min_quantity),
        max_quantity:
          s.max_quantity === undefined || s.max_quantity === null || s.max_quantity === ''
            ? null
            : Number(s.max_quantity),
        reorder_point:
          s.reorder_point === undefined || s.reorder_point === null || s.reorder_point === ''
            ? null
            : Number(s.reorder_point),
        last_cost:
          s.last_cost === undefined || s.last_cost === null || s.last_cost === ''
            ? null
            : Number(s.last_cost),
      });

      if (productByBrand) {
        // Brand mode: only include rows where the user entered qty > 0
        const activeItems = stocks
          .map((s, i) => ({ s, i }))
          .filter(({ s }) => Number(s.quantity) > 0);

        if (activeItems.length === 0) {
          notify.error('Please enter Add Quantity for at least one variation');
          return;
        }

        // Build the display list for the confirmation modal
        const items = activeItems.map(({ s, i }) => ({
          sku: variations[i]?.sku || '',
          name: variations[i]?.name || '',
          productName: variations[i]?.product?.name || selectedProduct.label || '',
          qty: Number(s.quantity),
        }));

        const payload = {
          tenant_id: isSuperAdmin ? selectedTenant?.value : undefined,
          warehouse_id: selectedWarehouse.value,
          product_id: selectedProduct.value,
          stocks: activeItems.map(({ s, i }) => buildEntry(s, i)),
        };

        setConfirmItems(items);
        setPendingPayload(payload);
        setShowConfirm(true);
        return; // wait for user confirmation
      }

      // Non-brand mode: send all variations as before
      const payload = {
        tenant_id: isSuperAdmin ? selectedTenant?.value : undefined,
        warehouse_id: selectedWarehouse.value,
        product_id: selectedProduct.value,
        stocks: stocks.map((s, i) => buildEntry(s, i)),
      };

      await stockService.storeStocks(payload);
      notify.success('Stocks saved successfully');
      setFormErrors({});

      // After successful save, reset product selection and variation table to initial state
      setSelectedProduct(null);
      setVariations([]);
      setStocks([]);
    } catch (err: any) {
      console.error(err);
      // If validation errors from backend
      if (err?.response?.data?.errors) {
        const transformed: { [k: string]: string } = {};
        Object.entries(err.response.data.errors).forEach(([k, v]: any) => {
          transformed[k] = Array.isArray(v) ? v.join(', ') : v;
        });
        setFormErrors(transformed);
      } else {
        notify.error(err?.response?.data?.message || 'Failed to save stocks');
      }
    }
  };

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    try {
      await stockService.storeStocks(pendingPayload);
      notify.success('Stocks saved successfully');
      setFormErrors({});
      setSelectedProduct(null);
      setVariations([]);
      setStocks([]);
      setPendingPayload(null);
      setConfirmItems([]);
    } catch (err: any) {
      console.error(err);
      if (err?.response?.data?.errors) {
        const transformed: { [k: string]: string } = {};
        Object.entries(err.response.data.errors).forEach(([k, v]: any) => {
          transformed[k] = Array.isArray(v) ? v.join(', ') : v;
        });
        setFormErrors(transformed);
      } else {
        notify.error(err?.response?.data?.message || 'Failed to save stocks');
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Add Stocks</h1>
      </div>

      <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-md p-3 space-y-3">
        {isSuperAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tenant <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={selectedTenant}
                onChange={(o: any) => {
                  setSelectedTenant(o);
                  // clear tenant error
                  if (o?.value && formErrors.tenant_id) {
                    const { tenant_id, ...rest } = formErrors;
                    setFormErrors(rest);
                  }
                  // clear selected warehouse and product when tenant changes
                  setSelectedWarehouse(null);
                  setSelectedProduct(null);
                  setVariations([]);
                  setStocks([]);
                }}
                loadOptions={loadTenantOptions}
                defaultOptions={defaultTenantOptions}
                placeholder="Select tenant"
                className="text-sm"
                isInvalid={!!formErrors.tenant_id}
              />
              {formErrors.tenant_id && (
                <p className="text-red-600 text-xs mt-1">{formErrors.tenant_id}</p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
                // clear selected product when warehouse changes
                setSelectedProduct(null);
                setVariations([]);
                setStocks([]);
              }}
              loadOptions={loadWarehouseOptions}
              defaultOptions={defaultWarehouseOptions}
              placeholder="Select warehouse"
              className="text-sm"
              isInvalid={!!formErrors.warehouse_id}
            />
            {formErrors.warehouse_id && (
              <p className="text-red-600 text-xs mt-1">{formErrors.warehouse_id}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <CustomSelect
                  value={selectedProduct}
                  onChange={(o: any) => {
                    setSelectedProduct(o);
                    if (o?.value && formErrors.product_id) {
                      const { product_id, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  loadOptions={loadProductOptions}
                  defaultOptions={defaultProductOptions}
                  placeholder={
                    !canSelectProduct()
                      ? isSuperAdmin && !selectedTenant
                        ? 'Select tenant first'
                        : 'Select warehouse first'
                      : 'Select product'
                  }
                  className="text-sm"
                  isInvalid={!!formErrors.product_id}
                  isDisabled={!canSelectProduct()}
                />
              </div>
              {selectedProduct && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(null);
                    setVariations([]);
                    setStocks([]);
                  }}
                  className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-sm transition-colors flex items-center gap-1"
                  title="Clear Product"
                >
                  <span>
                    <RefreshCcw className="w-5 h-5 cursor-pointer" />
                  </span>
                </button>
              )}
            </div>
            {formErrors.product_id && (
              <p className="text-red-600 text-xs mt-1">{formErrors.product_id}</p>
            )}
            {!canSelectProduct() && (
              <p className="text-amber-600 text-xs mt-1">
                {isSuperAdmin && !selectedTenant
                  ? '⚠ Please select a tenant before choosing a product'
                  : '⚠ Please select a warehouse before choosing a product'}
              </p>
            )}
          </div>
        </div>

        {/* Product By Brand Row */}
        <div className="flex items-center gap-3">
          <label className="flex items-center text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={productByBrand}
              onChange={e => setproductByBrand(e.target.checked)}
              disabled={!canSelectProduct()}
              className="mr-2 w-4 h-4 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className={!canSelectProduct() ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300 font-medium'}>
              Product By Brand
            </span>
          </label>
          {productByBrand && (
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
              ℹ All variations from products with the same brand will be loaded
            </span>
          )}
        </div>

        {/* Variations table */}
        {variations.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Product Variations ({variations.length})
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Click on any field to edit
              </span>
            </div>
            <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 w-12">
                        #
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 min-w-[200px]">
                        Variation (SKU / Name)
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 w-32">
                        Current Stock
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 w-32">
                        Add Quantity
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 w-32">
                        Reserved
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 w-28">
                        Min Qty
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 w-28">
                        Max Qty
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 w-28">
                        Reorder Point
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 w-32">
                        Last Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {variations.map((v, idx) => (
                      <tr
                        key={v.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                      >
                        <td className="px-2 py-1 text-gray-600 dark:text-gray-400 font-medium">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-1">
                          <div className="flex flex-col">
                            {v.sku && (
                              <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                                {v.sku}
                              </span>
                            )}
                            {v.name && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {v.name}
                              </span>
                            )}
                            {v.product && v.product.name && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-medium">
                                {v.product.name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-1">
                          <div className="flex items-center justify-center">
                            {v.stock ? (
                              Number(v.stock.quantity) > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                  {Number(v.stock.quantity).toFixed(0)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 dark:text-red-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                  Out of Stock
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500">N/A</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-1">
                          <input
                            type="number"
                            value={stocks[idx]?.quantity !== undefined && stocks[idx]?.quantity !== null ? Math.round(stocks[idx].quantity) : 0}
                            min={0}
                            step={1}
                            onChange={e =>
                              handleStockChange(idx, 'quantity', e.target.value)
                            }
                            onFocus={e => e.target.select()}
                            className="w-full px-2.5 py-1.5 text-right text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 transition-all"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-1">
                          <input
                            type="number"
                            min={0}
                            value={stocks[idx]?.reserved_quantity !== undefined && stocks[idx]?.reserved_quantity !== null ? Math.round(stocks[idx].reserved_quantity) : 0}
                            onChange={e =>
                              handleStockChange(idx, 'reserved_quantity', e.target.value)
                            }
                            onFocus={e => e.target.select()}
                            className="w-full px-2.5 py-1.5 text-right text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 transition-all"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-1">
                          <input
                            type="number"
                            min={0}
                            value={stocks[idx]?.min_quantity !== undefined && stocks[idx]?.min_quantity !== null ? Math.round(stocks[idx].min_quantity) : 1}
                            onChange={e => handleStockChange(idx, 'min_quantity', e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-full px-2.5 py-1.5 text-right text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 transition-all"
                            placeholder="Opt."
                          />
                        </td>
                        <td className="px-3 py-1">
                          <input
                            type="number"
                            min={0}
                            value={stocks[idx]?.max_quantity !== undefined && stocks[idx]?.max_quantity !== null ? Math.round(stocks[idx].max_quantity) : ''}
                            onChange={e => handleStockChange(idx, 'max_quantity', e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-full px-2.5 py-1.5 text-right text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 transition-all"
                            placeholder="Opt."
                          />
                        </td>
                        <td className="px-3 py-1">
                          <input
                            type="number"
                            min={0}
                            value={stocks[idx]?.reorder_point !== undefined && stocks[idx]?.reorder_point !== null ? Math.round(stocks[idx].reorder_point) : ''}
                            onChange={e => handleStockChange(idx, 'reorder_point', e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 transition-all"
                            placeholder="Opt."
                          />
                        </td>
                        <td className="px-3 py-1">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={stocks[idx]?.last_cost !== undefined && stocks[idx]?.last_cost !== null && stocks[idx]?.last_cost !== '' ? stocks[idx].last_cost : ''}
                            onChange={e => handleStockChange(idx, 'last_cost', e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-full px-2.5 py-1.5 text-right text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 transition-all"
                            placeholder="Opt."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">Note:</span> Scroll within the table to view all
              variations. All values are auto-selected on focus for quick editing.
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer"
          >
            <GiSave className="w-4 h-4" />
            Save Stocks
          </button>
        </div>
      </form>

      {/* Confirmation Modal — shown only in Product By Brand mode */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 max-w-lg w-full mx-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Confirm Stock Update
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              <strong>{confirmItems.length}</strong> variation(s) with new quantity will be updated.
              Variations with Add Quantity = 0 will be skipped.
            </p>
            <div className="border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden max-h-60 overflow-y-auto mb-3">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Variation</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Product</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">Add Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {confirmItems.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5">
                        <span className="font-mono text-xs font-medium text-gray-900 dark:text-gray-100">{item.sku}</span>
                        {item.name && (
                          <span className="block text-xs text-gray-500 dark:text-gray-400">{item.name}</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400">{item.productName}</td>
                      <td className="px-3 py-1.5 text-right font-semibold text-green-600 dark:text-green-400">+{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Confirmed quantities will be added to existing stock (old + new).
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  setPendingPayload(null);
                  setConfirmItems([]);
                }}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer"
              >
                <GiSave className="w-4 h-4" />
                Confirm &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
