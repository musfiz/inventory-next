'use client';

import { Loader2, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ReportEmptyState from './ReportEmptyState';

interface ReportLayoutProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  summaryCards?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyMessage?: string;
  hasData?: boolean;
  printRef?: React.RefObject<HTMLDivElement | null>;
  printId?: string;
}

export default function ReportLayout({
  title,
  description,
  icon: Icon,
  actions,
  filters,
  summaryCards,
  children,
  loading = false,
  error = null,
  isEmpty = false,
  emptyIcon,
  emptyTitle,
  emptyMessage,
  hasData = false,
  printRef,
  printId,
}: ReportLayoutProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
              <Icon size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="no-print">{actions}</div>}
      </div>

      {/* Filters */}
      {filters && <div className="no-print">{filters}</div>}

      {/* Content */}
      <div ref={printRef} id={printId}>
        {/* Summary cards */}
        {summaryCards && hasData && <div>{summaryCards}</div>}

        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 flex items-start gap-2">
            <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-red-700 dark:text-red-300">Error</div>
              <div className="text-xs text-red-600 dark:text-red-400">{error}</div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && !error && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 text-indigo-500 animate-spin" />
            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading report...</div>
          </div>
        )}

        {/* Report content */}
        {!loading && !error && hasData && children}

        {/* Empty state */}
        {!loading && !error && !hasData && (
          <ReportEmptyState
            icon={emptyIcon}
            title={emptyTitle}
            message={emptyMessage}
          />
        )}
      </div>
    </div>
  );
}
