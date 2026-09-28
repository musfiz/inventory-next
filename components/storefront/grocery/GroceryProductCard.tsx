'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, ImageIcon, Leaf, Zap } from 'lucide-react';
import { IoCartSharp } from 'react-icons/io5';
import { useState } from 'react';
import type { Product } from '@/types/storefront';
import { formatMoney } from '@/lib/utils/format';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { useCartFly } from '@/components/storefront/CartFlyProvider';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import { notify } from '@/lib/notifications';
import { imageUrl } from '@/lib/image-url';
import { productDetailHref } from '@/lib/utils/variation-slug';
import Badge from '../Badge';

interface GroceryProductCardProps {
  product: Product;
  variant?: 'default' | 'compact' | 'list';
  showWishlist?: boolean;
}

const discount = (mrp?: number, price?: number) => {
  if (!mrp || !price || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
};

const hasValidBrand = (name?: string) =>
  !!name && !['no brand', 'unknown', 'n/a', 'none', ''].includes(name.trim().toLowerCase());

// Format weight/unit display from backend data
function formatUnitDisplay(product: Product): string {
  const variation = product.variations.find(v => v.isDefault) || product.variations[0];
  if (variation?.weight && variation?.unit) {
    return `${variation.weight}${variation.unit}`;
  }
  if (variation?.unit) {
    return variation.unit;
  }
  return product.unit || '';
}

// Get freshness badge based on product attributes
function getFreshnessBadge(product: Product): string | null {
  const name = product.name.toLowerCase();
  if (name.includes('organic')) return 'Organic';
  if (name.includes('fresh')) return 'Fresh Today';
  if (product.isNew) return 'Just Arrived';
  return null;
}

export default function GroceryProductCard({
  product,
  variant = 'default',
  showWishlist = true,
}: GroceryProductCardProps) {
  const defaultVariation =
    product.variations.find(v => v.isDefault) || product.variations[0];
  const price = defaultVariation.sellingPrice;
  const mrp = defaultVariation.mrp;
  const pct = discount(mrp, price);
  // Displayed price follows the variation's price mode: MRP mode shows only
  // the MRP, otherwise only the selling price from the API.
  const displayPrice = defaultVariation.price_mode === 'mrp' && mrp ? mrp : price;
  const showDiscountBadge = pct > 0 && defaultVariation.price_mode !== 'mrp';
  const inStock = product.variations.some(v => v.stock > 0);
  // Link to the variation this card represents so the detail page opens on the
  // same price/stock instead of falling back to the (possibly out-of-stock) default.
  const detailHref = productDetailHref(product.slug, defaultVariation);
  const [hovered, setHovered] = useState(false);

  const addItem = useCartStore(s => s.addItem);
  const wishlist = useWishlistStore();
  const isWished = wishlist.has(product.id);
  // Wishlist hearts render only for logged-in customers.
  const isAuthed = useCustomerAuthStore(s => s.isAuthenticated);
  const { trackView } = useRecentlyViewed();
  const { flyToCart } = useCartFly();
  const router = useRouter();
  const { expressCheckoutEnabled } = useStorefrontStatus();
  const showExpress = expressCheckoutEnabled && inStock && !!product.slug;

  const unitDisplay = formatUnitDisplay(product);
  const freshnessBadge = getFreshnessBadge(product);
  const hasImage = Boolean(product.images?.[0]);

  const handleExpress = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/store/products/${product.slug}/checkout`);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const vid = defaultVariation.id;
    const res = addItem(product, vid, 1);
    if (res.ok) {
      flyToCart(e, imageUrl(defaultVariation.image) || imageUrl(product.images[0]) || '', product.name);
    } else {
      notify.error(res.message || 'Could not add to cart');
    }
  };

  const handleWish = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    wishlist.toggle(product.id);
    notify.success(
      isWished ? 'Removed from wishlist' : 'Added to wishlist'
    );
  };

  if (variant === 'list') {
    return (
      <Link
        href={detailHref}
        onClick={() => trackView(product.id)}
        className={`group flex gap-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:border-green-300 dark:hover:border-green-700 ${hasImage ? 'hover:shadow-md' : ''}`}
      >
        <div
          className={`relative h-32 w-32 shrink-0 overflow-hidden rounded-lg ${hasImage ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {product.images[0] ? (
            <>
              <Image
                src={imageUrl(product.images[0]) || ''}
                alt={product.name}
                fill
                sizes="128px"
                className="object-cover transition-opacity duration-500"
                style={{ opacity: hovered && product.images[1] ? 0 : 1 }}
              />
              {product.images[1] && (
                <Image
                  src={imageUrl(product.images[1]) || ''}
                  alt={product.name}
                  fill
                  sizes="128px"
                  className="object-cover transition-opacity duration-500"
                  style={{ opacity: hovered ? 1 : 0 }}
                />
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {hasValidBrand(product.brand?.name) && (
                <p className="text-xs font-medium uppercase tracking-wide text-green-600 dark:text-green-400">
                  {product.brand?.name}
                </p>
              )}
              <h3 title={product.name} className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-green-600">
                {product.name}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {unitDisplay || ' '}
              </p>
            </div>
            {showWishlist && isAuthed && (
              <button
                onClick={handleWish}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-orange-500 dark:hover:bg-gray-800"
                aria-label="Add to wishlist"
              >
                <Heart
                  className={`h-5 w-5 ${isWished ? 'fill-orange-500 text-orange-500' : ''
                    }`}
                />
              </button>
            )}
          </div>
          <div className="mt-auto pt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {formatMoney(displayPrice)}
              </span>
            </div>
            <button
              onClick={handleAdd}
              disabled={!inStock}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xs border border-green-600 bg-white px-3 py-1 text-sm font-semibold text-green-600 transition-all hover:bg-green-700 hover:text-white focus:bg-green-600 focus:text-white active:scale-[0.99] disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400 dark:border-green-500 dark:bg-gray-900 dark:text-green-400 dark:hover:bg-green-700 dark:hover:text-white dark:focus:bg-green-600 dark:focus:text-white dark:disabled:border-gray-700 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
            >
              <IoCartSharp className="h-4 w-4" />
              {inStock ? 'Add to Cart' : 'Sold out'}
            </button>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={detailHref}
      onClick={() => trackView(product.id)}
      className={`group relative flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-shadow duration-200 hover:border-green-300 dark:hover:border-green-700 ${hasImage ? 'hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)]' : ''}`}
    >
      <div
        className={`relative aspect-square overflow-hidden rounded-t-lg ${hasImage ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {product.images[0] ? (
          <>
            <Image
              src={imageUrl(product.images[0]) || ''}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
              className="object-cover transition-opacity duration-500"
              style={{ opacity: hovered && product.images[1] ? 0 : 1 }}
            />
            {product.images[1] && (
              <Image
                src={imageUrl(product.images[1]) || ''}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                className="object-cover transition-opacity duration-500"
                style={{ opacity: hovered ? 1 : 0 }}
              />
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-14 w-14 text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          {showDiscountBadge && <Badge variant="sale">-{pct}%</Badge>}
          {freshnessBadge && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <Leaf className="h-3 w-3" />
              {freshnessBadge}
            </span>
          )}
        </div>

        {showWishlist && isAuthed && (
          <button
            onClick={handleWish}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-all hover:bg-white dark:bg-gray-900/90 dark:hover:bg-gray-900"
            aria-label="Add to wishlist"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${isWished
                ? 'fill-orange-500 text-orange-500'
                : 'text-gray-600 dark:text-gray-400'
                }`}
            />
          </button>
        )}

        {!inStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm dark:bg-gray-950/60">
            <span className="rounded-lg bg-gray-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
              Sold out
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {hasValidBrand(product.brand?.name) && (
          <p className="text-xs font-medium uppercase tracking-wider text-green-600 dark:text-green-400">
            {product.brand?.name}
          </p>
        )}
        <h3 title={product.name} className="mt-1 truncate text-[13px] font-semibold text-gray-900 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
          {product.name}
        </h3>

        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {unitDisplay || ' '}
        </p>

        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-gray-900 dark:text-gray-100">
              {formatMoney(displayPrice)}
            </span>
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            <button
              onClick={handleAdd}
              disabled={!inStock}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xs border border-green-600 bg-white px-3 py-1 text-sm font-semibold text-green-600 transition-all hover:bg-green-700 hover:text-white focus:bg-green-600 focus:text-white active:scale-[0.99] disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400 dark:border-green-500 dark:bg-gray-900 dark:text-green-400 dark:hover:bg-green-700 dark:hover:text-white dark:focus:bg-green-600 dark:focus:text-white dark:disabled:border-gray-700 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
            >
              <IoCartSharp className="h-4 w-4" />
              {inStock ? 'Add to Cart' : 'Sold out'}
            </button>
            {showExpress && (
              <button
                onClick={handleExpress}
                title="Instant purchase"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xs border border-purple-600 bg-white px-3 py-1 text-sm font-semibold text-purple-600 transition-all hover:bg-purple-600 hover:text-white focus:bg-purple-600 focus:text-white active:scale-[0.99] dark:border-purple-500 dark:bg-gray-900 dark:text-purple-400 dark:hover:bg-purple-600 dark:hover:text-white dark:focus:bg-purple-600 dark:focus:text-white"
              >
                <Zap className="h-4 w-4" />
                Instant purchase
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
