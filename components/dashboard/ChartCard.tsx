'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  periodOptions?: { label: string; value: string }[];
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
  loading?: boolean;
  children: React.ReactNode;
  height?: string;
  onRefresh?: () => void;
  className?: string;
}

export default function ChartCard({
  title,
  subtitle,
  periodOptions,
  selectedPeriod,
  onPeriodChange,
  loading = false,
  children,
  height = 'h-72',
  onRefresh,
  className = '',
}: ChartCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {periodOptions && onPeriodChange && (
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              {periodOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onPeriodChange(opt.value)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    selectedPeriod === opt.value
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {onRefresh && (
            <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className={`px-5 pb-4 ${height}`}>
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
