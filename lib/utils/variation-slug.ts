export interface VariationLike {
  id?: string | number | null;
  name?: string | null;
  sku?: string | null;
}

/** Convert arbitrary text into a URL-safe slug. */
export function slugify(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * URL segment that identifies a variation. Prefers the human variation name
 * (the same name shown on the product card), then the SKU, then the id as a
 * last resort so the segment is never empty when an id exists.
 */
export function variationSlug(variation: VariationLike | null | undefined): string {
  if (!variation) return '';
  return (
    slugify(variation.name) ||
    slugify(variation.sku) ||
    (variation.id != null ? String(variation.id) : '')
  );
}

/** Build the storefront product-detail path for a product (and optional variation). */
export function productDetailHref(
  productSlug: string,
  variation?: VariationLike | null,
): string {
  const base = `/store/products/${productSlug}`;
  const segment = variationSlug(variation);
  return segment ? `${base}/${segment}` : base;
}

/**
 * Resolve a variation from a URL segment. When several variations share the
 * same slug (duplicate names), prefer an in-stock one, then the default.
 */
export function findVariationBySlug<
  T extends VariationLike & { stock?: number; isDefault?: boolean },
>(variations: T[], slug: string | null | undefined): T | undefined {
  if (!slug) return undefined;
  const target = slugify(slug) || String(slug);
  const matches = variations.filter(v => variationSlug(v) === target);
  if (matches.length <= 1) return matches[0];
  return (
    matches.find(v => (v.stock ?? 0) > 0) ??
    matches.find(v => v.isDefault) ??
    matches[0]
  );
}
