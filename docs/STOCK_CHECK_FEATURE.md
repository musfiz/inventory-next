# Stock Check on Variation Select — Feature Documentation

## Overview

When adding items to a Sales Order, after a **product + variation** is selected the system
silently calls `GET /api/v1/stocks` to check how many units are available in the selected
warehouse. A coloured badge appears below the Variation dropdown:

| Badge | Meaning |
|---|---|
| Pulsing grey dot + "Checking…" | API call in-flight |
| Green dot + "In Stock (N)" | N units available in selected warehouse |
| Red dot + "Out of Stock" | 0 units in selected warehouse |
| _(nothing)_ | No variation selected yet / no warehouse selected |

Stock check is **non-blocking** — the user can still submit an order with 0-stock items
(intentional credit/backorder scenario). The unit price is still auto-filled from `selling_price`
regardless of stock status.

---

## Files Changed

### 1. `inventory-laravel/app/Traits/StockTrait.php`

**What:** Added `product_id` and `variation_id` as optional WHERE filters in `getAllStocks()`.

**Before** — only supported: `per_page`, `search`, `tenant_id`, `warehouse_id`
**After** — additionally supports: `product_id`, `variation_id`

```php
// New variables extracted from $filters
$productId  = $filters['product_id']  ?? null;
$variationId = $filters['variation_id'] ?? null;

// New WHERE conditions applied to $query
if ($productId)  { $query->where('product_id',  $productId);  }
if ($variationId) { $query->where('variation_id', $variationId); }
```

This enables the frontend to call `GET /api/v1/stocks?product_id=X&variation_id=Y&warehouse_id=Z&per_page=1`
and receive exactly the stock row for that product+variation+warehouse combination.

---

### 2. `inventory-next/app/(protected)/sales-orders/add/page.tsx`

#### a) New import
```ts
import stockService from '@/services/stockService';
```

#### b) Extended `OrderItem` interface
```ts
interface OrderItem {
  // ...existing fields...
  stockQty?: number | null;   // null = not checked, number = result
  stockChecking?: boolean;     // true while API call in-flight
}
```

#### c) `addItem` initial state
```ts
{ ..., stockQty: null, stockChecking: false }
```

#### d) New `checkStock` helper
Placed before `onProductSelect`. Calls the stocks API with `product_id`, `variation_id`,
`warehouse_id`. Skips silently if no warehouse is selected. Updates `stockQty` and
`stockChecking` on the specific item row.

```ts
const checkStock = async (idx: number, productId: string, variationId: string) => {
  if (!formData.warehouse_id) return;
  setItemField(idx, 'stockChecking', true);
  setItemField(idx, 'stockQty', null);
  try {
    const res: any = await stockService.getStocks({
      product_id: productId,
      variation_id: variationId,
      warehouse_id: formData.warehouse_id,
      per_page: 1,
    });
    const list = res?.data || res || [];
    const row = Array.isArray(list) ? list[0] : (list.data || [])[0];
    setItemField(idx, 'stockQty', row ? (Number(row.quantity) || 0) : 0);
  } catch {
    setItemField(idx, 'stockQty', null);
  } finally {
    setItemField(idx, 'stockChecking', false);
  }
};
```

#### e) Updated `onProductSelect`
- Resets `stockQty: null` and `stockChecking: false` when product changes (clears stale badge)
- Calls `checkStock()` in the single-variation auto-select path

#### f) Updated `onVariationSelect` (now async)
- Calls `checkStock()` after setting variation fields and unit price
- Reads `product_id` from current state snapshot via a `setItems` callback to avoid stale closure
- Clears `stockQty`/`stockChecking` when variation is cleared

#### g) Stock badge JSX (in Variation column)
```tsx
{it.stockChecking && (
  <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-medium text-gray-400">
    <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
    Checking…
  </span>
)}
{!it.stockChecking && it.stockQty !== null && it.stockQty !== undefined && (
  it.stockQty > 0
    ? <span className="... text-green-600"><span className="... bg-green-500" />In Stock ({it.stockQty})</span>
    : <span className="... text-red-500"><span className="... bg-red-500" />Out of Stock</span>
)}
```

---

## API Call Flow

```
User selects variation
  → onVariationSelect(idx, variationId, label, sellingPrice)
    → setItemField unit_price from sellingPrice
    → checkStock(idx, productId, variationId)
      → GET /api/v1/stocks?product_id=X&variation_id=Y&warehouse_id=Z&per_page=1
        → StockTrait::getAllStocks() applies WHERE product_id + variation_id + warehouse_id
        → Returns paginated result (1 row max)
      → setItemField stockQty = row.quantity ?? 0
      → setItemField stockChecking = false
  → Badge renders: green "In Stock (N)" or red "Out of Stock"
```

---

## Edge Cases Handled

| Scenario | Behaviour |
|---|---|
| No warehouse selected | Toast warning "Please select a warehouse first"; stock check skipped; unit price disabled |
| Stock = 0 | Toast warning "Stock out: Product – Variation"; unit price reset to 0 and disabled |
| API call fails | `stockQty` set to `null` — badge hidden (silent fail) |
| Product changes | `stockQty` reset to `null`, badge cleared |
| Variation cleared | `stockQty` reset to `null`, badge cleared |
| Single variation auto-select | `checkStock` called automatically |
| Multiple rows in the order | Each row has its own independent `stockQty`/`stockChecking` |
| 0-stock item submitted | Allowed — warning badge shown, not blocked |

---

## No Changes Needed In

- `inventory-laravel/routes/api.php` — existing `/stocks` GET route already passes all `$request->all()` to the trait
- `inventory-laravel/app/Http/Controllers/Api/StockController.php` — controller already delegates to trait
- `inventory-next/services/stockService.ts` — `getStocks(params)` already accepts `Record<string, any>`
- Any other file

---

## Enhancement: Warehouse Validation & Stock-Out Enforcement (May 2026)

### New Behaviours

| Trigger | Behaviour |
|---|---|
| Variation selected, no warehouse chosen | Toast warning "Please select a warehouse first"; stock check skipped |
| Variation selected, stock = 0 | Toast warning "Stock out: Product – Variation"; unit price reset to 0 |
| Unit price field — no warehouse selected | `disabled` + `opacity-50 cursor-not-allowed` |
| Unit price field — stock = 0 | `disabled` + `opacity-50 cursor-not-allowed` |
| Unit price field — stock > 0 | Enabled; auto-filled from variation `selling_price` |

### Code Changes

#### `checkStock()` — `app/(protected)/sales-orders/add/page.tsx`

- **Before:** silently returned when `warehouse_id` was empty
- **After:** calls `notify.warning('Please select a warehouse first')` before returning early
- **New:** after stock API resolves to `qty === 0`, reads `items[idx]` for product/variation names, fires `notify.warning('Stock out: …')`, and resets unit price to 0 via `setItemField(idx, 'unit_price', 0)`

#### Unit Price `<input>` — same file

- **Before:** always enabled
- **After:** `disabled={!formData.warehouse_id || it.stockQty === 0}` with conditional `opacity-50 cursor-not-allowed` class

### Updated API Call Flow

```
User selects variation
  → onVariationSelect(idx, variationId, label, sellingPrice)
    → setItemField unit_price from sellingPrice
    → checkStock(idx, productId, variationId)
      ├─ [no warehouse] → notify.warning('Please select a warehouse first') → return
      └─ [warehouse set] → GET /api/v1/stocks?product_id=X&variation_id=Y&warehouse_id=Z
          ├─ qty > 0 → setItemField stockQty=qty → green badge, price enabled
          └─ qty = 0 → notify.warning('Stock out: …') → setItemField unit_price=0 → red badge, price disabled
```
