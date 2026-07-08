'use client';

import type { LucideIcon } from 'lucide-react';

export interface SummaryCard {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'amber' | 'gray';
}

const COLOR_MAP: Record<string, { text: string; bg: string; border: string }> = {
  blue: {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  green: {
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
  },
  red: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
  },
  orange: {
    text: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
  },
  purple: {
    text: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
  },
  amber: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
  },
  gray: {
    text: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-800/40',
    border: 'border-gray-200 dark:border-gray-700',
  },
};

interface ReportSummaryCardsProps {
  cards: SummaryCard[];
  columns?: number;
}

export default function ReportSummaryCards({ cards, columns }: ReportSummaryCardsProps) {
  if (!cards || cards.length === 0) return null;

  const gridCols = columns
    ? `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns}`
    : cards.length <= 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className={`grid ${gridCols} gap-4`}>
      {cards.map((card, i) => {
        const colors = COLOR_MAP[card.color ?? 'gray'] ?? COLOR_MAP.gray;
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}
          >
            {Icon && (
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={colors.text} />
                <span className={`text-xs font-medium ${colors.text}`}>{card.label}</span>
              </div>
            )}
            {!Icon && (
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                {card.label}
              </div>
            )}
            <div className={`text-xl font-bold font-mono ${colors.text}`}>
              {card.value}
            </div>
            {card.subValue && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{card.subValue}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
