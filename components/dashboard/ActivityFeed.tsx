'use client';

import { Clock, Package, ShoppingCart, AlertTriangle, FileText, RefreshCw } from 'lucide-react';
import type { ActivityItem } from '@/services/dashboardService';

interface ActivityFeedProps {
  items: ActivityItem[];
  loading?: boolean;
}

const ACTION_ICONS: Record<string, typeof Package> = {
  created: Package,
  completed: ShoppingCart,
  updated: RefreshCw,
  flagged: AlertTriangle,
  default: FileText,
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getActionIcon(action: string) {
  const key = Object.keys(ACTION_ICONS).find(k => action.toLowerCase().includes(k));
  return key ? ACTION_ICONS[key] : ACTION_ICONS.default;
}

export default function ActivityFeed({ items, loading = false }: ActivityFeedProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h3>
      </div>
      <div className="px-5 pb-4 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-2.5 w-1/3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-6 text-center">
            <Clock className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-xs text-gray-500 dark:text-gray-400">No recent activity</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700" />
            <div className="space-y-0">
              {items.map((item, idx) => {
                const Icon = getActionIcon(item.action);
                return (
                  <div key={idx} className="flex gap-3 relative pb-4 last:pb-0">
                    <div className="relative z-10">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
                        <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-xs text-gray-900 dark:text-gray-100 leading-snug">
                        <span className="font-medium">{item.user_name}</span>{' '}
                        {item.action}{' '}
                        <span className="font-medium">{item.subject_type}</span>
                        {item.reference && <span className="text-gray-500"> #{item.reference}</span>}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
