'use client';

import Image from 'next/image';
import Link from 'next/link';
import WeeklyDealsCarousel from './WeeklyDealsCarousel';
import { useHeroGridImages, useWeeklyDeals } from '@/hooks/use-storefront-data';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import type { StorefrontHeroGridImage } from '@/types/storefront';

/** Prefix relative backend URLs (e.g. /storage/...) with the API origin. */
const resolveImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return url;
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
};

/** Cell ratio used only when an image has no recorded dimensions. */
const FALLBACK_CELL_RATIO = '16 / 9';

/**
 * The API sends `aspect_ratio` as a number (width / height). CSS needs a
 * `<ratio>` string, so serialise it explicitly — passing the raw number
 * through React's style object is unreliable and breaks cell sizing.
 */
const ratioStyle = (ratio: number | null | undefined): { aspectRatio: string } => ({
  aspectRatio: ratio && ratio > 0 ? `${ratio} / 1` : FALLBACK_CELL_RATIO,
});

/** Loading placeholder matching the grid + rail silhouette. The rail card
    stretches to the grid row height with a flex-1 slide block, so the
    skeleton holds the same footprint as the loaded widget. */
export function HeroGridDealsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
      <div className="grid grid-cols-2 gap-2 lg:col-span-5">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            style={{ aspectRatio: FALLBACK_CELL_RATIO }}
            className="sf-shimmer rounded-sm"
          />
        ))}
      </div>
      <div className="lg:col-span-2 lg:h-full lg:min-h-0">
        <div className="flex h-full flex-col space-y-3 rounded-sm border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-2">
            <div className="sf-shimmer h-5 w-32 rounded-sm" />
            <div className="flex gap-1.5">
              <div className="sf-shimmer h-6 w-6 rounded-sm" />
              <div className="sf-shimmer h-6 w-6 rounded-sm" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="sf-shimmer h-10 rounded-sm" />
            ))}
          </div>
          <div className="sf-shimmer min-h-40 w-full flex-1 rounded-sm" />
          <div className="flex justify-center gap-1.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="sf-shimmer h-1.5 w-1.5 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Homepage hero widget: a 2x2 promo image grid beside a Weekly Deals rail.
 *
 * Deals come from the admin-managed weekly deals (Ecommerce → Homepage →
 * Weekly Deals) and the backend only returns those whose active window
 * contains now. When no deal is live the grid renders full width on its own.
 */
export default function HeroGridWithWeeklyDeals() {
  const { homepageHeroWidget } = useStorefrontStatus();
  const enabled = homepageHeroWidget === 'hero_grid_deals';

  const { images, loading: gridLoading } = useHeroGridImages(enabled);
  const { deals, loading: dealsLoading } = useWeeklyDeals(enabled);

  // The first live deal drives the rail.
  const deal = deals[0] ?? null;
  const hasDeals = !!deal && deal.items.length > 0;
  const hasImages = images.length > 0;

  if (gridLoading || dealsLoading) return <HeroGridDealsSkeleton />;

  // Nothing configured — let the caller fall back rather than render empties.
  if (!hasImages && !hasDeals) return null;

  return (
    <div className={`grid grid-cols-1 gap-4 ${hasDeals && hasImages ? 'lg:grid-cols-7' : ''}`}>
      {/* Left: 2x2 promo image grid — each cell is sized by its own intrinsic
          ratio (captured at upload) with object-contain, so the full artwork
          is always visible and never cropped. No h-full/items-stretch: forcing
          the height would override the ratio and stretch the row. */}
      {hasImages && (
        <div className={`grid grid-cols-2 gap-2 ${hasDeals ? 'lg:col-span-5' : ''}`}>
          {images.map((img: StorefrontHeroGridImage, i) => {
            const cell = (
              <div
                style={ratioStyle(img.aspect_ratio)}
                className="group relative w-full overflow-hidden rounded-sm bg-gray-100 dark:bg-gray-800"
              >
                <Image
                  src={resolveImageUrl(img.image_url)}
                  alt={img.alt_text || img.title || 'Promotion'}
                  fill
                  sizes="(max-width: 1024px) 50vw, 60vw"
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
              <Link key={img.id} href={img.link_url} className="block min-w-0">
                {cell}
              </Link>
            ) : (
              <div key={img.id} className="min-w-0">
                {cell}
              </div>
            );
          })}
        </div>
      )}

      {/* Right: Weekly Deals rail — stretched to the grid row height; the
          slide image flexes to fill, so both widgets end up the same height. */}
      {hasDeals && (
        <div className={hasImages ? 'min-h-0 lg:col-span-2 lg:h-full' : ''}>
          <WeeklyDealsCarousel deal={deal} />
        </div>
      )}
    </div>
  );
}
