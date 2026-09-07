'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Search, Plus, Edit2, Trash2, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import type { Category } from '@/types/api.types';

export type TreeCategory = Category & { childrenNodes: TreeCategory[] };

export function buildCategoryTree(categories: Category[]): TreeCategory[] {
  const map = new Map<string, TreeCategory>();
  const roots: TreeCategory[] = [];
  categories.forEach(c => map.set(String(c.id), { ...c, childrenNodes: [] }));
  categories.forEach(c => {
    const node = map.get(String(c.id))!;
    const pid = c.parent_id ? String(c.parent_id) : null;
    if (pid && map.has(pid)) map.get(pid)!.childrenNodes.push(node);
    else roots.push(node);
  });
  const sort = (nodes: TreeCategory[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach(n => sort(n.childrenNodes));
  };
  sort(roots);
  return roots;
}

function getDescendantIds(categories: Category[], rootId: string): Set<string> {
  const childrenMap = new Map<string, string[]>();
  categories.forEach(c => {
    const pid = c.parent_id ? String(c.parent_id) : '__root__';
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid)!.push(String(c.id));
  });
  const result = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop()!;
    const kids = childrenMap.get(cur) || [];
    kids.forEach(k => { if (!result.has(k)) { result.add(k); stack.push(k); } });
  }
  return result;
}

export function CategoryTreePanel({
  categories,
  loading,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
  canCreate,
  canUpdate,
  canDelete,
  productCounts,
}: {
  categories: Category[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (parentId?: string) => void;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
  onRefresh: () => void;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  productCounts?: Record<string, number>;
}) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildCategoryTree(categories), [categories]);

  const filteredIds = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return new Set(categories.filter(c => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)).map(c => String(c.id)));
  }, [categories, search]);

  // Auto-expand ancestors of matched nodes
  const expandedForSearch = useMemo(() => {
    if (!filteredIds) return expanded;
    const next = new Set(expanded);
    const parentMap = new Map<string, string | null>();
    categories.forEach(c => parentMap.set(String(c.id), c.parent_id ? String(c.parent_id) : null));
    filteredIds.forEach(id => {
      let cur: string | null = parentMap.get(id) || null;
      while (cur) { next.add(cur); cur = parentMap.get(cur) || null; }
    });
    return next;
  }, [filteredIds, expanded, categories]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const expandAll = () => setExpanded(new Set(categories.map(c => String(c.id))));
  const collapseAll = () => setExpanded(new Set());

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
            <FolderOpen className="w-4 h-4 text-indigo-600" /> Categories
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={expandAll} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Expand all"><Maximize2 className="w-3.5 h-3.5" /></button>
            <button onClick={collapseAll} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Collapse all"><Minimize2 className="w-3.5 h-3.5" /></button>
            <button onClick={onRefresh} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories..." className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onSelect(null)} className={`flex-1 text-xs px-2 py-1 rounded border ${selectedId === null ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50'}`}>All</button>
          {canCreate && (
            <button onClick={() => onAdd(undefined)} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="w-3 h-3" /> New</button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-1 scrollbar-thin">
        {loading ? (
          <div className="p-4 text-center text-xs text-gray-500">Loading categories...</div>
        ) : tree.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500">No categories found</div>
        ) : (
          <ul className="space-y-0.5">
            {tree.map(node => (
              <CategoryTreeNode
                key={String(node.id)}
                node={node}
                depth={0}
                expanded={expandedForSearch}
                onToggle={toggle}
                selectedId={selectedId}
                onSelect={onSelect}
                onAdd={onAdd}
                onEdit={onEdit}
                onDelete={onDelete}
                canCreate={canCreate}
                canUpdate={canUpdate}
                canDelete={canDelete}
                filteredIds={filteredIds}
                productCounts={productCounts}
                searchActive={!!search.trim()}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        {categories.length} categories {selectedId ? `· filter active` : ''}
      </div>
    </div>
  );
}

function CategoryTreeNode({
  node,
  depth,
  expanded,
  onToggle,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  canCreate,
  canUpdate,
  canDelete,
  filteredIds,
  productCounts,
  searchActive,
}: {
  node: TreeCategory;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (parentId?: string) => void;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  filteredIds: Set<string> | null;
  productCounts?: Record<string, number>;
  searchActive: boolean;
}) {
  const id = String(node.id);
  const isExpanded = expanded.has(id);
  const isSelected = selectedId === id;
  const hasChildren = node.childrenNodes.length > 0;
  const isMatched = !filteredIds || filteredIds.has(id);
  const hasMatchedDescendant = (() => {
    if (!filteredIds) return false;
    const stack = [...node.childrenNodes];
    while (stack.length) {
      const cur = stack.pop()!;
      if (filteredIds.has(String(cur.id))) return true;
      stack.push(...cur.childrenNodes);
    }
    return false;
  })();
  if (searchActive && !isMatched && !hasMatchedDescendant) return null;

  const count = productCounts?.[id];

  return (
    <li>
      <div
        className={`group flex items-center gap-1 px-1.5 py-1 rounded text-xs cursor-pointer select-none ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'} ${isMatched && searchActive ? 'ring-1 ring-amber-300' : ''}`}
        style={{ paddingLeft: `${6 + depth * 14}px` }}
        onClick={() => onSelect(id)}
      >
        {hasChildren ? (
          <button onClick={e => { e.stopPropagation(); onToggle(id); }} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 shrink-0">
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {isExpanded && hasChildren ? <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />}
        <span className="truncate flex-1" title={node.name}>{node.name}</span>
        {typeof count === 'number' && count > 0 && (
          <span className="ml-1 px-1 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] leading-none">{count}</span>
        )}
        <span className={`hidden group-hover:flex items-center gap-0.5 ml-1 ${isSelected ? '' : ''}`}>
          {canCreate && (
            <button onClick={e => { e.stopPropagation(); onAdd(id); }} className="p-1 rounded hover:bg-white dark:hover:bg-gray-600 text-gray-500 hover:text-indigo-600" title="Add sub-category"><Plus className="w-3 h-3" /></button>
          )}
          {canUpdate && (
            <button onClick={e => { e.stopPropagation(); onEdit(node); }} className="p-1 rounded hover:bg-white dark:hover:bg-gray-600 text-gray-500 hover:text-blue-600" title="Edit"><Edit2 className="w-3 h-3" /></button>
          )}
          {canDelete && (
            <button onClick={e => { e.stopPropagation(); onDelete(node); }} className="p-1 rounded hover:bg-white dark:hover:bg-gray-600 text-gray-500 hover:text-red-600" title="Delete"><Trash2 className="w-3 h-3" /></button>
          )}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <ul className="space-y-0.5 mt-0.5">
          {node.childrenNodes.map(child => (
            <CategoryTreeNode
              key={String(child.id)}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedId={selectedId}
              onSelect={onSelect}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
              canCreate={canCreate}
              canUpdate={canUpdate}
              canDelete={canDelete}
              filteredIds={filteredIds}
              productCounts={productCounts}
              searchActive={searchActive}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function getCategoryDescendantIds(categories: Category[], rootId: string | null): Set<string> | null {
  if (!rootId) return null;
  return getDescendantIds(categories, rootId);
}
