'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Tag,
  ArrowRight,
  History,
} from 'lucide-react';
import ProductCard from '@/components/storefront/ProductCard';
import ProductCardSkeleton from '@/components/storefront/ProductCardSkeleton';
import ScrollReveal from '@/components/storefront/ScrollReveal';
import HeroCarousel, { HeroCarouselSkeleton } from '@/components/storefront/HeroCarousel';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import storefrontService from '@/services/storefrontService';
import type { StorefrontHeroSlider } from '@/services/storefrontService';
import type { StorefrontOfferSlide, Product } from '@/types/storefront';
import {
  accentDisplayClass,
  accentOverlayStyle,
} from '@/lib/utils/offer-accent';
import { useStorefrontCategories } from '@/hooks/use-storefront-categories';

const resolveImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return url;
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
};

const CATEGORY_ICONS: Record<string, string> = {
  electronics: '💻',
  mobile: '📱',
  smartphones: '📱',
  cases: '🛡️',
  laptop: '💻',
  audio: '🎧',
  wearable: '⌚',
  fashion: '👗',
  men: '👔',
  women: '👗',
  shoes: '👟',
  grocery: '🛒',
  home: '🏠',
  beauty: '💄',
  sports: '⚽',
  food: '🍔',
  beverage: '🥤',
  toy: '🧸',
  book: '📚',
  automotive: '🚗',
  pet: '🐾',
  health: '💊',
  jewelry: '💎',
  accessory: '👜',
  tool: '🔧',
  garden: '🌱',
  office: '📎',
  baby: '👶',
  music: '🎵',
  game: '🎮',
  camera: '📷',
  furniture: '🪑',
  lighting: '💡',
  bath: '🛁',
  kitchen: '🍳',
  mattress: '🛏️',
  outdoor: '🏕️',
  luggage: '🧳',
  watch: '⌚',
  perfume: '🧴',
  skincare: '🧖',
  supplement: '💊',
  organic: '🌿',
  frozen: '❄️',
  dairy: '🥛',
  meat: '🥩',
  seafood: '🦐',
};

/* ================================================================ */
/*  Section: Category Strip — "Shop by Category" icon grid           */
/* ================================================================ */
const CategoryStrip = () => {
  const { categories, loading } = useStorefrontCategories();
  const visible = categories.slice(0, 10);

  if (loading) {
    return (
      <section className="py-10 sm:py-12">
        <div className="mb-6">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <div className="aspect-square w-full animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
              <div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (visible.length === 0) return null;

  return (
    <section className="py-10 sm:py-12">
      <ScrollReveal animation="fade-up" as="div" className="mb-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
              Shop by Category
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Browse our most popular categories
            </p>
          </div>
          <Link
            href="/store/products"
            className="hidden text-sm font-semibold text-brand-600 hover:text-brand-700 sm:inline-flex sm:items-center sm:gap-1"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10">
        {visible.map((cat, i) => (
          <ScrollReveal key={cat.id} animation="zoom-in" staggerIndex={i}>
            <Link
              href={`/store/category/${cat.slug}`}
              className="group flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 text-center transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-md bg-linear-to-br from-brand-50 to-purple-50 dark:from-brand-950/30 dark:to-purple-950/30">
                {cat.image ? (
                  <Image
                    src={resolveImageUrl(cat.image)}
                    alt={cat.name}
                    fill
                    sizes="120px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl">
                    {CATEGORY_ICONS[cat.slug] ?? '🛍️'}
                  </div>
                )}
              </div>
              <p className="line-clamp-1 text-xs font-semibold text-gray-700 group-hover:text-brand-600 dark:text-gray-300">
                {cat.name}
              </p>
            </Link>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
};

/* ================================================================ */
/*  Section: Featured Products — dynamic from API (is_featured flag) */
/*  Only products where ecommerce_product_visibility.is_featured = 1 */
/*  (set via Admin > Ecommerce > Products > Flags page). Hidden     */
/*  entirely when no featured products exist.                        */
/* ================================================================ */
const FeaturedProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    storefrontService
      .getProducts({ is_featured: true, per_page: 8 })
      .then(res => {
        if (!cancelled) setProducts(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="py-8 sm:py-10">
        <div className="mb-6 flex items-end justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
            <div>
              <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              <div className="mt-2 h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
          {[...Array(8)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-8 sm:py-10">
      <ScrollReveal animation="fade-up" as="div" className="mb-6">
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
                Featured Products
              </h2>
              <p className="text-sm text-gray-500">Hand-picked by our team</p>
            </div>
          </div>
          <Link
            href="/store/products"
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700 transition-all hover:bg-brand-100 hover:text-brand-800 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-400"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((p, i) => (
          <ScrollReveal key={p.id} animation="zoom-in" staggerIndex={i}>
            <ProductCard product={p as any} />
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
};

/* ================================================================ */
/*  Section: Best Sellers — dynamic from API (is_bestseller flag)   */
/*  Only products where ecommerce_product_visibility.is_bestseller=1 */
/*  (set via Admin > Ecommerce > Products > Flags page). Hidden     */
/*  entirely when no best sellers exist.                             */
/* ================================================================ */
const BestSellers = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    storefrontService
      .getProducts({ is_bestseller: true, per_page: 8 })
      .then(res => {
        if (!cancelled) setProducts(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="py-8 sm:py-10">
        <div className="mb-6 flex items-end justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
            <div>
              <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              <div className="mt-2 h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
          {[...Array(8)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-8 sm:py-10">
      <ScrollReveal animation="fade-up" as="div" className="mb-6">
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
                Best Sellers
              </h2>
              <p className="text-sm text-gray-500">What everyone&apos;s buying right now</p>
            </div>
          </div>
          <Link
            href="/store/products"
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700 transition-all hover:bg-brand-100 hover:text-brand-800 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-400"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((p, i) => (
          <ScrollReveal key={p.id} animation="zoom-in" staggerIndex={i}>
            <ProductCard product={p as any} />
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
};

/* ================================================================ */
/*  Section: New Arrivals — dynamic from API (is_new flag)           */
/*  Only products where ecommerce_product_visibility.is_new = 1       */
/*  (set via Admin > Ecommerce > Products > Flags page). Hidden      */
/*  entirely when no new arrivals exist.                             */
/* ================================================================ */
const NewArrivals = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    storefrontService
      .getProducts({ is_new: true, per_page: 8 })
      .then(res => {
        if (!cancelled) setProducts(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="py-8 sm:py-10">
        <div className="mb-6 flex items-end justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
            <div>
              <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              <div className="mt-2 h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
          {[...Array(8)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-8 sm:py-10">
      <ScrollReveal animation="fade-up" as="div" className="mb-6">
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
                New Arrivals
              </h2>
              <p className="text-sm text-gray-500">Fresh styles just landed</p>
            </div>
          </div>
          <Link
            href="/store/products"
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700 transition-all hover:bg-brand-100 hover:text-brand-800 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-400"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((p, i) => (
          <ScrollReveal key={p.id} animation="zoom-in" staggerIndex={i}>
            <ProductCard product={p as any} />
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
};

/* ================================================================ */
/*  Section: Promo Banners — two-column image + CTA cards            */
/* ================================================================ */
const PromoBanners = ({ slides }: { slides: StorefrontOfferSlide[] }) => {
  const promos = slides.slice(0, 2);
  if (promos.length === 0) return null;

  return (
    <section className="my-10 grid gap-4 sm:my-12 md:grid-cols-2">
      {promos.map((b, i) => (
        <ScrollReveal key={b.id} animation="fade-up" staggerIndex={i} staggerGap={150}>
          <Link
            href={b.link}
            className="group relative block h-44 overflow-hidden rounded-2xl sm:h-56"
          >
            {b.image_url ? (
              <Image
                src={resolveOfferImageUrl(b.image_url)}
                alt={b.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : null}
            <div className="absolute inset-0 bg-linear-to-r from-black/60 to-transparent" />
            <div className="absolute inset-0 flex items-center p-6 sm:p-8">
              <div className="text-white">
                <h3 className="text-2xl font-black sm:text-3xl">{b.title}</h3>
                <p className="mt-1 text-sm text-white/90">{b.subtitle}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold underline-offset-4 group-hover:underline">
                  Shop now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </Link>
        </ScrollReveal>
      ))}
    </section>
  );
};

/* ================================================================ */
/*  Section: Top Offers Carousel — horizontal scrolling deal cards   */
/*  (fetched from API)                                                */
/* ================================================================ */
const resolveOfferImageUrl = (url: string) => {
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return url;
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
};

const OffersCarousel = ({ slides }: { slides: StorefrontOfferSlide[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollByCard = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' });
  };

  if (slides.length === 0) return null;

  return (
    <ScrollReveal animation="fade-up" as="section" className="py-6 sm:py-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
            Top Offers
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Hand-picked deals across categories
          </p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            onClick={() => scrollByCard(-1)}
            aria-label="Scroll offers left"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => scrollByCard(1)}
            aria-label="Scroll offers right"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2"
      >
        {slides.map(o => (
          <Link
            key={o.id}
            href={o.link}
            className="group relative h-44 w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]"
          >
            <div className="relative h-full w-full">
              {o.image_url ? (
                <Image
                  src={resolveOfferImageUrl(o.image_url)}
                  alt={o.title}
                  fill
                  sizes="(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              ) : null}
            </div>
            <div
              className={`absolute inset-0 bg-linear-to-r ${accentDisplayClass(o.accent)}`}
              style={accentOverlayStyle(o.accent)}
              aria-hidden
            />
            <div className="absolute inset-0 flex items-center p-6">
              <div className="text-white">
                <p className="text-xs font-bold uppercase tracking-wider text-white/85">
                  Limited time
                </p>
                <h3 className="mt-1 text-xl font-black sm:text-2xl">
                  {o.title}
                </h3>
                <p className="mt-1 text-sm text-white/90">{o.subtitle}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold underline-offset-4 group-hover:underline">
                  Shop now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </ScrollReveal>
  );
};

/* ================================================================ */
/*  Section: Recently Viewed — products the user browsed earlier     */
/* ================================================================ */
const RecentlyViewed = () => {
  const { products } = useRecentlyViewed();
  if (products.length === 0) return null;

  return (
    <section className="py-8 sm:py-10">
      <ScrollReveal animation="fade-up" as="div" className="mb-6">
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
                Recently Viewed
              </h2>
              <p className="text-sm text-gray-500">Pick up where you left off</p>
            </div>
          </div>
        </div>
      </ScrollReveal>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {products.map((p, i) => (
          <ScrollReveal key={p.id} animation="zoom-in" staggerIndex={i}>
            <ProductCard product={p} />
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
};

export default function HomePage() {
  const [heroSliders, setHeroSliders] = useState<StorefrontHeroSlider[]>([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [offerSlides, setOfferSlides] = useState<StorefrontOfferSlide[]>([]);

  useEffect(() => {
    storefrontService
      .getHeroSliders()
      .then(setHeroSliders)
      .catch(() => { })
      .finally(() => setHeroLoading(false));
    storefrontService
      .getOfferSlides()
      .then(setOfferSlides)
      .catch(() => { });
  }, []);

  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Section 1 — Hero Carousel (main banner slider) */}
        {heroLoading ? <HeroCarouselSkeleton /> : <HeroCarousel slides={heroSliders} />}

        {/* Section 2 — Shop by Category (replaces Trust Strip) */}
        <CategoryStrip />

        {/* Section 3 — Recently Viewed */}
        <RecentlyViewed />

        {/* Section 4 — Top Offers Carousel */}
        <OffersCarousel slides={offerSlides} />

        {/* Section 6 — Featured Products (dynamic: epv.is_featured, hidden if empty) */}
        <FeaturedProducts />

        {/* Section 8 — Promo Banners (real offer slide data) */}
        <PromoBanners slides={offerSlides} />

        {/* Section 9 — Best Sellers (dynamic: epv.is_bestseller, hidden if empty) */}
        <BestSellers />

        {/* Section 10 — New Arrivals (dynamic: epv.is_new, hidden if empty) */}
        <NewArrivals />
      </div>
    </div>
  );
}
