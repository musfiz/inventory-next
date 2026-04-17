'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { notify } from '@/lib/notifications';
import CustomSelect from '@/components/ui/custom-select';
import { stockService, commonService } from '@/services';
import { usePermissions } from '@/hooks/use-permissions';
import { Package2, RefreshCcw, SaveAll } from 'lucide-react';

export default function StockAddPage() {
  const { isSuperAdmin } = usePermissions();

  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [defaultTenantOptions, setDefaultTenantOptions] = useState<any[]>([]);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [defaultWarehouseOptions, setDefaultWarehouseOptions] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [defaultProductOptions, setDefaultProductOptions] = useState<any[]>([]);

  const [variations, setVariations] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);

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
    const list = await commonService.getProductsForDropdown({ search: input }).catch(() => []);
    return (list || []).map((p: any) => ({ value: p.id, label: p.name }));
  };

  const loadWarehouseOptions = async (input: string) => {
    const tenant_id = isSuperAdmin ? selectedTenant?.value : authUser?.tenant_id;
    const list = await commonService.getWarehousesByTenant({ search: input, tenant_id }).catch(() => []);
    return (list || []).map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` }));
  };

  const authUser = useAuthStore((s) => s.user);

  // Prefetch warehouse options: for tenant users load their warehouses, for superadmin load when tenant selected
  useEffect(() => {
    const prefetch = async () => {
      if (!isSuperAdmin && authUser?.tenant_id) {
        const list = await commonService.getWarehousesByTenant({ tenant_id: authUser.tenant_id }).catch(() => []);
        setDefaultWarehouseOptions((list || []).map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` })));
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
        const list = await commonService.getWarehousesByTenant({ tenant_id: selectedTenant.value }).catch(() => []);
        setDefaultWarehouseOptions((list || []).map((w: any) => ({ value: w.id, label: `${w.name} (${w.code})` })));
      } else if (isSuperAdmin && !selectedTenant) {
        setDefaultWarehouseOptions([]);
      }
    };
    prefetchForTenant();
  }, [isSuperAdmin, selectedTenant]);

  useEffect(() => {
    // when product selected, load its variations
    const load = async () => {
      if (!selectedProduct) return;
      try {
        const items = await commonService.getVariationsByProduct(selectedProduct.value).catch(() => []);
        setVariations(items || []);
        setStocks((items || []).map((v: any) => ({ variation_id: v.id, quantity: v.stock?.quantity ?? 0, reserved_quantity: v.stock?.reserved_quantity ?? 0, min_quantity: v.stock?.min_quantity ?? null, max_quantity: v.stock?.max_quantity ?? null, reorder_point: v.stock?.reorder_point ?? null })));
      } catch (err) {
        console.error('Failed to load variations', err);
        setVariations([]);
        setStocks([]);
      }
    };
    load();
  }, [selectedProduct]);

  const handleStockChange = (index: number, field: string, value: any) => {
    const copy = [...stocks];
    copy[index] = { ...copy[index], [field]: value };
    setStocks(copy);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    // validation
    const errors: { [key: string]: string } = {};
    if (isSuperAdmin && !selectedTenant) { errors.tenant_id = 'Tenant is required'; }
    if (!selectedWarehouse) { errors.warehouse_id = 'Warehouse is required'; }
    if (!selectedProduct) { errors.product_id = 'Product is required'; }
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    try {
      const payload = {
        tenant_id: isSuperAdmin ? selectedTenant?.value : undefined,
        warehouse_id: selectedWarehouse.value,
        product_id: selectedProduct.value,
        stocks: stocks.map((s, i) => ({
          variation_id: s.variation_id,
          quantity: s.quantity || 0,
          reserved_quantity: s.reserved_quantity || 0,
          // If min_quantity is empty/null/undefined, default to 1
          min_quantity: (s.min_quantity === undefined || s.min_quantity === null || s.min_quantity === '') ? 1 : Number(s.min_quantity),
          max_quantity: (s.max_quantity === undefined || s.max_quantity === null || s.max_quantity === '') ? null : Number(s.max_quantity),
          reorder_point: (s.reorder_point === undefined || s.reorder_point === null || s.reorder_point === '') ? null : Number(s.reorder_point),
        })),
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
        Object.entries(err.response.data.errors).forEach(([k, v]: any) => { transformed[k] = Array.isArray(v) ? v.join(', ') : v; });
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant <span className="text-red-500">*</span></label>
              <CustomSelect
                value={selectedTenant}
                onChange={(o: any) => {
                  setSelectedTenant(o);
                  // clear tenant error
                  if (o?.value && formErrors.tenant_id) {
                    const { tenant_id, ...rest } = formErrors;
                    setFormErrors(rest);
                  }
                  // clear selected warehouse when tenant changes
                  setSelectedWarehouse(null);
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse <span className="text-red-500">*</span></label>
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
              placeholder="Select warehouse"
              className="text-sm"
              isInvalid={!!formErrors.warehouse_id}
            />
            {formErrors.warehouse_id && (
              <p className="text-red-600 text-xs mt-1">{formErrors.warehouse_id}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product <span className="text-red-500">*</span></label>
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
                  placeholder="Select product"
                  className="text-sm"
                  isInvalid={!!formErrors.product_id}
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
                  <span><RefreshCcw className="w-5 h-5 cursor-pointer" /></span>
                </button>
              )}
            </div>
            {formErrors.product_id && (
              <p className="text-red-600 text-xs mt-1">{formErrors.product_id}</p>
            )}
          </div>
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
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 w-12">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 min-w-[200px]">Variation (SKU / Name)</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 w-32">Quantity</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 w-32">Reserved</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 w-28">Min Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 w-28">Max Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600 w-28">Reorder Point</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {variations.map((v, idx) => (
                      <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        <td className="px-2 py-1 text-gray-600 dark:text-gray-400 font-medium">{idx + 1}</td>
                        <td className="px-3 py-1">
                          <div className="flex flex-col">
                            {v.sku && <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{v.sku}</span>}
                            {v.name && <span className="text-xs text-gray-500 dark:text-gray-400">{v.name}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-1">
                          <input
                            type="number"
                            value={stocks[idx]?.quantity ?? 0}
                            onChange={e => handleStockChange(idx, 'quantity', e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 transition-all"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-1">
                          <input
                            type="number"
                            value={stocks[idx]?.reserved_quantity ?? 0}
                            onChange={e => handleStockChange(idx, 'reserved_quantity', e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 transition-all"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-1">
                          <input
                            type="number"
                            value={stocks[idx]?.min_quantity ?? 1}
                            onChange={e => handleStockChange(idx, 'min_quantity', e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 transition-all"
                            placeholder="Opt."
                          />
                        </td>
                        <td className="px-3 py-1">
                          <input
                            type="number"
                            value={stocks[idx]?.max_quantity ?? ''}
                            onChange={e => handleStockChange(idx, 'max_quantity', e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 transition-all"
                            placeholder="Opt."
                          />
                        </td>
                        <td className="px-3 py-1">
                          <input
                            type="number"
                            value={stocks[idx]?.reorder_point ?? ''}
                            onChange={e => handleStockChange(idx, 'reorder_point', e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 transition-all"
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
              <span className="font-medium">Note:</span> Scroll within the table to view all variations. All values are auto-selected on focus for quick editing.
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer">
            <SaveAll className="w-4 h-4" />
            Save Stocks
          </button>
        </div>
      </form>
    </div>
  );
}
