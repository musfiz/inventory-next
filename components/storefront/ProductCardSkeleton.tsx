export default function ProductCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className={`sf-shimmer ${compact ? 'aspect-[4/3]' : 'aspect-square'}`} />
      <div className="space-y-2 p-4">
        <div className="sf-shimmer h-3 w-1/3 rounded-sm" />
        <div className="sf-shimmer h-4 w-3/4 rounded-sm" />
        <div className="sf-shimmer h-3 w-1/2 rounded-sm" />
        <div className="sf-shimmer h-5 w-16 rounded-sm pt-2" />
        <div className="sf-shimmer h-7 w-full rounded-xs" />
      </div>
    </div>
  );
}
