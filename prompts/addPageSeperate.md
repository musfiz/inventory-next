Product Add Page — Prompt Context (separate)

Purpose

- Capture the design, interactions, and validation patterns used by the Product "Add" page so AI can generate other module "Add" pages with the same UX and behavior.

Key patterns to preserve

- Modes: single-purpose "Add" page (also can be adapted for `edit`/`clone`).
- Async selects: `CustomSelect` with `loadOptions(inputValue)` returning `{ value,label }[]`. Cache default options to avoid repeated loads. Clear cached options when dependent filters change (e.g., `business_type`).
- Tenant/scope logic: use `useAuthStore` to detect `super_admin` and show extra controls (business type or tenant selector) only for that user type.
- Form state: centralized `formData` object; per-field `errors: Record<string, string[]>`; helpers `getFieldError(field)` and `hasFieldError(field)` to show first message and boolean state respectively.
- Inline field clearing: on user input, remove that field's error from `errors` to give immediate feedback.
- Loading guards: use `useRef` flags (e.g., `hasLoadedData`, `isLoadingData`) to prevent duplicated API loads.
- Numeric parsing: convert numeric string inputs to numbers before sending: `parseFloat` for prices, `parseInt` for integer thresholds; provide sensible defaults when empty.

Fields & UI elements (product example)

- Basic: `name` (required), `description` (optional).
- Categorization: `business_type` (required for product), `category_id` (required), `brand_id` (required), `unit_id` (optional). Use `CustomSelect` for these.
- Pricing: `cost_price`, `selling_price`, `dp`, `mrp` (numbers, >= 0).
- Tax: `is_taxable` (checkbox), `tax_rate` (0-100 number).
- Inventory: `track_inventory` (checkbox), `allow_backorder`, `low_stock_threshold` (integer), `reorder_point` (integer).
- Flags & display: `has_expiry`, `has_batch`, `has_serial`, `is_featured`, `display_order` (integer).

Validation rules (client-side)

- Required fields: `name`, `business_type` (or tenant for multi-tenant), `category_id`, `brand_id` where applicable.
- Numeric field constraints: numbers must parse to finite numbers; `min=0` for prices; `tax_rate` between 0 and 100.
- Trim all string inputs before validating emptiness.
- For async selects, treat missing `value` as invalid when required.
- On validation failure: set `errors[field] = ['message']` (array) to match API error shape.

Server integration contract

- Create endpoint: POST `/api/v1/{resource}/store` or `/{resource}` depending on existing pattern; include parsed numeric fields and `business_type`/`tenant_id` when required.
- On edit include `id` in payload or call update endpoint.
- Error payload format to expect: `response.data.errors` is an object mapping field keys to arrays of strings (e.g., `{ name: ['Name is required'] }`). Map this directly to `errors` state.

UX/Accessibility

- Place label above inputs, mark required fields with asterisk.
- Error message: show the first error message below the input in small red text and mark field border red when invalid.
- Disable submit button and show `Creating...` text or spinner while `isLoading` is true.
- Show a top-level toast for general failures or success messages.

Code patterns to emulate

- Single `handleInputChange` handler for most inputs that supports `checkbox` toggles and removes per-field errors when user types.
- `CustomSelect` onChange handlers should set selection and update `formData` (`category_id`, `brand_id`, etc.) and clear errors for that field.
- Use `useCallback` for `loadOptions` functions and pass `defaultOptions` array to the select to avoid an initial blank state.
- Use `useEffect` to trigger initial loads when a dependent filter (like `businessType`) becomes available.

AI prompt template (use when asking AI to generate another Add page)
"""
Generate a React client-side Add page component using Tailwind styles and project conventions. Follow these rules derived from the Product Add page:

- Modes: target is an Add page (can accept `mode` prop to support edit/clone later).
- Form state: single `formData` object, `errors: Record<string,string[]>`, `isLoading` boolean. Provide `getFieldError(field)` and `hasFieldError(field)` helpers.
- Async selects: implement `loadOptions(inputValue)` functions for dropdowns; return `[{value,label}]`; cache default options and clear cache when dependent filters change.
- Validation: implement client-side validation per-field based on these rules:
  - Required fields: {required_fields}
  - Numeric fields: parse and validate min/max bounds (e.g., >=0, tax_rate 0-100)
  - Trim string fields before checking empty
  - For selects, require a non-empty `value` when field is required
- API: submit parsed payload to `{endpoint}` (POST create), include `tenant_id` or `business_type` when required. Parse numeric fields (parseFloat/parseInt) before sending.
- Error handling: map `response.data.errors` (field -> string[]) to `errors` state and display the first message per field.
- UX: show disabling submit while saving; show toast notifications with `notify.success` and `notify.error`.

Produce a single React functional component with the above behavior and Tailwind styling. Keep code concise and use the project's `CustomSelect`, `notify`, and `services.{resource}Service` naming conventions.
"""

Example placeholders to replace when reusing template

- `{resource}` → `brand` | `category` | `warehouse` etc.
- `{endpoint}` → `brands` | `categories` | `warehouses`
- `{required_fields}` → comma-separated required keys (e.g., `name, code`)

Usage notes

- For simpler modules (e.g., Brand), omit business_type logic and async category/brand loaders; still keep `errors` mapping and numeric parsing patterns.
- For complex modules that need file uploads or images, add a small explanation to the prompt: "include an image upload field using FormData and `service.store{Resource}` handling of file".

---

Generated from: `app/(protected)/products/add/page.tsx` (reference implementation)
