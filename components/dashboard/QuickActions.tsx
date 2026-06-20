'use client';

import { ShoppingCart, Truck, FileText, Package, AlertTriangle, BarChart3 } from 'lucide-react';
import Link from 'next/link';

interface QuickAction {
  label: string;
  href: string;
  icon: typeof ShoppingCart;
  color: string;
  bgColor: string;
}

const ACTIONS: QuickAction[] = [
  { label: 'New POS Sale', href: '/pos', icon: ShoppingCart, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/30' },
  { label: 'New Purchase Order', href: '/purchase-orders/create', icon: Truck, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/30' },
  { label: 'New Sales Order', href: '/sales-orders/create', icon: FileText, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-900/30' },
  { label: 'Adjust Stock', href: '/stock/adjust', icon: Package, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/30' },
  { label: 'View Low Stock', href: '/stock?filter=low', icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/30' },
  { label: "Today's Report", href: '/reports/daily', icon: BarChart3, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/30' },
];

export default function QuickActions() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {ACTIONS.map(action => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
          >
            <div className={`p-2 rounded-lg ${action.bgColor} group-hover:scale-110 transition-transform`}>
              <action.icon className={`w-4 h-4 ${action.color}`} />
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center leading-tight">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
