import Spinner from './spinner';

export interface PageLoaderProps {
  /** Accessible label / visible loading text. */
  label?: string;
  /** Spinner size. */
  size?: 'sm' | 'md' | 'lg';
  /** Extra classes for the wrapper (e.g. height overrides). */
  className?: string;
}

/**
 * Full-page or available-space loader built on `Spinner`.
 * Reused by `app/loading.tsx`, auth guards, redirects, and simple Suspense fallbacks.
 */
export default function PageLoader({
  label = 'Loading',
  size = 'lg',
  className = '',
}: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={`flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-950 ${className}`}
    >
      <Spinner size={size} decorative />
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}…</p>
    </div>
  );
}
