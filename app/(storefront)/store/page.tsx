'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
  Zap,
  Sparkles,
  Flame,
  TrendingUp,
  Tag,
  ArrowRight,
  Search,
  History,
} from 'lucide-react';
import ProductCard from '@/components/storefront/ProductCard';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import {
  HERO_BANNERS,
  PROMO_BANNERS,
  CATEGORIES,
  PRODUCTS,
  formatMoney,
  STORE_INFO,
} from '@/lib/storefront/mock-data';

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
};

const HeroCarousel = () => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (paused) return;
    const t = setInterval(
      () => setIndex(i => (i + 1) % HERO_BANNERS.length),
      5000
    );
    return () => clearInterval(t);
  }, [paused]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/store/search?q=${encodeURIComponent(query.trim())}`);
  };

  const banner = HERO_BANNERS[index];

  return (
    <div
      className="group relative h-[420px] overflow-hidden rounded-2xl sm:h-[480px] lg:h-[520px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {HERO_BANNERS.map((b, i) => (
        <div
          key={b.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={b.image}
            alt={b.title}
            fill
            sizes="(max-width: 1024px) 100vw, 75vw"
            className="object-cover"
            priority={i === 0}
          />
          <div
            className={`absolute inset-0 bg-gradient-to-r ${b.accent}`}
            aria-hidden
          />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-12">
              <div className="max-w-xl text-white sf-fade-in">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Featured
                </span>
                <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                  {b.title}
                </h1>
                <p className="mt-3 text-lg font-semibold text-white/95 sm:text-xl">
                  {b.subtitle}
                </p>
                <p className="mt-2 max-w-md text-sm text-white/80 sm:text-base">
                  {b.description}
                </p>

                {/* Embedded search bar (Pickbazar-style) */}
                <form
                  onSubmit={submitSearch}
                  className="mt-6 flex w-full max-w-md items-center overflow-hidden rounded-full bg-white shadow-2xl"
                >
                  <Search className="ml-4 h-5 w-5 shrink-0 text-gray-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search for products, brands and more..."
                    className="flex-1 bg-transparent px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="m-1 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
                  >
                    Search
                  </button>
                </form>

                <Link
                  href={b.link}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/25"
                >
                  {b.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={() =>
          setIndex(i => (i - 1 + HERO_BANNERS.length) % HERO_BANNERS.length)
        }
        className="absolute left-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:scale-110 sm:flex"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => setIndex(i => (i + 1) % HERO_BANNERS.length)}
        className="absolute right-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:scale-110 sm:flex"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {HERO_BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${
              i === index
                ? 'w-8 bg-white'
                : 'w-2 bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

const CategoryStrip = () => {
  const visible = CATEGORIES.filter(c => !c.parentId).slice(0, 10);
  return (
    <section className="py-10 sm:py-12">
      <div className="mb-6 flex items-end justify-between">
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

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10">
        {visible.map(cat => (
          <Link
            key={cat.id}
            href={`/category/${cat.slug}`}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white p-3 text-center transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br from-brand-50 to-purple-50 dark:from-brand-950/30 dark:to-purple-950/30">
              {cat.image ? (
                <Image
                  src={cat.image}
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
        ))}
      </div>
    </section>
  );
};

const FlashSale = () => {
  const saleProducts = PRODUCTS.filter(p => p.isOnSale).slice(0, 6);
  const [time, setTime] = useState({ h: 5, m: 42, s: 18 });

  useEffect(() => {
    const t = setInterval(() => {
      setTime(prev => {
        let { h, m, s } = prev;
        if (s > 0) s--;
        else if (m > 0) {
          m--;
          s = 59;
        } else if (h > 0) {
          h--;
          m = 59;
          s = 59;
        }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  if (saleProducts.length === 0) return null;

  return (
    <section className="my-10 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 via-pink-600 to-purple-700 p-6 sm:p-8 text-white sm:my-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6" />
            <h2 className="text-2xl font-black sm:text-3xl">Flash Sale</h2>
          </div>
          <p className="mt-1 text-sm text-white/85">
            Limited time offers — don&apos;t miss out!
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white/85">Ends in</span>
          <div className="flex items-center gap-1 font-mono text-lg font-black">
            <span className="rounded-lg bg-white/15 px-2.5 py-1 backdrop-blur-sm">
              {String(time.h).padStart(2, '0')}
            </span>
            <span>:</span>
            <span className="rounded-lg bg-white/15 px-2.5 py-1 backdrop-blur-sm">
              {String(time.m).padStart(2, '0')}
            </span>
            <span>:</span>
            <span className="rounded-lg bg-white/15 px-2.5 py-1 backdrop-blur-sm">
              {String(time.s).padStart(2, '0')}
            </span>
          </div>
          <Link
            href="/store/products?filter=sale"
            className="ml-2 inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-bold text-rose-600 transition-transform hover:scale-105"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {saleProducts.map(p => (
          <ProductCard key={p.id} product={p} showWishlist={false} />
        ))}
      </div>
    </section>
  );
};

const ProductSection = ({
  title,
  subtitle,
  icon: Icon,
  filter,
  viewAllLink,
  bgClass = '',
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  filter: (p: typeof PRODUCTS[0]) => boolean;
  viewAllLink: string;
  bgClass?: string;
}) => {
  const products = PRODUCTS.filter(filter).slice(0, 8);

  if (products.length === 0) return null;

  return (
    <section className={`py-8 sm:py-10 ${bgClass}`}>
      <div className="mb-6 flex items-end justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
              {title}
            </h2>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>
        <Link
          href={viewAllLink}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700 transition-all hover:bg-brand-100 hover:text-brand-800 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-400"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
        {products.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
};

const PromoBanners = () => (
  <section className="my-10 grid gap-4 sm:my-12 md:grid-cols-2">
    {PROMO_BANNERS.map(b => (
      <Link
        key={b.id}
        href={b.link}
        className="group relative h-44 overflow-hidden rounded-2xl sm:h-56"
      >
        <Image
          src={b.image}
          alt={b.title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
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
    ))}
  </section>
);

// Pickbazar-style horizontal offers carousel
const OFFER_SLIDES = [
  {
    id: 'of-1',
    title: 'Mega Electronics Sale',
    subtitle: 'Up to 40% off latest gadgets',
    image:
      'https://images.unsplash.com/photo-1593344484962-796055d4a3a4?w=800&h=400&fit=crop',
    link: '/category/electronics',
    accent: 'from-indigo-600/85 to-blue-700/85',
  },
  {
    id: 'of-2',
    title: 'Fresh Fashion Picks',
    subtitle: 'New season styles starting ৳450',
    image:
      'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=400&fit=crop',
    link: '/category/fashion',
    accent: 'from-rose-600/85 to-pink-700/85',
  },
  {
    id: 'of-3',
    title: 'Home Makeover Deals',
    subtitle: 'Furniture & living — up to 30% off',
    image:
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=400&fit=crop',
    link: '/category/home',
    accent: 'from-emerald-600/85 to-teal-700/85',
  },
  {
    id: 'of-4',
    title: 'Beauty Essentials',
    subtitle: 'Top brands at member prices',
    image:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=400&fit=crop',
    link: '/category/beauty',
    accent: 'from-fuchsia-600/85 to-purple-700/85',
  },
  {
    id: 'of-5',
    title: 'Sports & Active',
    subtitle: 'Gear up for less',
    image:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop',
    link: '/category/sports',
    accent: 'from-amber-600/85 to-orange-700/85',
  },
];

const OffersCarousel = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollByCard = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' });
  };
  return (
    <section className="py-6 sm:py-8">
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
        {OFFER_SLIDES.map(o => (
          <Link
            key={o.id}
            href={o.link}
            className="group relative h-44 w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]"
          >
            <Image
              src={o.image}
              alt={o.title}
              fill
              sizes="(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div
              className={`absolute inset-0 bg-gradient-to-r ${o.accent}`}
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
    </section>
  );
};

const TrustStrip = () => (
  <section className="my-10 grid grid-cols-2 gap-4 sm:my-12 md:grid-cols-4">
    {[
      { icon: Truck, title: 'Free Shipping', desc: `On orders over ${formatMoney(STORE_INFO.freeShippingThreshold)}` },
      { icon: RotateCcw, title: '7-Day Returns', desc: 'Hassle-free returns' },
      { icon: ShieldCheck, title: 'Secure Payment', desc: '100% protected' },
      { icon: Headphones, title: '24/7 Support', desc: 'Dedicated help' },
    ].map(({ icon: Icon, title, desc }) => (
      <div
        key={title}
        className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-bold text-gray-900 dark:text-gray-100">{title}</p>
          <p className="text-xs text-gray-500">{desc}</p>
        </div>
      </div>
    ))}
  </section>
);

const RecentlyViewed = () => {
  const { products } = useRecentlyViewed();
  if (products.length === 0) return null;

  return (
    <section className="py-8 sm:py-10">
      <div className="mb-6 flex items-end justify-between">
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {products.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
};

export default function HomePage() {
  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <HeroCarousel />

        <TrustStrip />

        <RecentlyViewed />

        <OffersCarousel />

        <CategoryStrip />

        <FlashSale />

        <ProductSection
          title="Featured Products"
          subtitle="Hand-picked by our team"
          icon={Sparkles}
          filter={p => !!p.isFeatured}
          viewAllLink="/store/products"
        />

        <PromoBanners />

        <ProductSection
          title="Best Sellers"
          subtitle="What everyone's buying right now"
          icon={TrendingUp}
          filter={p => !!p.isBestseller}
          viewAllLink="/store/products"
        />

        <ProductSection
          title="New Arrivals"
          subtitle="Fresh styles just landed"
          icon={Tag}
          filter={p => !!p.isNew}
          viewAllLink="/store/products"
        />
      </div>
    </div>
  );
}
