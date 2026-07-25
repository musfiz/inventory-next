# Flash Sale Campaigns Page — Implementation Plan

## Context

The current campaign page at `app/(protected)/ecommerce/promotions/campaigns/page.tsx` is a stub (`PageStub` placeholder). We need to replace it with a full industrial-grade CRUD page featuring product tagging, a countdown banner preview, and computed campaign status. The sidebar already links to `/ecommerce/promotions/campaigns`. This plan follows the established patterns from `coupons.tsx`, `brands.tsx`, and `hero-slider/page.tsx`.

---

## Files to Create (4 new)

### 1. `services/flashSaleCampaignService.ts` — API Service

- Follows the `couponService.ts` pattern exactly (class with mock data fallback)
- Methods: `list()`, `store()`, `delete()`, `getById()`, `togglePause()`, `searchProducts()`
- Mock data includes one campaign for each status (scheduled, active, ended, paused)
- `list()` matches `DataTable`'s `fetchData` signature: `{ data, total, page, per_page }`
- `searchProducts()` returns `{ id, name, sku, image_url }[]` for the product picker
- Real API calls through `apiClient` (Axios) when endpoints exist

### 2. `components/ecommerce/campaigns/campaign-stat-cards.tsx` — Summary Cards

- Props: `campaigns: FlashSaleCampaign[]`
- Derives counts via `computed_status` on each campaign
- Renders 4 cards in `grid grid-cols-2 md:grid-cols-4 gap-3`:

| Card | Color | Icon |
|------|-------|------|
| Active | Green | `Timer` |
| Scheduled | Blue | `CalendarClock` |
| Ended | Gray | `CheckCheck` |
| Total | Indigo | `List` |

- Empty/loading: zero counts with muted gray styling

### 3. `components/ecommerce/campaigns/countdown-banner-preview.tsx` — Live Timer

- Props: campaign fields (name, start_date, end_date, discount_type, discount_value, banner_image_url/preview)
- Renders a styled banner card (~3:1 aspect ratio) with:
  - Gradient background + optional uploaded banner image
  - Campaign name overlay
  - Live countdown: `[days]d [HH]:[MM]:[SS]` (updates every 1s via `setInterval`)
  - Discount badge (e.g., "10% OFF" or "৳500 OFF")
- Logic:
  - Before start_date → "Starts in: [countdown]"
  - Between start/end → "Ends in: [countdown]"
  - After end_date → "Campaign has ended" (muted overlay)
- Edge cases: missing dates → placeholder text; end < start → validation warning

### 4. `components/ecommerce/campaigns/product-selector.tsx` — Multi-Product Search

- Uses `react-select`'s `AsyncSelect` with `isMulti`
- `loadOptions` → `flashSaleCampaignService.searchProducts`
- Renders selected products as tags (name + SKU)
- Props: `value`, `onChange`, `loadOptions`, `isDisabled`

---

## Files to Modify (3 existing)

### 5. `types/ecommerce.ts` — New Type Interfaces

```typescript
export type CampaignStatus = 'scheduled' | 'active' | 'ended' | 'paused';

export interface FlashSaleCampaign {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  is_paused: boolean;
  banner_image_url?: string | null;
  banner_image_path?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  computed_status?: CampaignStatus;  // computed client-side
  products?: FlashSaleCampaignProduct[];
}

export interface FlashSaleCampaignProduct {
  id: string;
  campaign_id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  product_image?: string;
  discount_value?: number | null;
}

export interface ProductSearchResult {
  id: string;
  name: string;
  sku?: string;
  image_url?: string;
}
```

### 6. `services/index.ts` — Add Export

```typescript
export { default as flashSaleCampaignService } from './flashSaleCampaignService';
```

### 7. `app/(protected)/ecommerce/promotions/campaigns/page.tsx` — Full Rewrite

Follows the `coupons.tsx` page pattern exactly:

**Structure:**
- Page header with title + "Add Campaign" button
- `<CampaignStatCards>` showing live counts
- Inline form (toggled by `showForm` state):
  - Row 1: Name (colspan 2), Discount Type (select), Discount Value (number)
  - Row 2: Start Date (DateTimePicker), End Date (DateTimePicker), Active checkbox, Paused checkbox
  - Row 3: Description (textarea, colspan 2)
  - Row 4: Banner upload (drag-drop pattern from hero-slider) + CountdownBannerPreview
  - Row 5: ProductSelector for product tagging
  - Save / Cancel buttons
- `<DataTable>` with `fetchData` → `flashSaleCampaignService.list`

**Columns:**

| Column | Width | Render |
|--------|-------|--------|
| `#` | 4% | Serial from pagination |
| `Name` | 18% | Bold text, truncated |
| `Discount` | 10% | Type-colored: `10%` or `৳500` |
| `Start Date` | 12% | `formatDate()` |
| `End Date` | 12% | `formatDate()` |
| `Products` | 8% | Count: "3 products" |
| `Status` | 10% | Color-coded badge |
| `Actions` | 14% | Edit, Pause/Resume toggle, Delete |

**Status computation** (pure function, runs on fetch + every 60s interval):
```typescript
function computeStatus(c: { start_date, end_date, is_paused }): CampaignStatus {
  if (c.is_paused) return 'paused';
  const now = new Date();
  if (now < new Date(c.start_date)) return 'scheduled';
  if (now > new Date(c.end_date)) return 'ended';
  return 'active';
}
```

**Status badge** (inline render function):
| Status | Background | Text |
|--------|-----------|------|
| scheduled | `bg-blue-100 dark:bg-blue-900/30` | `text-blue-800 dark:text-blue-300` |
| active | `bg-green-100 dark:bg-green-900/30` | `text-green-800 dark:text-green-300` |
| ended | `bg-gray-100 dark:bg-gray-700` | `text-gray-600 dark:text-gray-400` |
| paused | `bg-amber-100 dark:bg-amber-900/30` | `text-amber-800 dark:text-amber-300` |

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Status computed client-side | Real-time accuracy without API polling |
| 60s status refresh interval | Catches scheduled→active and active→ended transitions |
| Countdown refreshes every 1s | Professional live timer UX |
| Inline form (not modal) | Matches existing page pattern (brands, coupons) |
| Mock service with real API wiring | Frontend works immediately; swap to real endpoints later |
| Async multi-select for products | Industrial-grade UX for product tagging |
| Drag-and-drop banner upload | Matches hero-slider pattern |

---

## Component Hierarchy

```
CampaignsPage
├── Header (title + Add Campaign button)
├── CampaignStatCards (4 summary cards)
├── CampaignForm (inline, conditional)
│   ├── Basic fields (name, discount, dates)
│   ├── Banner upload (drag-drop)
│   ├── CountdownBannerPreview (live timer)
│   └── ProductSelector (async multi-select)
└── DataTable (with status badges + actions)
```

---

## Edge Cases Covered

| Scenario | Handling |
|----------|----------|
| Loading | DataTable spinner + stat cards not rendered until loaded |
| Empty | Stat cards show 0s; DataTable shows "No data found" |
| Validation errors | Inline field errors + disable submit |
| End < Start date | Validation: "End date must be after start date" |
| API failure (create/update) | `notify.error()` + backend field errors mapped to form |
| API failure (delete) | `notify.error('Failed to delete campaign')` |
| Image too large (>5MB) | Client-side validation, `notify.error()` |
| Image wrong type | Client-side validation (JPEG/PNG/WebP only) |
| Campaign ending while viewing | 60s auto-refresh updates badges + stat cards |
| Campaign started while viewing | Same auto-refresh handles the transition |
| Edit ended campaign | All fields editable; optionally show warning banner |
| Date parse failure | `formatDate()` returns "-" fallback |

---

## Verification

1. Run `npm run dev` and navigate to `http://localhost:9000/ecommerce/promotions/campaigns`
2. Verify 4 stat cards render with correct counts from mock data
3. Verify DataTable shows all mock campaigns with correct status badges
4. Test "Add Campaign" — form opens with all fields (name, discount, dates, description, banner upload, product selector)
5. Test countdown preview updates live when dates change
6. Test product search works in the async select
7. Test save creates a new campaign in the list
8. Test edit pre-fills the form with existing data
9. Test pause/resume toggle updates status
10. Test delete with confirmation dialog
11. Verify dark mode renders correctly for all components
12. Wait 60s and verify status refresh updates badges automatically
