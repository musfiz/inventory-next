'use client';

import { Search, RotateCcw, Loader2 } from 'lucide-react';

interface ReportFiltersProps {
  onApply: () => void;
  onReset?: () => void;
  loading?: boolean;
  applyLabel?: string;
  resetLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export default function ReportFilters({
  onApply,
  onReset,
  loading = false,
  applyLabel = 'Generate Report',
  resetLabel = 'Reset',
  children,
  className = '',
}: ReportFiltersProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}
    >
      <div className="flex flex-wrap gap-3 items-end">
        {children}
        <button
          onClick={onApply}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm disabled:opacity-60 transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {loading ? 'Loading\u2026' : applyLabel}
        </button>
        {onReset && (
          <button
            onClick={onReset}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-60 transition-colors"
          >
            <RotateCcw size={14} />
            {resetLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Filter Field Wrappers ───────────────────────────────────────────────────

export function FilterField({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

export const filterInputClass =
  'w-full px-2.5 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400';

export const filterSelectClass = filterInputClass + ' cursor-pointer';
