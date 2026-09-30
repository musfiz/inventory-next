'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ImageIcon, Tag } from 'lucide-react';
import { IoCartSharp } from 'react-icons/io5';
import { formatMoney } from '@/lib/utils/format';
import { imageUrl } from '@/lib/image-url';
import { productDetailHref } from '@/lib/utils/variation-slug';
import { useCartStore } from '@/stores/cart-store';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { useCartFly } from '@/components/storefront/CartFlyProvider';
import { notify } from '@/lib/notifications';
import type { Product } from '@/types/storefront';
import type { StorefrontWeeklyDeal } from '@/types/storefront';

const pad = (n: number) => String(n).padStart(2, '0');

/** Auto-advance interval for the one-by-one carousel. */
const ROTATE_MS = 4500;

interface Remaining {
  total: number;
  d: number;
  h: number;
  m: number;
  s: number;
}

function computeRemaining(target: string, now: number): Remaining {
  const total = Math.max(0, new Date(target).getTime() - now);
  return {
    total,
    d: Math.floor(total / 86400000),
    h: Math.floor((total % 86400000) / 3600000),
    m: Math.floor((total % 3600000) / 60000),
    s: Math.floor(((total % 3600000) % 60000) / 1000),
  };
}

/**
 * Prominent countdown to the deal's end. Hides itself once the deal expires.
 */
function DealTimer({ target }: { target: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { total, d, h, m, s } = computeRemaining(target, now);
  if (total <= 0) return null;

  const units: { value: string; label: string }[] = [
    { value: pad(d), label: 'Days' },
    { value: pad(h), label: 'Hrs' },
    { value: pad(m), label: 'Mins' },
    { value: pad(s), label: 'Secs' },
  ];

  return (
    <div
      className="mt-2 flex items-stretch gap-1.5"
      role="timer"
      aria-label={`Deal ends in ${d} days ${h} hours ${m} minutes ${s} seconds`}
      title={`Ends ${new Date(target).toLocaleString()}`}
    >
      {units.map(u => (
        <div
          key={u.label}
          className="flex min-w-0 flex-1 flex-col items-center rounded-sm bg-gray-900 px-1 py-1 text-white dark:bg-white dark:text-gray-900"
        >
          <span className="font-mono text-[13px] leading-none font-bold tabular-nums">
            {u.value}
          </span>
          <span className="mt-1 text-[9px] leading-none font-semibold tracking-wider uppercase opacity-70">
            {u.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * One deal slide. A vertical mini product card mirroring the ProductCard info
 * layout (image, brand, name, unit, price, Add to Cart) in a slightly wider
 * cut for the rail — a full ProductCard is far too tall beside the grid.
 * Pricing follows the same rules as ProductCard (price_mode).
 */
function DealSlide({ product }: { product: Product }) {
  const variation = product.variations.find(v => v.isDefault) || product.variations[0];
  const addItem = useCartStore(s => s.addItem);
  const { trackView } = useRecentlyViewed();
  const { flyToCart } = useCartFly();

  const price = variation?.sellingPrice ?? 0;
  const mrp = variation?.mrp;
  const pct = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const displayPrice = variation?.price_mode === 'mrp' && mrp ? mrp : price;
  const showDiscountBadge = pct > 0 && variation?.price_mode !== 'mrp';
  const brandName = product.brand?.name ?? '';
  const hasBrand =
    !!brandName && !['no brand', 'unknown', 'n/a', 'none', ''].includes(brandName.trim().toLowerCase());
  const thumb = imageUrl(variation?.image) || imageUrl(product.images[0]) || '';
  const inStock = (variation?.stock ?? 0) > 0;
  const unitDisplay = (() => {
    if (variation?.weight && variation?.unit) return `${variation.weight}${variation.unit}`;
    if (variation?.unit) return variation.unit;
    return product.unit || '';
  })();
  const detailHref = variation ? productDetailHref(product.slug, variation) : `/store/products/${product.slug}`;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!variation) return;
    const res = addItem(product, variation.id, 1);
    if (res.ok) {
      flyToCart(e, thumb, product.name);
    } else {
      notify.error(res.message || 'Could not add to bag');
    }
  };

  return (
    <Link
      href={detailHref}
      onClick={() => trackView(product.id)}
      className="group mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      {/* Flexes to fill the rail: on desktop the row height is set by the hero
          grid, so this image grows/shrinks to make both widgets equal height.
          Mobile keeps a fixed 4:3 ratio. */}
      <div className="relative aspect-[4/3] w-full flex-1 overflow-hidden bg-gray-100 lg:aspect-auto lg:min-h-40 dark:bg-gray-800">
        {thumb ? (
          <Image
            src={thumb}
            alt={product.name}
            fill
            sizes="(max-width: 1024px) 40vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-10 w-10 text-gray-300 dark:text-gray-600" />
          </div>
        )}
        {showDiscountBadge && (
          <span className="absolute top-2 left-2 rounded-sm bg-accent-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
            -{pct}%
          </span>
        )}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-950/60">
            <span className="rounded-sm bg-gray-900 px-3 py-1 text-[11px] font-semibold tracking-wide text-white uppercase">
              Sold out
            </span>
          </div>
        )}
      </div>

      <div className="p-2.5">
        {hasBrand && (
          <p className="truncate text-[11px] font-medium tracking-wider text-brand-600 uppercase dark:text-brand-400">
            {brandName}
          </p>
        )}
        <p title={product.name} className="mt-0.5 line-clamp-2 min-h-8 text-[13px] leading-snug font-semibold text-gray-900 group-hover:text-brand-600 dark:text-gray-100">
          {product.name}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {unitDisplay || ' '}
        </p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-base font-bold text-gray-900 dark:text-gray-100">
            {formatMoney(displayPrice)}
          </span>
          {showDiscountBadge && mrp && (
            <span className="text-xs text-gray-400 line-through dark:text-gray-500">
              {formatMoney(mrp)}
            </span>
          )}
        </div>
        <button
          onClick={handleAdd}
          disabled={!inStock}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xs border border-brand-600 bg-white px-2 py-1 text-xs font-semibold text-brand-600 transition-all hover:bg-brand-700 hover:text-white active:scale-[0.99] disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400 dark:border-brand-500 dark:bg-gray-900 dark:text-brand-400 dark:hover:bg-brand-700 dark:hover:text-white dark:disabled:border-gray-700 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
        >
          <IoCartSharp className="h-3.5 w-3.5" />
          {inStock ? 'Add to Cart' : 'Sold out'}
        </button>
      </div>
    </Link>
  );
}

/**
 * Weekly Deals rail: shows the promoted product variations one at a time with
 * a countdown to the deal's end, auto-advancing with prev/next controls and
 * position dots. The rail is sized to fit the remaining space beside the 2x2
 * hero grid, so slides are compact horizontal cards with Add to Cart.
 */
export default function WeeklyDealsCarousel({ deal }: { deal: StorefrontWeeklyDeal }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = deal.items.length;

  // Reset when switching deals; clamp when the item set shrinks.
  useEffect(() => {
    setIndex(0);
  }, [deal.id]);
  useEffect(() => {
    setIndex(i => (i >= count ? 0 : i));
  }, [count]);

  const go = useCallback(
    (dir: 1 | -1) => {
      setIndex(i => (i + dir + count) % count);
    },
    [count],
  );

  // Auto-advance, paused on hover/focus or while the tab is hidden.
  useEffect(() => {
    if (paused || count <= 1) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') go(1);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, count, go]);

  const current = useMemo(() => deal.items[index], [deal.items, index]);
  if (!current) return null;

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-sm border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 text-sm font-bold tracking-wider text-gray-900 uppercase dark:text-gray-100">
            <Tag className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="truncate">{deal.title || 'Weekly Deals'}</span>
          </h2>
          {deal.description && (
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
              {deal.description}
            </p>
          )}
          <DealTimer target={deal.ends_at} />
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous deal"
            className="rounded-sm border border-gray-200 p-1 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next deal"
            className="rounded-sm border border-gray-200 p-1 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <DealSlide key={current.id + (current.variations[0]?.id ?? '')} product={current} />

      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {deal.items.map((item, i) => (
            <button
              key={item.id + (item.variations[0]?.id ?? i)}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show deal ${i + 1} of ${count}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? 'w-5 bg-amber-500'
                  : 'w-1.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
