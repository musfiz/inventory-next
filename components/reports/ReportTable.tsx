'use client';

import { useState, useMemo, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
} from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent, formatDate } from '@/lib/utils/format';

// ── Types ───────────────────────────────────────────────────────────────────

export type ColumnFormat = 'currency' | 'number' | 'percent' | 'date' | 'datetime' | 'text' | 'qty';

export interface ReportColumn<T = Record<string, any>> {
  key: string;
  header: string;
  accessor?: (row: T) => any;
  cell?: (value: any, row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  width?: string;
  format?: ColumnFormat;
  currency?: string;
}

interface ReportTableProps<T = Record<string, any>> {
  columns: ReportColumn<T>[];
  data: T[];
  pageSize?: number;
  pageSizes?: number[];
  enableSearch?: boolean;
  searchPlaceholder?: string;
  searchKeys?: string[];
  enablePagination?: boolean;
  enableSorting?: boolean;
  totalsRow?: Record<string, ReactNode>;
  rowKey?: (row: T, index: number) => string;
  maxHeight?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCell(value: any, format?: ColumnFormat, currency?: string): string {
  if (value === null || value === undefined || value === '') return '-';
  switch (format) {
    case 'currency':
      return formatCurrency(value, currency ?? 'BDT');
    case 'number':
      return formatNumber(value);
    case 'percent':
      return formatPercent(value);
    case 'date':
      return formatDate(value, 'short');
    case 'datetime':
      return formatDate(value, 'datetime');
    case 'qty':
      return formatNumber(value, value % 1 === 0 ? 0 : 2);
    default:
      return String(value);
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ReportTable<T extends Record<string, any>>({
  columns,
  data,
  pageSize: initialPageSize = 25,
  pageSizes = [25, 50, 100],
  enableSearch = true,
  searchPlaceholder = 'Search\u2026',
  searchKeys,
  enablePagination = true,
  enableSorting = true,
  totalsRow,
  rowKey,
  maxHeight,
  emptyMessage = 'No data found for the selected filters.',
  onRowClick,
}: ReportTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // ── Search ──
  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    const keys = searchKeys ?? columns.map((c) => c.key);
    return data.filter((row) =>
      keys.some((k) => {
        const v = row[k];
        return v !== null && v !== undefined && String(v).toLowerCase().includes(q);
      }),
    );
  }, [data, search, columns, searchKeys]);

  // ── Sort ──
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    const accessor = col?.accessor ?? ((row: T) => row[sortKey]);
    const sortedData = [...filtered].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv));
    });
    return sortDir === 'asc' ? sortedData : sortedData.reverse();
  }, [filtered, sortKey, sortDir, columns]);

  // ── Paginate ──
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = enablePagination
    ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sorted;

  const toggleSort = (key: string) => {
    if (!enableSorting) return;
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const alignClass = (align?: 'left' | 'right' | 'center') => {
    switch (align) {
      case 'right':
        return 'text-right';
      case 'center':
        return 'text-center';
      default:
        return 'text-left';
    }
  };

  // ── Render ──
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Search bar */}
      {enableSearch && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div
        className="overflow-x-auto"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/40 sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 ${alignClass(col.align)} font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap ${col.sortable !== false && enableSorting ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700/40' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable !== false && enableSorting && toggleSort(col.key)}
                >
                  <span className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'flex-row-reverse' : ''}`}>
                    {col.header}
                    {col.sortable !== false && enableSorting && (
                      sortKey === col.key ? (
                        sortDir === 'asc' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />
                      ) : (
                        <ArrowUpDown size={12} className="text-gray-400" />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => {
                const key = rowKey ? rowKey(row, i) : `row-${i}`;
                return (
                  <tr
                    key={key}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => {
                      const accessor = col.accessor ?? ((r: T) => r[col.key]);
                      const value = accessor(row);
                      const formatted = col.cell
                        ? col.cell(value, row)
                        : formatCell(value, col.format, col.currency);
                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-2 ${alignClass(col.align)} ${
                            col.format === 'currency' || col.format === 'number' || col.format === 'percent' || col.format === 'qty'
                              ? 'font-mono text-xs'
                              : ''
                          } text-gray-700 dark:text-gray-300 whitespace-nowrap`}
                        >
                          {formatted}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
          {totalsRow && (
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-800/60 border-t-2 border-gray-300 dark:border-gray-600">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-2.5 ${alignClass(col.align)} font-bold text-gray-900 dark:text-white whitespace-nowrap ${
                      col.format === 'currency' || col.format === 'number' || col.format === 'percent' || col.format === 'qty'
                        ? 'font-mono text-xs'
                        : ''
                    }`}
                  >
                    {totalsRow[col.key] ?? ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {enablePagination && total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-gray-500 dark:text-gray-400">
              Showing {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, total)} of {total}
            </span>
            {pageSizes.length > 1 && (
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-0.5 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm text-gray-700 dark:text-gray-300 focus:outline-none"
              >
                {pageSizes.map((s) => (
                  <option key={s} value={s}>
                    {s} / page
                  </option>
                ))}
              </select>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={currentPage === 1}
                className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 text-xs text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
