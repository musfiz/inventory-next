'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, ImageIcon, Zap } from 'lucide-react';
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
import Badge from './Badge';
import { useStorefrontTheme } from '@/contexts/storefront-theme-context';
import GroceryProductCard from '@/components/storefront/grocery/GroceryProductCard';

interface ProductCardProps {
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

export default function ProductCard(props: ProductCardProps) {
  const { isGrocery } = useStorefrontTheme();
  return isGrocery ? <GroceryProductCard {...props} /> : <DefaultProductCard {...props} />;
}

function DefaultProductCard({
  product,
  variant = 'default',
  showWishlist = true,
}: ProductCardProps) {
  const defaultVariation =
    product.variations.find(v => v.isDefault) || product.variations[0];
  const price = defaultVariation.sellingPrice;
  const mrp = defaultVariation.mrp;
  const pct = discount(mrp, price);
  // Displayed price follows the variation's price mode: MRP mode shows only
  // the MRP, otherwise only the selling price from the API.
  const displayPrice = defaultVariation.price_mode === 'mrp' && mrp ? mrp : price;
  const showDiscountBadge = pct > 0 && defaultVariation.price_mode !== 'mrp';
  const hasImage = Boolean(product.images?.[0]);
  const unitDisplay = (() => {
    const v = defaultVariation;
    if (v?.weight && v?.unit) return `${v.weight}${v.unit}`;
    if (v?.unit) return v.unit;
    return product.unit || '';
  })();
  // Absolute user savings; only meaningful when MRP is actually above the price.
  const inStock = product.variations.some(v => v.stock > 0);
  const hasManyVariations = product.variations.length > 1;
  // Link to the variation this card represents so the detail page opens on the
  // same price/stock instead of falling back to the (possibly out-of-stock) default.
  const detailHref = productDetailHref(product.slug, defaultVariation);
  const [hovered, setHovered] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

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

  const handleExpress = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/store/products/${product.slug}/checkout`);
  };

  const handleAdd = (e: React.MouseEvent, variationId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    const vid = variationId || defaultVariation.id;
    const res = addItem(product, vid, 1);
    if (res.ok) {
      flyToCart(e, imageUrl(defaultVariation.image) || imageUrl(product.images[0]) || '', product.name);
      setShowQuickAdd(false);
    } else {
      notify.error(res.message || 'Could not add to bag');
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
        className={`group flex gap-4 rounded-none border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:border-brand-300 dark:hover:border-brand-700 ${hasImage ? 'hover:shadow-md' : ''}`}
      >
        <div
          className={`relative h-32 w-32 shrink-0 overflow-hidden ${hasImage ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
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
                <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
                  {product.brand?.name}
                </p>
              )}
              <h3 title={product.name} className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-600">
                {product.name}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {unitDisplay || ' '}
              </p>
            </div>
            {showWishlist && isAuthed && (
              <button
                onClick={handleWish}
                className="rounded-none p-2 text-gray-400 hover:bg-gray-100 hover:text-accent-500 dark:hover:bg-gray-800"
                aria-label="Add to wishlist"
              >
                <Heart
                  className={`h-5 w-5 ${isWished ? 'fill-accent-500 text-accent-500' : ''
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
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xs border border-brand-600 bg-white px-3 py-1 text-sm font-semibold text-brand-600 transition-all hover:bg-brand-700 hover:text-white focus:bg-brand-600 focus:text-white active:scale-[0.99] disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400 dark:border-brand-500 dark:bg-gray-900 dark:text-brand-400 dark:hover:bg-brand-700 dark:hover:text-white dark:focus:bg-brand-600 dark:focus:text-white dark:disabled:border-gray-700 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
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
      className={`group relative flex h-full flex-col overflow-hidden rounded-none border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-shadow duration-200 hover:border-brand-300 dark:hover:border-brand-700 ${hasImage ? 'hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)]' : ''}`}
    >
      <div
        className={`relative aspect-square overflow-hidden ${hasImage ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
        onMouseEnter={() => { setHovered(true); if (product.images[1]) setShowQuickAdd(true); }}
        onMouseLeave={() => { setHovered(false); setShowQuickAdd(false); }}
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
          {product.isNew && <Badge variant="new">New</Badge>}
          {product.isBestseller && !product.isNew && (
            <Badge variant="bestseller">Bestseller</Badge>
          )}
        </div>

        {showWishlist && isAuthed && (
          <button
            onClick={handleWish}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-none bg-white/90 shadow-sm backdrop-blur-sm transition-all hover:bg-white dark:bg-gray-900/90 dark:hover:bg-gray-900"
            aria-label="Add to wishlist"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${isWished
                ? 'fill-accent-500 text-accent-500'
                : 'text-gray-600 dark:text-gray-400'
                }`}
            />
          </button>
        )}

        {!inStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm dark:bg-gray-950/60">
            <span className="rounded-none bg-gray-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
              Sold out
            </span>
          </div>
        )}

        {/* Quick add popover for variable products */}
        {showQuickAdd && hasManyVariations && inStock && (
          <div
            className="absolute inset-x-0 bottom-0 z-20 bg-white/95 p-2 backdrop-blur-md dark:bg-gray-950/95 sf-slide-up"
            onClick={e => e.preventDefault()}
          >
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Quick add
            </p>
            <div className="flex flex-wrap gap-1.5">
              {product.variations.slice(0, 5).map(v => (
                <button
                  key={v.id}
                  onClick={e => handleAdd(e, v.id)}
                  disabled={v.stock <= 0}
                  className="rounded-none border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-700 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                >
                  {Object.values(v.attributes).join(' ') || v.name}
                </button>
              ))}
              {product.variations.length > 5 && (
                <span className="rounded-none bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-500 dark:bg-gray-800">
                  +{product.variations.length - 5}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {hasValidBrand(product.brand?.name) && (
          <p className="text-xs font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">
            {product.brand?.name}
          </p>
        )}
        <h3 title={product.name} className="mt-1 truncate text-[13px] font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
          {product.name}
        </h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {unitDisplay || ' '}
        </p>

        {variant !== 'compact' && (
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {hasManyVariations ? `${product.variations.length} options` : '\u00A0'}
          </p>
        )}

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
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xs border border-brand-600 bg-white px-3 py-1 text-sm font-semibold text-brand-600 transition-all hover:bg-brand-700 hover:text-white focus:bg-brand-600 focus:text-white active:scale-[0.99] disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400 dark:border-brand-500 dark:bg-gray-900 dark:text-brand-400 dark:hover:bg-brand-700 dark:hover:text-white dark:focus:bg-brand-600 dark:focus:text-white dark:disabled:border-gray-700 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
            >
              <IoCartSharp className="h-4 w-4" />
              {inStock ? 'Add to Cart' : 'Sold out'}
            </button>
            {showExpress && (
              <button
                onClick={handleExpress}
                title="Instant purchase with COD (Cash on Delivery)"
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
