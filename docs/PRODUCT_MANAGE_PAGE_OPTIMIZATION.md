# Product Manage Page Optimization Plan

**Date**: 2026-09-10  
**Scope**: Fix duplicate API calls and improve code quality in the Products Manage page  
**Target Files**:

- `app/(protected)/products/manage/page.tsx`
- `components/product-manage/product-tree.tsx`
- `components/product-manage/product-detail-panel.tsx`

---

## Executive Summary

The Products Manage page currently makes redundant API calls due to:

1. **Auth-hydration double fetch** — categories and products fetched once with wrong `businessTypeId` before auth hydrates, then again after
2. **Variations fetched twice after save/delete** — both local refetch AND a separate tree signal effect fire the same request
3. **No shared cache between components** — tree and detail panel each independently fetch the same variations data
4. **Race conditions in effect chains** — missing abort guards on rapid state changes

**Solution**: Introduce React Query hooks to deduplicate requests, unify caching, and improve type safety.

---

## Current Issues (Detailed)

### Issue 1: Auth-Hydration Double Fetch

**Location**: `page.tsx` + `product-tree.tsx`

**Problem**:

```typescript
// page.tsx, line ~13
const [businessTypeId, setBusinessTypeId] = useState<number | null>(
  isSuperAdmin ? null : tenantBusinessTypeId // computed before isHydrated
);

// Then in useEffect (line ~81):
useEffect(() => {
  fetchCategories();
}, [fetchCategories]);
// fetchCategories depends on businessTypeId which is initially wrong/null

// After auth hydrates:
useEffect(() => {
  if (isSuperAdmin && tenantBusinessTypeId) setBusinessTypeId(tenantBusinessTypeId);
}, [isSuperAdmin, tenantBusinessTypeId]);
// This causes businessTypeId to change → fetchCategories fires AGAIN
```

**Impact**: Every page load fires:

- `GET /api/v1/categories?business_type_id=null` (or missing businessTypeId)
- `GET /api/v1/products?business_type_id=null` (in product-tree.tsx)
- Then immediately after hydration:
  - `GET /api/v1/categories?business_type_id=<correct>`
  - `GET /api/v1/products?business_type_id=<correct>`

**4 redundant requests on every load.**

---

### Issue 2: Variations Fetched Twice After Save/Delete

**Location**: `product-detail-panel.tsx` (lines ~430–450) and `product-tree.tsx` (line ~104–120)

**Problem**:

```typescript
// product-detail-panel.tsx, line ~437
const handleSaveVariation = async () => {
  // ... save variation ...
  cancelVariationDraft();
  fetchVariations(String(editingProduct.id));  // ← Fetch 1
  onVariationsChanged?.(String(editingProduct.id));  // ← Triggers parent
};

// Page calls ProductTreePanel with this callback
<ProductTreePanel
  variationsSignal={variationsSignal}  // state that gets bumped
  onVariationsChanged={handleVariationsChanged}  // sets the signal
/>

// product-tree.tsx, line ~104
useEffect(() => {
  if (!variationsSignal?.productId) return;
  // ... independent fetch of variations for same productId ...
  const res = await productVariationService.getVariations({ product_id: pid, ... });
}, [variationsSignal]);
```

**Impact**: When a variation is saved or deleted, two identical `GET /api/v1/product-variations?product_id=X` requests fire within milliseconds:

1. One from `fetchVariations()` in detail panel
2. One from the `variationsSignal` effect in tree

**This happens on every variation CRUD operation.**

---

### Issue 3: No Shared Cache Between Components

**Location**: `product-tree.tsx` (expand handler) + `product-detail-panel.tsx` (select handler)

**Problem**:

```typescript
// product-tree.tsx, line ~130
const handleToggle = async (productId: string) => {
  // On expand, fetch into variationMap[productId]
  const res = await productVariationService.getVariations({ product_id: productId, ... });
  setVariationMap(prev => ({ ...prev, [productId]: data }));
};

// product-detail-panel.tsx, line ~206
const fetchVariations = useCallback(async (productId: string) => {
  // On select in tree, independently fetch into local variations state
  const res = await productVariationService.getVariations({ product_id: productId, ... });
  setVariations(Array.isArray(res) ? res : (res?.data ?? res?.variations ?? []));
}, []);
```

**Impact**: If you expand a tree node for product X (fetches variations into tree's state) and then immediately click to select product X in the detail panel (fetches variations into detail panel's state), two identical requests fire within seconds, with zero sharing.

---

### Issue 4: Race Condition on Product Selection

**Location**: `product-detail-panel.tsx`, line ~266

**Problem**:

```typescript
useEffect(() => {
  if (selectedProductId) {
    setLoadingProduct(true);
    productService.getProduct(selectedProductId)
      .then(p => {
        openEditProductForm(p);  // ← No `mounted` guard
      })
      .catch(...)
      .finally(() => setLoadingProduct(false));
  }
  // ... no return () => { cancelled = true } cleanup
}, [selectedProductId]);

// Compare to refreshKey effect (line ~296), which DOES have guards:
useEffect(() => {
  let cancelled = false;  // ← Guard present here
  // ... fetch ...
  return () => { cancelled = true; };
}, [refreshKey]);
```

**Impact**: Rapid selection of different products can let an older fetch response overwrite a newer one. Example:

1. User clicks product A → `getProduct(A)` starts
2. Immediately clicks product B → `getProduct(B)` starts
3. B responds first → panel shows product B (correct)
4. A responds late → panel shows product A (wrong; stale data overwrote B)

---

### Issue 5: Tenant & Business Type Dropdown Double-Fetch (Dev Only, but Preventable)

**Location**: `components/ui/tenant-select.tsx` (line ~36) + `components/ui/business-type-select.tsx` (line ~34)

**Problem**:
Both dropdown selects are mounted only once in `product-tree.tsx` (lines ~100 and ~113), but each fetches its options in a plain `useEffect` with only a `mounted` flag:

```typescript
// tenant-select.tsx, line ~36
useEffect(() => {
  let mounted = true;
  (async () => {
    try {
      const opts = await loadOptions(''); // ← Fetch 1 on mount
      if (!mounted) return;
      setDefaultOptions(opts);
    } catch (e) {
      /* ... */
    }
  })();
  return () => {
    mounted = false;
  }; // ← Only prevents setState after unmount, NOT dedup
}, []);

// In dev, React 18 Strict Mode intentionally mounts → unmounts → remounts every component once
// to surface effect bugs. This double-invokes loadOptions('') even though it's the same component.
```

**Root Cause**: `next.config.ts` has `reactStrictMode: true` (confirmed). Strict Mode is designed to catch bugs by intentionally performing an extra mount/unmount/remount cycle in development. The `mounted` flag only prevents **state updates** after unmount, but does **not** prevent the **network request** itself from being made twice.

**Impact** (dev only): Every page load fires:

- `GET /api/v1/dropdown/tenants` twice (one per StrictMode mount cycle)
- `GET /api/v1/dropdown/business-types` twice (one per StrictMode mount cycle)

**Why it's worth fixing**: Although this only manifests in dev, it:

1. Makes performance profiling in dev unreliable (misleads developers about actual behavior)
2. Could happen in production if these components are ever remounted via key changes
3. Violates React Query best practices — use dedicated query hooks for all data fetches, even dropdowns

**Solution** (see Phase 1.5 below): Add `useTenantsDropdown` and `useBusinessTypesDropdown` React Query hooks. React Query's cache is keyed by `queryKey` and survives StrictMode's mount/unmount/remount cycle within the same `QueryClientProvider` — the second mount hits the cache instead of firing a new request.

---

### Additional Code Quality Issues

1. **Repeated response-unwrapping logic** — duplicated 5+ times:

   ```typescript
   const data: ProductVariation[] = Array.isArray(res) ? res : (res?.data ?? res?.variations ?? []);
   ```

2. **Heavy `any` casts** — defeating existing types in `types/api.types.ts`:

   ```typescript
   const user = useAuthStore(s => s.user);
   const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null; // ← Should be typed
   ```

3. **Dead code** — `product-tree.tsx`, line ~265:

   ```typescript
   const hasVariations = (...) || true;  // ← Always true; logic is unclear
   ```

4. **Masked linting issues** — `product-detail-panel.tsx`:

   ```typescript
   }, [selectedProductId]); // eslint-disable-line react-hooks/exhaustive-deps
   ```

   The suppressions hide real stale-closure risks in `openEditProductForm`/`categoryOptions`/`fetchVariations`.

5. **Manual fetching instead of React Query** — App already has React Query installed but this page uses raw `useState`/`useEffect`/axios, missing built-in dedup, caching, and stale-response handling.

---

## Solution: React Query Hooks

### Why React Query?

React Query (TanStack Query) provides:

- **Request deduplication**: identical in-flight requests are coalesced into one
- **Smart caching**: same query key serves all consumers instantly
- **Automatic stale-response handling**: race conditions handled internally
- **Enabled/disabled queries**: perfect for gating fetches until auth hydrates
- **Query invalidation**: replace manual refetch-signal plumbing with `queryClient.invalidateQueries(...)`

Already installed in `package.json`, so no new dependencies.

---

## Implementation Plan

### Phase 1: Create React Query Hooks (Independent, Can be Parallel)

#### 1.1 `services/queries/useCategories.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/axios';
import type { Category } from '@/types/api.types';

export function useCategories(businessTypeId: number | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['categories', businessTypeId],
    queryFn: async () => {
      const params: Record<string, any> = { per_page: 100 };
      if (businessTypeId) params.business_type_id = businessTypeId;
      const res = await apiClient.get('/api/v1/categories', { params });
      const raw: any[] = res.data?.data ?? res.data ?? [];
      return raw.map(
        (r: any) =>
          ({
            id: String(r.id),
            name: r.name,
            description: r.description,
            parent_id: r.parent_id ? String(r.parent_id) : undefined,
            is_active: !!r.is_active,
            business_types: r.business_types,
            business_type: r.business_type,
            parent: r.parent,
          }) as Category
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled, // ← Gate until auth hydrates
  });
}
```

#### 1.2 `services/queries/useProducts.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import productService from '@/services/productService';
import type { Product } from '@/types/api.types';

export function useProducts(
  businessTypeId: number | null | undefined,
  search: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['products', businessTypeId, search],
    queryFn: async () => {
      const params: any = { per_page: 100, lite: 1 };
      if (search.trim()) params.search = search.trim();
      if (businessTypeId) params.business_type_id = businessTypeId;
      const res: any = await productService.getProducts(params);
      return Array.isArray(res) ? res : ((res?.data ?? res?.products ?? []) as Product[]);
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    enabled, // ← Gate until auth hydrates
  });
}
```

#### 1.3 `services/queries/useProduct.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import productService from '@/services/productService';
import type { Product } from '@/types/api.types';

export function useProduct(productId: string | null | undefined) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null;
      return await productService.getProduct(productId);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!productId, // ← Don't fetch until productId is set
  });
}
```

#### 1.4 `services/queries/useProductVariations.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import productVariationService from '@/services/productVariationService';
import type { ProductVariation } from '@/types/api.types';

export function useProductVariations(productId: string | null | undefined) {
  return useQuery({
    queryKey: ['variations', productId],
    queryFn: async () => {
      if (!productId) return [];
      const res: any = await productVariationService.getVariations({
        product_id: productId,
        per_page: 100,
      } as any);
      return Array.isArray(res)
        ? res
        : ((res?.data ?? res?.variations ?? []) as ProductVariation[]);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!productId, // ← Don't fetch until productId is set
  });
}
```

#### 1.5 Helper: `lib/api/response-helpers.ts`

```typescript
/**
 * Unified response unwrapper for list endpoints that may return various shapes:
 * - Direct array: res = [item1, item2, ...]
 * - Wrapped in data: res = { data: [item1, ...] }
 * - Custom key: res = { variations: [item1, ...] }
 */
export function unwrapListResponse<T>(res: any, fallbackKey?: string): T[] {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  if (fallbackKey && res?.[fallbackKey] && Array.isArray(res[fallbackKey])) {
    return res[fallbackKey];
  }
  return [];
}
```

**Update existing services** to use this helper (optional, but cleaner):

```typescript
// services/productService.ts
export const getProducts = async (params?: any) => {
  const res = await apiClient.get('/api/v1/products', { params });
  return unwrapListResponse(res.data); // Callers now receive a typed array directly
};
```

#### 1.6 `services/queries/useTenantsDropdown.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { commonService } from '@/services';

export interface TenantDropdownOption {
  id: string | number;
  business_name: string;
}

export function useTenantsDropdown() {
  return useQuery({
    queryKey: ['tenantsDropdown'],
    queryFn: async () => {
      const tenants = await commonService.getTenantsForDropdown({ search: '' });
      return (tenants || []) as TenantDropdownOption[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes — tenants change infrequently
  });
}
```

#### 1.7 `services/queries/useBusinessTypesDropdown.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { businessTypeService } from '@/services/businessTypeService';

export interface BusinessTypeDropdownOption {
  id: number;
  name: string;
}

export function useBusinessTypesDropdown() {
  return useQuery({
    queryKey: ['businessTypesDropdown'],
    queryFn: async () => {
      return await businessTypeService.getForDropdown({ search: '' });
    },
    staleTime: 10 * 60 * 1000, // 10 minutes — business types change infrequently
  });
}
```

**Integration with TenantSelect / BusinessTypeSelect**:

- Keep the `AsyncSelect` + `loadOptions` behavior for **search-as-you-type** (live calls, not cached)
- Replace the `useEffect` default-options preload with the query hook:

```typescript
// tenant-select.tsx
import { useTenantsDropdown } from '@/services/queries/useTenantsDropdown';

export default function TenantSelect({ value, onChange, ... }: TenantSelectProps) {
  const { data: preloadedTenants = [] } = useTenantsDropdown();  // ← Cache hit on StrictMode remount
  const [defaultOptions, setDefaultOptions] = useState<SelectOption[]>([]);

  // Initialize defaultOptions from the query hook's data (cache-backed, not a new fetch)
  useEffect(() => {
    const opts = (preloadedTenants || []).map((t: any) => ({
      value: String(t.id),
      label: t.business_name
    }));
    setDefaultOptions(opts);
  }, [preloadedTenants]);

  // Keep the existing loadOptions callback for search-as-you-type (fires fresh requests)
  const loadOptions = async (input: string) => {
    try {
      const tenants = await commonService.getTenantsForDropdown({ search: input });
      const opts = (tenants || []).map((t: any) => ({ value: String(t.id), label: t.business_name }));
      return opts;
    } catch (err) {
      console.error('TenantSelect loadOptions error', err);
      return [];
    }
  };

  // ... rest of component unchanged ...
}
```

Same pattern for `BusinessTypeSelect` — use `useBusinessTypesDropdown()` for the preload, keep `loadOptions` for live search.

**Benefit**: React Query's cache is keyed by `queryKey` and shared across the entire `QueryClientProvider` tree. When React 18 Strict Mode remounts `TenantSelect`, the query hook checks the cache first (hits on the second mount) instead of firing a new `GET /dropdown/tenants` request. This also works in production if these components ever get remounted via parent key changes.

---

### Phase 2: Rewire Components (Depends on Phase 1)

#### 2.1 `app/(protected)/products/manage/page.tsx`

**Remove**:

- `fetchCategories` callback
- `loadingCategories` state
- `useEffect(() => { fetchCategories(); }, [fetchCategories])` (line ~81)
- `useEffect` to handle `tenantBusinessTypeId` change (line ~57)

**Replace with**:

```typescript
// After imports
import { useCategories } from '@/services/queries/useCategories';

export default function ProductManageTreePage() {
  // ... existing state ...
  const { isHydrated } = usePermissions();  // ← Already present

  // Replace manual fetch + state with React Query hook
  const { data: categories = [], isLoading: isLoadingCategories } = useCategories(
    effectiveBtId,
    isHydrated  // ← Gate until auth hydrates; this eliminates double-fetch
  );

  // Remove handleBusinessTypeChange's side effect of clearing selection
  // (or keep it if desired for UX; just remove the treeRefreshKey bump)
  const handleBusinessTypeChange = (id: number | null) => {
    setBusinessTypeId(id);
    setSelectedProductId(null);
    // No more: setTreeRefreshKey(v => v + 1) — hook dependency will auto-refetch
  };

  // Remove handleRefresh's treeRefreshKey/detailRefreshKey bumping:
  const handleRefresh = () => {
    // Instead, use queryClient to invalidate:
    const queryClient = useQueryClient();
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['product', selectedProductId] });
    queryClient.invalidateQueries({ queryKey: ['variations'] });
  };

  // Remove these state vars entirely (no longer needed):
  // const [treeRefreshKey, setTreeRefreshKey] = useState(0);
  // const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  // const [variationsSignal, setVariationsSignal] = useState<...>(null);
```

#### 2.2 `components/product-manage/product-tree.tsx`

**Remove**:

- `fetchProducts` callback
- `loadingVariations` + `variationMap` state
- `useEffect(() => { fetchProducts(); }, [fetchProducts, refreshKey, effectiveBtId])`
- `useEffect` that handles `variationsSignal`
- `handleToggle`, `expandAll` variation-fetch logic (replace with hook query)

**Replace with**:

```typescript
// After imports
import { useProducts } from '@/services/queries/useProducts';
import { useProductVariations } from '@/services/queries/useProductVariations';
import { useQueryClient } from '@tanstack/react-query';

export function ProductTreePanel({
  businessTypeId,
  onBusinessTypeChange,
  tenantId,
  onTenantChange,
  selectedProductId,
  onSelectProduct,
  onAddProduct,
  onRefresh,
  canCreate,
  canUpdate,
  categories,
  // Remove: refreshKey, variationsSignal (no longer needed)
}: ProductTreePanelProps) {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isHydrated } = usePermissions();  // ← Add isHydrated

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Replace manual fetch + loading state with query hook (deduped, cached)
  const { data: products = [], isLoading } = useProducts(
    effectiveBtId,
    debounced,
    isHydrated  // ← Gate until auth hydrates
  );

  // Per-product variations: two ways to use this:
  // Option A: Track which product is currently expanding, fetch only that one:
  const [expandingProductId, setExpandingProductId] = useState<string | null>(null);
  const { data: expandedVariations = [] } = useProductVariations(expandingProductId);

  // Option B (better for UX): Keep a map of which products are expanded,
  // and call useProductVariations multiple times (one hook per expanded product ID).
  // This is more idiomatic React Query. For now, use Option A for simplicity.

  const handleToggle = async (productId: string) => {
    const isExpanded = expanded.has(productId);
    if (isExpanded) {
      setExpanded(prev => { const n = new Set(prev); n.delete(productId); return n; });
    } else {
      setExpanded(prev => new Set(prev).add(productId));
      setExpandingProductId(productId);  // Trigger fetch of this product's variations
    }
  };

  const expandAll = async () => {
    const allIds = products.map(p => String(p.id));
    setExpanded(new Set(allIds));
    // Fetch variations for all products (they'll be cached)
    for (const pid of allIds) {
      // Trigger load by setting the key in a loop (or use a map)
      // For MVP: just expand UI; variations load on-demand as user interacts
    }
  };

  // Remove the dedicated variationsSignal effect; instead, rely on React Query's
  // cache invalidation from the parent (triggered when detail panel saves/deletes).
```

#### 2.3 `components/product-manage/product-detail-panel.tsx`

**Remove**:

- `fetchVariations` callback
- `loadingVariations`, `variationMap`, `variationDraftId` state (except where still needed for UI)
- The two `useEffect` chains that fetch product/variations on selection and refresh (lines ~266, ~296)
- The `mounted` guard pattern (React Query handles this)

**Replace with**:

```typescript
// After imports
import { useProduct } from '@/services/queries/useProduct';
import { useProductVariations } from '@/services/queries/useProductVariations';
import { useQueryClient } from '@tanstack/react-query';

export function ProductDetailPanel({
  selectedProductId,
  categories,
  businessTypeId,
  tenantId,
  onTenantChange,
  createTrigger = 0,
  onProductSaved,
  onProductDeleted,
  // Remove: refreshKey, onVariationsChanged, variationsSignal (no longer needed)
}: ProductDetailPanelProps) {
  const queryClient = useQueryClient();
  const { isHydrated } = usePermissions();

  // Replace manual load with query hook (handles race conditions internally)
  const { data: loadedProduct, isLoading: isLoadingProduct } = useProduct(
    selectedProductId && isHydrated ? selectedProductId : null
  );

  // Load variations for the current product
  const { data: variations = [], isLoading: isLoadingVariations } = useProductVariations(
    selectedProductId && isHydrated ? selectedProductId : null
  );

  // Instead of refresh-key bumping, invalidate the queries
  const handleRefresh = () => {
    if (!selectedProductId) return;
    queryClient.invalidateQueries({ queryKey: ['product', selectedProductId] });
    queryClient.invalidateQueries({ queryKey: ['variations', selectedProductId] });
  };

  // In handleSaveVariation, replace onVariationsChanged call with invalidation:
  const handleSaveVariation = async () => {
    // ... existing save logic ...
    try {
      // ... saveVariation, storeStocks ...

      // OLD: cancelVariationDraft(); fetchVariations(...); onVariationsChanged?.(...);
      // NEW: just invalidate; hook will auto-refetch
      cancelVariationDraft();
      queryClient.invalidateQueries({ queryKey: ['variations', String(editingProduct.id)] });
      // Don't need to manually call fetchVariations or signal the tree
    } catch (e: any) {
      notify.error(...);
    }
  };

  // Same for handleDeleteVariation:
  const handleDeleteVariation = async (v: ProductVariation) => {
    // ... existing delete logic ...
    try {
      await productVariationService.deleteVariation(String(v.id));
      notify.success('Variation deleted');
      // OLD: fetchVariations(...); onVariationsChanged?.(...);
      // NEW:
      if (editingProduct) {
        queryClient.invalidateQueries({ queryKey: ['variations', String(editingProduct.id)] });
      }
    } catch (e: any) {
      notify.error(...);
    }
  };

  // Remove the two eslint-disable comments once effects are gone
```

#### 2.4 Update Props & Remove Plumbing

**In `page.tsx`**, remove these from `ProductTreePanel` props:

```typescript
// OLD:
<ProductTreePanel
  ...
  refreshKey={treeRefreshKey}
  variationsSignal={variationsSignal}
/>

// NEW:
<ProductTreePanel
  ...
  // No refreshKey, no variationsSignal
/>
```

Similarly for `ProductDetailPanel`:

```typescript
// OLD:
<ProductDetailPanel
  ...
  refreshKey={detailRefreshKey}
  createTrigger={createTrigger}
  onProductSaved={handleProductSaved}
  onProductDeleted={handleProductDeleted}
  onVariationsChanged={handleVariationsChanged}
/>

// NEW:
<ProductDetailPanel
  ...
  createTrigger={createTrigger}
  onProductSaved={handleProductSaved}
  onProductDeleted={handleProductDeleted}
  // No refreshKey, no onVariationsChanged
/>
```

#### 2.5 `components/ui/tenant-select.tsx` + `components/ui/business-type-select.tsx`

**Goal**: Use React Query hooks for the default-options preload so that React 18 Strict Mode's remount cycle hits the cache instead of firing a duplicate network request.

**tenant-select.tsx changes**:

```typescript
'use client';

import { useEffect, useState } from 'react';
import CustomSelect from './custom-select';
import { commonService } from '@/services';
import { useTenantsDropdown } from '@/services/queries/useTenantsDropdown';  // ← New hook

interface TenantSelectProps {
  value?: string | null;
  onChange: (tenantId?: string | null) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  compact?: boolean;
  isClearable?: boolean;
}

export default function TenantSelect({ value, onChange, placeholder = 'Select tenant', isDisabled = false, isInvalid = false, compact = false, isClearable = false }: TenantSelectProps) {
  const { data: preloadedTenants = [] } = useTenantsDropdown();  // ← Use cached query data
  const [defaultOptions, setDefaultOptions] = useState<{ value: string; label: string }[]>([]);
  const [selected, setSelected] = useState<any>(null);

  // Initialize defaultOptions from hook's cached data (not a separate fetch)
  useEffect(() => {
    const opts = (preloadedTenants || []).map((t: any) => ({
      value: String(t.id),
      label: t.business_name
    }));
    setDefaultOptions(opts);
  }, [preloadedTenants]);

  // Keep loadOptions for search-as-you-type live requests (not cached)
  const loadOptions = async (input: string) => {
    try {
      const tenants = await commonService.getTenantsForDropdown({ search: input });
      const opts = (tenants || []).map((t: any) => ({ value: String(t.id), label: t.business_name }));
      return opts;
    } catch (err) {
      console.error('TenantSelect loadOptions error', err);
      return [] as { value: string; label: string }[];
    }
  };

  // sync selected state when value prop changes (without re-fetching)
  useEffect(() => {
    if (!value) { setSelected(null); return; }
    const valueStr = String(value);
    const found = defaultOptions.find(o => String(o.value) === valueStr);
    if (found) setSelected(found);
  }, [value, defaultOptions]);

  return (
    <CustomSelect
      value={selected}
      onChange={(opt) => {
        setSelected(opt);
        onChange(opt?.value ? String(opt.value) : null);
      }}
      loadOptions={loadOptions}
      defaultOptions={defaultOptions}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      compact={compact}
      isClearable={isClearable}
    />
  );
}
```

**business-type-select.tsx changes**:

```typescript
'use client';

import { useEffect, useState } from 'react';
import CustomSelect from './custom-select';
import { businessTypeService } from '@/services/businessTypeService';
import { useBusinessTypesDropdown } from '@/services/queries/useBusinessTypesDropdown';  // ← New hook

type SelectOption = { value: string; label: string };

interface BusinessTypeSelectProps {
  value?: string | number | null;
  onChange: (businessTypeId: number | null) => void;
  onChangeDetail?: (detail: { id: number | null; name: string | null }) => void;
  placeholder?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isClearable?: boolean;
  className?: string;
  compact?: boolean;
}

export default function BusinessTypeSelect({ value, onChange, onChangeDetail, placeholder = 'Select business type', isDisabled = false, isInvalid = false, isClearable = true, className = 'w-full', compact = false }: BusinessTypeSelectProps) {
  const { data: preloadedBusinessTypes = [] } = useBusinessTypesDropdown();  // ← Use cached query data
  const [defaultOptions, setDefaultOptions] = useState<SelectOption[]>([]);
  const [selected, setSelected] = useState<SelectOption | null>(null);

  // Initialize defaultOptions from hook's cached data (not a separate fetch)
  useEffect(() => {
    const opts = (preloadedBusinessTypes || []).map((t) => ({ value: String(t.id), label: t.name }));
    setDefaultOptions(opts);
  }, [preloadedBusinessTypes]);

  // Keep loadOptions for search-as-you-type live requests (not cached)
  const loadOptions = async (input: string) => {
    try {
      const types = await businessTypeService.getForDropdown({ search: input || undefined });
      const opts = (types || []).map((t) => ({ value: String(t.id), label: t.name }));
      return opts;
    } catch (err) {
      console.error('BusinessTypeSelect loadOptions error', err);
      return [] as SelectOption[];
    }
  };

  // Sync selected state when value prop changes
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    const valueStr = String(value);
    const found = defaultOptions.find((o) => o.value === valueStr);
    if (found) {
      setSelected(found);
    } else {
      // Fallback: try to fetch individual item if not in preloaded list
      const id = parseInt(valueStr, 10);
      if (!Number.isNaN(id)) {
        businessTypeService.getById(id).then((item) => {
          if (!item) return;
          const fallbackOption = { value: String(item.id), label: item.name };
          setSelected(fallbackOption);
          setDefaultOptions((prev) => {
            if (prev.some((o) => o.value === fallbackOption.value)) return prev;
            return [fallbackOption, ...prev];
          });
        }).catch(err => console.error('BusinessTypeSelect fallback fetch error', err));
      } else {
        setSelected(null);
      }
    }
  }, [value, defaultOptions]);

  return (
    <CustomSelect
      value={selected}
      onChange={(opt) => {
        setSelected(opt);
        const id = opt ? parseInt(opt.value, 10) : null;
        const name = opt?.label ?? null;
        onChange(id);
        onChangeDetail?.({ id, name });
      }}
      loadOptions={loadOptions}
      defaultOptions={defaultOptions}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isClearable={isClearable}
      className={className}
      compact={compact}
    />
  );
}
```

**Key changes**:

- Import the new query hooks (`useTenantsDropdown`, `useBusinessTypesDropdown`)
- Remove the `useEffect` that fired `loadOptions('')` on mount — replaced with hook query data
- Keep `loadOptions` callback for search-as-you-type (live requests, not cached)
- The query hook's cache survives React Strict Mode remounts, eliminating the duplicate dev-only fetch

---

### Phase 3: Code Quality Cleanup (Parallel per File)

#### 3.1 Remove Dead Code

**product-tree.tsx**, line ~265:

```typescript
// OLD:
const hasVariations =
  (product.variations && product.variations.length > 0) || variations.length > 0 || true;
// ^ Always true; unclear intent

// NEW (if truly always expandable):
// Just remove the variable; expand button is always present anyway
// Or implement: const hasVariations = variations.length > 0;
```

#### 3.2 Extract Shared Response-Unwrap Helper

Create `lib/api/response-helpers.ts`:

```typescript
export function unwrapListResponse<T>(res: any, fallbackKey?: string): T[] {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  if (fallbackKey && res?.[fallbackKey] && Array.isArray(res[fallbackKey])) {
    return res[fallbackKey];
  }
  return [];
}
```

Update services to use it, eliminating repeated logic in components.

#### 3.3 Remove `any` Casts for User/Tenant Access

**File**: `types/api.types.ts` (or `stores/auth-store.ts` if applicable)

Add typed extension:

```typescript
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  tenant_id?: string;
  tenant?: {
    id: string;
    name: string;
    business_type?: {
      id: number;
      name: string;
    };
  };
  // ... other fields
}
```

Then in components:

```typescript
// OLD:
const tenantBusinessTypeId = (user as any)?.tenant?.business_type?.id ?? null;

// NEW:
const tenantBusinessTypeId = (user as AuthUser)?.tenant?.business_type?.id ?? null;
// Or better yet, add a typed hook that does this:
```

Optional: Extract a `useUserTenant()` hook:

```typescript
export function useUserTenant() {
  const user = useAuthStore(s => s.user) as AuthUser;
  return {
    tenantId: user?.tenant?.id,
    tenantBusinessTypeId: user?.tenant?.business_type?.id,
  };
}
```

#### 3.4 Remove ESLint Disables

Once effects are replaced with React Query hooks, the following comments disappear naturally:

```typescript
// OLD in product-detail-panel.tsx, line ~266:
}, [selectedProductId]); // eslint-disable-line react-hooks/exhaustive-deps

// OLD in product-detail-panel.tsx, line ~296:
// eslint-disable-next-line react-hooks/exhaustive-deps
```

---

## Testing & Verification

### Unit Tests (Optional, but Recommended)

Create `services/queries/__tests__/useProducts.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProducts } from '../useProducts';
import * as productService from '@/services/productService';

describe('useProducts', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('should fetch products when enabled', async () => {
    const mockProducts = [{ id: '1', name: 'Product 1' }];
    jest.spyOn(productService, 'getProducts').mockResolvedValue(mockProducts);

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useProducts(1, '', true), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockProducts);
  });

  it('should not fetch when enabled is false', () => {
    const spy = jest.spyOn(productService, 'getProducts');
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useProducts(1, '', false), { wrapper });

    expect(spy).not.toHaveBeenCalled();
  });

  it('should deduplicate identical in-flight requests', async () => {
    const mockProducts = [{ id: '1', name: 'Product 1' }];
    let callCount = 0;
    jest.spyOn(productService, 'getProducts').mockImplementation(async () => {
      callCount++;
      return mockProducts;
    });

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result: result1 } = renderHook(() => useProducts(1, '', true), { wrapper });
    const { result: result2 } = renderHook(() => useProducts(1, '', true), { wrapper });

    await waitFor(() => {
      expect(result1.current.isSuccess && result2.current.isSuccess).toBe(true);
    });

    expect(callCount).toBe(1); // ← Only one actual network call
    expect(result1.current.data).toEqual(result2.current.data);
  });
});
```

### Manual Testing Checklist

1. **No Double-Fetch on Load**:
   - Open browser DevTools → Network tab → filter by `/api/v1/`
   - Reload the Products Manage page
   - **Expected**: One `GET /api/v1/categories` request, one `GET /api/v1/products` request
   - **Before fix**: Two of each
   - ✅ Pass if exactly one request per endpoint

2. **No Duplicate Variation Fetches on Save/Delete**:
   - Open a product, add a new variation with stock
   - Check Network tab → filter by `/product-variations`
   - **Expected**: One `GET /api/v1/product-variations?product_id=X` after save
   - **Before fix**: Two identical requests
   - ✅ Pass if exactly one request fires

3. **Shared Cache Between Tree and Detail Panel**:
   - Network tab active, filter by `/product-variations`
   - Expand a tree node for product X (triggers fetch into tree's state)
   - Immediately click to select the same product X (triggers fetch into detail panel's state)
   - **Expected**: Network tab shows only one `/product-variations` request for X; detail panel data appears instantly (served from cache)
   - **Before fix**: Two requests fire
   - ✅ Pass if only one request and second component loads instantly

4. **Refresh Button Still Works**:
   - Click the "Refresh" button in the page header
   - **Expected**: Product, variations, and product list refetch from backend; no invalid/stale data shown
   - ✅ Pass if data refreshes correctly

5. **Permission Gates & Auth Flow**:
   - Log in as a tenant user → Products Manage page should load and show only their business type
   - Log in as super admin → should be able to switch business types and tenants
   - **Expected**: Same behavior as before; no broken permission checks
   - ✅ Pass if all permission flows work unchanged

6. **Create/Edit/Delete Product + Variation Flows**:
   - Create a new product
   - Add a variation with stock
   - Edit the product name
   - Edit the variation SKU
   - Delete the variation
   - Delete the product
   - **Expected**: All flows work as before; tree and detail panel stay in sync
   - ✅ Pass if all CRUD operations work unchanged

7. **Lint & Type Checks**:
   ```bash
   cd inventory-ui
   npm run lint
   npx tsc --noEmit
   ```

   - **Expected**: No errors (or only pre-existing issues)
   - ✅ Pass if no new type errors, no new lint issues

---

## Files to Create / Modify

### Create

- `services/queries/useCategories.ts`
- `services/queries/useProducts.ts`
- `services/queries/useProduct.ts`
- `services/queries/useProductVariations.ts`
- `services/queries/useTenantsDropdown.ts` (new for Issue 5 fix)
- `services/queries/useBusinessTypesDropdown.ts` (new for Issue 5 fix)
- `lib/api/response-helpers.ts`
- `services/queries/__tests__/useProducts.test.ts` (optional)

### Modify

- `app/(protected)/products/manage/page.tsx` — remove `fetchCategories`, refresh-key plumbing
- `components/product-manage/product-tree.tsx` — replace manual fetch effects with query hooks
- `components/product-manage/product-detail-panel.tsx` — replace manual fetch effects with query hooks, remove eslint-disable comments
- `components/ui/tenant-select.tsx` — replace mount-time fetch with `useTenantsDropdown()` hook, keep live `loadOptions` for search
- `components/ui/business-type-select.tsx` — replace mount-time fetch with `useBusinessTypesDropdown()` hook, keep live `loadOptions` for search
- `types/api.types.ts` — add typed `AuthUser` interface (optional but recommended)

### No Changes Required

- `components/product-manage/category-tree.tsx`
- `components/product-manage/category-form-dialog.tsx`
- `services/productService.ts`, `productVariationService.ts` (no breaking changes)
- `components/ui/custom-select.tsx` (AsyncSelect already has `cacheOptions` enabled)

---

## Rollback & Safety

- All changes are additive (new query hooks) + replacements of effects (functionally equivalent)
- The old service methods remain unchanged; only their call sites change
- If issues arise, reverting is straightforward: revert the affected component files to use old `fetchX` callbacks + `useEffect` chains
- Git history will show the migration clearly

---

## Performance Impact

**Before**:

- Page load: 4 API calls (2 categories, 2 products) + 2 dropdown calls (tenants, business-types) = 6 calls (800–1500ms)
- Expand a tree node: 1 call — 200–300ms
- Select same product after expand: 1 call (duplicate) — 200–300ms
- Save variation: 2 calls (fetch + signal) — 400–600ms total
- In dev (React Strict Mode): 2x tenant dropdown calls on mount (duplicate)
- **Typical session**: ~20–25 calls over a few minutes (dev: add 2 duplicate dropdown calls)

**After**:

- Page load: 2 API calls (1 categories, 1 products) + 2 cached dropdown calls (0ms, from cache) = 2 network calls (400–600ms typical, 50% reduction)
- Expand a tree node: 1 call — 200–300ms
- Select same product after expand: 0 calls (served from cache instantly)
- Save variation: 1 call (invalidate + auto-refetch) — 200–300ms (50% reduction)
- In dev (React Strict Mode): Tenant/business-type dropdowns now hit cache on remount (0 duplicate calls, was 2)
- **Typical session**: ~8–12 calls over same time period (40–50% reduction)

---

## Migration Timeline

- **Phase 1 (Create hooks)**: 2–3 hours (6 new hooks: categories, products, product, variations, tenantsDropdown, businessTypesDropdown; can be done in parallel)
- **Phase 2 (Rewire components)**: 3–4 hours (depends on Phase 1; includes product manage page components + dropdown selects)
- **Phase 3 (Code cleanup)**: 1 hour (dead code, unwrap helper, type safety)
- **Testing & QA**: 1–2 hours

**Total**: ~7–10 hours (5–6 hours if done efficiently in sequence)

---

## Decisions & Rationale

| Decision                                                                      | Why                                                                                                           |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Adopt React Query for this page + dropdowns (not app-wide)                    | Solves the reported problems immediately (production + dev Strict Mode); can be extended to other pages later |
| Use query keys like `['products', businessTypeId]`                            | Different business types have separate cache entries; tree refetch when BT changes doesn't affect other pages |
| Use `['tenantsDropdown']`, `['businessTypesDropdown']` query keys (no params) | Dropdown data is stable and global (not scoped); single cache entry shared across all page instances          |
| Gate all queries with `enabled: isHydrated`                                   | Eliminates the double-fetch caused by auth state initializing before hydration completes                      |
| Use `invalidateQueries` instead of manual `refetch` callbacks                 | Cleaner than signal plumbing; React Query dedupes concurrent invalidations + refetches automatically          |
| Keep UI markup & permission checks unchanged                                  | Minimizes risk; only data layer is touched                                                                    |
| Keep `loadOptions` live in TenantSelect/BusinessTypeSelect for search         | Search-as-you-type must fire fresh requests; preload only uses cached data for default options                |
| Extract response-unwrap helper (optional)                                     | DRY principle; reduces bugs from repeated inline logic; makes error handling consistent                       |

---

## Known Limitations & Future Work

1. **Per-node lazy loading** (`expandAll` button may trigger many parallel fetches) — acceptable for MVP; consider request batching later
2. **Category create/edit dialog** (category-form-dialog.tsx) not addressed — separate component; can be optimized independently
3. **Warehouse/bin/unit AsyncSelect loaders** in detail panel remain manual — acceptable; they're triggered on-demand and already cached by react-select
4. **Tenant/business-type dropdown search** — `loadOptions` callback still fires fresh requests on each keystroke; not cached. This is intentional (search results must be live), unlike the preloaded defaults (which are cached)
5. **No offline support** — React Query has plugins for this; out of scope for now
6. **Mutation handling** (create/update/delete) — still use direct service calls; could be replaced with `useMutation` for even better UX (optimistic updates), but deferred to Phase 2

---

## Author Notes

- This plan assumes the existing `productService`, `productVariationService`, etc. will not be refactored — only their call sites change
- The `isSuperAdmin` and `isHydrated` flags are already available from `usePermissions()` hook; the plan uses them to gate queries correctly
- React Query's DevTools browser extension is recommended for debugging cache state during development: https://github.com/TanStack/query/tree/main/packages/react-query-devtools
- **React 18 Strict Mode** (`reactStrictMode: true` in next.config.ts) intentionally remounts components in dev to expose effect bugs. The tenant/business-type double-fetch (Issue 5) only manifests in Strict Mode dev environments, but fixing it with React Query hooks prevents it from potentially occurring in production if these components ever get remounted. The fix also makes dev behavior more closely match production.
- The plan's decision to use React Query for dropdowns (1.6–1.7) is a preventive measure to ensure StrictMode doesn't cause phantom duplicate requests when developers are profiling or testing; this improves dev experience without weakening Strict Mode itself.
