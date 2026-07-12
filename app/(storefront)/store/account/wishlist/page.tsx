'use client';

import Link from 'next/link';
import { Heart, ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';
import { useWishlistStore } from '@/stores/wishlist-store';
import { PRODUCTS, formatMoney } from '@/lib/storefront/mock-data';
import ProductCard from '@/components/storefront/ProductCard';
import { notify } from '@/lib/notifications';

export default function WishlistPage() {
  const items = useWishlistStore(s => s.items);
  const clear = useWishlistStore(s => s.clear);
  const products = PRODUCTS.filter(p => items.includes(p.id));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
            My Wishlist
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {products.length} {products.length === 1 ? 'item' : 'items'} saved
          </p>
        </div>
        {products.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('Remove all items from your wishlist?')) {
                clear();
                notify.success('Wishlist cleared');
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
          >
            <Trash2 className="h-4 w-4" />
            Clear all
          </button>
        )}
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900">
          <Heart className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
            Your wishlist is empty
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Save items you love for later
          </p>
          <Link
            href="/store/products"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
          >
            Discover products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {products.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
