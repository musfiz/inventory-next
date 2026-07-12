'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Package,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-react';
import { useState } from 'react';
import { SAMPLE_ORDERS, formatMoney } from '@/lib/storefront/mock-data';

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  placed: { color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300', icon: Clock, label: 'Placed' },
  confirmed: { color: 'text-cyan-700', bg: 'bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-300', icon: CheckCircle2, label: 'Confirmed' },
  packed: { color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300', icon: Package, label: 'Packed' },
  shipped: { color: 'text-purple-700', bg: 'bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300', icon: Truck, label: 'Shipped' },
  delivered: { color: 'text-emerald-700', bg: 'bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2, label: 'Delivered' },
  cancelled: { color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-900/30 dark:text-red-300', icon: XCircle, label: 'Cancelled' },
  returned: { color: 'text-gray-700', bg: 'bg-gray-100 dark:bg-gray-800 dark:text-gray-300', icon: Package, label: 'Returned' },
};

const FILTERS = ['All', 'In transit', 'Delivered', 'Cancelled'];

export default function OrdersPage() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = SAMPLE_ORDERS.filter(o => {
    if (filter === 'In transit')
      return !['delivered', 'cancelled', 'returned'].includes(o.status);
    if (filter === 'Delivered') return o.status === 'delivered';
    if (filter === 'Cancelled')
      return ['cancelled', 'returned'].includes(o.status);
    if (search) {
      return (
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.items.some(i => i.name.toLowerCase().includes(search.toLowerCase()))
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
            My Orders
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage all your orders in one place
          </p>
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === f
                ? 'bg-brand-600 text-white'
                : 'border border-gray-300 bg-white text-gray-700 hover:border-brand-400 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900">
          <Package className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
            No orders found
          </p>
          <Link
            href="/store/products"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(o => {
            const StatusIcon = STATUS_CONFIG[o.status].icon;
            return (
              <li
                key={o.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
              >
                <Link
                  href={`/account/orders/${o.uuid}`}
                  className="block"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-gray-900/50">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-500">
                          Order #
                        </p>
                        <p className="font-mono font-bold text-gray-900 dark:text-white">
                          {o.orderNumber}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-500">
                          Placed on
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {new Date(o.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-500">
                          Total
                        </p>
                        <p className="font-bold text-gray-900 dark:text-white">
                          {formatMoney(o.total)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${STATUS_CONFIG[o.status].bg}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {STATUS_CONFIG[o.status].label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-5">
                    <div className="flex -space-x-3">
                      {o.items.slice(0, 3).map((it, i) => (
                        <div
                          key={i}
                          className="relative h-14 w-14 overflow-hidden rounded-lg border-2 border-white bg-gray-100 dark:border-gray-900"
                        >
                          <Image
                            src={it.image}
                            alt={it.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                      ))}
                      {o.items.length > 3 && (
                        <div className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-white bg-gray-100 text-xs font-bold text-gray-700 dark:border-gray-900 dark:bg-gray-800 dark:text-gray-300">
                          +{o.items.length - 3}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 font-semibold text-gray-900 dark:text-gray-100">
                        {o.items[0].name}
                        {o.items.length > 1 && ` +${o.items.length - 1} more`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {o.items.reduce((s, i) => s + i.quantity, 0)} items ·{' '}
                        {o.paymentMethod.toUpperCase()}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
