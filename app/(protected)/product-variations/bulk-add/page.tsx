'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Search, RefreshCw, Check, X, Loader2, Sparkles } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { notify } from '@/lib/notifications';
import productVariationService from '@/services/productVariationService';
import commonService from '@/services/commonService';
import CustomSelect, { SelectOption } from '@/components/ui/custom-select';
import BusinessTypeSelect from '@/components/ui/business-type-select';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import type { Category } from '@/types/api.types';

interface VariationRow {
  productId: string;
  productName: string;
  categoryName: string;
  sku: string;
  name: string;
  costPrice: string;
  sellingPrice: string;
  isGeneratingSku: boolean;
}

export default function BulkVariationAddPage() {
  const router = useRouter();
  const { isSuperAdmin } = usePermissions();
  const user = useAuthStore(state => state.user);
  const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const [businessTypeFilterId, setBusinessTypeFilterId] = useState<number | null>(
    isSuperAdmin ? null : tenantBusinessTypeId
  );
  const effectiveBusinessTypeId = isSuperAdmin ? businessTypeFilterId : tenantBusinessTypeId;

  const [selectedCategory, setSelectedCategory] = useState<SelectOption | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');

  const [variationRows, setVariationRows] = useState<VariationRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [resultSummary, setResultSummary] = useState<{
    show: boolean;
    created: number;
    failed: number;
    errors: any[];
  } | null>(null);

  const loadCategoryOptions = useCallback(async (inputValue: string) => {
    const params: any = {};
    if (effectiveBusinessTypeId) params.business_type_id = effectiveBusinessTypeId;
    if (inputValue) params.search = inputValue;
    try {
      const cats = await commonService.getCategoriesForDropdown(params);
      return cats.map((c: Category) => ({ value: c.id, label: c.name }));
    } catch {
      return [];
    }
  }, [effectiveBusinessTypeId]);

  const generateSkuForRowByIndex = async (
    index: number,
    productId: string,
    productName: string
  ) => {
    try {
      const sku = await productVariationService.generateSku(productId, productName);
      setVariationRows(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], sku, isGeneratingSku: false };
        }
        return updated;
      });
    } catch {
      setVariationRows(prev => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = { ...updated[index], isGeneratingSku: false };
        }
        return updated;
      });
    }
  };

  const handleSearch = async () => {
    setProductsLoading(true);
    setProductsError('');
    setResultSummary(null);
    setVariationRows([]);
    setErrors({});
    try {
      const params: any = {};
      if (effectiveBusinessTypeId) params.business_type_id = effectiveBusinessTypeId;
      if (selectedCategory?.value) params.category_id = selectedCategory.value;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const products = await productVariationService.getSimpleProducts(params);

      const rows: VariationRow[] = products.map(product => ({
        productId: product.id,
        productName: product.name,
        categoryName: product.category?.name || '',
        sku: '',
        name: 'Default',
        costPrice: '',
        sellingPrice: '',
        isGeneratingSku: true,
      }));
      setVariationRows(rows);

      for (let i = 0; i < rows.length; i++) {
        generateSkuForRowByIndex(i, rows[i].productId, rows[i].productName);
      }
    } catch (error: any) {
      setProductsError(error?.response?.data?.message || 'Failed to fetch products');
    } finally {
      setProductsLoading(false);
    }
  };

  const generateSkuForRow = async (row: VariationRow, index: number) => {
    setVariationRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isGeneratingSku: true };
      return updated;
    });
    try {
      const sku = await productVariationService.generateSku(row.productId, row.productName);
      setVariationRows(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], sku, isGeneratingSku: false };
        return updated;
      });
    } catch {
      setVariationRows(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], isGeneratingSku: false };
        return updated;
      });
    }
  };

  const removeProduct = (productId: string) => {
    setVariationRows(prev => prev.filter(r => r.productId !== productId));
    setErrors(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const updateRow = (productId: string, field: keyof VariationRow, value: any) => {
    setResultSummary(null);
    setVariationRows(prev =>
      prev.map(r => r.productId === productId ? { ...r, [field]: value } : r)
    );
    if (errors[productId]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  };

  const generateAllSkus = async () => {
    const rowsWithoutSku = variationRows.filter(r => !r.sku);
    if (rowsWithoutSku.length === 0) {
      notify.warning('All products already have SKUs');
      return;
    }
    setIsGeneratingAll(true);
    for (let i = 0; i < variationRows.length; i++) {
      const row = variationRows[i];
      if (!row.sku) {
        await generateSkuForRow(row, i);
      }
    }
    setIsGeneratingAll(false);
    notify.success('SKUs generated for all rows');
  };

  const handleSubmit = async () => {
    if (variationRows.length === 0) {
      notify.warning('No products to save');
      return;
    }

    let hasErrors = false;
    const newErrors: Record<string, string[]> = {};

    const skuToProductIds: Record<string, string[]> = {};
    variationRows.forEach(row => {
      const normalizedSku = row.sku.trim().toLowerCase();
      if (!normalizedSku) return;
      if (!skuToProductIds[normalizedSku]) {
        skuToProductIds[normalizedSku] = [];
      }
      skuToProductIds[normalizedSku].push(row.productId);
    });

    const duplicateProductIds = new Set<string>();
    Object.values(skuToProductIds).forEach(productIds => {
      if (productIds.length > 1) {
        productIds.forEach(pid => duplicateProductIds.add(pid));
      }
    });

    variationRows.forEach(row => {
      const rowErrors: string[] = [];
      if (!row.sku.trim()) rowErrors.push('SKU is required');
      if (duplicateProductIds.has(row.productId)) rowErrors.push('Duplicate SKU found in request');
      if (!row.costPrice || parseFloat(row.costPrice) <= 0) rowErrors.push('Cost price must be greater than 0');
      if (!row.sellingPrice || parseFloat(row.sellingPrice) <= 0) rowErrors.push('Selling price must be greater than 0');
      if (rowErrors.length > 0) {
        newErrors[row.productId] = rowErrors;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    if (hasErrors) {
      notify.error('Please fix validation errors before saving');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = variationRows.map(r => ({
        product_id: r.productId,
        sku: r.sku.trim(),
        name: r.name.trim() || 'Default',
        cost_price: parseFloat(r.costPrice),
        selling_price: parseFloat(r.sellingPrice),
      }));

      const result = await productVariationService.bulkStore(payload);

      setResultSummary({
        show: true,
        created: result.created,
        failed: result.failed,
        errors: result.errors || [],
      });

      if (result.failed === 0) {
        notify.success(`${result.created} variation(s) created successfully`);
        setVariationRows([]);
        setSelectedCategory(null);
        setSearchTerm('');
      } else {
        notify.warning(`${result.created} created, ${result.failed} failed`);
        if (result.errors) {
          const rowErrors: Record<string, string[]> = {};
          result.errors.forEach((err: any) => {
            const pid = String(err.product_id);
            rowErrors[pid] = [err.message];
          });
          setErrors(rowErrors);
        }
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to create variations';
      notify.error(msg);
      const bulkErrors = error?.response?.data?.data?.errors;
      if (Array.isArray(bulkErrors)) {
        const rowErrors: Record<string, string[]> = {};
        bulkErrors.forEach((err: any) => {
          const pid = String(err.product_id ?? '');
          if (!pid) return;
          if (!rowErrors[pid]) {
            rowErrors[pid] = [];
          }
          rowErrors[pid].push(err.message || 'Validation failed');
        });
        if (Object.keys(rowErrors).length > 0) {
          setErrors(rowErrors);
        }
      }
      if (error?.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Bulk Add Variations
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/product-variations')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-sm transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            Back to Variations
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Search Simple Products
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Find products with no variations to add variation data.
        </p>
        <div className="space-y-3">
          {isSuperAdmin && (
            <div className="w-full md:w-80">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Business Type
              </label>
              <BusinessTypeSelect
                value={businessTypeFilterId}
                onChange={setBusinessTypeFilterId}
                placeholder="All Business Types"
                isClearable
              />
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="w-full md:basis-2/5">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <CustomSelect
                key={effectiveBusinessTypeId || 'all-categories'}
                value={selectedCategory}
                onChange={(opt) => setSelectedCategory(opt)}
                loadOptions={loadCategoryOptions}
                placeholder="All Categories"
                isClearable
                defaultOptions
              />
            </div>
            <div className="w-full md:basis-1/2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search Product
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by product name..."
                  className="w-full px-2.5 py-1.5 pl-8 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none"
                />
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
            <button
              onClick={handleSearch}
              className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm transition-colors cursor-pointer h-8 w-full md:w-auto"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {productsLoading && (
        <div className="flex items-center justify-center py-8 text-sm text-gray-500">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Loading products...
        </div>
      )}

      {/* Error */}
      {productsError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-700 dark:text-red-400">
          {productsError}
          <button onClick={handleSearch} className="ml-2 underline hover:no-underline cursor-pointer">Retry</button>
        </div>
      )}

      {/* Variation Table */}
      {!productsLoading && !productsError && variationRows.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Variation Details ({variationRows.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={generateAllSkus}
                disabled={isGeneratingAll}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGeneratingAll ? 'Generating...' : 'Generate All SKUs'}
              </button>
              <button
                onClick={() => {
                  const avgCost = variationRows.reduce((s, r) => s + (parseFloat(r.costPrice) || 0), 0) / variationRows.length || 0;
                  variationRows.forEach(r => {
                    if (!r.costPrice) updateRow(r.productId, 'costPrice', String(Math.round(avgCost * 100) / 100 || ''));
                  });
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-sm transition-colors cursor-pointer"
              >
                Apply Avg Cost
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-8"></th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    SKU <span className="text-red-500">*</span>
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Cost Price <span className="text-red-500">*</span>
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Selling Price <span className="text-red-500">*</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {variationRows.map((row) => (
                  <tr key={row.productId} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 ${errors[row.productId] ? 'bg-red-50 dark:bg-red-900/10' : ''
                    }`}>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => removeProduct(row.productId)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        {row.productName}
                      </div>
                      {row.categoryName && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {row.categoryName}
                        </span>
                      )}
                      {errors[row.productId] && (
                        <div className="mt-1 text-xs text-red-600">
                          {errors[row.productId].map((e, i) => <div key={i}>{e}</div>)}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={row.sku}
                          onChange={(e) => updateRow(row.productId, 'sku', e.target.value)}
                          className={`w-36 px-2 py-1 text-xs bg-white dark:bg-gray-700 border ${errors[row.productId]?.some(e => e.toLowerCase().includes('sku'))
                              ? 'border-red-500'
                              : 'border-gray-300 dark:border-gray-600'
                            } focus:border-indigo-500 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none`}
                          placeholder="Auto-generated"
                        />
                        <button
                          onClick={() => {
                            const idx = variationRows.findIndex(r => r.productId === row.productId);
                            if (idx >= 0) generateSkuForRow(row, idx);
                          }}
                          disabled={row.isGeneratingSku}
                          className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded cursor-pointer disabled:opacity-50"
                          title="Generate SKU"
                        >
                          {row.isGeneratingSku ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateRow(row.productId, 'name', e.target.value)}
                        className="w-28 px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none"
                        placeholder="Default"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={row.costPrice}
                        onChange={(e) => updateRow(row.productId, 'costPrice', e.target.value)}
                        step="0.01"
                        min="0"
                        className={`w-28 px-2 py-1 text-xs bg-white dark:bg-gray-700 border ${errors[row.productId]?.some(e => e.toLowerCase().includes('cost'))
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-gray-600'
                          } focus:border-indigo-500 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none`}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={row.sellingPrice}
                        onChange={(e) => updateRow(row.productId, 'sellingPrice', e.target.value)}
                        step="0.01"
                        min="0"
                        className={`w-28 px-2 py-1 text-xs bg-white dark:bg-gray-700 border ${errors[row.productId]?.some(e => e.toLowerCase().includes('selling'))
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-gray-600'
                          } focus:border-indigo-500 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none`}
                        placeholder="0.00"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No results */}
      {!productsLoading && !productsError && variationRows.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
          <Package className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No products found. Try adjusting your search or filters.
          </p>
        </div>
      )}

      {/* Result Summary */}
      {resultSummary?.show && (
        <div className={`rounded-md shadow-sm border p-3 ${resultSummary.failed === 0
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          }`}>
          <div className="flex items-center gap-2 text-sm">
            {resultSummary.failed === 0 ? (
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <X className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            )}
            <span className={resultSummary.failed === 0 ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}>
              {resultSummary.created} variation(s) created
              {resultSummary.failed > 0 ? `, ${resultSummary.failed} failed` : ''}
            </span>
          </div>
          {resultSummary.errors.length > 0 && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400 space-y-1">
              {resultSummary.errors.map((err: any, i: number) => (
                <div key={i}>Row {err.row + 1}: {err.message}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit / Reset */}
      {variationRows.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GiSave className="w-4 h-4" />
            )}
            {isSubmitting ? 'Saving...' : `Save ${variationRows.length} Variation(s)`}
          </button>
          <button
            onClick={() => {
              setVariationRows([]);
              setErrors({});
              setResultSummary(null);
            }}
            className="flex items-center gap-2 px-4 py-1.5 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-sm transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
