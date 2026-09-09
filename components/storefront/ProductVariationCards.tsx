'use client';

import type { Product } from '@/types/storefront';
import ProductCard from './ProductCard';
import ScrollReveal from './ScrollReveal';
import GroceryProductCard from './grocery/GroceryProductCard';
import { useStorefrontTheme } from '@/contexts/storefront-theme-context';

interface ProductVariationCardsProps {
  product: Product;
  variant?: 'default' | 'compact' | 'list';
  showWishlist?: boolean;
  /** Base position in the stagger sequence; each variation card increments it. */
  staggerIndex?: number;
  staggerGap?: number;
}

/**
 * Renders one product card per variation so a multi-option product appears as
 * distinct grid cells — each showing that variation's own price, image and stock
 * — instead of cramming all options into a single card. Each card is labelled
 * "ProductName VariantName". Each card is wrapped in its own <ScrollReveal> so it
 * becomes its own grid item (a fragment's children are direct grid children).
 * A product with no variations renders a single unchanged card, as before.
 */
export default function ProductVariationCards({
  product,
  variant,
  showWishlist = true,
  staggerIndex = 0,
  staggerGap = 80,
}: ProductVariationCardsProps) {
  const { isGrocery } = useStorefrontTheme();
  const Card = isGrocery ? GroceryProductCard : ProductCard;

  const variations =
    product.variations && product.variations.length > 0 ? product.variations : null;

  // No variations — render the original product as a single card (unchanged).
  if (!variations) {
    return (
      <ScrollReveal
        key={`${product.id}-default`}
        animation="zoom-in"
        staggerIndex={staggerIndex}
        staggerGap={staggerGap}
      >
        <Card product={product} variant={variant} showWishlist={showWishlist} />
      </ScrollReveal>
    );
  }

  return (
    <>
      {variations.map((v, vIdx) => {
        const variationId = v?.id ?? 'default';
        const variantName = v?.name?.trim();
        // Only append a distinct, non-duplicate variation name (avoids "T-shirt T-shirt").
        const hasDistinctName =
          !!variantName &&
          variantName.toLowerCase() !== product.name.trim().toLowerCase();
        const card = {
          ...product,
          // Single-variation view so the card shows this variation's price/stock.
          variations: v ? [v] : [],
          // Use the variation's own image when present, else fall back to product images.
          images: [v?.image || product.images[0], product.images[1]].filter(Boolean) as string[],
          name: hasDistinctName ? `${product.name} ${variantName}` : product.name,
        } as Product;
        return (
          <ScrollReveal
            key={`${product.id}-${variationId}`}
            animation="zoom-in"
            staggerIndex={staggerIndex + vIdx}
            staggerGap={staggerGap}
          >
            <Card product={card} variant={variant} showWishlist={showWishlist} />
          </ScrollReveal>
        );
      })}
    </>
  );
}
