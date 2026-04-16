'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { notify } from '@/lib/notifications';
import CustomSelect from '@/components/ui/custom-select';
import { productService, warehouseService, stockService, commonService } from '@/services';
import { usePermissions } from '@/hooks/use-permissions';

export default function StockAddPage() {
  const { isSuperAdmin } = usePermissions();

  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [defaultTenantOptions, setDefaultTenantOptions] = useState<any[]>([]);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [defaultWarehouseOptions, setDefaultWarehouseOptions] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

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
        const res = await productService.getProductVariations(selectedProduct.value, { per_page: 200 });
        const items = res.data || [];
        setVariations(items);
        setStocks(items.map((v: any) => ({ variation_id: v.id, quantity: v.stock?.quantity ?? 0, reserved_quantity: v.stock?.reserved_quantity ?? 0, min_quantity: v.stock?.min_quantity ?? null, max_quantity: v.stock?.max_quantity ?? null, reorder_point: v.stock?.reorder_point ?? null })));
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
        stocks: stocks.map((s, i) => ({ variation_id: s.variation_id, quantity: s.quantity || 0, reserved_quantity: s.reserved_quantity || 0, min_quantity: s.min_quantity, max_quantity: s.max_quantity, reorder_point: s.reorder_point })),
      };

      await stockService.storeStocks(payload);
      notify.success('Stocks saved successfully');
      setFormErrors({});
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
              placeholder="Select product"
              className="text-sm"
              isInvalid={!!formErrors.product_id}
            />
            {formErrors.product_id && (
              <p className="text-red-600 text-xs mt-1">{formErrors.product_id}</p>
            )}
          </div>
        </div>

        {/* Variations table */}
        {variations.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-1">#</th>
                  <th className="py-1">Variation</th>
                  <th className="py-1">Quantity</th>
                  <th className="py-1">Reserved</th>
                  <th className="py-1">Min</th>
                  <th className="py-1">Max</th>
                  <th className="py-1">Reorder</th>
                </tr>
              </thead>
              <tbody>
                {variations.map((v, idx) => (
                  <tr key={v.id} className="border-t">
                    <td className="py-1 align-top">{idx+1}</td>
                    <td className="py-1 align-top">{v.sku || v.name}</td>
                    <td className="py-1"><input type="number" value={stocks[idx]?.quantity ?? 0} onChange={e=>handleStockChange(idx,'quantity',e.target.value)} className="w-24 px-2 py-1 text-sm border rounded" /></td>
                    <td className="py-1"><input type="number" value={stocks[idx]?.reserved_quantity ?? 0} onChange={e=>handleStockChange(idx,'reserved_quantity',e.target.value)} className="w-24 px-2 py-1 text-sm border rounded" /></td>
                    <td className="py-1"><input type="number" value={stocks[idx]?.min_quantity ?? ''} onChange={e=>handleStockChange(idx,'min_quantity',e.target.value)} className="w-20 px-2 py-1 text-sm border rounded" /></td>
                    <td className="py-1"><input type="number" value={stocks[idx]?.max_quantity ?? ''} onChange={e=>handleStockChange(idx,'max_quantity',e.target.value)} className="w-20 px-2 py-1 text-sm border rounded" /></td>
                    <td className="py-1"><input type="number" value={stocks[idx]?.reorder_point ?? ''} onChange={e=>handleStockChange(idx,'reorder_point',e.target.value)} className="w-20 px-2 py-1 text-sm border rounded" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white rounded">Save Stocks</button>
        </div>
      </form>
    </div>
  );
}
