'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Menu,
  Loader2,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  LayoutList,
  Link as LinkIcon,
  FolderTree,
  Eye,
  EyeOff,
  Search,
  Sparkles,
  Gift,
} from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import headerMenuService from '@/services/headerMenuService';
import commonService from '@/services/commonService';
import { notify } from '@/lib/notifications';
import type { HeaderMenuConfig, StorefrontNavigationItem, Category } from '@/types/api.types';

/* ──────────────────────── Helpers ──────────────────────── */

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function emptyMenuItem(sort_order: number): StorefrontNavigationItem {
  return {
    id: generateId(),
    label: '',
    type: 'category',
    category_id: null,
    category_slug: null,
    url: null,
    display_mode: 'single',
    sort_order,
    is_active: true,
    open_in_new_tab: false,
  };
}

/* ──────────────────────── Toggle ──────────────────────── */

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

/* ──────────────────────── Quick Category Badge ──────────────────────── */

function CategoryBadge({ slug }: { slug: string | null | undefined }) {
  if (!slug) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
      <FolderTree className="h-3 w-3" />
      {slug}
    </span>
  );
}

/* ──────────────────────── Main Page ──────────────────────── */

export default function StorefrontNavigationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Config state (navigation-specific fields from header-menu config)
  const [menuItems, setMenuItems] = useState<StorefrontNavigationItem[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(true);
  const [showFlashSale, setShowFlashSale] = useState(true);
  const [showNewArrivals, setShowNewArrivals] = useState(true);

  // Item form state
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<StorefrontNavigationItem | null>(null);
  const [form, setForm] = useState<StorefrontNavigationItem>(emptyMenuItem(0));
  const [categorySearch, setCategorySearch] = useState('');

  const markDirty = useCallback(() => setDirty(true), []);

  /* ────── Load config ────── */

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await headerMenuService.get();
      setMenuItems(res.menu_items || []);
      setShowAllCategories(res.navigation_show_all_categories ?? true);
      setShowFlashSale(res.navigation_show_flash_sale ?? true);
      setShowNewArrivals(res.navigation_show_new_arrivals ?? true);
    } catch {
      // Defaults are fine
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async (search?: string) => {
    setCategoriesLoading(true);
    try {
      const result = await commonService.getCategoriesForDropdown(
        search ? { search } : undefined
      );
      setCategories(result);
    } catch {
      // Silently fail
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    loadCategories();
  }, [fetchConfig, loadCategories]);

  /* ────── Save ────── */

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      // Update only the navigation fields via the existing header-menu config
      await headerMenuService.update({
        navigation_show_all_categories: showAllCategories,
        navigation_show_flash_sale: showFlashSale,
        navigation_show_new_arrivals: showNewArrivals,
        menu_items: menuItems,
      });
      notify.success('Navigation menu saved successfully');
      setDirty(false);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to save navigation menu');
    } finally {
      setSaving(false);
    }
  };

  /* ────── Item CRUD ────── */

  const openAddItem = () => {
    setEditingItem(null);
    setForm(emptyMenuItem(menuItems.length));
    setCategorySearch('');
    setShowForm(true);
  };

  const openEditItem = (item: StorefrontNavigationItem) => {
    setEditingItem(item);
    setForm({ ...item });
    setCategorySearch(item.category_slug || '');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleSaveItem = () => {
    if (!form.label.trim()) {
      notify.error('Item label is required');
      return;
    }
    if (form.type === 'custom_link' && !form.url?.trim()) {
      notify.error('URL is required for custom links');
      return;
    }

    let updated: StorefrontNavigationItem[];
    if (editingItem) {
      updated = menuItems.map(i => (i.id === editingItem.id ? { ...form } : i));
    } else {
      updated = [...menuItems, { ...form, id: generateId(), sort_order: menuItems.length }];
    }

    setMenuItems(updated);
    markDirty();
    closeForm();
    notify.success(editingItem ? 'Item updated' : 'Item added');
  };

  const handleRemoveItem = (id: string) => {
    setMenuItems(prev => prev.filter(i => i.id !== id));
    markDirty();
    notify.success('Item removed');
  };

  const handleMoveItem = (id: string, direction: -1 | 1) => {
    const idx = menuItems.findIndex(i => i.id === id);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= menuItems.length) return;

    const items = [...menuItems];
    [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
    setMenuItems(items.map((i, pos) => ({ ...i, sort_order: pos })));
    markDirty();
  };

  /* ────── Category selection ────── */

  const filteredCategories = categorySearch.trim()
    ? categories.filter(c =>
        c.name.toLowerCase().includes(categorySearch.toLowerCase())
      )
    : categories;

  const selectCategory = (cat: Category) => {
    const label = form.type === 'custom_link' ? form.label : cat.name;
    setForm({
      ...form,
      type: 'category',
      label,
      category_id: cat.id,
      category_slug: cat.name.toLowerCase().replace(/\s+/g, '-'),
      url: `/store/category/${cat.name.toLowerCase().replace(/\s+/g, '-')}`,
    });
    setCategorySearch(cat.name);
  };

  /* ────── Loading ────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  /* ────── Render ────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutList className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Storefront Navigation</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-sm transition-colors cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <GiSave className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Navigation Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Menu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Navigation Settings</h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Show &quot;All Categories&quot; button
              </span>
            </div>
            <Toggle
              checked={showAllCategories}
              onChange={v => { setShowAllCategories(v); markDirty(); }}
              id="toggle-all-categories"
            />
          </div>

          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Show Flash Sale badge</span>
            </div>
            <Toggle
              checked={showFlashSale}
              onChange={v => { setShowFlashSale(v); markDirty(); }}
              id="toggle-flash-sale"
            />
          </div>

          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Show New Arrivals badge</span>
            </div>
            <Toggle
              checked={showNewArrivals}
              onChange={v => { setShowNewArrivals(v); markDirty(); }}
              id="toggle-new-arrivals"
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          When all menu items below are inactive or empty, the storefront will display the full category tree automatically.
        </p>
      </div>

      {/* Menu Items Builder */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LayoutList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Menu Items</h2>
          </div>
          <button
            onClick={openAddItem}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-600 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Add Item
          </button>
        </div>

        {/* Item Form */}
        {showForm && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-600">
            {/* Item type selector */}
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  checked={form.type === 'category'}
                  onChange={() => setForm(f => ({ ...f, type: 'category' }))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Category Link</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  checked={form.type === 'custom_link'}
                  onChange={() => setForm(f => ({ ...f, type: 'custom_link', category_id: null, category_slug: null }))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Custom Link</span>
              </label>
            </div>

            {/* Label */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Label</label>
              <input
                type="text"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Men's Clothing"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Category selector */}
            {form.type === 'category' && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Category
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={e => {
                      setCategorySearch(e.target.value);
                      loadCategories(e.target.value);
                    }}
                    placeholder="Search categories..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {categoriesLoading ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                ) : filteredCategories.length > 0 ? (
                  <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded">
                    {filteredCategories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => selectCategory(cat)}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer ${
                          form.category_id === cat.id
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FolderTree className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="font-medium">{cat.name}</span>
                          {cat.parent && (
                            <span className="text-gray-400">— {cat.parent.name}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : categorySearch.trim() ? (
                  <p className="mt-1 text-xs text-gray-400">No categories found</p>
                ) : null}

                {/* Display mode */}
                {form.type === 'category' && (
                  <div className="flex items-center gap-4 mt-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        checked={form.display_mode === 'single'}
                        onChange={() => setForm(f => ({ ...f, display_mode: 'single' }))}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Single Link</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        checked={form.display_mode === 'dropdown'}
                        onChange={() => setForm(f => ({ ...f, display_mode: 'dropdown' }))}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Dropdown (show subcategories)</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* URL (custom link) */}
            {form.type === 'custom_link' && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
                <input
                  type="text"
                  value={form.url || ''}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="/products or https://"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Options */}
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.open_in_new_tab}
                  onChange={e => setForm(f => ({ ...f, open_in_new_tab: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Open in new tab</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSaveItem}
                className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                {editingItem ? 'Update' : 'Add'}
              </button>
              <button
                onClick={closeForm}
                className="px-3 py-1 bg-gray-500 text-white text-xs font-medium rounded hover:bg-gray-600 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Items list */}
        {menuItems.length === 0 ? (
          <div className="flex items-center justify-center h-20 bg-gray-50 dark:bg-gray-750 border border-dashed border-gray-200 dark:border-gray-600 rounded">
            <p className="text-xs text-gray-400">No menu items yet. Click &quot;Add Item&quot; to create one.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {menuItems.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-600"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMoveItem(item.id, -1)}
                    disabled={idx === 0}
                    className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Move up"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleMoveItem(item.id, 1)}
                    disabled={idx === menuItems.length - 1}
                    className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Move down"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.type === 'category' ? (
                      <FolderTree className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    ) : (
                      <LinkIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                    <span className={`text-sm font-medium truncate ${item.is_active ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 line-through'}`}>
                      {item.label || 'Untitled'}
                    </span>
                    {item.display_mode === 'dropdown' && (
                      <span className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400 uppercase tracking-wider shrink-0">Dropdown</span>
                    )}
                    {item.type === 'custom_link' && (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shrink-0">Link</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.type === 'category' && item.category_slug && (
                      <CategoryBadge slug={item.category_slug} />
                    )}
                    <p className="text-xs text-gray-400 truncate">
                      {item.type === 'category'
                        ? `/store/category/${item.category_slug || '...'}`
                        : item.url
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const updated = menuItems.map(i =>
                        i.id === item.id ? { ...i, is_active: !i.is_active } : i
                      );
                      setMenuItems(updated);
                      markDirty();
                    }}
                    className={`p-1 rounded cursor-pointer ${item.is_active ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`}
                    title={item.is_active ? 'Active' : 'Inactive'}
                  >
                    {item.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => openEditItem(item)}
                    className="p-1 text-gray-400 hover:text-indigo-600 cursor-pointer"
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info notice */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
        <div className="flex items-start gap-2">
          <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">ℹ</span>
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <p className="font-medium mb-1">How the menu works on your storefront:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Active menu items replace the default category links in the navigation bar</li>
              <li>Category items set to <strong>Dropdown</strong> will show subcategories when hovered</li>
              <li>Category items set to <strong>Single Link</strong> will link directly to the category page</li>
              <li>If no items are active, the full category tree will be shown automatically</li>
              <li>The &quot;All Categories&quot; mega menu button can be toggled on/off separately</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
