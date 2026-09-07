'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Flame, ArrowRight, AlertCircle, Clock, Zap } from 'lucide-react';
import { formatMoney } from '@/lib/utils/format';
import ProductCard from '@/components/storefront/ProductCard';
import ProductCardSkeleton from '@/components/storefront/ProductCardSkeleton';
import ScrollReveal from '@/components/storefront/ScrollReveal';
import storefrontService, { StorefrontFlashSaleCampaign, StorefrontFlashSaleProduct } from '@/services/storefrontService';

interface FlashSaleProductForCard {
  id: string;
  name: string;
  slug: string;
  images: string[];
  variations: Array<{
    id: string;
    sellingPrice: number;
    mrp?: number;
    stock: number;
    isDefault?: boolean;
    attributes: Record<string, string>;
    name: string;
    sku: string;
    image?: string;
  }>;
  brand?: { name: string };
  rating: number;
  reviewCount: number;
  isNew?: boolean;
  isBestseller?: boolean;
  isOnSale?: boolean;
}

interface CountdownParts {
  d: number;
  h: number;
  m: number;
  s: number;
}

function computeRemaining(target: string, now: number): CountdownParts {
  const diff = Math.max(0, new Date(target).getTime() - now);
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 3600000) % 60000 / 1000),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Prefix relative backend URLs (e.g. /storage/...) with the API origin */
const resolveImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:'))
    return url;
  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return url;
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
};

/** Per-campaign countdown display */
const CampaignCountdown = ({ target }: { target: string }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const t = computeRemaining(target, now);

  return (
    <div className="flex items-center gap-1.5 font-mono text-lg sm:text-xl font-black">
      {t.d > 0 && (
        <>
          <span className="rounded-lg bg-white/15 px-3 py-1.5 backdrop-blur-sm">
            {pad(t.d)}
          </span>
          <span className="text-white/70">d</span>
          <span className="hidden sm:inline text-white/50 animate-pulse">:</span>
        </>
      )}
      <span className="rounded-lg bg-white/15 px-3 py-1.5 backdrop-blur-sm">{pad(t.h)}</span>
      <span className="text-white/50 animate-pulse">:</span>
      <span className="rounded-lg bg-white/15 px-3 py-1.5 backdrop-blur-sm">{pad(t.m)}</span>
      <span className="text-white/50 animate-pulse">:</span>
      <span className="rounded-lg bg-white/15 px-3 py-1.5 backdrop-blur-sm">{pad(t.s)}</span>
    </div>
  );
};

export default function FlashSalePage() {
  const [campaigns, setCampaigns] = useState<StorefrontFlashSaleCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all live flash sale campaigns
  useEffect(() => {
    const fetchFlashSales = async () => {
      try {
        setLoading(true);
        const data = await storefrontService.getFlashSale();
        if (data.length > 0) {
          setCampaigns(data);
        } else {
          setError('No active flash sale campaign at the moment');
        }
      } catch (err) {
        console.error('Failed to fetch flash sale:', err);
        setError('Failed to load flash sale. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchFlashSales();
  }, []);

  // Transform API products to ProductCard-compatible format (per campaign)
  const productsByCampaign = useMemo((): Record<string, FlashSaleProductForCard[]> => {
    const map: Record<string, FlashSaleProductForCard[]> = {};
    for (const c of campaigns) {
      map[c.id] = c.products.map((p: StorefrontFlashSaleProduct) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        images: p.images.length > 0 ? p.images : [p.image_url || ''].filter(Boolean),
        brand: undefined,
        rating: 4.5,
        reviewCount: 0,
        isOnSale: true,
        variations: [
          {
            id: p.id,
            sellingPrice: p.sale_price,
            mrp: p.original_price,
            stock: 999,
            isDefault: true,
            attributes: {},
            name: p.name,
            sku: p.sku,
            image: p.image_url || p.images[0] || '',
          },
        ],
      }));
    }
    return map;
  }, [campaigns]);

  // Render loading skeleton
  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 min-h-screen">
        <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:py-12">
          {/* Hero skeleton */}
          <div className="mb-8 rounded-2xl bg-gradient-to-br from-rose-600 via-pink-600 to-purple-700 p-6 sm:p-8 animate-pulse">
            <div className="h-8 w-1/3 bg-white/20 rounded" />
            <div className="mt-4 h-4 w-1/4 bg-white/20 rounded" />
          </div>

          {/* Product grid skeleton */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[...Array(12)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render error/empty state
  if (error || campaigns.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 min-h-screen">
        <div className="mx-auto max-w-screen-2xl px-4 py-16 sm:py-24 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/30">
            {error?.includes('Failed') ? (
              <AlertCircle className="h-10 w-10 text-rose-600 dark:text-rose-400" />
            ) : (
              <Flame className="h-10 w-10 text-rose-600 dark:text-rose-400" />
            )}
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
            {error?.includes('Failed') ? 'Unable to Load Flash Sale' : 'No Active Flash Sale'}
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {error || 'There are no active flash sale campaigns at the moment. Check back soon for amazing deals!'}
          </p>
          <Link
            href="/store/products"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
          >
            Browse All Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const totalProducts = campaigns.reduce((sum, c) => sum + c.products.length, 0);

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:py-12">
        {/* Page Header */}
        <section className="relative mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 via-pink-600 to-purple-700 p-6 sm:p-8 text-white">
          <ScrollReveal animation="fade-up" as="div" className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/15 backdrop-blur-sm">
                    <Flame className="h-8 w-8" />
                  </div>
                  <h1 className="text-3xl font-black sm:text-4xl">Flash Sales</h1>
                </div>
                <p className="mt-2 text-base text-white/90">
                  {campaigns.length} live campaign{campaigns.length !== 1 ? 's' : ''} &middot;{' '}
                  {totalProducts} product{totalProducts !== 1 ? 's' : ''} on sale
                </p>
              </div>
              <span className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full bg-white px-4 py-1.5 text-sm font-bold text-rose-600">
                <Zap className="h-4 w-4 animate-pulse" />
                LIVE NOW
              </span>
            </div>
          </ScrollReveal>
        </section>

        {/* One section per live campaign */}
        {campaigns.map((campaign, ci) => (
          <section key={campaign.id} className={ci > 0 ? 'mb-16' : 'mb-12'}>
            {/* Campaign header */}
            <div className="relative isolate mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 via-pink-600 to-purple-700 p-5 sm:p-6 text-white">
              {/* Uploaded campaign banner — shown in full color */}
              {campaign.banner_image_url && (
                <>
                  <div className="absolute inset-0 -z-10">
                    <Image
                      src={resolveImageUrl(campaign.banner_image_url)}
                      alt={campaign.name}
                      fill
                      priority={ci === 0}
                      className="object-cover"
                      sizes="100vw"
                    />
                  </div>
                  {/* Readability overlay */}
                  <div className="absolute inset-0 -z-10 bg-linear-to-r from-black/80 via-black/50 to-black/25" />
                </>
              )}

              <ScrollReveal animation="fade-up" as="div" className="relative z-10">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-0.5 text-xs font-bold text-white">
                        <Zap className="h-3 w-3 animate-pulse" />
                        CAMPAIGN {ci + 1}
                      </span>
                      <span className="text-sm font-semibold text-white/85">
                        {campaign.discount_type === 'percentage'
                          ? `Up to ${campaign.discount_value}% OFF`
                          : `${formatMoney(campaign.discount_value)} OFF`}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black sm:text-3xl">{campaign.name}</h2>
                    {campaign.description && (
                      <p className="mt-1.5 text-sm text-white/85">{campaign.description}</p>
                    )}
                    <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-white/80">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {new Date(campaign.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} -{' '}
                        {new Date(campaign.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Ends-in countdown for this campaign */}
                  <div className="flex flex-col gap-1 self-start lg:self-auto">
                    <span className="text-sm font-semibold text-white/85">Ends in</span>
                    <CampaignCountdown target={campaign.end_date} />
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Products of this campaign */}
            <div>
              <ScrollReveal animation="fade-up" as="div" className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {campaign.products.length} product{campaign.products.length !== 1 ? 's' : ''} in this campaign
                </p>
              </ScrollReveal>

              {(productsByCampaign[campaign.id] || []).length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No products tagged in this campaign.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {(productsByCampaign[campaign.id] || []).map((product, index) => (
                    <ScrollReveal key={`${campaign.id}-${product.id}`} animation="zoom-in" staggerIndex={index}>
                      <ProductCard product={product as any} variant="default" showWishlist={true} />
                    </ScrollReveal>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}

        {/* CTA Section */}
        <ScrollReveal animation="fade-up" as="section" className="mt-12 rounded-2xl bg-white dark:bg-gray-900 p-6 sm:p-8 text-center border border-gray-100 dark:border-gray-800">
          <div className="max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-4 py-1.5 text-sm font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 mb-4">
              <Flame className="h-4 w-4" />
              Don&apos;t miss out!
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Hurry, sales end soon!
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Limited quantities available. Prices go back up when the timers hit zero.
            </p>
            <Link
              href="/store/products"
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
            >
              View All Products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
