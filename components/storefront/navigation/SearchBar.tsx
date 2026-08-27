'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, TrendingUp, History } from 'lucide-react';
import { POPULAR_SEARCHES, PRODUCTS } from '@/lib/storefront/mock-data';
import { formatMoney } from '@/lib/utils/format';

export const SearchBar = ({ onClose }: { onClose?: () => void }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'iphone 15',
    'wireless earbuds',
  ]);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const suggestions = query.trim()
    ? PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5)
    : [];

  const submit = (term: string) => {
    if (!term.trim()) return;
    if (!recentSearches.includes(term)) {
      setRecentSearches([term, ...recentSearches].slice(0, 6));
    }
    setOpen(false);
    setQuery('');
    router.push(`/store/search?q=${encodeURIComponent(term)}`);
    onClose?.();
  };

  return (
    <div ref={ref} className="relative w-full max-w-2xl">
      <form onSubmit={e => { e.preventDefault(); submit(query); }}>
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-4 h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search products, brands, categories..."
            className="w-full rounded-full border-2 border-gray-100 bg-gray-50 py-3 pl-11 pr-24 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-950"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-16 rounded-full p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1.5 rounded-full bg-linear-to-r from-brand-600 to-purple-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition-all hover:shadow-xl hover:shadow-brand-600/30"
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
                  {POPULAR_SEARCHES.map(p => (
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
          ) : suggestions.length > 0 ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {suggestions.map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => { setOpen(false); router.push(`/store/products/${p.slug}`); onClose?.(); }}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left transition-all hover:bg-linear-to-r hover:from-brand-50 hover:to-transparent dark:hover:from-brand-950/20"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm dark:bg-gray-800">
                      {p.images[0] ? (
                        <Image src={p.images[0]} alt={p.name} fill sizes="56px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="text-lg font-bold text-gray-300 dark:text-gray-600">{p.name[0]}</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{p.brand?.name} · {p.category.name}</p>
                    </div>
                    <p className="text-sm font-bold text-brand-600">{formatMoney(p.variations[0].sellingPrice)}</p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-sm text-gray-500">No products found for &ldquo;{query}&rdquo;</p>
          )}
        </div>
      )}
    </div>
  );
};
