'use client';

import Link from 'next/link';
import {
  Package,
  Heart,
  MapPin,
  ShoppingBag,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { SAMPLE_ORDERS, formatMoney, formatMoneyDecimal } from '@/lib/storefront/mock-data';
import Rating from '@/components/storefront/Rating';

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  placed: { color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock, label: 'Placed' },
  confirmed: { color: 'text-cyan-700', bg: 'bg-cyan-100', icon: CheckCircle2, label: 'Confirmed' },
  packed: { color: 'text-amber-700', bg: 'bg-amber-100', icon: Package, label: 'Packed' },
  shipped: { color: 'text-purple-700', bg: 'bg-purple-100', icon: Truck, label: 'Shipped' },
  delivered: { color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2, label: 'Delivered' },
  cancelled: { color: 'text-red-700', bg: 'bg-red-100', icon: XCircle, label: 'Cancelled' },
  returned: { color: 'text-gray-700', bg: 'bg-gray-100', icon: Package, label: 'Returned' },
};

export default function AccountDashboardPage() {
  const user = useCustomerAuthStore(s => s.user);
  const wishlist = useWishlistStore(s => s.items.length);
  const addresses = 0; // TODO: wire up address API endpoint

  const orders = SAMPLE_ORDERS;
  const totalSpent = orders.reduce((s, o) => s + o.total, 0);
  const inFlight = orders.filter(o => !['delivered', 'cancelled', 'returned'].includes(o.status)).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-brand-50 to-purple-50 p-6 dark:border-gray-800 dark:from-brand-950/30 dark:to-purple-950/30">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
          Hi, {user?.name.split(' ')[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Welcome back! Here&apos;s a quick overview of your account.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total orders', value: orders.length, icon: Package, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'In transit', value: inFlight, icon: Truck, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Wishlist', value: wishlist, icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Addresses', value: addresses, icon: MapPin, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${s.bg} ${s.color}`}>
              <s.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Recent Orders</h2>
          <Link
            href="/store/account/orders"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No orders yet</p>
        ) : (
          <ul className="space-y-3">
            {orders.slice(0, 3).map(o => {
              const StatusIcon = STATUS_CONFIG[o.status].icon;
              return (
                <li
                  key={o.id}
                  className="flex flex-col gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:hover:bg-gray-900/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                      <ShoppingBag className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">
                        {o.orderNumber}
                      </p>
                      <p className="text-xs text-gray-500">
                        {o.items.length} items · {new Date(o.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_CONFIG[o.status].bg} ${STATUS_CONFIG[o.status].color}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {STATUS_CONFIG[o.status].label}
                    </span>
                    <p className="text-sm font-bold">{formatMoney(o.total)}</p>
                    <Link
                      href={`/account/orders/${o.uuid}`}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:border-gray-700"
                    >
                      Details
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-black text-gray-900 dark:text-white">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: '/products', label: 'Shop now', icon: ShoppingBag },
            { href: '/account/wishlist', label: 'View wishlist', icon: Heart },
            { href: '/account/addresses', label: 'Manage addresses', icon: MapPin },
            { href: '/account/settings', label: 'Account settings', icon: Package },
          ].map(a => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-800 dark:hover:border-brand-700 dark:hover:bg-brand-950/20"
            >
              <a.icon className="h-5 w-5 text-brand-600" />
              <span className="text-sm font-semibold">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
