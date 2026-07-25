'use client';

import { Eye, Clock } from 'lucide-react';
import type { EcommerceOrder } from '@/types/ecommerce';

interface OrderCardProps {
  order: EcommerceOrder;
  onClick: (order: EcommerceOrder) => void;
  compact?: boolean;
}

const STATUS_BORDER: Record<string, string> = {
  placed: 'border-l-blue-400',
  confirmed: 'border-l-indigo-400',
  packed: 'border-l-purple-400',
  shipped: 'border-l-yellow-400',
  delivered: 'border-l-green-400',
  cancelled: 'border-l-red-400',
  returned: 'border-l-orange-400',
};

const STATUS_BG: Record<string, string> = {
  placed: 'bg-blue-50 dark:bg-blue-900/10',
  confirmed: 'bg-indigo-50 dark:bg-indigo-900/10',
  packed: 'bg-purple-50 dark:bg-purple-900/10',
  shipped: 'bg-yellow-50 dark:bg-yellow-900/10',
  delivered: 'bg-green-50 dark:bg-green-900/10',
  cancelled: 'bg-red-50 dark:bg-red-900/10',
  returned: 'bg-orange-50 dark:bg-orange-900/10',
};

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  } catch {
    return '';
  }
}

export default function OrderCard({ order, onClick, compact }: OrderCardProps) {
  const statusKey = order.status || 'placed';
  const borderColor = STATUS_BORDER[statusKey] || 'border-l-gray-400';
  const bgColor = STATUS_BG[statusKey] || '';

  return (
    <div
      className={`border border-gray-200 dark:border-gray-700 border-l-2 ${borderColor} ${bgColor}
        rounded-sm cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600
        transition-shadow duration-150 ${compact ? 'p-1.5' : 'p-2.5'}`}
      onClick={() => onClick(order)}
    >
      {/* Order number + action */}
      <div className="flex items-center justify-between mb-1">
        <span className={`font-mono font-semibold text-indigo-600 dark:text-indigo-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {order.order_number}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onClick(order); }}
          className="p-0.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded cursor-pointer"
          title="View details"
        >
          <Eye className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
        </button>
      </div>

      {/* Customer */}
      <p className={`text-gray-900 dark:text-gray-100 truncate ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {order.customer_name}
      </p>

      {/* Total + items */}
      <div className="flex items-center justify-between mt-1">
        <span className={`font-semibold text-gray-800 dark:text-gray-200 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          ৳{order.total.toLocaleString('en-IN')}
        </span>
        <span className={`text-gray-400 dark:text-gray-500 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
          {order.items_count} item{order.items_count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Time */}
      <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400 dark:text-gray-500">
        <Clock className="w-2.5 h-2.5" />
        {timeAgo(order.created_at)}
      </div>
    </div>
  );
}
