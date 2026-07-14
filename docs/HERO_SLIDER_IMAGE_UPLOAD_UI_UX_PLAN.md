# Hero Slider — Upload Form & Image Grid UI/UX Plan

> **For:** Hero Slider content management (admin/back-office, `inventory-ui`)
> **Scope:** (1) Add/Edit slider form — Title, Subtitle, Short Description, drag-and-drop image upload. (2) Grid view of all uploaded sliders.
> **Fields confirmed:** `title`, `subtitle`, `short_description`, `image` (drag & drop)
> **Status:** Design plan only — no implementation yet.

This plan follows the **existing admin conventions** already used across Brand/Category/Product pages, so the new Slider screen feels native to the app rather than a bolt-on:

- Dense, utilitarian layout — tight padding (`p-1.5`–`p-3`), small text (`text-sm`/`text-xs`), no large SaaS-style whitespace.
- Card style: `bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700`.
- Inputs/buttons: `rounded-sm`, `px-2 py-1.5 text-sm`.
- Same inline collapsible "Add/Edit form above, list below" pattern used by Brand/Category pages (not a separate route, not a modal).
- Reuses the visual language of the existing `ImageUploadForm.tsx` dropzone (dashed border, drag-active highlight, progress bar, preview thumbnail, remove button) rather than inventing a new upload look.
- Toasts via the existing SweetAlert2 `notifications`/`notify` wrapper (`notify.saved`, `notify.deleted`, etc.) — no new toast system.

---

## 1. Page Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Hero Sliders                                    [+ Add Slider] │  ← page header
├─────────────────────────────────────────────────────────────────┤
│  ┌─ Add / Edit Slider Form (collapsible, toggled by button) ──┐ │
│  │  Title | Subtitle          (2-col row)                     │ │
│  │  Short Description         (full-width textarea)           │ │
│  │  Image dropzone            (full-width, drag & drop)        │ │
│  │  CTA Text | CTA URL (optional, if in scope)                 │ │
│  │  Active toggle | Sort order                                 │ │
│  │              [Save]  [Cancel]                                │ │
│  └───────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Image Grid (uploaded sliders)                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                    │
│  │ card 1 │ │ card 2 │ │ card 3 │ │ card 4 │  ...                │
│  └────────┘ └────────┘ └────────┘ └────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

Single page, e.g. `app/(protected)/sliders/page.tsx`, mirroring `brands/page.tsx` / `categories/page.tsx` structurally: page header + toggle-form + list-below. **List is a visual card grid, not a DataTable** (unlike Product Images today) — because sliders are inherently visual/large-image content, a grid communicates the actual banner far better than table rows.

---

## 2. Add/Edit Form — Field-by-Field Design

Form card wrapper matches existing convention:
```
bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 mb-2
```
Header: `<h2 className="text-lg font-semibold mb-2">{isEditing ? 'Edit Slider' : 'Add Slider'}</h2>`

### 2.1 Row 1 — Title & Subtitle (2 columns, side by side)

```
grid grid-cols-1 md:grid-cols-2 gap-2
```
- **Title** (required)
  - `<label>Title <span className="text-red-500">*</span></label>`
  - `<input type="text" maxLength={100} />`
  - Helper text under field: `text-xs text-gray-400` — "Shown as the main heading on the banner"
  - Character counter bottom-right of the field, e.g. `42/100`, turns amber/red near limit (matches pattern of showing constraints inline, consistent with the existing "recommended size" hints used for images).
- **Subtitle** (optional)
  - `<input type="text" maxLength={150} />`
  - Helper text: "Optional supporting line under the title"

### 2.2 Row 2 — Short Description (full width)

```
<textarea rows={2} maxLength={250} className="... rounded-sm ..." />
```
- Full-width single field below the Title/Subtitle row.
- Character counter (`x/250`) bottom-right, same treatment as Title/Subtitle.
- Placeholder: "One or two lines describing the promotion/banner (optional)."
- Note: standardize this textarea on `rounded-sm` (matching inputs) rather than the `rounded-lg` inconsistency spotted in the current Brand form — small consistency fix included in this plan.

### 2.3 Row 3 — Image Upload (drag & drop, full width)

This is the centerpiece — reuse the existing `ImageUploadForm.tsx` visual pattern, adapted for the slider's larger recommended aspect ratio:

**Idle state**
```
┌───────────────────────────────────────────────────────────────┐
│   [image icon]                                                │
│   Drag & drop hero banner image here, or click to browse      │
│   Recommended: 1920×700 (desktop) · JPG, PNG, WebP · Max 5MB   │
└───────────────────────────────────────────────────────────────┘
```
- Box style: `border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-sm hover:border-gray-400 transition-colors cursor-pointer`, height ~180–220px (tall enough to convey "this is a big banner image", unlike the compact single-row brand-logo dropzone).
- Center-aligned icon (`lucide-react` `ImagePlus` or `UploadCloud`) + primary instruction text (`text-sm font-medium`) + secondary constraint hint (`text-xs text-gray-400`), matching the existing `RECOMMENDED_SIZE` hint convention already used in `constants.ts` for product images.

**Drag-active state**
- `border-blue-400 bg-blue-50 dark:bg-blue-900/20` (identical to existing `ImageUploadForm.tsx` active state) — instruction text changes to "Drop image to upload".

**Client-side pre-validation (before any network call)**
- On file select/drop: check mime (`jpg`/`jpeg`/`png`/`webp`), size (≤5MB), and dimensions (≥1200×500 via `new Image()` + `URL.createObjectURL`, reusing the existing `validateImageFile` helper pattern from `products/images/utils.ts`, extended with a dimension check).
- Inline error shown directly under the dropzone in red (`text-red-600 text-xs`) if validation fails — e.g. "Image must be at least 1200×500px" or "File exceeds 5MB" — matching the existing `error` state handling in `ImageUploadForm.tsx`.

**After a valid file is selected — preview + progress**
```
┌───────────────────────────────────────────────────────────────┐
│  ┌────────────┐  banner-photo.jpg                      [✕]     │
│  │  preview   │  2.4 MB                                        │
│  │  thumbnail │  ████████████████░░░░  78%                     │
│  └────────────┘                                                │
└───────────────────────────────────────────────────────────────┘
```
- Preview thumbnail on the left (object-cover, wide aspect ratio ~16:6 to hint at the banner shape rather than a square thumb, since this is a wide hero image not a square product photo).
- Filename + formatted size (`formatFileSize` helper, reused) next to it.
- Upload progress bar identical style to existing: `bg-blue-600 h-2 rounded-full` driven by axios `onUploadProgress`.
- Remove (✕) button top-right of the preview to clear selection and re-open the dropzone, same as current pattern.

**Responsive variant note:** if the backend generates `mobile`/`tablet`/`desktop` derivatives from a single upload (per the backend Image Management Plan), the form only needs **one** upload input — the admin uploads one high-quality image, and the three responsive sizes are generated server-side. No need for 3 separate upload fields; keep the form simple.

### 2.4 Row 4 — CTA fields (optional, include only if slider needs a click-through link)

```
grid grid-cols-1 md:grid-cols-2 gap-2
```
- **CTA Text** — e.g. "Shop Now" (optional, short text input)
- **CTA URL** — e.g. `/store/category/summer-sale` (optional, text input with light URL-format validation)

### 2.5 Row 5 — Status & Ordering

```
grid grid-cols-1 md:grid-cols-2 gap-2
```
- **Active** — toggle/checkbox switch, label "Show on storefront"
- **Sort Order** — number input (or handled purely via grid drag-reorder in §3.4, making this field optional/hidden and auto-managed)
- Optional: **Schedule** (`starts_at` / `ends_at` date-time pickers, reusing existing `date-time-picker.tsx`) — only if scheduling is in scope; otherwise omit for v1 simplicity.

### 2.6 Actions row

```
flex justify-end gap-2 mt-2
[Cancel]  (bg-gray-600, rounded-sm)
[Save Slider]  (bg-indigo-600, rounded-sm, disabled while uploading)
```
- Save button shows a small spinner + "Saving..." while the request (including image upload) is in flight, matching existing button-loading patterns elsewhere.
- On success: `notify.saved('Slider')` toast (SweetAlert2), form collapses, grid refreshes.
- On backend validation error: map `error.response.data.errors` into the same `formErrors` state object used elsewhere, inline red text under each field (existing pattern — e.g. if the backend rejects the image for insufficient width, the error surfaces under the dropzone).

### 2.7 Field Validation Summary

| Field | Rule | Where enforced |
|---|---|---|
| Title | required, max 100 chars | client (`validateForm()`) + server |
| Subtitle | optional, max 150 chars | client + server |
| Short description | optional, max 250 chars | client + server |
| Image | required on create, optional on edit (keep existing if not replaced); jpg/png/webp; ≤5MB; ≥1200×500px | client pre-check + server (authoritative) |
| CTA URL | optional, must look like a valid path/URL if provided | client (light regex) + server |

---

## 3. Image Grid — Display of Uploaded Sliders

Replaces the DataTable-row approach used for product images; sliders get a **visual card grid** since the image itself is the primary content.

### 3.1 Grid layout

```
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3
```
- 1 column on mobile, 2 on tablet, 3 on desktop admin viewport — keeps each card wide enough to preview the banner's wide aspect ratio legibly.

### 3.2 Card anatomy

```
┌─────────────────────────────────────────────┐
│                                              │  ← image (aspect-[16/7], object-cover)
│         [hero banner preview image]         │     rounded-t-md
│                                    [●Active] │  ← status badge, top-right overlay
├─────────────────────────────────────────────┤
│  Summer Sale Collection                     │  ← title, text-sm font-semibold, truncate
│  Up to 50% off selected items               │  ← subtitle, text-xs text-gray-500, truncate
│  Sort: 2                                     │  ← small meta row
│  ┌──────┐ ┌────────┐ ┌────────┐              │
│  │ ⠿ drag│ │ Edit   │ │ Delete │              │  ← action row
│  └──────┘ └────────┘ └────────┘              │
└─────────────────────────────────────────────┘
```

- **Card container:** `bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden` — consistent with every other card in the app.
- **Image area:** fixed aspect ratio (`aspect-[16/7]` to echo the 1920×700 hero ratio) using `next/image` with `fill` + `object-cover`, so all cards line up evenly regardless of original upload dimensions.
- **Status badge:** top-right overlay on the image, semi-transparent backdrop, reusing the existing badge style (`bg-green-100 text-green-800` / `bg-red-100 text-red-800` for Active/Inactive) — e.g. `absolute top-2 right-2 backdrop-blur-sm`.
- **Processing indicator:** if `processing_status = pending` (server still generating responsive derivatives), overlay a subtle spinner + "Processing…" label on the image instead of the badge, and disable Edit until done.
- **Text block below image:** `p-2` — Title (`text-sm font-semibold truncate`), Subtitle (`text-xs text-gray-500 truncate`), both single-line with `truncate` to keep card heights uniform.
- **Action row:** three small icon+text buttons, `text-xs`, consistent with existing row-action button sizing elsewhere (`px-2 py-1 rounded-sm`):
  - **Drag handle** (`⠿` / `GripVertical` icon) — grab cursor, used for reordering (§3.4).
  - **Edit** — opens the form above pre-filled (scrolls up to the form card, same UX as existing Brand/Category edit).
  - **Delete** — triggers existing `confirm()` SweetAlert2 dialog before calling delete.

### 3.3 Empty state

When no sliders exist yet:
```
┌─────────────────────────────────────────────┐
│              [image icon, muted]             │
│         No hero sliders yet                  │
│   Add your first banner to feature it on     │
│           the storefront homepage             │
│              [+ Add Slider]                   │
└─────────────────────────────────────────────┘
```
Centered, dashed-border placeholder card spanning the grid width — same tone as other empty states in the app (if any exist) or a simple centered block if not.

### 3.4 Drag-to-reorder

- Introduce `@dnd-kit/sortable` (not currently installed — first use in this codebase) since no sortable primitive exists yet.
- Grid cards become sortable items; dragging a card by its handle reorders the grid visually in real time.
- On drop, fire a single `PATCH /sliders/reorder` call with the new ordered array of IDs (debounced/batched — not one request per swap) and show a small non-blocking toast (`notify.updated('Order')`) on success.
- Fallback if drag-and-drop reordering is deferred to a later phase: keep the manual **Sort Order number input** in the form (§2.5) as the v1 mechanism, and add drag-to-reorder as a fast-follow enhancement — flag this as an open decision (§5).

### 3.5 Toggle Active directly from the grid (optional quick action)

- Clicking the status badge itself toggles `is_active` inline (optimistic UI update + `PATCH /sliders/{id}/toggle`) without opening the full edit form — a small efficiency win for admins managing seasonal banners frequently.

---

## 4. Responsive Behavior

| Breakpoint | Form | Grid |
|---|---|---|
| Mobile (`< sm`) | Title/Subtitle stack to 1 column; dropzone height reduces to ~140px | 1 column |
| Tablet (`sm`–`lg`) | Title/Subtitle 2 columns | 2 columns |
| Desktop (`lg+`) | unchanged | 3 columns |

---

## 5. Open Decisions Before Build

1. **Scheduling fields** (`starts_at`/`ends_at`) — include in v1 form, or defer? Affects whether `date-time-picker.tsx` is wired in now.
2. **CTA fields** — confirm whether sliders need a click-through link/button at all, or are purely decorative banners for v1.
3. **Drag-to-reorder vs. manual sort-order number** — confirm whether `@dnd-kit/sortable` should be added now (richer UX, new dependency) or deferred, using the simple number input first.
4. **Per-slide "Active" toggle from the grid** (§3.5) — nice-to-have inline UX, confirm if worth building in v1 or fold into the Edit form only.
5. **Business-type/tenant scoping** — if sliders are scoped per business type (like Brand), the form needs a `BusinessTypeSelect` field added to §2; confirm scope before finalizing the field list.
