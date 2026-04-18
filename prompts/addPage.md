# Add Page Prompt Context

Purpose

- Provide a reusable AI prompt context derived from the Warehouse "Add" page. Use this to generate consistent "Add" pages across modules (Products, Brands, Categories, Bins, Suppliers, etc.).

High-level behavior

- Support modes: `add`, `edit`, `clone`.
- Form has initial values, client-side validation, saving state, error mapping from API, and success/error notifications.
- For multi-tenant apps, show tenant selector only for super-admins and include `tenant_id` in payload when present.

Layout & components

- Header: page title + primary action button (e.g., "Add Warehouse").
- Form container: card with subtle border and shadow.
- Grid layout responsive by breakpoints: 1/2/3/4 columns depending on field groups.
- Input types: text, email, tel, textarea (address), select (tenant), checkbox toggles for boolean flags.
- Buttons: primary save, secondary cancel. Save shows spinner/disabled when saving.

Canonical fields (adapt per module)

- Identifiers: `code` (string, required, short), `name` (string, required).
- Contact: `contact_person`, `phone`, `email` (email format).
- Location/address: `address`, `city`, `state`, `country` (default: "Bangladesh"), `postal_code`.
- Flags/toggles: `is_active` (default true), `is_default`, `is_sales_location`, `is_purchase_location`.
- Tenant: `tenant_id` (only set/visible to super-admins).

Validation rules

- Required: `name`, `code`.
- Email: RFC-like regex check before submit.
- Tenant selection required for super-admins.
- Trim strings before validation.

API contract (conventions)

- Endpoint path: plural resource name (e.g., `warehouses`) with `POST` to create and `PUT`/`PATCH` to update (include `id`).
- Payload: include only allowed fields; include `tenant_id` when applicable.
- Error response: assume `response.data.errors` is an object mapping field -> array of messages; map to form-level string messages joined by comma.

State & UX

- Form states: `initialValues`, `formErrors` (map), `saving` (boolean), `showForm` (visible), `isEditing`.
- On success: show toast notification (success message), hide or reset form, refresh list.
- On API validation error: display per-field error messages under inputs.
- On network/error: show generic error toast with server message fallback.

Accessibility & i18n

- Ensure form labels are associated with inputs.
- Error messages placed immediately after the input; use `aria-invalid` when invalid.
- Keep all user-visible strings as translatable keys where applicable.

AI prompt template
"""
You are generating a React + Tailwind 'Add' page component for the resource `{resource}` using the following design rules:

- Modes: `add`, `edit`, `clone`.
- Required fields: `{required_fields}`.
- Optional fields: `{optional_fields}`.
- Tenant handling: show tenant selector only for super-admin; include `tenant_id` in payload if provided.
- Validation: trim strings, require required fields, email pattern validation.
- API: POST to `{endpoint}` to create; include `id` when editing.
- UX: show saving state, disable submit while saving, show success and error notifications, map API validation errors to fields.
- Layout: responsive grid; group related fields; use checkbox toggles for booleans.

Produce a single React functional component (client-side) that implements the form, validation, API calls (using `service.store{Resource}` naming), and notifications. Keep styling using existing Tailwind conventions used across the project (card container, small text, rounded inputs). Include inline comments only where necessary and keep code concise.
"""

Example use for Warehouse

- resource: `warehouse`
- endpoint: `warehouses`
- required_fields: `code, name`
- optional_fields: `contact_person, phone, email, address, city, state, country, postal_code, is_active, is_default, is_sales_location, is_purchase_location`

How to use this context

- Copy and replace `{resource}`, `{endpoint}`, `{required_fields}`, and `{optional_fields}` values when prompting the AI.
- Optionally specify platform details (e.g., `use TanStack Table for list page`, `use axios instance from services`) to match project conventions.
