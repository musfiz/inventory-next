'use client';

import type { LucideIcon } from 'lucide-react';

interface ReportEmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  message?: string;
}

export default function ReportEmptyState({
  icon: Icon,
  title = 'No report generated',
  message = 'Select filters and click Generate Report to view data.',
}: ReportEmptyStateProps) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center">
      {Icon ? (
        <Icon className="mx-auto h-10 w-10 text-gray-400" />
      ) : (
        <div className="mx-auto h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <span className="text-gray-400 text-xl">i</span>
        </div>
      )}
      <div className="mt-3 text-sm font-medium text-gray-900 dark:text-white">{title}</div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}
