'use client';

import Image from 'next/image';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, TrendingUp, History, Tag, Layers, Loader2 } from 'lucide-react';
import { POPULAR_SEARCHES } from '@/lib/storefront/mock-data';
import { formatMoney } from '@/lib/utils/format';
import type { SearchSuggestions } from '@/services/storefrontService';
import { useStorefrontTrending } from '@/hooks/use-storefront-trending';
import { useSearchSuggestions } from '@/hooks/use-storefront-data';

const RECENT_SEARCHES_KEY = 'sf_recent_searches';
const EMPTY_SUGGESTIONS: SearchSuggestions = { products: [], categories: [], brands: [] };

type FlatItem =
  | { type: 'product'; href: string; label: string; item: SearchSuggestions['products'][number] }
  | { type: 'category'; href: string; label: string; item: SearchSuggestions['categories'][number] }
  | { type: 'brand'; href: string; label: string; item: SearchSuggestions['brands'][number] };

/** Wraps the substring of `text` matching `query` in a highlighted <mark>. */
function HighlightedText({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-300">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export const SearchBar = ({ onClose }: { onClose?: () => void }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { terms: trendingTerms, ready: trendingReady } = useStorefrontTrending();
  const trending = trendingReady && trendingTerms.length > 0 ? trendingTerms : POPULAR_SEARCHES;

  // Debounce the typed term, then let SWR own the request (cached per term).
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);
  const { suggestions: fetched, loading } = useSearchSuggestions(debounced, true);
  const suggestions = fetched ?? EMPTY_SUGGESTIONS;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {
      // localStorage unavailable — ignore, recent searches just won't persist
    }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  const flatItems = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = [];
    for (const p of suggestions.products) {
      items.push({ type: 'product', href: `/store/products/${p.slug}`, label: p.name, item: p });
    }
    for (const c of suggestions.categories) {
      items.push({ type: 'category', href: `/store/category/${c.slug}`, label: c.name, item: c });
    }
    for (const b of suggestions.brands) {
      items.push({ type: 'brand', href: `/store/brand/${b.slug}`, label: b.name, item: b });
    }
    return items;
  }, [suggestions]);

  const saveRecent = (term: string) => {
    setRecentSearches(prev => {
      const next = [term, ...prev.filter(s => s !== term)].slice(0, 6);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {
        // ignore persistence errors
      }
      return next;
    });
  };

  const submit = (term: string) => {
    if (!term.trim()) return;
    saveRecent(term.trim());
    setOpen(false);
    setQuery('');
    router.push(`/store/search?q=${encodeURIComponent(term)}`);
    onClose?.();
  };

  const goTo = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
    onClose?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || flatItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i <= 0 ? flatItems.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      goTo(flatItems[activeIndex].href);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const hasResults = flatItems.length > 0;

  return (
    <div ref={ref} className="relative w-full max-w-4xl">
      <form onSubmit={e => { e.preventDefault(); submit(query); }}>
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-4 h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search products, brands, categories..."
            className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 py-3 pl-11 pr-24 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-950"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-16 rounded-lg p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1.5 rounded-lg bg-linear-to-r from-brand-600 to-purple-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition-all hover:shadow-xl hover:shadow-brand-600/30"
          >
            Search
          </button>
        </div>
      </form>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[480px] overflow-auto rounded-lg border border-gray-100 bg-white shadow-2xl shadow-black/5 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950 sf-fade-in">
          {!query.trim() ? (
            <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
              {recentSearches.length > 0 && (
                <div>
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                    <History className="h-3.5 w-3.5" />
                    Recent
                  </p>
                  <ul className="space-y-0.5">
                    {recentSearches.map(s => (
                      <li key={s}>
                        <button
                          onClick={() => submit(s)}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 transition-all hover:bg-brand-50 hover:text-brand-700 dark:text-gray-300 dark:hover:bg-brand-950/30"
                        >
                          <Search className="h-3.5 w-3.5 text-gray-400" />
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Trending
                </p>
                <div className="flex flex-wrap gap-2">
                  {trending.map(p => (
                    <button
                      key={p}
                      onClick={() => submit(p)}
                      className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : loading && !hasResults ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-14 w-14 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-gray-800" />
                    <div className="h-2.5 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : hasResults ? (
            <div>
              {loading && (
                <div className="flex items-center gap-1.5 px-4 pt-3 text-xs text-gray-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> Updating…
                </div>
              )}
              {suggestions.products.length > 0 && (
                <div className="border-b border-gray-100 dark:border-gray-800">
                  <p className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wider text-gray-400">Products</p>
                  <ul>
                    {suggestions.products.map(p => {
                      const idx = flatItems.findIndex(f => f.type === 'product' && f.item.id === p.id);
                      return (
                        <li key={p.id}>
                          <button
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={() => goTo(`/store/products/${p.slug}`)}
                            className={`flex w-full items-center gap-4 px-4 py-3 text-left transition-all ${activeIndex === idx ? 'bg-linear-to-r from-brand-50 to-transparent dark:from-brand-950/20' : ''}`}
                          >
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm dark:bg-gray-800">
                              {p.image ? (
                                <Image src={p.image} alt={p.name} fill sizes="56px" className="object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <span className="text-lg font-bold text-gray-300 dark:text-gray-600">{p.name[0]}</span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                                <HighlightedText text={p.name} query={query} />
                              </p>
                              {p.category && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">{p.category.name}</p>
                              )}
                            </div>
                            {p.price !== null && (
                              <p className="text-sm font-bold text-brand-600">{formatMoney(p.price)}</p>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {suggestions.categories.length > 0 && (
                <div className="border-b border-gray-100 dark:border-gray-800">
                  <p className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wider text-gray-400">Categories</p>
                  <ul>
                    {suggestions.categories.map(c => {
                      const idx = flatItems.findIndex(f => f.type === 'category' && f.item.id === c.id);
                      return (
                        <li key={c.id}>
                          <button
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={() => goTo(`/store/category/${c.slug}`)}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all ${activeIndex === idx ? 'bg-linear-to-r from-brand-50 to-transparent dark:from-brand-950/20' : ''}`}
                          >
                            <Layers className="h-4 w-4 shrink-0 text-gray-400" />
                            <span className="truncate text-sm text-gray-700 dark:text-gray-300">
                              <HighlightedText text={c.name} query={query} />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {suggestions.brands.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wider text-gray-400">Brands</p>
                  <ul>
                    {suggestions.brands.map(b => {
                      const idx = flatItems.findIndex(f => f.type === 'brand' && f.item.id === b.id);
                      return (
                        <li key={b.id}>
                          <button
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={() => goTo(`/store/brand/${b.slug}`)}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all ${activeIndex === idx ? 'bg-linear-to-r from-brand-50 to-transparent dark:from-brand-950/20' : ''}`}
                          >
                            <Tag className="h-4 w-4 shrink-0 text-gray-400" />
                            <span className="truncate text-sm text-gray-700 dark:text-gray-300">
                              <HighlightedText text={b.name} query={query} />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <button
                onClick={() => submit(query)}
                className="flex w-full items-center justify-center gap-1.5 border-t border-gray-100 px-4 py-3 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50 dark:border-gray-800 dark:hover:bg-brand-950/20"
              >
                View all results for &ldquo;{query}&rdquo;
              </button>
            </div>
          ) : (
            <p className="p-6 text-center text-sm text-gray-500">No products found for &ldquo;{query}&rdquo;</p>
          )}
        </div>
      )}
    </div>
  );
};

