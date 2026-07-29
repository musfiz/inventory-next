export default function OrdersLoading() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-14 w-14 animate-pulse rounded-lg border-2 border-white bg-gray-200 dark:border-gray-900 dark:bg-gray-800" />
              ))}
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
