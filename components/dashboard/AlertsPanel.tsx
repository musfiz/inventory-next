'use client';

import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import type { Alert } from '@/services/dashboardService';

interface AlertsPanelProps {
  alerts: Alert[];
  loading?: boolean;
  onDismiss?: (id: number) => void;
}

const PRIORITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/30',
    dot: 'bg-red-500',
    label: 'Critical',
  },
  high: {
    icon: AlertCircle,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    dot: 'bg-orange-500',
    label: 'High',
  },
  medium: {
    icon: AlertTriangle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-900/30',
    dot: 'bg-yellow-500',
    label: 'Medium',
  },
  low: {
    icon: Info,
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-800',
    dot: 'bg-gray-400',
    label: 'Low',
  },
};

export default function AlertsPanel({ alerts, loading = false, onDismiss }: AlertsPanelProps) {
  const sorted = [...alerts].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.priority] ?? 99) - (order[b.priority] ?? 99);
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Priority Alerts</h3>
        </div>
        {!loading && alerts.length > 0 && (
          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            {alerts.length}
          </span>
        )}
      </div>
      <div className="px-5 pb-4 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-6 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">All clear — no alerts</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {sorted.map(alert => {
              const config = PRIORITY_CONFIG[alert.priority] || PRIORITY_CONFIG.low;
              const Icon = config.icon;
              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-2.5 rounded-lg ${config.bg} relative group`}
                >
                  <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${config.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${config.color} shrink-0`} />
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{alert.title}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">{alert.message}</p>
                  </div>
                  {onDismiss && (
                    <button
                      onClick={() => onDismiss(alert.id)}
                      className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity"
                    >
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
