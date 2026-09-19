import ProductCardSkeleton from '@/components/storefront/ProductCardSkeleton';

export default function ProductsLoading() {
  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-screen-2xl px-4 py-6">
        {/* Breadcrumb skeleton */}
        <div className="mb-4 h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Gallery skeleton */}
          <div>
            <div className="relative aspect-square animate-pulse overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* Product info skeleton */}
          <div className="space-y-5">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-8 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-10 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="flex gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 w-20 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
              ))}
            </div>
            <div className="h-12 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
