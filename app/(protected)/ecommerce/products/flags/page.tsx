'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tag, Search, X, Eye, EyeOff, Loader2, Square, CheckSquare, SquareMinus, ChevronDown, ChevronRight } from 'lucide-react';
import { notify } from '@/lib/notifications';
import productFlagsService from '@/services/productFlagsService';
import commonService from '@/services/commonService';
import CustomSelect from '@/components/ui/custom-select';
import DateTimePicker from '@/components/ui/date-time-picker';
import { useAuthStore } from '@/stores/auth-store';
import type { ProductFlagsItem, ProductFlagsVariation } from '@/types/api.types';
import type { SelectOption } from '@/components/ui/custom-select';

const FLAGS = [
  { key: 'is_featured' as const, label: 'Featured', color: 'purple' },
  { key: 'is_new' as const, label: 'New Arrival', color: 'blue' },
  { key: 'is_bestseller' as const, label: 'Bestseller', color: 'amber' },
  { key: 'is_on_sale' as const, label: 'On Sale', color: 'green' },
];

type FlagKey = (typeof FLAGS)[number]['key'];
type TogglableKey = FlagKey | 'is_visible_on_storefront';

// Composite key: product_id + variation_id. Backend resolves flags per
// (tenant, product, variation) — see product_variation_id on
// ecommerce_product_visibility.
const varKey = (productId: string, variationId: string | null) => `${productId}|${variationId ?? 'base'}`;
const parseVarKey = (key: string): { productId: string; variationId: string | null } => {
  const idx = key.indexOf('|');
  const productId = key.slice(0, idx);
  const variationId = key.slice(idx + 1);
  return { productId, variationId: variationId === 'base' ? null : variationId };
};

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
        checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-3' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function FlagBadge({ active, color }: { active: boolean; color: string }) {
  if (!active) return null;
  const colors: Record<string, string> = {
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  };
  return <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-sm ${colors[color]}`}>ON</span>;
}

export default function FlagsPage() {
  const user = useAuthStore(state => state.user);
  const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null;

  const [items, setItems] = useState<ProductFlagsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SelectOption | null>(null);
  const [searchInput, setSearchInput] = useState('');

  // Debounced search like the product-manage tree — no Search button needed.
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = searchInput.trim();
      setSearch(prev => (prev === trimmed ? prev : trimmed));
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [detailsForm, setDetailsForm] = useState<Record<string, { hide_when_out_of_stock: boolean; available_from: string; available_until: string }>>({});
  const [savingDetails, setSavingDetails] = useState<Record<string, boolean>>({});

  // Only fetch when a category is selected — no list on initial page load
  const fetchData = useCallback(async () => {
    if (!selectedCategory) return;
    setLoading(true);
    try {
      const res = await productFlagsService.list({
        page,
        per_page: 20,
        ...(search ? { search } : {}),
        category_id: Number(selectedCategory.value),
      });
      setItems(res.data);
      setTotal(res.meta.total);
      setLastPage(res.meta.last_page);
    } catch {
      notify.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategory]);

  useEffect(() => {
    if (selectedCategory) {
      fetchData();
      setExpandedRow(null);
    } else {
      setItems([]);
      setTotal(0);
      setLastPage(1);
      setPage(1);
    }
  }, [selectedCategory]);

  const loadCategoryOptions = useCallback(
    async (inputValue: string): Promise<SelectOption[]> => {
      try {
        const params: { search?: string; business_type_id?: number } = {};
        if (inputValue) params.search = inputValue;
        if (tenantBusinessTypeId) params.business_type_id = tenantBusinessTypeId;
        const data = await commonService.getCategoriesForDropdown(params);
        // Parent categories first, then their subcategories. Subcategory
        // options carry isSubcategory so the dropdown can badge them.
        type CategoryOption = SelectOption & { isSubcategory?: boolean };
        const parents = data.filter(c => !c.parent_id);
        const childrenByParent = new Map<string, typeof data>();
        for (const c of data) {
          if (!c.parent_id) continue;
          const list = childrenByParent.get(String(c.parent_id));
          if (list) list.push(c);
          else childrenByParent.set(String(c.parent_id), [c]);
        }
        const options: CategoryOption[] = [];
        for (const p of parents) {
          options.push({ value: String(p.id), label: p.name });
          for (const child of childrenByParent.get(String(p.id)) ?? []) {
            options.push({
              value: String(child.id),
              label: `${p.name} › ${child.name}`,
              isSubcategory: true,
            });
          }
        }
        // Children whose parent wasn't in the result (e.g. search hits) still show.
        for (const c of data) {
          if (c.parent_id && !parents.some(p => String(p.id) === String(c.parent_id))) {
            const parentName = c.parent?.name ?? c.parent_category;
            options.push({
              value: String(c.id),
              label: parentName ? `${parentName} › ${c.name}` : c.name,
              isSubcategory: true,
            });
          }
        }
        return options;
      } catch {
        return [];
      }
    },
    [tenantBusinessTypeId]
  );

  // Group products by category, each table then lists product_variation rows.
  const grouped = useMemo(() => {
    const map = new Map<string, ProductFlagsItem[]>();
    for (const item of items) {
      const cat = item.category?.name ?? 'Uncategorized';
      const list = map.get(cat);
      if (list) list.push(item);
      else map.set(cat, [item]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const allVariationKeys = useMemo(() => {
    const keys: string[] = [];
    for (const item of items) {
      if (item.variations.length === 0) {
        keys.push(varKey(item.product_id, null));
      } else {
        for (const v of item.variations) keys.push(varKey(item.product_id, v.id));
      }
    }
    return keys;
  }, [items]);

  const patchVariation = (
    productId: string,
    variationId: string | null,
    patch: Partial<ProductFlagsVariation & ProductFlagsItem>
  ) => {
    setItems(prev =>
      prev.map(item => {
        if (item.product_id !== productId) return item;
        if (variationId === null) return { ...item, ...patch };
        return {
          ...item,
          variations: item.variations.map(v => (v.id === variationId ? { ...v, ...patch } : v)),
        };
      })
    );
  };

  const handleToggle = async (
    productId: string,
    variationId: string | null,
    flagKey: TogglableKey,
    value: boolean
  ) => {
    const key = varKey(productId, variationId);
    setToggling(prev => ({ ...prev, [`${key}-${flagKey}`]: true }));
    const payload: Record<string, boolean> = { [flagKey]: value };
    if (value && flagKey !== 'is_visible_on_storefront') {
      payload.is_visible_on_storefront = true;
    }
    try {
      await productFlagsService.update(productId, {
        ...(variationId ? { product_variation_id: variationId } : {}),
        ...payload,
      });
      patchVariation(productId, variationId, payload);
    } catch {
      notify.error('Failed to update flag');
    } finally {
      setToggling(prev => ({ ...prev, [`${key}-${flagKey}`]: false }));
    }
  };

  const handleBulkFlag = async (flagKey: TogglableKey, value: boolean) => {
    if (selected.size === 0) {
      notify.warning('No variations selected');
      return;
    }
    setBulkSaving(true);
    try {
      const payload: Record<string, boolean> = { [flagKey]: value };
      if (value && flagKey !== 'is_visible_on_storefront') {
        payload.is_visible_on_storefront = true;
      }
      const keys = Array.from(selected);
      const results = await Promise.allSettled(
        keys.map(k => {
          const { productId, variationId } = parseVarKey(k);
          return productFlagsService.update(productId, {
            ...(variationId ? { product_variation_id: variationId } : {}),
            ...payload,
          });
        })
      );
      const okCount = results.filter(r => r.status === 'fulfilled').length;
      if (okCount < keys.length) {
        notify.warning(`${okCount} of ${keys.length} variations updated`);
      } else {
        notify.success(`${okCount} variations updated`);
      }
      setSelected(new Set());
      fetchData();
    } catch {
      notify.error('Failed to update flags');
    } finally {
      setBulkSaving(false);
    }
  };

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const currentPageAllSelected = () => allVariationKeys.length > 0 && allVariationKeys.every(k => selected.has(k));
  const currentPageSomeSelected = () => allVariationKeys.some(k => selected.has(k));

  const toggleSelectAll = () => {
    if (allVariationKeys.every(k => selected.has(k))) {
      const next = new Set(selected);
      allVariationKeys.forEach(k => next.delete(k));
      setSelected(next);
    } else {
      const next = new Set(selected);
      allVariationKeys.forEach(k => next.add(k));
      setSelected(next);
    }
  };

  const toggleSelectCategory = (categoryItems: ProductFlagsItem[]) => {
    const keys: string[] = [];
    for (const item of categoryItems) {
      if (item.variations.length === 0) keys.push(varKey(item.product_id, null));
      else for (const v of item.variations) keys.push(varKey(item.product_id, v.id));
    }
    const allSelected = keys.every(k => selected.has(k));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  const findRow = (key: string): { item: ProductFlagsItem; variation: ProductFlagsVariation | null } | null => {
    const { productId, variationId } = parseVarKey(key);
    const item = items.find(i => i.product_id === productId);
    if (!item) return null;
    if (variationId === null) return { item, variation: null };
    const variation = item.variations.find(v => v.id === variationId) ?? null;
    if (!variation) return null;
    return { item, variation };
  };

  const toggleExpand = (key: string) => {
    if (expandedRow === key) {
      setExpandedRow(null);
    } else {
      const found = findRow(key);
      if (found) {
        const src = found.variation ?? found.item;
        setDetailsForm(prev => ({
          ...prev,
          [key]: {
            hide_when_out_of_stock: src.hide_when_out_of_stock,
            available_from: src.available_from ?? '',
            available_until: src.available_until ?? '',
          },
        }));
      }
      setExpandedRow(key);
    }
  };

  const handleSaveDetails = async (key: string) => {
    const form = detailsForm[key];
    if (!form) return;
    const { productId, variationId } = parseVarKey(key);
    setSavingDetails(prev => ({ ...prev, [key]: true }));
    try {
      await productFlagsService.update(productId, {
        ...(variationId ? { product_variation_id: variationId } : {}),
        hide_when_out_of_stock: form.hide_when_out_of_stock,
        available_from: form.available_from || null,
        available_until: form.available_until || null,
      });
      patchVariation(productId, variationId, {
        hide_when_out_of_stock: form.hide_when_out_of_stock,
        available_from: form.available_from || null,
        available_until: form.available_until || null,
      });
      notify.success('Details saved');
    } catch {
      notify.error('Failed to save details');
    } finally {
      setSavingDetails(prev => ({ ...prev, [key]: false }));
    }
  };

  const COL_SPAN = 11;

  const renderVariationRow = (item: ProductFlagsItem, variation: ProductFlagsVariation | null) => {
    const key = varKey(item.product_id, variation?.id ?? null);
    const row = variation ?? item;
    const isBase = variation === null;
    return (
      <React.Fragment key={key}>
        <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${loading ? 'opacity-40 pointer-events-none' : ''}`}>
          <td className="px-3 py-2">
            <button onClick={() => toggleSelect(key)} className="cursor-pointer">
              {selected.has(key) ? (
                <CheckSquare className="w-4 h-4 text-indigo-600" />
              ) : (
                <Square className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </td>
          <td className="px-3 py-2">
            <div className="flex items-center gap-2">
              {item.image ? (
                <img src={item.image.thumb_url} alt="" className="w-7 h-7 rounded-sm object-cover border border-gray-200 dark:border-gray-600" />
              ) : (
                <div className="w-7 h-7 rounded-sm bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  <Tag className="w-3 h-3 text-gray-400" />
                </div>
              )}
              <div className="min-w-0">
                <div className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{item.product_name}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{item.product_slug}</div>
              </div>
            </div>
          </td>
          <td className="px-3 py-2">
            {isBase ? (
              <span className="text-xs text-gray-400 italic">No variations</span>
            ) : (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-900 dark:text-gray-100 text-xs truncate">
                    {variation!.name ?? variation!.sku}
                  </span>
                  {variation!.is_default && (
                    <span className="px-1 py-px text-[10px] font-medium rounded-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">Default</span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {variation!.sku}
                  {variation!.product_code ? ` · ${variation!.product_code}` : ''}
                  {variation!.brand ? ` · ${variation!.brand.name}` : ''}
                </div>
              </div>
            )}
          </td>
          <td className="px-3 py-2 text-right whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">
            {isBase ? <span className="text-gray-400">—</span> : variation!.selling_price.toFixed(2)}
          </td>
          <td className="px-3 py-2 text-right whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">
            {isBase ? (
              <span className="text-gray-400">—</span>
            ) : (
              <span className={variation!.stock.available_quantity > 0 ? '' : 'text-red-500 font-medium'}>
                {variation!.stock.available_quantity}
              </span>
            )}
          </td>
          <td className="px-3 py-2 text-center">
            <button
              onClick={() => toggleExpand(key)}
              className="cursor-pointer text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              {expandedRow === key ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </td>
          {FLAGS.map(flag => (
            <td key={flag.key} className="px-3 py-2 text-center">
              <div className="flex flex-col items-center gap-1">
                <ToggleSwitch
                  checked={row[flag.key]}
                  onChange={v => handleToggle(item.product_id, variation?.id ?? null, flag.key, v)}
                  disabled={toggling[`${key}-${flag.key}`]}
                />
                <FlagBadge active={row[flag.key]} color={flag.color} />
              </div>
            </td>
          ))}
          <td className="px-3 py-2 text-center">
            <div className="flex flex-col items-center gap-1">
              <ToggleSwitch
                checked={row.is_visible_on_storefront}
                onChange={v => handleToggle(item.product_id, variation?.id ?? null, 'is_visible_on_storefront', v)}
                disabled={toggling[`${key}-is_visible_on_storefront`]}
              />
              {row.is_visible_on_storefront ? (
                <Eye className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-gray-400" />
              )}
            </div>
          </td>
        </tr>
        {expandedRow === key && (
          <tr className="bg-gray-50 dark:bg-gray-700/20">
            <td colSpan={COL_SPAN} className="px-6 py-3">
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Hide Out of stock</label>
                  <ToggleSwitch
                    checked={detailsForm[key]?.hide_when_out_of_stock ?? false}
                    onChange={v => setDetailsForm(prev => ({ ...prev, [key]: { ...prev[key], hide_when_out_of_stock: v } }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Available From</label>
                  <DateTimePicker
                    value={detailsForm[key]?.available_from ?? ''}
                    onChange={v => setDetailsForm(prev => ({ ...prev, [key]: { ...prev[key], available_from: v } }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Available Until</label>
                  <DateTimePicker
                    value={detailsForm[key]?.available_until ?? ''}
                    onChange={v => setDetailsForm(prev => ({ ...prev, [key]: { ...prev[key], available_until: v } }))}
                  />
                </div>
                <button
                  onClick={() => handleSaveDetails(key)}
                  disabled={savingDetails[key]}
                  className="px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm disabled:opacity-50 cursor-pointer"
                >
                  {savingDetails[key] ? 'Saving...' : 'Save'}
                </button>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        Featured / New / Bestseller / On Sale Flags
      </h1>

      {/* Filters — same look as the product-manage tree panel: one row, half/half */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-3 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
              <CustomSelect
                value={selectedCategory}
                onChange={option => { setSelectedCategory(option); setPage(1); }}
                loadOptions={loadCategoryOptions}
                placeholder="Select a category to load products"
                isClearable
                defaultOptions
                compact
                formatOptionLabel={(option, context) => {
                  // Subcategory options carry isSubcategory — badge them. In the
                  // dropdown menu the badge shows next to the child name; in the
                  // selected value it stays compact.
                  const isSub = (option as SelectOption & { isSubcategory?: boolean }).isSubcategory;
                  if (!isSub) return <span className="font-medium">{option.label}</span>;
                  const sepIdx = option.label.indexOf(' › ');
                  const parentName = sepIdx === -1 ? null : option.label.slice(0, sepIdx);
                  const childName = sepIdx === -1 ? option.label : option.label.slice(sepIdx + 3);
                  if (context.context === 'menu') {
                    return (
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-gray-500 dark:text-gray-400 text-[11px]">{parentName}</span>
                        <span className="text-gray-300 dark:text-gray-600">/</span>
                        <span className="truncate font-medium">{childName}</span>
                        <span className="ml-auto shrink-0 px-1 py-px text-[10px] font-semibold rounded-sm bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                          Sub
                        </span>
                      </span>
                    );
                  }
                  return (
                    <span className="flex items-center gap-1 min-w-0">
                      <span className="truncate">{childName}</span>
                      <span className="shrink-0 px-1 py-px text-[10px] font-semibold rounded-sm bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                        Sub
                      </span>
                    </span>
                  );
                }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">Search Product</label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search products, variations, brands..."
                  className="w-full pl-7 pr-8 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {searchInput && (
                  <button
                    onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          {selectedCategory ? `${total} products · ${allVariationKeys.length} variations` : 'Select a category to load products'}
        </div>
      </div>

      {/* Empty state — no category selected */}
      {!selectedCategory && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 px-3 py-12 text-center text-sm text-gray-500">
          Select a category above to view and manage product flags
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-md p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
              {selected.size} variation{selected.size > 1 ? 's' : ''} selected
              {selected.size > allVariationKeys.length && (
                <span className="font-normal text-indigo-500 dark:text-indigo-400"> ({allVariationKeys.length} on this page)</span>
              )}
            </span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 underline cursor-pointer ml-2"
            >
              Clear all
            </button>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {FLAGS.map(flag => (
              <div key={flag.key} className="flex items-center gap-1">
                <button
                  onClick={() => handleBulkFlag(flag.key, true)}
                  disabled={bulkSaving}
                  className="px-2 py-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm disabled:opacity-50 cursor-pointer"
                >
                  Set {flag.label}
                </button>
                <button
                  onClick={() => handleBulkFlag(flag.key, false)}
                  disabled={bulkSaving}
                  className="px-2 py-1 text-xs font-medium bg-gray-500 hover:bg-gray-600 text-white rounded-sm disabled:opacity-50 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            ))}
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleBulkFlag('is_visible_on_storefront', true)}
                disabled={bulkSaving}
                className="px-2 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-sm disabled:opacity-50 cursor-pointer flex items-center gap-1"
              >
                <Eye className="w-3 h-3" /> Show
              </button>
              <button
                onClick={() => handleBulkFlag('is_visible_on_storefront', false)}
                disabled={bulkSaving}
                className="px-2 py-1 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-sm disabled:opacity-50 cursor-pointer flex items-center gap-1"
              >
                <EyeOff className="w-3 h-3" /> Hide
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Category-wise variation tables */}
      {grouped.length === 0 && !loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 px-3 py-12 text-center text-sm text-gray-500">
          No products found
        </div>
      ) : (
        grouped.map(([categoryName, categoryItems]) => {
          const variationCount = categoryItems.reduce((n, i) => n + Math.max(i.variations.length, 1), 0);
          const catKeys: string[] = [];
          for (const item of categoryItems) {
            if (item.variations.length === 0) catKeys.push(varKey(item.product_id, null));
            else for (const v of item.variations) catKeys.push(varKey(item.product_id, v.id));
          }
          const catAllSelected = catKeys.length > 0 && catKeys.every(k => selected.has(k));
          const catSomeSelected = catKeys.some(k => selected.has(k));
          return (
            <div key={categoryName} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <button onClick={() => toggleSelectCategory(categoryItems)} className="cursor-pointer">
                  {catAllSelected ? (
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                  ) : catSomeSelected ? (
                    <SquareMinus className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{categoryName}</h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {categoryItems.length} product{categoryItems.length !== 1 ? 's' : ''} · {variationCount} variation{variationCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left w-8">
                        <button onClick={toggleSelectAll} className="cursor-pointer" title="Select all on page">
                          {allVariationKeys.length > 0 && currentPageAllSelected() ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : allVariationKeys.length > 0 && currentPageSomeSelected() ? (
                            <SquareMinus className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Product</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Variation</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Price</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Avail.</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-16">Details</th>
                      {FLAGS.map(flag => (
                        <th key={flag.key} className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider min-w-[100px]">
                          {flag.label}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Visible in Store</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {categoryItems.flatMap(item =>
                      item.variations.length === 0
                        ? [renderVariationRow(item, null)]
                        : item.variations.map(v => renderVariationRow(item, v))
                    )}
                    {loading && (
                      <tr>
                        <td colSpan={COL_SPAN} className="px-3 py-2 text-center">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-500 mx-auto" />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/30">
          <span className="text-xs text-gray-500">Page {page} of {lastPage} ({total} total)</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">First</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">Prev</button>
            <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage}
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-sm disabled:opacity-50 cursor-pointer bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">Next</button>
            <button onClick={() => setPage(lastPage)} disabled={page === lastPage}
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">Last</button>
          </div>
        </div>
      )}
    </div>
  );
}