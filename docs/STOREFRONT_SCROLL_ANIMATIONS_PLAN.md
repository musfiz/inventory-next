# Plan: Storefront Scroll Animations (ecom2.itnogor.com style)

## TL;DR

Rewrite the `ScrollReveal` system to deliver polished, industry-standard scroll-triggered animations across ALL storefront pages — matching the ecom2.itnogor.com reference site's feel: **sections fade-up as they enter the viewport, product cards stagger in with scale+fade, hero content slides in, section headings animate, and the footer reveals on scroll**. The current `ScrollReveal` component only supports a single `sf-zoom-in` effect. This plan adds multiple animation variants, fixes the component to guarantee the initial hidden frame is painted before reveal, applies animations to every storefront section (including pages that currently have zero animation), and adds `prefers-reduced-motion` support.

---

## Reference Site Animation Pattern (ecom2.itnogor.com)

The reference site uses these scroll-triggered effects:

1. **Section containers** — fade up (opacity 0→1 + translateY 30px→0) when scrolling into view
2. **Product cards in grids** — staggered zoom-in (scale 0.9→1 + opacity 0→1), each card delayed ~100-150ms from the previous
3. **Category cards** — same stagger zoom-in
4. **Hero/banners** — immediate load animation (no scroll trigger), content fades+slides in
5. **Section headings** — subtle fade-up before their content appears
6. **Trust badges / icon strips** — staggered pop-in from bottom
7. **Footer** — gentle fade-up when scrolled to

Key traits: **fast** (300-600ms per element), **subtle** (small translateY, no extreme scale), **one-shot** (animate once, never re-triggers), **staggered children** (50-150ms gaps, not 200ms).

---

## Phase 1: Rewrite ScrollReveal Component

### Step 1 — Enhanced `ScrollReveal.tsx`

File: `components/storefront/ScrollReveal.tsx`

Changes:

- Add `animation` prop: `'fade-up' | 'zoom-in' | 'fade-in' | 'slide-left' | 'slide-right' | 'pop'` (default: `'fade-up'`)
- Add `duration` prop: `'fast' | 'normal' | 'slow'` (maps to 300ms / 500ms / 800ms, default `'normal'`)
- Add `staggerIndex` prop (replaces `delayMs`): integer index, multiplied by a configurable `staggerGap` (default 80ms) internally — produces tighter, more professional stagger than current 200ms
- Add `once` prop (default `true`): animate only on first appearance
- Wrap `setVisible(true)` in `requestAnimationFrame(() => { ... })` to guarantee the browser paints the hidden frame before starting the animation — fixes the "appears instantly" bug
- Add `as` prop (default `'div'`): allows rendering as `section`, `article`, `li` etc. for semantic HTML
- Remove `delay` prop (d1/d2/d3/d4) and `delayMs` prop — replaced by `staggerIndex` + `staggerGap`
- Keep `threshold` prop (default 0.15)
- Add `rootMargin` prop (default `'0px 0px -50px 0px'`) — triggers slightly before element reaches viewport bottom edge for a more natural feel

### Step 2 — New CSS Animation Keyframes

File: `app/globals.css`

Replace all `sf-zoom-in-d1..d4` classes and add new keyframes:

```
@keyframes sf-fade-up      → opacity 0→1, translateY(24px)→0
@keyframes sf-zoom-in      → opacity 0→1, scale(0.92)→1, translateY(12px)→0  (refined from current)
@keyframes sf-pop           → opacity 0→1, scale(0.85)→1  (no translateY, for badges/icons)
@keyframes sf-slide-left   → opacity 0→1, translateX(-30px)→0
@keyframes sf-slide-right  → opacity 0→1, translateX(30px)→0
```

Each animation class (`.sf-fade-up`, `.sf-zoom-in`, `.sf-pop`, `.sf-slide-left`, `.sf-slide-right`) sets:

- `animation: <name> var(--sf-duration, 500ms) cubic-bezier(0.16, 1, 0.3, 1) both`
- `animation-delay: var(--sf-delay, 0ms)`

The `ScrollReveal` component sets `--sf-duration` and `--sf-delay` via inline CSS custom properties — cleaner than inline `animationDelay`.

Add reduced-motion support:

```css
@media (prefers-reduced-motion: reduce) {
  .sf-fade-up,
  .sf-zoom-in,
  .sf-pop,
  .sf-slide-left,
  .sf-slide-right {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
```

---

## Phase 2: Apply Animations to Home Page

### Step 3 — `app/(storefront)/store/page.tsx`

Apply section-by-section animations:

| Section                                             | Animation                           | Stagger                       | Notes                                      |
| --------------------------------------------------- | ----------------------------------- | ----------------------------- | ------------------------------------------ |
| Hero Carousel                                       | Keep existing `sf-fade-in` on text  | —                             | No scroll trigger (above fold)             |
| Trust Strip badges                                  | `pop`                               | `staggerIndex={i}`, gap 100ms | Badges pop in one by one                   |
| Recently Viewed cards                               | `zoom-in`                           | `staggerIndex={i}`, gap 80ms  | Card stagger                               |
| Offers Carousel                                     | `fade-up` on entire section wrapper | —                             | Single section reveal, no per-item stagger |
| Category Strip cards                                | `zoom-in`                           | `staggerIndex={i}`, gap 80ms  | Card stagger                               |
| Flash Sale cards                                    | `zoom-in`                           | `staggerIndex={i}`, gap 80ms  | Card stagger                               |
| Section headings ("Featured", "Best Sellers", etc.) | `fade-up`, duration `fast`          | —                             | Heading animates before product grid       |
| Featured Products grid                              | `zoom-in`                           | `staggerIndex={i}`, gap 80ms  | Card stagger                               |
| Promo Banners                                       | `fade-up`                           | `staggerIndex={i}`, gap 150ms | 2 banners stagger in                       |
| Best Sellers grid                                   | `zoom-in`                           | `staggerIndex={i}`, gap 80ms  | Card stagger                               |
| New Arrivals grid                                   | `zoom-in`                           | `staggerIndex={i}`, gap 80ms  | Card stagger                               |

---

## Phase 3: Apply Animations to Other Storefront Pages

### Step 4 — `store/products/page.tsx` (Product Listing)

- **Breadcrumb + heading**: `fade-up`, duration `fast`
- **Sidebar filters**: `slide-right`, duration `normal` (desktop only)
- **Product grid items**: `zoom-in` with `staggerIndex`, gap 80ms
- **Pagination / "Load More"**: newly loaded items should also animate in (wrap in `ScrollReveal`)

### Step 5 — `store/products/[productSlug]/page.tsx` (Product Detail)

- **Product image gallery**: `fade-up`, duration `normal`
- **Product info (title/price/description)**: `slide-right`, duration `normal` (_parallel with Step 4_)
- **Trust badges row**: `pop`, staggerIndex, gap 100ms
- **Related Products section heading**: `fade-up`, duration `fast`
- **Related Products cards**: `zoom-in`, staggerIndex, gap 80ms

### Step 6 — `store/category/[categorySlug]/page.tsx` (Category Page) (_parallel with Step 5_)

- **Hero banner**: `fade-up`, duration `normal`
- **Subcategory chips**: `pop`, staggerIndex, gap 60ms
- **Product grid items**: `zoom-in`, staggerIndex, gap 80ms

### Step 7 — `store/brand/[brandSlug]/page.tsx` (_parallel with Step 6_)

- **Brand header/banner**: `fade-up`
- **Product grid items**: `zoom-in`, staggerIndex, gap 80ms

### Step 8 — `store/search/page.tsx` (_parallel with Step 7_)

- **Search results heading**: `fade-up`, duration `fast`
- **Product grid items**: `zoom-in`, staggerIndex, gap 80ms

### Step 9 — `store/account/wishlist/page.tsx` (_parallel with Step 8_)

- **Heading**: `fade-up`, duration `fast`
- **Wishlist product cards**: `zoom-in`, staggerIndex, gap 80ms

### Step 10 — `components/storefront/StorefrontFooter.tsx`

- Wrap entire footer in a single `ScrollReveal` with `fade-up`, duration `normal`

---

## Phase 4: Polish & Accessibility

### Step 11 — Hover Micro-interactions on Product Cards

File: `components/storefront/ProductCard.tsx`

Add subtle hover lift effect (CSS-only, no JS):

- `transition: transform 200ms ease, box-shadow 200ms ease`
- On hover: `transform: translateY(-4px)`, `box-shadow: 0 8px 25px rgba(0,0,0,0.08)`
- This complements the scroll reveal and matches the reference site's card hover behavior

### Step 12 — Section Heading Animation Helper (_optional_)

Create `components/storefront/SectionHeading.tsx` wrapper that applies `fade-up` with `fast` duration — reduces repetition across pages.

---

## Relevant Files

**Modify:**

- `components/storefront/ScrollReveal.tsx` — rewrite with new props (Step 1)
- `app/globals.css` — new keyframes + animation classes + reduced-motion (Step 2)
- `app/(storefront)/store/page.tsx` — apply animations per section (Step 3)
- `app/(storefront)/store/products/page.tsx` — add animations (Step 4)
- `app/(storefront)/store/products/[productSlug]/page.tsx` — add animations (Step 5)
- `app/(storefront)/store/category/[categorySlug]/page.tsx` — add animations (Step 6)
- `app/(storefront)/store/brand/[brandSlug]/page.tsx` — add animations (Step 7)
- `app/(storefront)/store/search/page.tsx` — add animations (Step 8)
- `app/(storefront)/store/account/wishlist/page.tsx` — add animations (Step 9)
- `components/storefront/StorefrontFooter.tsx` — wrap in ScrollReveal (Step 10)
- `components/storefront/ProductCard.tsx` — hover lift effect (Step 11)

**Optionally create:**

- `components/storefront/SectionHeading.tsx` — reusable animated heading (Step 12)

**No changes:**

- `components/storefront/StorefrontHeader.tsx` — header stays always-visible (no scroll animation on nav is industry standard)
- `components/storefront/HeroCarousel.tsx` — keep existing `sf-fade-in` on text (above fold, no scroll trigger needed)

---

## Verification

1. Hard-reload `/store` — hero loads instantly (no scroll anim), then scroll down: trust badges pop in, categories zoom-in staggered, each product section heading fades up followed by cards zooming in with 80ms stagger gaps
2. Navigate to `/store/products` — breadcrumb fades up, grid items zoom-in as you scroll through pages
3. Navigate to `/store/products/[slug]` — gallery fades up on left, product info slides in from right, related products zoom-in at bottom
4. Navigate to `/store/category/[slug]` — hero banner fades up, subcategory chips pop in, products zoom-in
5. Footer fades up when scrolled to on any page
6. Toggle Chrome DevTools "Emulate prefers-reduced-motion: reduce" — all animations instantly show final state, no motion
7. No console errors, no hydration mismatches, no layout shifts (CLS)
8. Mobile responsive: animations still work but feel natural on touch scroll
9. Product cards have subtle lift on hover (desktop)

## Decisions

- **No external animation library** (no AOS, no Framer Motion, no GSAP) — pure CSS animations + IntersectionObserver, zero bundle cost
- **Stagger gap: 80ms** (down from current 200ms) — feels snappier and more professional, matching modern ecommerce sites
- **Animation durations: 300-500ms** (down from current 1000ms) — faster = more polished, less "wait around"
- **rootMargin: -50px** — triggers animation slightly before element reaches viewport bottom, so content is already animating in as user scrolls to it (not after)
- **Header stays static** — no entrance animation on navbar is the industry standard (it's always visible/functional)
- **Hero: no scroll trigger** — it's above the fold, uses page-load animation only
- **`requestAnimationFrame` guard** — ensures the browser paints `opacity: 0` before flipping to the animation class, preventing the "appears instantly" bug
- **CSS custom properties** (`--sf-duration`, `--sf-delay`) for animation timing — cleaner than inline `animationDelay`/`animationDuration`

## Further Considerations

1. **Skeleton → reveal transition**: Currently `ProductCardSkeleton` shows while loading; should the real card animate in (zoom-in) when data arrives, or just swap instantly? Recommendation: animate in for a polished feel.
2. **Infinite scroll pages** (products, category): newly loaded items should also use `ScrollReveal` — verify the observer still works for dynamically appended DOM nodes.
