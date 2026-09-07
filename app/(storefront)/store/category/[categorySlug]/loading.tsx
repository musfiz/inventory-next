import ProductCardSkeleton from '@/components/storefront/ProductCardSkeleton';

export default function CategoryLoading() {
  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      {/* Hero skeleton */}
      <div className="relative h-44 animate-pulse overflow-hidden bg-gray-200 sm:h-60 dark:bg-gray-800" />

      <div className="mx-auto max-w-screen-2xl px-4 py-6">
        {/* Subcategory chips skeleton */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-9 w-24 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>

        {/* Toolbar skeleton */}
        <div className="mb-5 h-14 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />

        {/* Product grid skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {[...Array(8)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
