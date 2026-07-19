'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tag, Search, Loader2, Square, CheckSquare } from 'lucide-react';
import { notify } from '@/lib/notifications';
import productFlagsService from '@/services/productFlagsService';
import type { ProductFlagsItem } from '@/types/api.types';

const FLAGS = [
  { key: 'is_featured' as const, label: 'Featured', color: 'purple' },
  { key: 'is_new' as const, label: 'New Arrival', color: 'blue' },
  { key: 'is_bestseller' as const, label: 'Bestseller', color: 'amber' },
  { key: 'is_on_sale' as const, label: 'On Sale', color: 'green' },
];

type FlagKey = (typeof FLAGS)[number]['key'];

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
  const [items, setItems] = useState<ProductFlagsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productFlagsService.list({
        page,
        per_page: 20,
        ...(search ? { search } : {}),
      });
      setItems(res.data);
      setTotal(res.meta.total);
      setLastPage(res.meta.last_page);
    } catch {
      notify.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = async (productId: string, flagKey: FlagKey, value: boolean) => {
    setToggling(prev => ({ ...prev, [`${productId}-${flagKey}`]: true }));
    try {
      await productFlagsService.update(productId, { [flagKey]: value });
      setItems(prev =>
        prev.map(i => (i.product_id === productId ? { ...i, [flagKey]: value } : i))
      );
    } catch {
      notify.error('Failed to update flag');
    } finally {
      setToggling(prev => ({ ...prev, [`${productId}-${flagKey}`]: false }));
    }
  };

  const handleBulkFlag = async (flagKey: FlagKey, value: boolean) => {
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

  const toggleSelectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => i.product_id)));
    }
  };

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        Featured / New / Bestseller / On Sale Flags
      </h1>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-md p-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
            {selected.size} selected
          </span>
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
                    {selected.size === items.length && items.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Product</th>
                {FLAGS.map(flag => (
                  <th key={flag.key} className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider min-w-[100px]">
                    {flag.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">In Store</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-sm text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
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
                      <span className={`text-xs font-medium ${item.is_visible_on_storefront ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                        {item.is_visible_on_storefront ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))
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
