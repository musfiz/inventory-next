Prompt context: replicate Warehouse list design & functionality for another resource list

Goal
- Create a prompt context that instructs a UI/content generator to produce a list page matching the Warehouse list's design and behavior (table, icon actions, add/edit form, confirm delete, tenant handling, search/pagination).

Design & UI patterns to replicate
- Header: title with `Warehouse` icon, right-aligned `Add` button with `Plus` icon.
- Table container: white/dark-aware rounded card with sticky header and scrollable body.
- Columns: serial (SL), code (with small `Warehouse` icon and `Default` badge when applicable), name (primary + contact subtext), conditional tenant column (for super-admin), location (MapPin + city,country), contact (phone/email), type badges (Sales/Purchase), status pill (Active/Inactive), actions (icon-only buttons).
- Actions: icon-only `Edit` (pencil) and `Delete` (trash) buttons with small padding, title attribute, color-coded (green for edit, red for delete), hover color variants, and accessible labels.

Behavior & interactions
- Data loading: server-side pagination, sorting and search via shared `DataTable` component that calls API endpoints with `page`, `per_page`, `search`, `sortBy`, `sortOrder`.
- Search: debounced input (≈300ms) that resets to page 1 when changed.
- Pagination: show page numbers with previous/next and first/last controls; compute showing range and total results.
- Add/Edit: `Add` opens a form panel; `Edit` fills the form with the selected record and toggles `isEditing` state. Form includes tenant select (super-admin only), validations, and success/error notifications. After save, refresh table by bumping a `refreshKey`.
- Delete: show a confirm modal with title, HTML summary (code, city, status) and destructive warning, require explicit confirmation before calling delete API; on success notify and refresh table.

Data & API
- Use existing service methods pattern: `resourceService.get...`, `resourceService.store...`, `resourceService.delete...`.
- API endpoints follow `/api/v1/<resource>` conventions; DataTable expects server response with `data` and either `pagination` object or `total`.

Accessibility & small details
- Table cells: use `whitespace-nowrap` for compact rows and `text-xs` typography for dense display.
- Buttons: provide `title` attributes and visible focus/hover states. Use semantic color classes consistent with Tailwind tokens already in UI.
- Tenant visibility: include a conditional `Tenant` column only if `isSuperAdmin` is true; `CustomSelect` is used for tenant dropdown with `loadOptions`.

Prompt usage example (to feed into a code/UX generator)
"Create a React + Tailwind list page for the `<Resource>` resource that matches the Warehouse page in layout and behavior: server-side `DataTable` with columns SL, code (icon + code + default badge), name (with contact subline), conditional Tenant, location (MapPin), contact, type badges, status pill, and icon-only Edit/Delete actions. Include an Add/Edit form panel that reuses the same field patterns (tenant select for super-admin, text inputs, status toggles), client-side validation, success/error notifications, and a confirmation dialog for deletes with HTML summary. Use the existing `DataTable` component API and follow the same color/spacing/icon conventions (Edit: green pencil, Delete: red trash)."

Notes for implementer
- Copy the `columns` structure and action button styles from `app/(protected)/warehouse/page.tsx`.
- Reuse `notify`, `confirm`, `CustomSelect`, and `DataTable` where possible.
- Keep `refreshKey` pattern to force table reload after create/update/delete.
- Ensure API service for the new resource mirrors `warehouseService` shape (get/list, store, delete).

End of prompt context.
