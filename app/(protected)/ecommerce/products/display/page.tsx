'use client';

import { useState, useEffect } from 'react';
import { List, Loader2 } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { notify } from '@/lib/notifications';
import displaySettingsService from '@/services/displaySettingsService';
import type { DisplaySettings } from '@/services/displaySettingsService';

const defaultForm: DisplaySettings = {
  default_view: 'grid',
  grid_columns: 4,
  items_per_page: 24,
  default_sort: 'newest',
  show_out_of_stock: true,
  show_low_stock_badge: true,
  out_of_stock_policy: 'show_with_badge',
};

export default function DisplayPage() {
  const [form, setForm] = useState<DisplaySettings>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await displaySettingsService.get();
      setForm(data);
    } catch {
      notify.error('Failed to load display settings');
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await displaySettingsService.update(form);
      notify.success('Display & stock rules saved');
    } catch {
      notify.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <List className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        Display & Stock Rules
      </h1>

      <form onSubmit={handleSave} className="space-y-2">
        {/* Display defaults */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Display Defaults</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Default View</label>
              <select
                value={form.default_view}
                onChange={e => update('default_view', e.target.value as 'grid' | 'list')}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5"
              >
                <option value="grid">Grid</option>
                <option value="list">List</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Grid Columns</label>
              <select
                value={form.grid_columns}
                onChange={e => update('grid_columns', parseInt(e.target.value))}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5"
              >
                <option value={2}>2 Columns</option>
                <option value={3}>3 Columns</option>
                <option value={4}>4 Columns</option>
                <option value={5}>5 Columns</option>
                <option value={6}>6 Columns</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Items Per Page</label>
              <select
                value={form.items_per_page}
                onChange={e => update('items_per_page', parseInt(e.target.value))}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5"
              >
                {[12, 24, 36, 48, 60, 96, 120].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Default Sort</label>
              <select
                value={form.default_sort}
                onChange={e => update('default_sort', e.target.value as DisplaySettings['default_sort'])}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
                <option value="popularity">Popularity</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stock & availability rules */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Stock & Availability Rules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Out-of-Stock Policy</label>
              <select
                value={form.out_of_stock_policy}
                onChange={e => update('out_of_stock_policy', e.target.value as DisplaySettings['out_of_stock_policy'])}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5"
              >
                <option value="show_with_badge">Show with badge</option>
                <option value="hide">Hide</option>
                <option value="show">Show (no badge)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">Badges</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.show_out_of_stock}
                    onChange={e => update('show_out_of_stock', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show "Out of Stock" badge</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.show_low_stock_badge}
                    onChange={e => update('show_low_stock_badge', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show low stock badge</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <GiSave className="w-4 h-4" />}
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
