'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Search, Eye, EyeOff, Loader2, Square, CheckSquare, SquareMinus, ChevronDown, ChevronRight } from 'lucide-react';
import { notify } from '@/lib/notifications';
import productFlagsService from '@/services/productFlagsService';
import commonService from '@/services/commonService';
import CustomSelect from '@/components/ui/custom-select';
import DateTimePicker from '@/components/ui/date-time-picker';
import { useAuthStore } from '@/stores/auth-store';
import type { ProductFlagsItem } from '@/types/api.types';
import type { SelectOption } from '@/components/ui/custom-select';

const FLAGS = [
  { key: 'is_featured' as const, label: 'Featured', color: 'purple' },
  { key: 'is_new' as const, label: 'New Arrival', color: 'blue' },
  { key: 'is_bestseller' as const, label: 'Bestseller', color: 'amber' },
  { key: 'is_on_sale' as const, label: 'On Sale', color: 'green' },
];

type FlagKey = (typeof FLAGS)[number]['key'];
type TogglableKey = FlagKey | 'is_visible_on_storefront';

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
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SelectOption | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [detailsForm, setDetailsForm] = useState<Record<string, { hide_when_out_of_stock: boolean; available_from: string; available_until: string }>>({});
  const [savingDetails, setSavingDetails] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productFlagsService.list({
        page,
        per_page: 20,
        ...(search ? { search } : {}),
        ...(selectedCategory ? { category_id: Number(selectedCategory.value) } : {}),
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

  const loadCategoryOptions = useCallback(
    async (inputValue: string): Promise<SelectOption[]> => {
      try {
        const params: { search?: string; business_type_id?: number } = {};
        if (inputValue) params.search = inputValue;
        if (tenantBusinessTypeId) params.business_type_id = tenantBusinessTypeId;
        const data = await commonService.getCategoriesForDropdown(params);
        return data.map(c => ({ value: String(c.id), label: c.name }));
      } catch {
        return [];
      }
    },
    [tenantBusinessTypeId]
  );

  useEffect(() => {
    fetchData();
    setExpandedRow(null);
  }, [fetchData]);

  const handleToggle = async (productId: string, flagKey: TogglableKey, value: boolean) => {
    setToggling(prev => ({ ...prev, [`${productId}-${flagKey}`]: true }));
    const payload: Record<string, boolean> = { [flagKey]: value };
    if (value && flagKey !== 'is_visible_on_storefront') {
      payload.is_visible_on_storefront = true;
    }
    try {
      await productFlagsService.update(productId, payload);
      setItems(prev =>
        prev.map(i => (i.product_id === productId ? { ...i, ...payload } : i))
      );
    } catch {
      notify.error('Failed to update flag');
    } finally {
      setToggling(prev => ({ ...prev, [`${productId}-${flagKey}`]: false }));
    }
  };

  const handleBulkFlag = async (flagKey: TogglableKey, value: boolean) => {
    if (selected.size === 0) {
      notify.warning('No products selected');
      return;
    }
    setBulkSaving(true);
    try {
      const count = await productFlagsService.bulkUpdate(Array.from(selected), {
        [flagKey]: value,
      });
      notify.success(`${count} products updated`);
      setSelected(new Set());
      fetchData();
    } catch {
      notify.error('Failed to update flags');
    } finally {
      setBulkSaving(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpand = (productId: string) => {
    if (expandedRow === productId) {
      setExpandedRow(null);
    } else {
      const item = items.find(i => i.product_id === productId);
      if (item) {
        setDetailsForm(prev => ({
          ...prev,
          [productId]: {
            hide_when_out_of_stock: item.hide_when_out_of_stock,
            available_from: item.available_from ?? '',
            available_until: item.available_until ?? '',
          },
        }));
      }
      setExpandedRow(productId);
    }
  };

  const handleSaveDetails = async (productId: string) => {
    const form = detailsForm[productId];
    if (!form) return;
    setSavingDetails(prev => ({ ...prev, [productId]: true }));
    try {
      await productFlagsService.update(productId, {
        hide_when_out_of_stock: form.hide_when_out_of_stock,
        available_from: form.available_from || null,
        available_until: form.available_until || null,
      });
      setItems(prev =>
        prev.map(i =>
          i.product_id === productId
            ? {
                ...i,
                hide_when_out_of_stock: form.hide_when_out_of_stock,
                available_from: form.available_from || null,
                available_until: form.available_until || null,
              }
            : i
        )
      );
      notify.success('Details saved');
    } catch {
      notify.error('Failed to save details');
    } finally {
      setSavingDetails(prev => ({ ...prev, [productId]: false }));
    }
  };

  const currentPageAllSelected = () => items.length > 0 && items.every(i => selected.has(i.product_id));
  const currentPageSomeSelected = () => items.some(i => selected.has(i.product_id));

  const toggleSelectAll = () => {
    const currentIds = items.map(i => i.product_id);
    const allCurrentSelected = currentIds.every(id => selected.has(id));
    if (allCurrentSelected) {
      const next = new Set(selected);
      currentIds.forEach(id => next.delete(id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      currentIds.forEach(id => next.add(id));
      setSelected(next);
    }
  };

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        Featured / New / Bestseller / On Sale Flags
      </h1>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-end gap-3">
          <div className="w-56">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
            <CustomSelect
              value={selectedCategory}
              onChange={option => { setSelectedCategory(option); setPage(1); }}
              loadOptions={loadCategoryOptions}
              placeholder="All categories"
              isClearable
              defaultOptions
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Search Product</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                onClick={() => { setSearch(searchInput); setPage(1); }}
                className="px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm cursor-pointer"
              >
                Search
              </button>
              <button
                onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
                className="px-3 py-1.5 text-sm font-medium bg-gray-500 hover:bg-gray-600 text-white rounded-sm cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-md p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
              {selected.size} selected
              {selected.size > items.length && (
                <span className="font-normal text-indigo-500 dark:text-indigo-400"> ({items.length} on this page)</span>
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

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-2 text-left w-8">
                  <button onClick={toggleSelectAll} className="cursor-pointer">
                    {items.length > 0 && currentPageAllSelected() ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : items.length > 0 && currentPageSomeSelected() ? (
                      <SquareMinus className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Product</th>
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
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-sm text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <React.Fragment key={item.product_id}>
                    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${loading ? 'opacity-40 pointer-events-none' : ''}`}>
                      <td className="px-3 py-2">
                        <button onClick={() => toggleSelect(item.product_id)} className="cursor-pointer">
                          {selected.has(item.product_id) ? (
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
                          <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{item.product_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => toggleExpand(item.product_id)}
                          className="cursor-pointer text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          {expandedRow === item.product_id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      {FLAGS.map(flag => (
                        <td key={flag.key} className="px-3 py-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <ToggleSwitch
                              checked={item[flag.key]}
                              onChange={v => handleToggle(item.product_id, flag.key, v)}
                              disabled={toggling[`${item.product_id}-${flag.key}`]}
                            />
                            <FlagBadge active={item[flag.key]} color={flag.color} />
                          </div>
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <ToggleSwitch
                            checked={item.is_visible_on_storefront}
                            onChange={v => handleToggle(item.product_id, 'is_visible_on_storefront', v)}
                            disabled={toggling[`${item.product_id}-is_visible_on_storefront`]}
                          />
                          {item.is_visible_on_storefront ? (
                            <Eye className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedRow === item.product_id && (
                      <tr className="bg-gray-50 dark:bg-gray-700/20">
                        <td colSpan={8} className="px-6 py-3">
                          <div className="flex items-end gap-4 flex-wrap">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Hide Out of stock</label>
                              <ToggleSwitch
                                checked={detailsForm[item.product_id]?.hide_when_out_of_stock ?? false}
                                onChange={v => setDetailsForm(prev => ({ ...prev, [item.product_id]: { ...prev[item.product_id], hide_when_out_of_stock: v } }))}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Available From</label>
                              <DateTimePicker
                                value={detailsForm[item.product_id]?.available_from ?? ''}
                                onChange={v => setDetailsForm(prev => ({ ...prev, [item.product_id]: { ...prev[item.product_id], available_from: v } }))}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Available Until</label>
                              <DateTimePicker
                                value={detailsForm[item.product_id]?.available_until ?? ''}
                                onChange={v => setDetailsForm(prev => ({ ...prev, [item.product_id]: { ...prev[item.product_id], available_until: v } }))}
                              />
                            </div>
                            <button
                              onClick={() => handleSaveDetails(item.product_id)}
                              disabled={savingDetails[item.product_id]}
                              className="px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm disabled:opacity-50 cursor-pointer"
                            >
                              {savingDetails[item.product_id] ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
              {loading && items.length > 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-2 text-center">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500 mx-auto" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {lastPage > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
            <span className="text-xs text-gray-500">Page {page} of {lastPage} ({total} total)</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">First</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">Prev</button>
              <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">Next</button>
              <button onClick={() => setPage(lastPage)} disabled={page === lastPage}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">Last</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
