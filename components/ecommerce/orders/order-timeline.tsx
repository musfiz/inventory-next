'use client';

import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import type { OrderTimeline as OrderTimelineType } from '@/types/ecommerce';

interface OrderTimelineProps {
  entries: OrderTimelineType[];
  loading?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  placed: 'border-blue-500',
  confirmed: 'border-indigo-500',
  packed: 'border-purple-500',
  shipped: 'border-yellow-500',
  delivered: 'border-green-500',
  cancelled: 'border-red-500',
  returned: 'border-orange-500',
};

const BG_COLORS: Record<string, string> = {
  placed: 'bg-blue-500',
  confirmed: 'bg-indigo-500',
  packed: 'bg-purple-500',
  shipped: 'bg-yellow-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  returned: 'bg-orange-500',
};

export default function OrderTimeline({ entries, loading }: OrderTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-3 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-2.5 w-16 bg-gray-100 dark:bg-gray-700/50 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="text-center py-6 text-gray-400 dark:text-gray-500">
        <p className="text-xs">No timeline data available</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {entries.map((entry, idx) => {
        const isLast = idx === entries.length - 1;
        const color = BG_COLORS[entry.status] || 'bg-gray-400';

        return (
          <div key={entry.status + idx} className="flex gap-3 pb-3 relative">
            {/* Connector line */}
            {!isLast && (
              <div className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${entry.is_completed ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}

            {/* Icon */}
            <div className="flex-shrink-0 relative z-10">
              {entry.is_current ? (
                <div className="relative">
                  <div className={`w-6 h-6 rounded-full ${color} flex items-center justify-center`}>
                    <Loader2 className="w-3 h-3 text-white animate-spin" />
                  </div>
                  <span className="absolute inset-0 rounded-full animate-ping bg-current opacity-20" />
                </div>
              ) : entry.is_completed ? (
                <div className={`w-6 h-6 rounded-full ${color} flex items-center justify-center`}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
              ) : entry.status === 'cancelled' || entry.status === 'returned' ? (
                <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 flex items-center justify-center">
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  <Circle className="w-3 h-3 text-gray-400" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${entry.is_current ? 'text-indigo-600 dark:text-indigo-400' : entry.is_completed ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
                  {entry.label}
                </span>
                {entry.timestamp && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0">
                    {formatRelativeTime(entry.timestamp)}
                  </span>
                )}
              </div>
              {entry.note && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 italic">{entry.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  try {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}
