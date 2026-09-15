'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Package,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Search,
  ShoppingBag,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useTrackableOrders } from '@/hooks/use-storefront-data';

const STATUS_BADGE: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  confirmed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  packed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  shipped: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  returned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

const STATUS_LABELS: Record<string, string> = {
  placed: 'Placed', confirmed: 'Confirmed', packed: 'Packed',
  shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned',
};

const STATUS_ICON: Record<string, any> = {
  placed: Clock, confirmed: CheckCircle2, packed: Package,
  shipped: Truck, delivered: CheckCircle2, cancelled: XCircle, returned: Package,
};

export default function TrackOrdersPage() {
  const [search, setSearch] = useState('');

  // Trackable orders — SWR (deduped, cached across the account section).
  const { orders, error: loadError, loading } = useTrackableOrders();
  const error = loadError ? 'Could not load your orders. Please try again.' : null;

  const filtered = search.trim()
    ? orders.filter(o =>
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.tracking_number?.toLowerCase().includes(search.toLowerCase())
    )
    : orders;

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
          <p className="mt-3 text-sm text-gray-500">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-3 text-sm text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm font-semibold text-brand-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
            Track Orders
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time tracking for all your shipped orders
          </p>
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order or tracking #..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-950">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
            <Truck className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No trackable orders</h3>
          <p className="mt-1 text-sm text-gray-500">
            {search ? 'No orders match your search.' : 'You don\'t have any shipped orders to track yet.'}
          </p>
          {!search && (
            <Link
              href="/store/products"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition-all hover:bg-brand-700 hover:shadow-xl"
            >
              <ShoppingBag className="h-4 w-4" />
              Start Shopping
            </Link>
          )}
        </div>
      )}

      {/* Order list */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(order => {
            const StatusIcon = STATUS_ICON[order.status] || Package;
            return (
              <Link
                key={order.id}
                href={`/store/account/track-orders/${order.id}`}
                className="group block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md hover:shadow-brand-100/50 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-brand-800 dark:hover:shadow-brand-950"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-brand-50 to-purple-50 text-brand-600 dark:from-brand-950/30 dark:to-purple-950/30 dark:text-brand-400">
                      <StatusIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {order.order_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                        {' · '}
                        {order.items_count} item{order.items_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {order.tracking_number && (
                      <div className="hidden text-right sm:block">
                        <p className="text-xs text-gray-500">Tracking</p>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {order.tracking_number}
                        </p>
                      </div>
                    )}
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                    <ChevronRight className="h-5 w-5 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-500" />
                  </div>
                </div>

                {/* Progress bar for in-transit orders */}
                {['shipped', 'packed', 'confirmed'].includes(order.status) && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-brand-500 to-brand-400"
                          style={{
                            width: order.status === 'confirmed' ? '25%'
                              : order.status === 'packed' ? '50%'
                                : order.status === 'shipped' ? '75%'
                                  : '0%',
                          }}
                        />
                      </div>
                      <Truck className="h-4 w-4 text-brand-600" />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {order.status === 'confirmed' && 'Order confirmed, packing in progress'}
                      {order.status === 'packed' && 'Packed and ready for pickup'}
                      {order.status === 'shipped' && `In transit${order.courier ? ` via ${order.courier}` : ''}`}
                    </p>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
