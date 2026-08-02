'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Menu,
  Loader2,
  Monitor,
  EyeOff,
  ChevronDown,
  Columns3,
  ListOrdered,
  Save,
  Sparkles,
  LayoutGrid,
  Plus,
  Trash2,
  X,
  Search,
  ChevronUp,
  GripVertical,
} from 'lucide-react';
import headerMenuService from '@/services/headerMenuService';
import storefrontService from '@/services/storefrontService';
import { notify } from '@/lib/notifications';
import type {
  HeaderMenuConfig,
  MegaMenuConfig,
  MegaMenuItem,
} from '@/types/api.types';
import type { CategoryTreeItem } from '@/services/storefrontService';

/* ──────────────────── Default Config ──────────────────── */

const DEFAULT_MEGA_MENU: MegaMenuConfig = {
  enabled: true,
  display_style: 'mega',
  columns: 4,
  show_product_count: false,
  items: [],
};

/* ──────────────────── Toggle ──────────────────── */

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${checked
          ? 'bg-indigo-600 dark:bg-indigo-500'
          : 'bg-gray-300 dark:bg-gray-600'
        }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-all duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'
          }`}
      />
    </button>
  );
}

/* ──────────────────── Column Override Selector ──────────────────── */

function ColumnOverride({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const options = [
    { value: null as number | null, label: 'Inherit' },
    { value: 2 as number | null, label: '2 Cols' },
    { value: 3 as number | null, label: '3 Cols' },
    { value: 4 as number | null, label: '4 Cols' },
    { value: 5 as number | null, label: '5 Cols' },
    { value: 6 as number | null, label: '6 Cols' },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${value === opt.value
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-300'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ──────────────────── Global Column Selector ──────────────────── */

function GlobalColumnSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const options = [
    { value: 0, label: 'Auto' },
    { value: 2, label: '2 Columns' },
    { value: 3, label: '3 Columns' },
    { value: 4, label: '4 Columns' },
    { value: 5, label: '5 Columns' },
    { value: 6, label: '6 Columns' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${value === opt.value
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-300'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500'
            }`}
        >
          <Columns3 className="h-3.5 w-3.5" />
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ──────────────────── Category Picker Modal ──────────────────── */

function CategoryPickerModal({
  open,
  categoryTree,
  selectedIds,
  onConfirm,
  onClose,
}: {
  open: boolean;
  categoryTree: CategoryTreeItem[];
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set(selectedIds));

  useEffect(() => {
    if (open) {
      setChecked(new Set(selectedIds));
      setSearch('');
    }
  }, [open, selectedIds]);

  const filteredTree = useMemo(() => {
    if (!search.trim()) return categoryTree;
    const lower = search.toLowerCase();

    const filterNode = (node: CategoryTreeItem): CategoryTreeItem | null => {
      const nameMatch = node.name.toLowerCase().includes(lower);
      const filteredChildren = node.children
        ? node.children.map(filterNode).filter(Boolean)
        : [];
      if (nameMatch || filteredChildren.length > 0) {
        return {
          ...node,
          children:
            filteredChildren.length > 0
              ? (filteredChildren as CategoryTreeItem[])
              : node.children,
        };
      }
      return null;
    };

    return categoryTree
      .map(filterNode)
      .filter(Boolean) as CategoryTreeItem[];
  }, [categoryTree, search]);

  const toggleNode = useCallback(
    (id: string, children: CategoryTreeItem[] = []) => {
      setChecked((prev) => {
        const next = new Set(prev);
        const isChecked = next.has(id);
        const toggle = (nodeId: string, kids: CategoryTreeItem[]) => {
          if (isChecked) {
            next.delete(nodeId);
          } else {
            next.add(nodeId);
          }
          for (const kid of kids) {
            toggle(kid.id, kid.children || []);
          }
        };
        toggle(id, children);
        return next;
      });
    },
    [],
  );

  const isChecked = useCallback((id: string) => checked.has(id), [checked]);

  const renderTreeNode = (node: CategoryTreeItem, depth = 0) => (
    <div key={node.id}>
      <label
        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        <input
          type="checkbox"
          checked={isChecked(node.id)}
          onChange={() => toggleNode(node.id, node.children || [])}
          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {node.name}
        </span>
        {(node.productCount ?? 0) > 0 && (
          <span className="text-xs text-gray-400">({node.productCount})</span>
        )}
      </label>
      {node.children && node.children.length > 0 && (
        <div className="ml-6 border-l-2 border-gray-100 dark:border-gray-700/50">
          {node.children.map((child) => renderTreeNode(child, depth + 1))}
        </div>
      )}
    </div>
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Assign Categories
          </h3>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-9 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto space-y-0.5 px-2 py-3">
          {filteredTree.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              No categories found
            </p>
          ) : (
            filteredTree.map((node) => renderTreeNode(node))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-gray-700">
          <span className="text-xs text-gray-500">
            {checked.size} category{checked.size !== 1 ? 'ies' : 'y'} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm(Array.from(checked));
              }}
              className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
            >
              Confirm ({checked.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────── Mega Menu Item Card ──────────────────── */

function MegaMenuItemCard({
  item,
  index,
  total,
  categoryMap,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onPickCategories,
}: {
  item: MegaMenuItem;
  index: number;
  total: number;
  categoryMap: Map<string, CategoryTreeItem>;
  onUpdate: (id: string, partial: Partial<MegaMenuItem>) => void;
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onPickCategories: (itemId: string) => void;
}) {
  const assignedCategories = item.category_ids
    .map((id) => categoryMap.get(id))
    .filter(Boolean) as CategoryTreeItem[];

  const totalProductCount = useMemo(() => {
    let count = 0;
    const walk = (cat: CategoryTreeItem) => {
      count += cat.productCount ?? 0;
      if (cat.children) cat.children.forEach(walk);
    };
    assignedCategories.forEach(walk);
    return count;
  }, [assignedCategories]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      {/* Header row */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        {/* Reorder arrows */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="cursor-pointer p-0.5 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            className="cursor-pointer p-0.5 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        <GripVertical className="h-4 w-4 shrink-0 text-gray-300" />

        {/* Name input */}
        <input
          value={item.name}
          onChange={(e) => onUpdate(item.id, { name: e.target.value })}
          placeholder="Enter column name..."
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />

        {/* Column override */}
        <ColumnOverride
          value={item.columns}
          onChange={(v) => onUpdate(item.id, { columns: v })}
        />

        {/* Product count badge */}
        {totalProductCount > 0 && (
          <span className="whitespace-nowrap text-xs text-gray-400">
            📦 {totalProductCount}
          </span>
        )}

        {/* Remove */}
        <button
          onClick={() => onRemove(item.id)}
          className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Assigned categories */}
      <div className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {assignedCategories.slice(0, 12).map((cat) => (
            <span
              key={cat.id}
              className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300"
            >
              {cat.name}
              <button
                onClick={() => {
                  const newIds = item.category_ids.filter((id) => id !== cat.id);
                  onUpdate(item.id, { category_ids: newIds });
                }}
                className="ml-0.5 cursor-pointer text-indigo-400 hover:text-indigo-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {assignedCategories.length > 12 && (
            <span className="text-xs text-gray-400">
              +{assignedCategories.length - 12} more
            </span>
          )}
          <button
            onClick={() => onPickCategories(item.id)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border-2 border-dashed border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-indigo-700 dark:hover:bg-indigo-900/20"
          >
            <Plus className="h-3 w-3" />
            {assignedCategories.length === 0 ? 'Add Categories' : 'Edit'}
          </button>
        </div>
        {assignedCategories.length === 0 && (
          <p className="mt-2 text-xs text-gray-400">
            No categories assigned. Click &ldquo;Add Categories&rdquo; to
            choose.
          </p>
        )}
      </div>
    </div>
  );
}

/* ──────────────────── Live Preview ──────────────────── */

function MegaMenuPreview({
  config,
  categoryMap,
}: {
  config: MegaMenuConfig;
  categoryMap: Map<string, CategoryTreeItem>;
}) {
  if (!config.enabled) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <EyeOff className="h-6 w-6 text-gray-400" />
        </div>
        <p className="mt-3 text-sm font-semibold text-gray-500">
          Mega menu is disabled
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Toggle the switch above to enable it.
        </p>
      </div>
    );
  }

  if (config.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm font-semibold text-gray-400">
          No parent items yet
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Add parent items and assign categories to see a preview.
        </p>
      </div>
    );
  }

  const sortedItems = [...config.items].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const colCount =
    config.columns > 0
      ? config.columns
      : Math.min(config.items.length, 4);

  const renderCategoryTree = (
    cat: CategoryTreeItem,
    depth: number,
  ) => {
    const children = cat.children ?? [];
    return (
      <div key={cat.id}>
        <div className="flex items-center gap-1 py-0.5">
          <span
            className={
              depth === 0
                ? 'text-xs font-bold text-gray-900 dark:text-gray-100'
                : 'text-[11px] text-gray-400/60 dark:text-gray-500'
            }
          >
            {cat.name}
          </span>
          {config.show_product_count && (
            <span className="text-[10px] text-gray-400">
              ({cat.productCount ?? 0})
            </span>
          )}
        </div>
        {children.length > 0 && (
          <div
            className={`space-y-0.5 ${depth === 0
                ? 'mt-1.5'
                : 'ml-3 mt-0.5 pl-2 border-l-2 border-gray-100 dark:border-gray-800'
              }`}
          >
            {children.map((child) =>
              renderCategoryTree(child, depth + 1),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-700">
      {/* All Categories Button */}
      <div className="flex items-center gap-2.5 bg-linear-to-r from-indigo-600 to-purple-600 px-4 py-2.5">
        <Menu className="h-4 w-4 text-white" />
        <span className="text-sm font-bold text-white">All Categories</span>
        <ChevronDown className="ml-auto h-4 w-4 text-white/70" />
      </div>

      {/* Grid */}
      <div className="bg-white p-4 dark:bg-gray-900">
        <div
          className="grid gap-6"
          style={{
            gridTemplateColumns: `repeat(${Math.min(colCount, 6)}, 1fr)`,
          }}
        >
          {sortedItems.map((item) => {
            const span = item.columns ?? 1;
            const assigned = item.category_ids
              .map((id) => categoryMap.get(id))
              .filter(Boolean) as CategoryTreeItem[];

            return (
              <div
                key={item.id}
                style={{ gridColumn: `span ${Math.min(span, colCount)}` }}
              >
                {/* Parent header — accent bar */}
                <div className="mb-3 border-l-4 border-indigo-500 pl-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
                    {item.name}
                  </h3>
                </div>

                {/* Category tree */}
                {assigned.length === 0 ? (
                  <p className="pl-3 text-[11px] italic text-gray-400">
                    No categories
                  </p>
                ) : (
                  <div className="space-y-1.5 pl-3">
                    {assigned.map((cat) =>
                      renderCategoryTree(cat, 0),
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Browse all link */}
      <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/30">
        <p className="text-center text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
          Browse all products →
        </p>
      </div>

      {config.show_product_count && (
        <div className="border-t border-gray-100 px-4 py-2 text-center dark:border-gray-800">
          <p className="text-[10px] text-gray-400">
            Product counts shown on categories
          </p>
        </div>
      )}
    </div>
  );
}

/* ──────────────────── Main Page ──────────────────── */

export default function MegaMenuPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [pickingForItemId, setPickingForItemId] = useState<string | null>(
    null,
  );

  const [config, setConfig] = useState<MegaMenuConfig>(DEFAULT_MEGA_MENU);

  // Flat category map for O(1) lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, CategoryTreeItem>();
    const walk = (items: CategoryTreeItem[]) => {
      for (const item of items) {
        map.set(item.id, item);
        if (item.children) walk(item.children);
      }
    };
    walk(categories);
    return map;
  }, [categories]);

  const markDirty = useCallback(() => setDirty(true), []);

  const updateConfig = useCallback(
    (partial: Partial<MegaMenuConfig>) => {
      setConfig((prev) => ({ ...prev, ...partial }));
      markDirty();
    },
    [markDirty],
  );

  /* ────── Item CRUD ────── */

  const addItem = useCallback(() => {
    const newItem: MegaMenuItem = {
      id: crypto.randomUUID(),
      name: '',
      columns: null,
      sort_order: config.items.length,
      category_ids: [],
    };
    setConfig((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    markDirty();
  }, [config.items.length, markDirty]);

  const updateItem = useCallback(
    (id: string, partial: Partial<MegaMenuItem>) => {
      setConfig((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === id ? { ...item, ...partial } : item,
        ),
      }));
      markDirty();
    },
    [markDirty],
  );

  const removeItem = useCallback(
    (id: string) => {
      setConfig((prev) => {
        const filtered = prev.items.filter((item) => item.id !== id);
        const reindexed = filtered.map((item, idx) => ({
          ...item,
          sort_order: idx,
        }));
        return { ...prev, items: reindexed };
      });
      markDirty();
    },
    [markDirty],
  );

  const moveItem = useCallback(
    (index: number, direction: 'up' | 'down') => {
      setConfig((prev) => {
        const items = [...prev.items];
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= items.length) return prev;
        [items[index], items[target]] = [items[target], items[index]];
        return {
          ...prev,
          items: items.map((item, idx) => ({ ...item, sort_order: idx })),
        };
      });
      markDirty();
    },
    [markDirty],
  );

  const confirmCategoryPick = useCallback(
    (itemId: string, ids: string[]) => {
      updateItem(itemId, { category_ids: ids });
      setPickingForItemId(null);
    },
    [updateItem],
  );

  /* ────── Load Data ────── */

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Load the saved menu config first. The category tree is optional — a
      // failure there must never prevent the parent items from loading,
      // otherwise a later save would persist an empty items list.
      const menuRes = await headerMenuService.get();
      try {
        setCategories(await storefrontService.getCategories());
      } catch {
        setCategories([]);
      }
      const savedConfig = menuRes.mega_menu_config;

      if (savedConfig?.items && savedConfig.items.length > 0) {
        // New format — use directly
        setConfig({
          enabled: savedConfig.enabled ?? true,
          display_style: savedConfig.display_style ?? 'mega',
          columns: savedConfig.columns ?? 4,
          show_product_count: savedConfig.show_product_count ?? false,
          items: savedConfig.items,
        });
      } else if (
        (savedConfig as any)?.category_settings?.length > 0
      ) {
        // Old format — one-time auto-migration
        const old = savedConfig as any;
        const migrated: MegaMenuItem[] = old.category_settings
          .filter((cs: any) => cs.visible)
          .map((cs: any, idx: number) => ({
            id: crypto.randomUUID(),
            name: cs.category_name,
            columns: null,
            sort_order: idx,
            category_ids: [cs.category_id],
          }));
        setConfig({
          enabled: savedConfig?.enabled ?? true,
          display_style: savedConfig?.display_style ?? 'mega',
          columns: savedConfig?.columns ?? 4,
          show_product_count: savedConfig?.show_product_count ?? false,
          items: migrated,
        });
      } else {
        // No data — start fresh
        setConfig({
          enabled: savedConfig?.enabled ?? true,
          display_style: savedConfig?.display_style ?? 'mega',
          columns: savedConfig?.columns ?? 4,
          show_product_count: savedConfig?.show_product_count ?? false,
          items: [],
        });
      }
    } catch {
      notify.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ────── Save ────── */

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      await headerMenuService.update({
        mega_menu_config: config,
      } as Partial<HeaderMenuConfig>);
      notify.success('Mega menu settings saved successfully');
      setDirty(false);
    } catch (err: any) {
      notify.error(
        err?.response?.data?.message || 'Failed to save mega menu settings',
      );
    } finally {
      setSaving(false);
    }
  };

  /* ────── Derived ────── */

  const sortedItems = useMemo(
    () => [...config.items].sort((a, b) => a.sort_order - b.sort_order),
    [config.items],
  );

  /* ────── Loading ────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
          <p className="mt-3 text-sm text-gray-500">
            Loading mega menu configuration...
          </p>
        </div>
      </div>
    );
  }

  /* ────── Render ────── */

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ════ Header ════ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <LayoutGrid className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Mega Menu (All Categories)
            </h1>
            <p className="text-sm text-gray-500">
              Create parent items and assign categories to build a multi-column
              mega menu
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/30 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ════ Enable/Disable ════ */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
              <Menu className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Mega Menu
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                When enabled, a full-width mega menu appears in the storefront
                navigation with your configured parent items as column headers.
              </p>
              {config.enabled && (
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  <span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {config.items.length}
                    </span>{' '}
                    parent item{config.items.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span>
                    {config.columns === 0 ? 'Auto' : config.columns} column
                    {config.columns !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Toggle
            checked={config.enabled}
            onChange={(v) => updateConfig({ enabled: v })}
            id="mega-menu-toggle"
          />
        </div>
      </div>

      {/* ════ Main Grid ════ */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ── Left Column ── */}
        <div className="space-y-6">
          {/* Layout Settings */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Layout Settings
                </h2>
              </div>
            </div>
            <div className="space-y-5 p-6">
              {/* Menu Style */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-gray-400" />
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Menu Style
                  </label>
                </div>
                <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/50">
                  {(
                    [
                      { value: 'mega' as const, label: 'Mega Menu' },
                      { value: 'cascading' as const, label: 'Cascading Menu' },
                    ]
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateConfig({ display_style: opt.value })}
                      className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${config.display_style === opt.value
                          ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400">
                  Mega Menu shows a full-width grid panel. Cascading Menu shows
                  a compact flyout that reveals nested category levels one
                  column at a time.
                </p>
              </div>

              {/* Columns */}
              {config.display_style !== 'cascading' && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Columns3 className="h-4 w-4 text-gray-400" />
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Columns
                    </label>
                  </div>
                  <GlobalColumnSelector
                    value={config.columns}
                    onChange={(v) => updateConfig({ columns: v })}
                  />
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    &ldquo;Auto&rdquo; adapts to the number of parent items (max
                    6). Each item can override its column span below.
                  </p>
                </div>
              )}

              {/* Product Count Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <ListOrdered className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      Product Count
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Show count badge per category
                    </p>
                  </div>
                </div>
                <Toggle
                  checked={config.show_product_count}
                  onChange={(v) => updateConfig({ show_product_count: v })}
                  id="toggle-product-count"
                />
              </div>
            </div>
          </div>

          {/* Parent Items */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    Parent Items
                  </h2>
                </div>
                <span className="text-xs text-gray-400">
                  {config.items.length} item
                  {config.items.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Each parent item becomes a column header in the mega menu.
                Assign categories that will appear under that header.
              </p>
            </div>

            <div className="space-y-4 p-4">
              {sortedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-10 text-center dark:border-gray-700">
                  <LayoutGrid className="mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-500">
                    No parent items yet
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Click the button below to add your first parent item.
                  </p>
                </div>
              ) : (
                sortedItems.map((item, idx) => (
                  <MegaMenuItemCard
                    key={item.id}
                    item={item}
                    index={idx}
                    total={sortedItems.length}
                    categoryMap={categoryMap}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                    onMoveUp={(idx) => moveItem(idx, 'up')}
                    onMoveDown={(idx) => moveItem(idx, 'down')}
                    onPickCategories={(id) => setPickingForItemId(id)}
                  />
                ))
              )}
            </div>

            <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
              <button
                onClick={addItem}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-indigo-700 dark:hover:bg-indigo-900/20"
              >
                <Plus className="h-4 w-4" />
                Add Parent Item
              </button>
            </div>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-6">
          {/* Live Preview */}
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Live Preview
                </h2>
              </div>
            </div>
            <div className="p-5">
              <MegaMenuPreview config={config} categoryMap={categoryMap} />
            </div>
            <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-3 dark:border-gray-800 dark:bg-gray-800/30">
              <p className="text-[11px] text-gray-400">
                This is a simplified preview. Parent items become column headers
                with assigned categories as nested lists below.
              </p>
            </div>
          </div>

          {/* Info Card */}
          <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm dark:border-amber-800 dark:bg-amber-950/20">
            <div className="p-4">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-amber-600 dark:text-amber-400">
                  💡
                </span>
                <div className="text-xs text-amber-800 dark:text-amber-300">
                  <p className="mb-1 font-semibold">How parent items work</p>
                  <ul className="list-inside list-disc space-y-1">
                    <li>
                      Each <strong>parent item</strong> becomes a column header
                      in the mega menu
                    </li>
                    <li>
                      <strong>Assign categories</strong> to each parent item
                      &mdash; they appear as links under that header
                    </li>
                    <li>
                      Categories with sub-categories show as nested lists (up to
                      3 levels)
                    </li>
                    <li>
                      Use the column override to control how many grid columns
                      each item spans
                    </li>
                    <li>
                      The global columns setting defines the total mega menu
                      grid width
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Picker Modal */}
      <CategoryPickerModal
        open={pickingForItemId !== null}
        categoryTree={categories}
        selectedIds={
          config.items.find((i) => i.id === pickingForItemId)
            ?.category_ids ?? []
        }
        onConfirm={(ids) => {
          if (pickingForItemId) confirmCategoryPick(pickingForItemId, ids);
        }}
        onClose={() => setPickingForItemId(null)}
      />
    </div>
  );
}
