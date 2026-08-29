# Express Checkout — Implementation Plan

**Module:** Ecommerce Storefront
**Status:** Planning
**Related:** `docs/STOREFRONT_NAVIGATION_REFACTOR_PLAN.md`, `docs/STOREFRONT_SALES_CONVERSION_UI_UX_PLAN.md`

---

## 1. Overview

A storefront-wide **Express Checkout** feature that lets a customer buy a single
product immediately, skipping the cart. It is controlled by an admin toggle under
**Ecommerce Management → Storefront Settings**.

When enabled:
- An **Express Checkout** button appears on the **product details page** and on **every product grid card**.
- Clicking it opens a dedicated, single-item checkout at
  `/store/products/{productSlug}/checkout`.
- The **default product variant** is pre-selected (qty 1, editable).
- The flow reuses the existing checkout steps (contact → address → shipping → payment), but **payment is locked to Cash on Delivery (COD)** for this phase.
- The cart is **never touched** (no add-to-cart, no cart pollution).

---

## 2. User Flow

```
Product grid / Product detail
        │  [Express Checkout]  (only if feature enabled + product in stock)
        ▼
/store/products/{slug}/checkout
        │  auto-loads product + default variant (qty 1)
        ▼
Step 1: Contact (email/phone)  →  Step 2: Shipping address
        ▼
Step 3: Shipping method         →  Step 4: Payment (COD only, pre-selected & locked)
        ▼
Place order via checkoutService.placeOrder({ items:[single], payment_method:'pm-cod' })
        ▼
/store/checkout/success (reuse existing success page)
```

---

## 3. Admin Configuration

### 3.1 Sidebar nav item
Add a child under the **Storefront Settings** group in `components/layout/sidebar.tsx`
(currently lines ~249–255, siblings: Status & Activation, Store Information, …).

```ts
{ name: 'Express Checkout', href: '/ecommerce/settings/express-checkout', icon: Zap },
```

### 3.2 Settings page (new)
`app/(protected)/ecommerce/settings/express-checkout/page.tsx`

Mirror the pattern of `app/(protected)/ecommerce/settings/status/page.tsx`:
- Load settings via `ecommerceSettingsService.get()`.
- Show header **"Express Checkout"** with a `Toggle` (active/inactive) + Save button.
- On toggle/save, call `ecommerceSettingsService.update({ express_checkout_enabled })` (or a dedicated `toggleExpressCheckout()`).
- Helper copy: "When active, an Express Checkout button appears on product pages and grid cards for direct COD purchase."

### 3.3 Types
Extend `EcommerceSettings` in `types/ecommerce.ts`:

```ts
export interface EcommerceSettings {
  // ...existing fields
  express_checkout_enabled: boolean; // NEW
}
```

### 3.4 Service
`services/ecommerceSettingsService.ts` already exposes `get()` / `update()`.
- Add `express_checkout_enabled: false` to `defaultSettings`.
- (Optional) add `toggleExpressCheckout()` mirroring `toggleStorefront()`.

> **Backend note:** `ecommerceSettingsService` is currently a mock. The admin
> update must eventually hit `PUT /api/v1/storefront/settings` (see §7).

---

## 4. Storefront Flag Consumption

The storefront must know whether Express Checkout is enabled **without** hitting
the mock settings service. Reuse the existing real status endpoint pattern.

### 4.1 Store (new or extend)
Create `stores/storefront-settings-store.ts` (or extend `stores/storefront-status-store.ts`)
to fetch `/api/v1/storefront/settings` (or extend `/api/v1/storefront/status`) and
expose:

```ts
expressCheckoutEnabled: boolean;
fetch: () => Promise<void>;
```

`storefront-status-store.ts` already fetches `/api/v1/storefront/status` and is the
right shape to copy.

### 4.2 Usage in components
- `components/storefront/ProductCard.tsx` → read `expressCheckoutEnabled`.
- `app/(storefront)/store/products/[productSlug]/page.tsx` → read `expressCheckoutEnabled`.

---

## 5. Storefront UI Changes

### 5.1 ProductCard (`components/storefront/ProductCard.tsx`)
- Add an **Express Checkout** quick-action button (e.g. `Zap` icon) alongside the
  existing cart/wishlist actions.
- Visible only when `expressCheckoutEnabled && inStock`.
- Links to `/store/products/${product.slug}/checkout`.
- Keep it subtle (icon button or small "Buy now" text) to differentiate from Add to Cart.

### 5.2 Product Details (`app/(storefront)/store/products/[productSlug]/page.tsx`)
- `Zap` icon is already imported (line 18).
- Next to the **Add to Cart** button, render **Express Checkout** when
  `expressCheckoutEnabled && product in stock`.
- `onClick` → `router.push('/store/products/' + product.slug + '/checkout')`.

---

## 6. Express Checkout Page (new route)

`app/(storefront)/store/products/[productSlug]/checkout/page.tsx`

### 6.1 Behavior
1. `useParams()` → `productSlug`; load product via `storefrontService.getProductBySlug(slug)` (reuse existing).
2. Determine default variant:
   `const defaultVariation = product.variations.find(v => v.isDefault) || product.variations[0];`
3. Local state: `selectedVariationId`, `qty` (default 1, editable).
4. Render the **same checkout steps** used by `app/(storefront)/store/checkout/page.tsx`:
   `type Step = 'contact' | 'address' | 'shipping' | 'payment'`.
   Reuse the address/shipping/payment UI blocks from the existing checkout page to stay consistent.
5. **Payment is COD-only:**
   - Pre-select `payment_method = 'pm-cod'`.
   - Hide/disable other payment options (the existing page reads `PAYMENT_METHODS` from mock-data; for express, render only the COD option or force-disable the rest).
6. Build the order payload and place it:

```ts
const payload: PlaceOrderPayload = {
  email, phone,
  address,                       // CheckoutAddressInput
  shipping_method_id: shipping, // SHIPPING_METHODS[0]
  payment_method: 'pm-cod',      // locked
  items: [{
    variation_id: selectedVariationId,
    product_id: String(product.id),
    quantity: qty,
    unit_price: selectedVariation.sellingPrice,
  }],
  customer_id: user?.id,
};
await checkoutService.placeOrder(payload);
router.push('/store/checkout/success?order=' + result.order_number);
```

`PlaceOrderPayload` (`services/checkoutService.ts:39`) already supports an arbitrary
`items` array and `payment_method`, so **no cart involvement** is required.

### 6.2 Validation
- Before placing: optionally call `checkoutService.validateCart([singleItem])` to confirm stock (mirrors existing cart validation).
- Show inline errors (out-of-stock, invalid address) using the same `notify` patterns.

### 6.3 Reuse
- Import `VariantSelector`, `formatMoney`, `STORE_INFO`, `SHIPPING_METHODS`, `checkoutService`, `useCustomerAuthStore` — all already used by the existing checkout page.
- The success page `/store/checkout/success` is shared.

---

## 7. Backend API Contracts (for reference)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/storefront/settings` (or extend `/storefront/status`) | Return `express_checkout_enabled` (and other storefront flags). |
| PUT | `/api/v1/storefront/settings` | Update `express_checkout_enabled`. |
| POST | `/api/v1/storefront/checkout/place` | Already exists; accepts `items[]` + `payment_method`. Must accept a single direct item (no cart session). |
| POST | `/api/v1/storefront/cart/validate` | Reuse for stock validation of the single item. |

> The frontend service layer already calls these endpoints (they 404 until the
> backend lands — see `checkoutService.ts:85`). The Express Checkout feature is
> therefore frontend-complete and will light up once the backend supports the
> `express_checkout_enabled` flag.

---

## 8. Files Summary

**Create**
- `app/(protected)/ecommerce/settings/express-checkout/page.tsx` (admin toggle page)
- `app/(storefront)/store/products/[productSlug]/checkout/page.tsx` (express checkout flow)
- `stores/storefront-settings-store.ts` (or extend `storefront-status-store.ts`)

**Modify**
- `components/layout/sidebar.tsx` — add sidebar nav item
- `types/ecommerce.ts` — add `express_checkout_enabled` to `EcommerceSettings`
- `services/ecommerceSettingsService.ts` — add default + update/toggle support
- `components/storefront/ProductCard.tsx` — add Express Checkout quick action
- `app/(storefront)/store/products/[productSlug]/page.tsx` — add Express Checkout button

**Reused (no change)**
- `services/checkoutService.ts` (`placeOrder`, `validateCart`)
- `app/(storefront)/store/checkout/success/page.tsx`
- `components/storefront/VariantSelector.tsx`, shared checkout step UI

---

## 9. Edge Cases & Rules

- Express Checkout button hidden when: feature disabled, product out of stock, or product has no variations.
- If the selected/default variant goes out of stock between load and place → block with validation error.
- Quantity editable but clamped to available stock of the chosen variant.
- COD-only in this phase: other payment methods must be disabled (not just hidden) to prevent bypass.
- Guest checkout: rely on the same contact/address capture the existing checkout uses (no forced login required unless backend enforces it).

---

## 10. Future Scope (out of this phase)

- Allow Express Checkout with additional payment methods (gateway, wallet) once the backend supports non-COD express placement.
- Express checkout from **category/listing quick-view** modals.
- Per-product or per-category opt-out of express checkout.
- "Buy X together" express bundle.
