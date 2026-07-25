'use client';

import { Timer, CalendarClock, CheckCheck, List } from 'lucide-react';
import type { FlashSaleCampaign } from '@/types/ecommerce';

interface CampaignStatCardsProps {
  campaigns: FlashSaleCampaign[];
  loading?: boolean;
}

interface StatCardConfig {
  label: string;
  key: 'active' | 'scheduled' | 'ended' | 'total';
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  bgColor: string;
  iconBg: string;
}

const cards: StatCardConfig[] = [
  {
    label: 'Active',
    key: 'active',
    icon: Timer,
    accentColor: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    iconBg: 'bg-green-100 dark:bg-green-900/40',
  },
  {
    label: 'Scheduled',
    key: 'scheduled',
    icon: CalendarClock,
    accentColor: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
  },
  {
    label: 'Ended',
    key: 'ended',
    icon: CheckCheck,
    accentColor: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    iconBg: 'bg-gray-100 dark:bg-gray-700',
  },
  {
    label: 'Total',
    key: 'total',
    icon: List,
    accentColor: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
  },
];

function getCount(campaigns: FlashSaleCampaign[], key: string): number {
  if (key === 'total') return campaigns.length;
  return campaigns.filter(c => c.computed_status === key).length;
}

export default function CampaignStatCards({ campaigns, loading }: CampaignStatCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(card => {
        const Icon = card.icon;
        const count = loading ? '—' : getCount(campaigns, card.key);

        return (
          <div
            key={card.key}
            className={`relative overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 p-3 transition-colors ${
              loading ? 'opacity-60' : ''
            } ${card.bgColor}`}
          >
            {/* Left accent bar */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${
                card.key === 'active'
                  ? 'bg-green-500'
                  : card.key === 'scheduled'
                    ? 'bg-blue-500'
                    : card.key === 'ended'
                      ? 'bg-gray-400 dark:bg-gray-500'
                      : 'bg-indigo-500'
              }`}
            />

            <div className="flex items-center justify-between ml-1">
              <div>
                <p className={`text-xs font-medium ${card.accentColor}`}>
                  {card.label}
                </p>
                <p className={`text-2xl font-bold mt-0.5 ${card.accentColor}`}>
                  {count}
                </p>
              </div>
              <div className={`p-2 rounded-full ${card.iconBg}`}>
                <Icon className={`w-5 h-5 ${card.accentColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
