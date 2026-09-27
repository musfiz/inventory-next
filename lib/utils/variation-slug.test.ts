import { describe, it, expect } from 'vitest';
import {
  slugify,
  variationSlug,
  productDetailHref,
  findVariationBySlug,
} from './variation-slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Red - Large')).toBe('red-large');
  });

  it('trims and collapses separators', () => {
    expect(slugify('  Blue /  XL  ')).toBe('blue-xl');
  });

  it('strips accents', () => {
    expect(slugify('Café Noir')).toBe('cafe-noir');
  });

  it('returns empty string for blank input', () => {
    expect(slugify('')).toBe('');
    expect(slugify(null)).toBe('');
    expect(slugify(undefined)).toBe('');
  });
});

describe('variationSlug', () => {
  it('prefers the variation name', () => {
    expect(variationSlug({ id: 9, name: 'Red - Large', sku: 'SKU-1' })).toBe('red-large');
  });

  it('falls back to sku when name is empty', () => {
    expect(variationSlug({ id: 9, name: '   ', sku: 'SKU 1' })).toBe('sku-1');
  });

  it('falls back to id when name and sku are empty', () => {
    expect(variationSlug({ id: 42 })).toBe('42');
  });

  it('returns empty string for nullish variation', () => {
    expect(variationSlug(null)).toBe('');
  });
});

describe('productDetailHref', () => {
  it('appends the variation segment when present', () => {
    expect(productDetailHref('blue-shirt', { id: 1, name: 'Red - Large' })).toBe(
      '/store/products/blue-shirt/red-large',
    );
  });

  it('returns the base href when there is no variation', () => {
    expect(productDetailHref('blue-shirt')).toBe('/store/products/blue-shirt');
  });
});

describe('findVariationBySlug', () => {
  const variations = [
    { id: 1, name: 'Red - Large', stock: 0, isDefault: true },
    { id: 2, name: 'Blue - Large', stock: 4 },
  ];

  it('matches by name slug', () => {
    expect(findVariationBySlug(variations, 'blue-large')?.id).toBe(2);
  });

  it('normalizes a raw name segment before matching', () => {
    expect(findVariationBySlug(variations, 'Blue - Large')?.id).toBe(2);
  });

  it('returns undefined for unknown or empty slug', () => {
    expect(findVariationBySlug(variations, 'green-large')).toBeUndefined();
    expect(findVariationBySlug(variations, '')).toBeUndefined();
  });

  it('prefers an in-stock duplicate over the default', () => {
    const dupes = [
      { id: 1, name: 'Large', stock: 0, isDefault: true },
      { id: 2, name: 'Large', stock: 3 },
    ];
    expect(findVariationBySlug(dupes, 'large')?.id).toBe(2);
  });
});
