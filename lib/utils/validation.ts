// Form Validation Schemas & Helpers (Section 3.4 — No Form Validation Library)
//
// Central, reusable zod-based validators for the whole app. Forms compose these
// into a `z.object({...})` schema and wire it to react-hook-form via
// `@hookform/resolvers/zod`. Keeping validators here (pure, no React imports)
// makes them unit-testable and shareable across admin + storefront forms.
//
// NOTE: Written for zod v4 — error messages use the `message`/refine params
// (zod 4 removed `required_error`/`invalid_type_error`).

import { z } from 'zod';

/** Required, trimmed, non-empty string. */
export function requiredString(
  label = 'This field',
  opts?: { min?: number; max?: number },
) {
  const min = opts?.min ?? 1;
  let schema = z.string().trim();
  if (min > 1) {
    schema = schema.min(min, `${label} must be at least ${min} characters`);
  } else {
    schema = schema.min(1, `${label} is required`);
  }
  if (opts?.max != null) {
    schema = schema.max(opts.max, `${label} must be at most ${opts.max} characters`);
  }
  return schema;
}

/** Optional free-text string (empty string -> undefined so it's omitted on submit). */
export const optionalString = (opts?: { max?: number }) =>
  z
    .string()
    .trim()
    .max(opts?.max ?? 65535, `Must be at most ${opts?.max ?? 65535} characters`)
    .optional()
    .or(z.literal(''))
    .transform(v => (v === '' ? undefined : v));

/** Required, RFC-ish email. */
export const email = (label = 'Email') =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .email(`Enter a valid ${label.toLowerCase()} address`);

/** Optional email (empty allowed). */
export const optionalEmail = (label = 'Email') =>
  z
    .string()
    .trim()
    .email(`Enter a valid ${label.toLowerCase()} address`)
    .optional()
    .or(z.literal(''))
    .transform(v => (v === '' ? undefined : v));

/** Bangladesh-friendly phone: 01XXXXXXXXX, +8801XXXXXXXXX, or 8801XXXXXXXXX (11 digits). */
export const phone = (label = 'Phone', required = true) => {
  const pattern = /^(\+?88)?01[3-9]\d{8}$/;
  if (required) {
    return z
      .string()
      .trim()
      .min(1, `${label} is required`)
      .regex(pattern, `Enter a valid ${label.toLowerCase()} number (e.g. 01XXXXXXXXX)`);
  }
  return z
    .string()
    .trim()
    .regex(pattern, `Enter a valid ${label.toLowerCase()} number (e.g. 01XXXXXXXXX)`)
    .optional()
    .or(z.literal(''))
    .transform(v => (v === '' ? undefined : v));
};

/** Number field with optional bounds. Accepts input-string-like values too. */
export function numberField(opts?: {
  label?: string;
  required?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
}) {
  const label = opts?.label ?? 'Value';
  const required = opts?.required ?? false;
  const base = z.union([
    z.number(),
    z.string().transform(v => (v === '' || v == null ? undefined : Number(v))),
  ]);

  if (required) {
    return base
      .refine((v): v is number => v !== undefined && !Number.isNaN(v as number), `${label} is required`)
      .pipe(
        z
          .number({ error: `${label} must be a number` })
          .refine(v => !opts?.integer || Number.isInteger(v), `${label} must be a whole number`)
          .refine(v => opts?.min == null || v >= opts.min, `${label} must be ≥ ${opts?.min}`)
          .refine(v => opts?.max == null || v <= opts.max, `${label} must be ≤ ${opts?.max}`),
      );
  }

  return base
    .pipe(
      z
        .number({ error: `${label} must be a number` })
        .optional()
        .refine(v => v == null || !opts?.integer || Number.isInteger(v), `${label} must be a whole number`)
        .refine(v => v == null || opts?.min == null || v >= opts.min, `${label} must be ≥ ${opts?.min}`)
        .refine(v => v == null || opts?.max == null || v <= opts.max, `${label} must be ≤ ${opts?.max}`),
    )
    .optional()
    .transform(v => (v == null || Number.isNaN(v as number) ? undefined : v));
}

/** Optional positive-integer id (selected dropdown, may be unset/empty). */
export const optionalId = (label = 'Selection') =>
  z
    .union([z.number(), z.string()])
    .transform(v => (v === '' || v == null ? undefined : Number(v)))
    .pipe(
      z
        .number({ error: `${label} is required` })
        .positive(`${label} is required`)
        .optional(),
    );

/** Required positive integer id (e.g. selected dropdown value). */
export const idField = (label = 'Selection') =>
  z
    .union([z.number(), z.string().transform(v => (v === '' || v == null ? undefined : Number(v)))])
    .refine((v): v is number => v !== undefined && !Number.isNaN(v as number), `${label} is required`)
    .pipe(z.number({ error: `${label} is required` }).positive(`${label} is required`));

/** Password with minimum length. */
export const password = (label = 'Password', min = 8) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`);

/** Add a password==confirmation check at the object (schema) level. */
export function withPasswordConfirmation<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  field: string,
  confirmField: string,
  message = 'Password confirmation does not match',
) {
  return schema.refine(data => (data as Record<string, unknown>)[field] === (data as Record<string, unknown>)[confirmField], {
    message,
    path: [confirmField],
  });
}

/** URL (optional by default). */
export const url = (label = 'URL', required = false) => {
  if (required) {
    return z
      .string()
      .trim()
      .min(1, `${label} is required`)
      .url(`Enter a valid ${label.toLowerCase()}`);
  }
  return z
    .string()
    .trim()
    .url(`Enter a valid ${label.toLowerCase()}`)
    .optional()
    .or(z.literal(''))
    .transform(v => (v === '' ? undefined : v));
};

/** Boolean field (checkboxes / switches). */
export const booleanField = z.boolean().optional().default(false);

/**
 * Flatten a zod issue list into `{ field: firstMessage }`.
 * Useful for mapping client validation failures or for tests.
 */
export function flattenFieldErrors(issues: z.core.$ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join('.') || '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Normalize a backend 422 `{ field: string[] | string }` error payload into the
 * `{ field: message }` shape react-hook-form expects via `setError`.
 */
export function normalizeServerErrors(
  errors: Record<string, string | string[]> | undefined,
): Record<string, string> {
  if (!errors) return {};
  const out: Record<string, string> = {};
  for (const [field, value] of Object.entries(errors)) {
    out[field] = Array.isArray(value) ? value[0] : value;
  }
  return out;
}

// ── Express checkout (storefront) ─────────────────────────────────
// Express Checkout is intentionally restricted: Dhaka-only delivery,
// Bangladesh-only country, fixed Express shipping and Cash on Delivery.
// These constants mirror both the checkout page and the Laravel rules
// (StorefrontCheckoutController::place).

export const EXPRESS_CITY = 'Dhaka' as const;
export const EXPRESS_COUNTRY = 'Bangladesh' as const;
export const EXPRESS_SHIPPING_METHOD = 'ship-express' as const;
export const EXPRESS_PAYMENT_METHOD = 'pm-cod' as const;

export const expressAddressSchema = z.object({
  name: requiredString('Full name', { min: 2 }),
  phone: phone('Phone'),
  address_line1: requiredString('Address', { min: 5 }),
  address_line2: optionalString(),
  city: z.enum([EXPRESS_CITY], { error: 'City must be Dhaka for express delivery' }),
  zip_code: optionalString(),
  country: z.enum([EXPRESS_COUNTRY], { error: 'Country must be Bangladesh' }),
  label: optionalString(),
});

export const expressCheckoutItemSchema = z.object({
  variation_id: requiredString('Variation'),
  product_id: requiredString('Product'),
  quantity: numberField({ label: 'Quantity', required: true, min: 1, max: 99, integer: true }),
  unit_price: numberField({ label: 'Unit price', required: true, min: 0 }),
});

/** Full express-checkout `PlaceOrderPayload` (mirrors backend validation). */
export const expressCheckoutPayloadSchema = z.object({
  email: email('Email'),
  phone: phone('Phone'),
  address: expressAddressSchema,
  shipping_method_id: z.enum(
    [EXPRESS_SHIPPING_METHOD],
    { error: 'Express checkout only supports Express Delivery' },
  ),
  payment_method: z.enum(
    [EXPRESS_PAYMENT_METHOD],
    { error: 'Express checkout only supports Cash on Delivery' },
  ),
  coupon_code: optionalString(),
  items: z.array(expressCheckoutItemSchema).min(1, 'Add at least one item'),
  customer_id: optionalString(),
  express: z.boolean().optional(),
});

/** Derive an inferred payload type from the schema. */
export type ExpressCheckoutPayload = z.infer<typeof expressCheckoutPayloadSchema>;
