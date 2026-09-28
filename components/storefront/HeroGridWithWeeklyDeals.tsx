'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Tag } from 'lucide-react';
import ProductVariationCards from './ProductVariationCards';
import { useFlashSale, useHeroGridImages } from '@/hooks/use-storefront-data';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import type { StorefrontHeroGridImage } from '@/types/storefront';
import type { Product } from '@/types/storefront';
import type { StorefrontFlashSaleProduct } from '@/services/storefrontService';

/** Prefix relative backend URLs (e.g. /storage/...) with the API origin. */
const resolveImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return url;
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Cell ratio used only when an image has no recorded dimensions. */
const FALLBACK_CELL_RATIO = '16 / 9';

/** Loading placeholder matching the grid + rail silhouette. */
export function HeroGridDealsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="grid grid-cols-2 gap-2 lg:col-span-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            style={{ aspectRatio: FALLBACK_CELL_RATIO }}
            className="sf-shimmer rounded-sm"
          />
        ))}
      </div>
      <div className="space-y-3 lg:col-span-2">
        <div className="sf-shimmer h-8 w-40 rounded-sm" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="sf-shimmer h-40 rounded-sm" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Countdown to the soonest deal end date, reusing the flash-sale chip pattern. */
function DealsCountdown({ target }: { target: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, new Date(target).getTime() - now);
  if (diff <= 0) return null;

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor(((diff % 3600000) % 60000) / 1000);

  return (
    <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-brand-700 dark:text-brand-300">
      <span className="rounded-sm bg-brand-50 px-1.5 py-0.5 dark:bg-brand-950/50">
        {d > 0 ? `${d}d ` : ''}
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>
      <span className="hidden sm:inline text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        left
      </span>
    </div>
  );
}

/**
 * Homepage hero widget: a 2x2 promo image grid beside a "Weekly Deals" rail.
 *
 * The rail reuses Flash Sale campaigns (Ecommerce -> Homepage -> Flash Sale)
 * rather than a duplicate deals model. When the admin pins a campaign in the
 * hero-section settings only that campaign feeds the rail; otherwise every
 * currently-active campaign is used.
 */
export default function HeroGridWithWeeklyDeals() {
  const { homepageHeroWidget, weeklyDealsCampaignId } = useStorefrontStatus();
  const { images, loading: gridLoading } = useHeroGridImages(
    homepageHeroWidget === 'hero_grid_deals',
  );
  const { campaigns } = useFlashSale();

  const railRef = useRef<HTMLDivElement>(null);

  const deals = useMemo(() => {
    const active = weeklyDealsCampaignId
      ? campaigns.filter(c => c.id === weeklyDealsCampaignId)
      : campaigns;

    return active.flatMap(c =>
      c.products.map((p: StorefrontFlashSaleProduct) => ({
        product: {
          id: p.id,
          name: p.name,
          slug: p.slug,
          images: p.images.length > 0 ? p.images : [p.image_url || ''].filter(Boolean),
          rating: 0,
          reviewCount: 0,
          isOnSale: true,
          variations: [
            {
              id: p.id,
              sellingPrice: p.sale_price,
              mrp: p.original_price > p.sale_price ? p.original_price : undefined,
              stock: 999,
              isDefault: true,
              attributes: {},
              name: p.name,
              sku: p.sku,
              image: p.image_url || p.images[0] || '',
            },
          ],
        } as unknown as Product,
      })),
    );
  }, [campaigns, weeklyDealsCampaignId]);

  // Soonest end date across the campaigns feeding the rail. Expired campaigns are
  // filtered out at render time by DealsCountdown, so no clock read here.
  const endsAt = useMemo(() => {
    const dates = (weeklyDealsCampaignId
      ? campaigns.filter(c => c.id === weeklyDealsCampaignId)
      : campaigns
    )
      .map(c => new Date(c.end_date).getTime())
      .filter(t => !Number.isNaN(t));

    return dates.length ? new Date(Math.min(...dates)).toISOString() : null;
  }, [campaigns, weeklyDealsCampaignId]);

  const scrollRail = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ top: dir * Math.max(240, el.clientHeight * 0.8), behavior: 'smooth' });
  };

  // Nothing configured yet — let the caller fall back rather than render empties.
  if (gridLoading) return <HeroGridDealsSkeleton />;
  if (images.length === 0 && deals.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Left: 2x2 promo image grid — each cell is sized from the image's own
          intrinsic ratio (captured at upload) so the full artwork is visible.
          Rows that mix ratios are equalised with items-stretch, so cells use
          object-contain to stay uncropped. */}
      <div className="grid grid-cols-2 items-stretch gap-2 lg:col-span-3">
        {images.length === 0
          ? [...Array(4)].map((_, i) => (
              <div
                key={i}
                style={{ aspectRatio: FALLBACK_CELL_RATIO }}
                className="rounded-sm border border-dashed border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900"
              />
            ))
          : images.map((img: StorefrontHeroGridImage, i) => {
              const cell = (
                <div
                  style={{ aspectRatio: img.aspect_ratio || FALLBACK_CELL_RATIO }}
                  className="group relative h-full overflow-hidden rounded-sm bg-gray-100 dark:bg-gray-800"
                >
                  <Image
                    src={resolveImageUrl(img.image_url)}
                    alt={img.alt_text || img.title || 'Promotion'}
                    fill
                    sizes="(max-width: 1024px) 50vw, 30vw"
                    className="object-contain transition-transform duration-500 group-hover:scale-105"
                    priority={i < 2}
                    loading={i < 2 ? 'eager' : 'lazy'}
                  />
                  {img.title && (
                    <span className="absolute bottom-2 left-2 rounded-sm bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                      {img.title}
                    </span>
                  )}
                </div>
              );

              return img.link_url ? (
                <Link key={img.id} href={img.link_url} className="block">
                  {cell}
                </Link>
              ) : (
                <div key={img.id}>{cell}</div>
              );
            })}
      </div>

      {/* Right: Weekly Deals rail */}
      <div className="lg:col-span-2">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
              <Tag className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <span className="truncate">Weekly Deals</span>
            </h2>
            {endsAt && <DealsCountdown target={endsAt} />}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href="/store/flash-sale"
              className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              See All
            </Link>
            <div className="hidden flex-col gap-0.5 sm:flex">
              <button
                type="button"
                onClick={() => scrollRail(-1)}
                aria-label="Previous deals"
                className="rounded-sm border border-gray-200 p-1 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollRail(1)}
                aria-label="Next deals"
                className="rounded-sm border border-gray-200 p-1 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {deals.length === 0 ? (
          <div className="rounded-sm border border-dashed border-gray-300 bg-white py-10 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            No deals running this week
          </div>
        ) : (
          <div
            ref={railRef}
            className="scrollbar-thin grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto pr-1"
          >
            {deals.map((d, i) => (
              <ProductVariationCards
                key={`${d.product.id}-${i}`}
                product={d.product}
                variant="compact"
                showWishlist={false}
                staggerIndex={i}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
