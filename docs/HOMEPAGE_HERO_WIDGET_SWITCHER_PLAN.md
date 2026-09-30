# Homepage Hero Section Widget Switcher — Plan

## 1. Goal

Give the store admin a choice, per storefront, of **which widget renders in the top hero area of the homepage**:

1. **Hero Slider** (existing) — full-width auto-rotating banner carousel (current `HeroCarousel` component).
2. **Grid + Weekly Deals** (new) — a two-column layout:
   - **Left side**: 4 promotional images arranged in a 2×2 grid (2 rows × 2 columns).
   - **Right side**: a **"Weekly Deals"** vertical/card carousel showing discounted products for the week.

This mirrors the layout pattern seen on reference sites such as [meenabazaronline.com](https://meenabazaronline.com) where the hero area splits into a promo banner cluster + a rotating deals rail, instead of (or in addition to) a single hero slider.

The choice is made once in **Dashboard → Ecommerce → Homepage → Hero Section** settings, and the storefront renders whichever widget is selected — no code change needed to switch.

---

## 2. UX / Layout Plan

### Option A — Hero Slider (existing, unchanged)
Full-width `HeroCarousel`, auto-rotating slides with title/subtitle/CTA/search box, as it works today via `useHeroSliders()`.

### Option B — Grid + Weekly Deals (new)
Two-column responsive section directly below the header/category strip:

```
┌───────────────────────────────┬───────────────────────────┐
│   Image 1        │  Image 2   │                           │
│  (2x2 grid, 2 rows,           │   WEEKLY DEALS             │
│   2 columns, equal size)      │   ─────────────────────    │
│                                │   [Product] [Product]     │
│   Image 3        │  Image 4   │   [Product] [Product]     │
│                                │   ‹ prev / auto-scroll / next ›│
└───────────────────────────────┴───────────────────────────┘
        ~60-65% width                     ~35-40% width
```

- **Left block (4-image grid)**
  - 2 rows × 2 columns of clickable promo images (each links to a category/product/tag page).
  - Each image config: `image_url`, `link_url`, `alt_text`, `sort_order` (position 1–4), optional `title` badge overlay.
  - Images fill their grid cell (`object-cover`), rounded corners, small gap between cells, lazy-loaded except the first two (above the fold).
  - On mobile: collapses to a horizontal 2-up scroll or stacks 2×2 shrinking to fit full width (grid still 2 columns, just smaller).

- **Right block (Weekly Deals carousel)**
  - Header: "Weekly Deals" title + optional countdown timer (reuses the flash-sale countdown pattern already in the codebase) + "See All" link.
  - Vertical stack or 2-column mini product grid inside a scrollable/auto-advancing carousel, similar interaction to the existing `OffersCarousel` but oriented for compact product cards (image, name, unit, was/now price, discount badge, add-to-cart button) — i.e., built by reusing `ProductCard`/`FlashSaleCampaign` product-card rendering already used elsewhere in storefront.
  - Data source: existing **Flash Sale Campaign** model/endpoints (`FlashSaleCampaign` + `FlashSaleProduct`), filtered to a campaign flagged/tagged as the "weekly" cadence, OR a lighter-weight dedicated "Weekly Deals" flag — see §4 backend section for the two options and recommendation.

- **Responsiveness**
  - Desktop (≥1024px): side-by-side, ~60/40 split.
  - Tablet: side-by-side, ~55/45 split, smaller carousel cards.
  - Mobile (<640px): stacked — 4-image grid first (2×2, full width), Weekly Deals carousel below it (horizontal scroll).

---

## 3. Settings / Admin Control Plan

### 3.1 Where it lives
Dashboard sidebar → **Ecommerce Management → Homepage** group (existing group that already has "Hero Slider", "Top Offer", "Flash Sale"). Add a new top entry:

- **"Hero Section"** (`/ecommerce/homepage/hero-section`) — the widget switcher + conditional config panel.

This page becomes the parent control that decides which of the two existing/​new admin pages is "live":
- If **Hero Slider** selected → existing `/ecommerce/homepage/hero-slider` CRUD stays the source of slide content (unchanged).
- If **Grid + Weekly Deals** selected → new `/ecommerce/homepage/hero-grid` CRUD manages the 4 images, and Weekly Deals pulls from the existing/adapted Flash Sale campaign data (or a new lightweight "Weekly Deals" list, see §4).

### 3.2 New Settings Page UI (`/ecommerce/homepage/hero-section`)
Follows the exact card-selector pattern already used in `app/(protected)/ecommerce/appearance/theme/page.tsx` (two selectable preview cards + Save button):

- **Card 1: "Hero Slider"** — thumbnail preview of a rotating banner, radio-selectable.
- **Card 2: "Image Grid + Weekly Deals"** — thumbnail preview of the 2×2 grid + side carousel, radio-selectable.
- Below the cards: a "Manage content" button that deep-links to whichever content-management page is relevant for the current selection (Hero Slider CRUD vs. new Hero Grid CRUD).
- **Save** persists the selection immediately (same optimistic-update + toast pattern as the theme page).

### 3.3 New Content Management Page (`/ecommerce/homepage/hero-grid`) — only shown/relevant when Grid option selected
- Simple CRUD form for exactly 4 image slots (position 1–4), each with:
  - Image upload (reuse existing image upload widget used for Hero Slider/Offer Slides).
  - Link URL, alt text.
  - Live 2×2 preview.
- Weekly Deals carousel content is **not managed here** — it reuses the existing Flash Sale Campaign management screen (`/ecommerce/homepage/flash-sale`) filtered/tagged as "weekly", so no duplicate CRUD is built (see §4 recommendation).

---

## 4. Data Model Plan

### 4.1 Widget selection flag
Add one column to the existing per-tenant `storefront_configs` table/model (same table already storing `storefront_theme`, `express_checkout_enabled`, etc.):

- `homepage_hero_widget` — enum/string: `hero_slider` (default) | `hero_grid_deals`

Exposed via the existing `StorefrontConfigController::settings()` (public read) and `update()` (admin write), same validation pattern as `storefront_theme` (`in:hero_slider,hero_grid_deals`).

### 4.2 4-image grid content
New table `hero_grid_images` (or reuse `offer_slides` with a `layout` discriminator — recommend a **new small table** for clarity since it's a fixed 4-slot layout, not an arbitrary list):

- `tenant_id`, `position` (1–4, unique per tenant), `image_path/url`, `link_url`, `alt_text`, `is_active`, timestamps.
- Simple public endpoint: `GET /api/v1/storefront/hero-grid-images`.
- Admin CRUD endpoints under `/api/v1/hero-grid-images/*`, permission `view-ecommerce-hero-slider` (reuse) or new `view-ecommerce-hero-grid`.

### 4.3 Weekly Deals data source
Two options — **recommendation: Option 1** to avoid duplicate models:

- **Option 1 (recommended)**: Reuse existing `FlashSaleCampaign` + `FlashSaleProduct` models (already have discount rules, date ranges, product associations, banner image). Add a `cadence` or `campaign_type` value (e.g. `weekly`) or simply let admin pick "which active campaign feeds the homepage Weekly Deals rail" via a settings dropdown. No new backend table needed.
- **Option 2 (fallback)**: New lightweight `weekly_deals` table if flash-sale's date-range/campaign semantics prove too heavy for a simple always-on "this week's discounts" rail. Only pursue if Option 1 turns out to be a poor fit during implementation.

### 4.4 Frontend service/hook additions
- Extend `StorefrontSettings` type + `storefrontSettingsService` + `useStorefrontSettings()` with `homepageHeroWidget`.
- New `heroGridImagesService` + `useHeroGridImages()` hook (SWR), mirroring `useHeroSliders()`.
- Weekly Deals carousel consumes existing `useFlashSale()`-equivalent hook/service, or a new `useWeeklyDeals()` thin wrapper if a dedicated campaign filter is added.

---

## 5. Rendering Plan (Storefront)

In both `app/(storefront)/store/page.tsx` (`HomePage`) and `components/storefront/grocery/GroceryHomePage.tsx`, replace the current unconditional `<HeroCarousel />` render with a branch:

```
homepageHeroWidget === 'hero_grid_deals'
  ? <HeroGridWithWeeklyDeals />   // new component
  : <HeroCarousel slides={...} /> // existing, unchanged
```

New component `components/storefront/HeroGridWithWeeklyDeals.tsx`:
- Fetches `useHeroGridImages()` for the 4-image grid.
- Fetches weekly deals product list (flash-sale based, per §4.3).
- Handles its own loading/skeleton state (mirrors `HeroCarouselSkeleton` pattern).
- Fully responsive per §2.

---

## 6. Implementation Checklist (for future execution, not now)

**Backend**
- [ ] Migration: add `homepage_hero_widget` enum column to `storefront_configs`.
- [ ] Migration: create `hero_grid_images` table.
- [ ] Model: `HeroGridImage` (mirrors `HeroSliderImage`/`OfferSlide`).
- [ ] Controller + routes: admin CRUD (`HeroGridImageController`) + public read (`Storefront\HeroGridImageController`).
- [ ] Update `StorefrontConfigController` validation to accept `homepage_hero_widget`.
- [ ] Decide + implement Weekly Deals data source (Option 1 vs 2 from §4.3).
- [ ] Permissions: add/reuse permission for hero grid management.

**Frontend**
- [ ] `services/storefrontSettingsService.ts` + `types/storefront.ts`: add `homepage_hero_widget` field.
- [ ] `hooks/use-storefront-status.ts`: expose `homepageHeroWidget` from `useStorefrontSettings()`.
- [ ] New `services/heroGridImagesService.ts` + `hooks/use-storefront-data.ts` addition (`useHeroGridImages`).
- [ ] New dashboard page `app/(protected)/ecommerce/homepage/hero-section/page.tsx` (widget switcher, card-selector UI pattern from theme page).
- [ ] New dashboard page `app/(protected)/ecommerce/homepage/hero-grid/page.tsx` (4-image CRUD).
- [ ] Sidebar entry: add "Hero Section" under Ecommerce → Homepage group in `components/layout/sidebar.tsx`.
- [ ] New storefront component `components/storefront/HeroGridWithWeeklyDeals.tsx` (+ skeleton).
- [ ] Wire conditional rendering into `app/(storefront)/store/page.tsx` and `GroceryHomePage.tsx`.
- [ ] Responsive styling/testing across breakpoints.

**QA**
- [ ] Switching the setting immediately changes storefront hero section without redeploy.
- [ ] Both widgets degrade gracefully when no images/deals configured (skeleton/empty states).
- [ ] Mobile layout verified (stacked grid + horizontal deals scroll).

---

## 7. Open Questions / Decisions Needed Before Coding

1. Weekly Deals source: reuse Flash Sale campaigns (Option 1) or build a dedicated lightweight model (Option 2)?
2. Should the 4-image grid support more/less than 4 images in future, or is a fixed 4-slot layout acceptable long-term?
3. Does "Weekly Deals" need its own countdown/expiry display, or just a static "this week" label?
4. Permission naming: reuse `view-ecommerce-hero-slider` for grid management, or introduce a new permission key?
