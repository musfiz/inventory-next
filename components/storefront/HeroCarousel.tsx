'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ArrowRight, Search, Sparkles } from 'lucide-react';
import type { StorefrontHeroSlider } from '@/services/storefrontService';

const resolveImageUrl = (url: string) => {
  if (/^https?:\/\//i.test(url)) return url;
  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return url;
  return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
};

export function HeroCarouselSkeleton() {
  return (
    <div className="h-[420px] overflow-hidden rounded-2xl sm:h-[480px] lg:h-[520px]">
      <div className="sf-shimmer h-full w-full" />
    </div>
  );
}

export default function HeroCarousel({ slides }: { slides: StorefrontHeroSlider[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (paused || slides.length === 0) return;
    const t = setInterval(() => setIndex(i => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/store/search?q=${encodeURIComponent(query.trim())}`);
  };

  const goTo = (i: number) => setIndex(i);
  const prev = () => setIndex(i => (i - 1 + slides.length) % slides.length);
  const next = () => setIndex(i => (i + 1) % slides.length);

  if (slides.length === 0) return null;

  return (
    <div
      className="group relative h-[420px] overflow-hidden rounded-2xl sm:h-[480px] lg:h-[520px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((b, i) => (
        <div
          key={b.id}
          className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${
            i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <Image
            src={resolveImageUrl(b.image_url)}
            alt={b.alt_text || b.title || 'Hero slide'}
            fill
            sizes="(max-width: 1024px) 100vw, 75vw"
            className="object-cover"
            priority={i === 0}
            loading={i === 0 ? 'eager' : 'lazy'}
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 to-gray-800/60" aria-hidden />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-12">
              <div className="max-w-xl text-white sf-fade-in">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Featured
                </span>

                {b.title && (
                  <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                    {b.title}
                  </h1>
                )}

                {b.subtitle && (
                  <p className="mt-3 text-lg font-semibold text-white/95 sm:text-xl">
                    {b.subtitle}
                  </p>
                )}

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

                {b.cta_text && b.cta_link && (
                  <Link
                    href={b.cta_link}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/25"
                  >
                    {b.cta_text}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={prev}
        className="absolute left-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:scale-110 sm:flex"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:scale-110 sm:flex"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all ${
              i === index ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
