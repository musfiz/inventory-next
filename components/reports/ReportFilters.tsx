'use client';

import { Search, RotateCcw, Loader2 } from 'lucide-react';

interface ReportFiltersProps {
  onApply: () => void;
  onReset?: () => void;
  loading?: boolean;
  applyLabel?: string;
  resetLabel?: string;
  /**
   * Where the Generate / Reset buttons sit.
   * - `inline` (default): appended to the filter flow, as before.
   * - `below`: on their own row under a divider, so wide filter rows aren't
   *   squeezed by the button widths.
   */
  actionsPlacement?: 'inline' | 'below';
  children: React.ReactNode;
  className?: string;
}

export default function ReportFilters({
  onApply,
  onReset,
  loading = false,
  applyLabel = 'Generate Report',
  resetLabel = 'Reset',
  actionsPlacement = 'inline',
  children,
  className = '',
}: ReportFiltersProps) {
  const stacked = actionsPlacement === 'below';

  const actions = (
    <>
      <button
        onClick={onApply}
        disabled={loading}
        className="inline-flex items-center gap-1.5 h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-60 transition-colors"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        {loading ? 'Loading\u2026' : applyLabel}
      </button>
      {onReset && (
        <button
          onClick={onReset}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-7 px-3 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-60 transition-colors"
        >
          <RotateCcw size={14} />
          {resetLabel}
        </button>
      )}
    </>
  );

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 ${className}`}>
      <div className={stacked ? 'space-y-3' : 'flex flex-wrap gap-3 items-end'}>
        {children}
        {!stacked && actions}
      </div>
      {stacked && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

// ── Filter Field Wrappers ───────────────────────────────────────────────────

/**
 * Tailwind needs the full class names present in source to emit them, so the
 * responsive column count is mapped to literals instead of interpolated.
 */
const GRID_COLS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

/**
 * One row of filter fields. Drop several `FilterRow`s inside `ReportFilters` to
 * split a long filter list into multiple rows instead of one long auto-flowing
 * line. Stacks to 1 column on mobile, 2 on `sm`, then `columns` equal columns
 * from `lg` up.
 */
export function FilterRow({
  columns = 4,
  className = '',
  children,
}: {
  columns?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 ${GRID_COLS[columns] ?? GRID_COLS[4]} gap-x-3 gap-y-2.5 items-end ${className}`}
    >
      {children}
    </div>
  );
}

export function FilterField({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="flex items-baseline gap-1 text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
        <span className="truncate">{label}</span>
        {hint && <span className="truncate text-[10px] font-normal text-gray-400 dark:text-gray-500">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

/**
 * Boolean filter rendered as the rounded "pill" checkbox used by the Options
 * row on the Add Stocks page, so report filters read the same as form inputs.
 * Sized to `h-7` to line up with the text inputs / selects in the same row.
 */
export function FilterCheckbox({
  label,
  activeHint,
  checked,
  onChange,
  disabled = false,
  className = '',
}: {
  /** Text shown inside the pill, next to the checkbox. */
  label: string;
  /** Helper text rendered beside the pill while the box is ticked. */
  activeHint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="flex items-center gap-2 h-7 flex-nowrap min-w-0">
        <span className="inline-flex items-center gap-1.5 h-7 px-2.5 shrink-0 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="h-3.5 w-3.5 accent-indigo-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span
            className={`text-xs whitespace-nowrap ${
              disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {label}
          </span>
        </span>
        {checked && activeHint && (
          <span className="truncate text-[11px] text-indigo-600 dark:text-indigo-400">{activeHint}</span>
        )}
      </label>
    </div>
  );
}

/**
 * Shared box for every filter control. Height (`h-7` = 28px) matches the
 * compact react-select control, so text inputs, native selects and the pill
 * checkbox all line up inside a filter row.
 */
const filterControlBase =
  'w-full h-7 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

export const filterInputClass = `${filterControlBase} px-2.5`;

export const filterSelectClass = `${filterInputClass} cursor-pointer`;

/** Same box as the other filter inputs, with room for a leading search icon. */
export const filterSearchInputClass = `${filterControlBase} pl-8 pr-2.5`;
