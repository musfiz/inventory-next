'use client';

import Link from 'next/link';
import { use } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  MapPin,
  Phone,
  CreditCard,
  ShoppingBag,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useTrackedOrder } from '@/hooks/use-storefront-data';

const STATUS_LABELS: Record<string, string> = {
  placed: 'Order Placed',
  confirmed: 'Order Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

const STATUS_BADGE: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  confirmed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  packed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  shipped: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  returned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

const STATUS_COLORS: Record<string, string> = {
  placed: 'bg-blue-500',
  confirmed: 'bg-indigo-500',
  packed: 'bg-purple-500',
  shipped: 'bg-amber-500',
  delivered: 'bg-emerald-500',
};

function TimelineStep({
  status, label, timestamp, isCompleted, isCurrent, isLast, isCancelled,
}: {
  status: string; label: string; timestamp: string | null;
  isCompleted: boolean; isCurrent: boolean; isLast: boolean; isCancelled: boolean;
}) {
  const circleColor = isCompleted
    ? STATUS_COLORS[status] || 'bg-gray-400'
    : isCurrent && !isCancelled
      ? 'bg-brand-500 ring-4 ring-brand-500/20'
      : 'bg-gray-300 dark:bg-gray-600';

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all ${isCompleted
          ? `${circleColor} text-white shadow-md`
          : isCurrent && !isCancelled
            ? `${circleColor} text-white animate-pulse`
            : `${circleColor}`
          }`}>
          {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : isCurrent && !isCancelled ? (
            <div className="h-2.5 w-2.5 rounded-full bg-white" />
          ) : (
            <div className="h-2.5 w-2.5 rounded-full bg-white/60" />
          )}
        </div>
        {!isLast && (
          <div className={`mt-1 w-0.5 flex-1 ${isCompleted ? 'bg-linear-to-b from-brand-500 to-brand-200 dark:to-brand-800' : 'bg-gray-200 dark:bg-gray-700'}`} style={{ minHeight: '2rem' }} />
        )}
      </div>
      <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
        <p className={`text-sm font-bold ${isCompleted || isCurrent ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
          {label}
          {isCurrent && !isCancelled && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              <Clock className="h-3 w-3" /> In Progress
            </span>
          )}
        </p>
        {timestamp && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {new Date(timestamp).toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        )}
        {isCurrent && isCancelled && (
          <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
            This order was cancelled
          </p>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  );
}

export default function TrackOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);

  // Tracked order detail — SWR; failures are terminal (no retry).
  const { order, error: loadError, loading } = useTrackedOrder(orderId);
  const error = loadError ? 'Something went wrong loading the order.' : null;

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
          <p className="mt-3 text-sm text-gray-500">Loading tracking details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-3 text-sm text-red-600">{error || 'Order not found'}</p>
          <Link href="/store/account/track-orders" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Track Orders
          </Link>
        </div>
      </div>
    );
  }

  const timelineStatuses =
    order.status === 'cancelled' || order.status === 'returned'
      ? [...(['placed', 'confirmed', 'packed', 'shipped'] as const), order.status]
      : (['placed', 'confirmed', 'packed', 'shipped', 'delivered'] as const);

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href="/store/account/track-orders"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition-colors hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Track Orders
      </Link>

      {/* Order Header Card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg shadow-gray-200/60 dark:border-gray-800 dark:bg-gray-950 dark:shadow-gray-950">
        <div className="bg-linear-to-r from-brand-600 to-purple-700 px-6 py-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/70">Order Number</p>
              <p className="text-xl font-black tracking-tight">{order.order_number}</p>
            </div>
            <span className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-700'}`}>
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
          <InfoRow icon={CalendarIcon} label="Placed on" value={new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} />
          <InfoRow icon={ShoppingBag} label="Items" value={`${order.items_count} item${order.items_count !== 1 ? 's' : ''}`} />
          <InfoRow icon={Truck} label="Courier" value={order.courier || 'Not assigned yet'} />
          <InfoRow icon={MapPin} label="Tracking" value={order.tracking_number || 'Pending'} />
        </div>
      </div>

      {/* Timeline Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/60 dark:border-gray-800 dark:bg-gray-950 dark:shadow-gray-950">
        <h2 className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
          <Clock className="h-4 w-4" />
          Order Timeline
        </h2>
        <div className="ml-0.5">
          {timelineStatuses.map((status, i) => {
            const step = order.timeline?.find(t => t.status === status);
            const isCompleted = step?.is_completed ?? false;
            const isCurrent = step?.is_current ?? false;
            const isCancelled = order.status === 'cancelled' || order.status === 'returned';

            return (
              <TimelineStep
                key={status}
                status={status}
                label={STATUS_LABELS[status] || status}
                timestamp={step?.timestamp || null}
                isCompleted={isCompleted}
                isCurrent={isCurrent}
                isLast={i === timelineStatuses.length - 1}
                isCancelled={isCancelled && (isCurrent || i >= timelineStatuses.length - 1)}
              />
            );
          })}
        </div>
      </div>

      {/* Shipping Info Card */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
            <MapPin className="h-4 w-4" />
            Shipping Address
          </h2>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {order.shipping_address || 'N/A'}
          </p>
          {order.customer_phone && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
              <Phone className="h-3.5 w-3.5" /> {order.customer_phone}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
            <CreditCard className="h-4 w-4" />
            Payment
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Method</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{order.payment_method?.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={`font-semibold capitalize ${order.payment_status === 'paid' ? 'text-emerald-600' :
                order.payment_status === 'pending' ? 'text-amber-600' :
                  order.payment_status === 'refunded' ? 'text-red-600' : 'text-gray-600'
                }`}>
                {order.payment_status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/60 dark:border-gray-800 dark:bg-gray-950 dark:shadow-gray-950">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
          <Package className="h-4 w-4" />
          Order Summary
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">৳{order.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Shipping</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{order.shipping === 0 ? 'Free' : `৳${order.shipping.toLocaleString()}`}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Discount</span>
              <span className="font-semibold text-emerald-600">−৳{order.discount.toLocaleString()}</span>
            </div>
          )}
          <hr className="border-gray-200 dark:border-gray-700" />
          <div className="flex items-center justify-between text-base">
            <span className="font-bold text-gray-900 dark:text-gray-100">Total</span>
            <span className="text-lg font-black text-brand-600">৳{order.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Items list */}
      {order.items && order.items.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/60 dark:border-gray-800 dark:bg-gray-950 dark:shadow-gray-950">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
            <ShoppingBag className="h-4 w-4" />
            Items ({order.items.length})
          </h2>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.product_name}</p>
                  <p className="text-xs text-gray-500">SKU: {item.product_sku} × {item.quantity}</p>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">৳{item.total.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View full order details */}
      <div className="text-center">
        <Link
          href={`/store/account/orders/${orderId}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
        >
          View Full Order Details <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
