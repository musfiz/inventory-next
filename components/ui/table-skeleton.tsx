import * as React from 'react';

export interface TableSkeletonProps {
  /** Number of skeleton rows to render. Defaults to 10. */
  rows?: number;
  /** Column widths (e.g. '20%') used for header and body cells. */
  columnWidths?: string[];
  /** Render the page header area (title + action button placeholders). */
  showHeader?: boolean;
  /** Accessible label announced to assistive technology. */
  label?: string;
  className?: string;
}

/**
 * Content-shaped skeleton that mirrors the admin `DataTable` layout:
 * an optional toolbar (search + refresh), a header row, and pulsing rows.
 * Used by route-level `loading.tsx` files for predictable table pages.
 */
export default function TableSkeleton({
  rows = 10,
  columnWidths = [],
  showHeader = false,
  label = 'Loading',
  className = '',
}: TableSkeletonProps) {
  const columns = Math.max(columnWidths.length, 1);

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={`space-y-2 ${className}`}
    >
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="h-7 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-28 animate-pulse rounded-sm bg-gray-200 dark:bg-gray-800" />
            <div className="h-8 w-32 animate-pulse rounded-sm bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      )}

      {/* Toolbar: search + refresh */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <div className="h-7 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="h-7 w-7 animate-pulse rounded border bg-gray-200 dark:bg-gray-800" />
      </div>

      <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-gray-900/50">
        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900/50">
              <tr>
                {Array.from({ length: columns }).map((_, i) => (
                  <th
                    key={i}
                    style={columnWidths[i] ? { width: columnWidths[i] } : undefined}
                    className="px-3 py-2 text-left"
                  >
                    <div className="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
              {Array.from({ length: rows }).map((_, r) => (
                <tr key={r} className="dark:hover:bg-gray-700/50">
                  {Array.from({ length: columns }).map((_, c) => (
                    <td
                      key={c}
                      style={columnWidths[c] ? { width: columnWidths[c] } : undefined}
                      className="px-3 py-2 whitespace-nowrap"
                    >
                      <div className="h-3.5 w-full max-w-[160px] animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
