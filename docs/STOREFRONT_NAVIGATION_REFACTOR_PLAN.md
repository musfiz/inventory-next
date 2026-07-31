# Plan: Storefront Navigation — Cascading + Mega Menu (Configurable)

## Goal

Refactor the 906-line `StorefrontHeader.tsx` by extracting 6 inline subcomponents into separate files, then add a new **CascadingMenu** variant that shares the same data source as the existing MegaMenu. Admin chooses display style via a new `display_style` field inside `mega_menu_config` JSON.

---

## Current State

- `StorefrontHeader.tsx` contains 6 inline subcomponents: `CategoryDropdown`, `CustomDropdown`, `MegaMenu`, `SearchBar`, `AccountMenu`, `MobileMenu`
- "All Categories" gradient button triggers `MegaMenu` (full-width grid) when `mega_menu_config.enabled === true`
- Individual nav items use `CategoryDropdown` for single-category hover flyout
- No cascading menu concept exists; no `display_style` field in config
- Data stored in `StorefrontConfig.mega_menu_config` JSON column (no migration needed for new fields)
- Unused imports detected: `PRODUCTS`, possibly `MapPin`

---

## Phase 1 — Refactor & Extract Components (no behavior change)

- [ ] Create `components/storefront/navigation/` directory
- [ ] Extract `MegaMenu` → `navigation/MegaMenu.tsx`
- [ ] Extract `CategoryDropdown` → `navigation/CategoryDropdown.tsx`
- [ ] Extract `CustomDropdown` → `navigation/CustomDropdown.tsx`
- [ ] Extract `SearchBar` → `navigation/SearchBar.tsx`
- [ ] Extract `AccountMenu` → `navigation/AccountMenu.tsx`
- [ ] Extract `MobileMenu` → `navigation/MobileMenu.tsx`
- [ ] Remove dead imports from StorefrontHeader (`PRODUCTS`, `MapPin`, icons only used in extracted files)
- [ ] Verify storefront renders identically — mega menu opens, items hover, mobile menu slides

---

## Phase 2 — Create CascadingMenu Component

- [ ] Create `components/storefront/navigation/CascadingMenu.tsx`
  - Left-panel flyout triggered by "All Categories" hover/click
  - **Level 1**: groups from `mega_menu_config.items` (same data MegaMenu uses)
  - **Level 2+**: on hover → slide-in sub-panel showing children recursively from category tree
  - Reuses same `categoryMap` (flat `Map<id, CategoryTreeItem>`) pattern from MegaMenu
  - Respects `show_product_count` config
  - Keyboard accessible (arrow keys navigate levels)
- [ ] Same props interface as MegaMenu: `{ onClose, onKeepOpen }`

---

## Phase 3 — Add `display_style` Config Field (*parallel with Phase 2*)

### Backend (`inventory-api`)

- [ ] Add validation in `HeaderMenuController.update()`:
  ```php
  'mega_menu_config.display_style' => 'nullable|in:mega,cascading'
  ```
- [ ] No migration needed — field lives inside existing JSON column
- [ ] `HeaderMenuResource` already passes through all `mega_menu_config` fields

### Frontend Types (`inventory-ui`)

- [ ] Add to `MegaMenuConfig` in `types/api.types.ts`:
  ```typescript
  display_style: 'mega' | 'cascading';
  ```
- [ ] Update `DEFAULT_CONFIG` in `stores/header-menu-store.ts`:
  ```typescript
  mega_menu_config: { ..., display_style: 'mega' }
  ```

---

## Phase 4 — Wire Display Style in StorefrontHeader (*depends on Phase 1, 2, 3*)

- [ ] In the category nav section of `StorefrontHeader.tsx`:
  - Read `menu.mega_menu_config?.display_style`
  - If `'cascading'` → render `<CascadingMenu />`
  - Else (default / undefined / `'mega'`) → render `<MegaMenu />`
- [ ] Same trigger button ("All Categories"), same open/close timer logic

---

## Phase 5 — Admin UI Style Selector (*depends on Phase 3*)

- [ ] In `app/(protected)/ecommerce/appearance/mega-menu/page.tsx`:
  - Add "Menu Style" segmented control at top: **Mega Menu** | **Cascading Menu**
  - Conditionally show column config only when `mega` is selected
  - Items/categories config shared by both styles (both use `mega_menu_config.items`)
  - Include `display_style` in the save payload

---

## Phase 6 — Cleanup

- [ ] Audit all imports in each extracted file — remove unused
- [ ] Confirm `PRODUCTS` mock import is dead (no usages after extraction)
- [ ] Confirm `formatMoney` only needed in parent for cart badge
- [ ] Run `npx next lint` — fix all warnings

---

## Relevant Files

| File | Action |
|------|--------|
| `components/storefront/StorefrontHeader.tsx` | Refactor: extract 6 components, wire display_style switch |
| `components/storefront/navigation/` (new dir) | All extracted + new CascadingMenu |
| `types/api.types.ts` (~L1070 `MegaMenuConfig`) | Add `display_style` field |
| `stores/header-menu-store.ts` | Update DEFAULT_CONFIG |
| `app/(protected)/ecommerce/appearance/mega-menu/page.tsx` | Add style selector UI |
| `app/Http/Controllers/Api/Ecommerce/HeaderMenuController.php` (backend) | Add validation rule |

---

## Verification

1. **Phase 1**: Storefront visually identical — mega menu opens, hover items work, mobile menu slides
2. **Phase 2**: Manually set `display_style: 'cascading'` in API response → cascading renders
3. **Phase 3–4**: API round-trip — save cascading choice, reload page, correct menu appears
4. **Phase 5**: Admin toggles style, storefront reflects change immediately
5. **Phase 6**: `npx next lint` passes, no unused imports flagged

---

## Decisions

- `display_style` lives **inside** `mega_menu_config` JSON — no DB migration, backward compatible
- Default is `'mega'` — existing tenants without the field see no change
- Cascading menu reuses same `mega_menu_config.items` as level-1 group headers — no new data model
- Mobile menu stays unchanged (already uses accordion pattern)
- **Out of scope**: animation library, nested category CRUD in admin, mobile cascading variant
