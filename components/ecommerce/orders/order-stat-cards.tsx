'use client';

import { ClipboardList, Timer, Truck, CheckCircle2, AlertCircle, IndianRupee, TrendingUp } from 'lucide-react';
import type { OrderKPIs } from '@/types/ecommerce';

interface OrderStatCardsProps {
  kpis: OrderKPIs | null;
  loading?: boolean;
  error?: boolean;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  loading?: boolean;
}

function StatCard({ icon, label, value, subValue, color, loading }: StatCardProps) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400',
  };

  return (
    <div className={`rounded-md border p-3 ${colorMap[color] || colorMap.indigo} ${loading ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</span>
        <span className="opacity-70">{icon}</span>
      </div>
      {loading ? (
        <div className="space-y-1.5">
          <div className="h-6 w-24 bg-current/10 rounded" />
          <div className="h-3 w-16 bg-current/10 rounded" />
        </div>
      ) : (
        <>
          <div className="text-xl font-bold">{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</div>
          {subValue && <div className="text-xs mt-0.5 opacity-75">{subValue}</div>}
        </>
      )}
    </div>
  );
}

export default function OrderStatCards({ kpis, loading, error }: OrderStatCardsProps) {
  if (error) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-3">
            <div className="text-xs text-red-500">—</div>
            <div className="text-xl font-bold text-red-400">—</div>
          </div>
        ))}
      </div>
    );
  }

  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<ClipboardList className="w-4 h-4" />} label="Loading" value="" color="indigo" loading />
        <StatCard icon={<Timer className="w-4 h-4" />} label="Loading" value="" color="amber" loading />
        <StatCard icon={<Truck className="w-4 h-4" />} label="Loading" value="" color="blue" loading />
        <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Loading" value="" color="green" loading />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        icon={<ClipboardList className="w-4 h-4" />}
        label="Total Orders"
        value={kpis.total_orders}
        subValue={`Revenue: ৳${kpis.total_revenue.toLocaleString('en-IN')}`}
        color="indigo"
      />
      <StatCard
        icon={<Timer className="w-4 h-4" />}
        label="Pending / Processing"
        value={kpis.pending_orders + kpis.processing_orders}
        subValue={`${kpis.pending_orders} placed · ${kpis.processing_orders} processing`}
        color="amber"
      />
      <StatCard
        icon={<Truck className="w-4 h-4" />}
        label="Shipped Today"
        value={kpis.shipped_today}
        subValue={`Avg order: ৳${kpis.average_order_value.toLocaleString('en-IN')}`}
        color="blue"
      />
      <StatCard
        icon={<CheckCircle2 className="w-4 h-4" />}
        label="Delivered Today"
        value={kpis.delivered_today}
        subValue={`Revenue today: ৳${kpis.revenue_today.toLocaleString('en-IN')}`}
        color="green"
      />
    </div>
  );
}

// ── Mobile-friendly small stat row (used inside detail panel / status page) ──

export function OrderMiniStats({ kpis }: { kpis: OrderKPIs | null }) {
  if (!kpis) return null;
  const stats = [
    { label: 'Total', value: kpis.total_orders, icon: <ClipboardList className="w-3 h-3" />, color: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Revenue', value: `৳${kpis.total_revenue.toLocaleString('en-IN')}`, icon: <IndianRupee className="w-3 h-3" />, color: 'text-green-600 dark:text-green-400' },
    { label: 'Avg', value: `৳${kpis.average_order_value.toLocaleString('en-IN')}`, icon: <TrendingUp className="w-3 h-3" />, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Pending', value: kpis.pending_orders, icon: <AlertCircle className="w-3 h-3" />, color: 'text-amber-600 dark:text-amber-400' },
  ];

  return (
    <div className="flex gap-4 flex-wrap text-xs">
      {stats.map(s => (
        <span key={s.label} className={`flex items-center gap-1 ${s.color}`}>
          {s.icon} {s.label}: <strong>{typeof s.value === 'number' ? s.value.toLocaleString('en-IN') : s.value}</strong>
        </span>
      ))}
    </div>
  );
}
