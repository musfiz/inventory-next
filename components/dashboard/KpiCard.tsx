'use client';

import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  subValueType?: 'positive' | 'negative' | 'neutral' | 'warning';
  icon: LucideIcon;
  iconColor?: string;
  bgColor?: string;
  loading?: boolean;
  onClick?: () => void;
  badge?: { text: string; color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' };
}

export default function KpiCard({
  title,
  value,
  subValue,
  subValueType = 'neutral',
  icon: Icon,
  iconColor = 'text-blue-600 dark:text-blue-400',
  bgColor = 'bg-blue-50 dark:bg-blue-900/30',
  loading = false,
  onClick,
  badge,
}: KpiCardProps) {
  const subValueColors = {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-500 dark:text-gray-400',
    warning: 'text-amber-600 dark:text-amber-400',
  };

  const badgeColors = {
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  };

  return (
    <div
      onClick={onClick}
      className={`relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-600' : ''
      }`}
    >
      {badge && (
        <span className={`absolute top-2 right-2 px-2 py-0.5 text-xs font-semibold rounded-full ${badgeColors[badge.color]}`}>
          {badge.text}
        </span>
      )}
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-lg ${bgColor}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{title}</p>
          {loading ? (
            <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
          )}
          {subValue && !loading && (
            <p className={`text-xs mt-0.5 ${subValueColors[subValueType]}`}>{subValue}</p>
          )}
        </div>
      </div>
    </div>
  );
}
