# Plan: Correctly re-implement Zod validation for Product + Variation forms

## Confirmed bug (from `.next/dev/logs/next-development.log`)

Clicking Update/Save on the Variation form throws an unhandled exception before any
save/toast/inline-error logic runs:

```
TypeError: issues is not iterable
    at flattenFieldErrors (lib/utils/validation.ts)
    at handleSaveVariation (components/product-manage/product-detail-panel.tsx:559)
```

In `handleSaveVariation` (`components/product-manage/product-detail-panel.tsx` ~L560-568),
`validateVariation()` + `flattenFieldErrors(result.error.issues)` sit **outside** the
surrounding try/catch, so when `result.error.issues` isn't a plain iterable array, the whole
handler crashes silently: no toast, no inline red error text, `setSavingVariation` never
called — looks exactly like "the button does nothing."

`VariationEditRow` correctly wires `errors`/`setErrors` to `fieldError()`/`clearError()` for
SKU, cost_price, selling_price, quantity, warehouse_id — so the UI plumbing for showing errors
is fine. The bug is purely that validation never gets to call `setErrors` because it throws
first.

## Root-cause candidate

`variationSchema` (`lib/validations/product.ts` ~L26-54) is the only schema in the codebase
that chains a top-level `.refine()` on a `z.object({...})` whose fields are themselves built
from the `numberField()`/`idField()` helpers (union + refine + pipe chains in
`lib/utils/validation.ts`). Neither `productSchema` (no `.refine()`) nor the proven-working
`expressCheckoutPayloadSchema`/`expressAddressSchema` (also no top-level `.refine()`) hit this,
which is the only structural difference and the most likely trigger for the malformed
`ZodError`/`.issues` seen in the log.

## Fix plan

1. **Remove the fragile top-level `.refine()` from `variationSchema`.** Move the "warehouse
   required when quantity > 0" cross-field rule out of Zod and into a plain manual check inside
   `handleSaveVariation`, mirroring the existing manual `effectiveBtId`/business_type check
   already used in `handleSaveProduct` (`product-detail-panel.tsx` ~L349-352).
2. **Guard the validation step defensively regardless of root cause.** Wrap the
   `validateVariation`/`flattenFieldErrors` call (and the equivalent in `handleSaveProduct`/
   `handleSaveAsNew`) in a try/catch, or move it inside the existing try block, so any future
   schema/error-shape problem degrades to `notify.error(...)` instead of silently freezing the
   button. Apply consistently to all three call sites in `product-detail-panel.tsx`
   (~L345, ~L398, ~L563).
3. **Add regression tests** in a new `lib/validations/product.test.ts` (no test file exists for
   this module today) covering: valid variation payload, missing SKU, invalid cost/selling
   price, and the "quantity > 0 but no warehouse" case — asserting
   `flattenFieldErrors(result.error.issues)` never throws for any of these.
4. **Audit `productSchema`** for parity — no known bug there, but apply the same defensive
   try/catch for consistency once the pattern is set.

## Relevant files

- `lib/validations/product.ts` — remove/replace the object-level `.refine()` on
  `variationSchema`.
- `components/product-manage/product-detail-panel.tsx` — `handleSaveVariation` (~L560),
  `handleSaveProduct` (~L338), `handleSaveAsNew` (~L391): wrap validation+flatten in try/catch;
  add manual warehouse/quantity cross-check in `handleSaveVariation`.
- `lib/utils/validation.ts` — no change expected; keep as the reference for
  `numberField`/`idField`/`flattenFieldErrors` used correctly elsewhere (e.g.
  `expressCheckoutPayloadSchema`).
- New: `lib/validations/product.test.ts` — regression tests.

## Verification

1. `npm run test` (vitest) — new `product.test.ts` passes.
2. Manual: open Edit Variation, submit with quantity > 0 and no warehouse selected → expect
   inline red error under Warehouse, no crash, no silent no-op.
3. Manual: open Edit Variation, submit with valid data → expect success toast and row updates.
4. Check browser console / `.next/dev/logs` for no more `issues is not iterable`.

## Decisions

- Prefer moving the cross-field warehouse rule to a manual JS check over debugging Zod's
  `.refine()`-on-object internals further — lower risk, matches existing codebase convention
  (business_type manual check), and doesn't require pinning down the exact Zod 4.5.4 internal
  quirk to ship a fix.
- Out of scope: rewriting `expressCheckoutPayloadSchema`/other storefront schemas — they aren't
  broken and already follow the correct pattern.
