import Link from 'next/link';
import { Home, Search, PackageX } from 'lucide-react';

export default function StorefrontNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
        <PackageX className="h-12 w-12" />
      </div>
      <p className="text-sm font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
        404
      </p>
      <h1 className="mt-2 text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 max-w-md text-sm text-gray-500 dark:text-gray-400">
        The product, category or link you followed may have been removed,
        renamed, or is temporarily unavailable.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
        >
          <Home className="h-4 w-4" />
          Back to home
        </Link>
        <Link
          href="/store/products"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          <Search className="h-4 w-4" />
          Browse products
        </Link>
      </div>
    </div>
  );
}