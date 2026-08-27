'use client';

import Link from 'next/link';
import Image from 'next/image';
import { use } from 'react';
import { notFound } from 'next/navigation';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ChevronLeft,
  Download,
  XCircle,
  Star,
  MapPin,
  CreditCard,
  Phone,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { SAMPLE_ORDERS, formatMoney, formatMoneyDecimal } from '@/lib/storefront/mock-data';
import { imageUrl } from '@/lib/image-url';
import { useState } from 'react';
import Rating from '@/components/storefront/Rating';

const STATUS_ICON: Record<string, any> = {
  Placed: Clock,
  Confirmed: CheckCircle2,
  Packed: Package,
  Shipped: Truck,
  Delivered: CheckCircle2,
};

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const order = SAMPLE_ORDERS.find(o => o.uuid === orderId);
  const [reviewing, setReviewing] = useState<string | null>(null);

  if (!order) notFound();

  return (
    <div className="space-y-5">
      <Link
        href="/store/account/orders"
        className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-brand-600"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to orders
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500">Order</p>
            <h1 className="font-mono text-2xl font-black text-gray-900 dark:text-white">
              {order.orderNumber}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Placed on{' '}
              {new Date(order.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
              <Download className="h-4 w-4" />
              Invoice
            </button>
            {order.status === 'delivered' && (
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-700">
                Return
              </button>
            )}
            {order.status === 'shipped' && (
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-700">
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-6">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Order Status</h2>
          <ol className="mt-4 grid gap-2 sm:grid-cols-5">
            {order.timeline.map((step, i) => {
              const Icon = STATUS_ICON[step.status] || Clock;
              return (
                <li
                  key={i}
                  className="relative flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50 p-3 text-center dark:border-gray-800 dark:bg-gray-900/50"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      step.completed
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'
                        : 'bg-gray-200 text-gray-500 dark:bg-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <p
                    className={`mt-2 text-xs font-bold ${
                      step.completed
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.status}
                  </p>
                  <p className="text-[10px] text-gray-500">{step.date}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Tracking */}
      {order.trackingNumber && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/30">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">Tracking</p>
                <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                  {order.trackingNumber}
                </p>
                <p className="text-xs text-gray-500">
                  Courier: {order.courier}
                </p>
              </div>
            </div>
            <a
              href="#"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Track on courier website
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Items */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">
            Items ({order.items.length})
          </h2>
          <ul className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
            {order.items.map(item => (
              <li key={item.variationId} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                <Link
                  href={`/products/${item.slug}`}
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
                >
                  {item.image ? (
                    <Image
                      src={imageUrl(item.image) || ''}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-2xl font-bold text-gray-300 dark:text-gray-600">{item.name[0]}</span>
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${item.slug}`}
                    className="line-clamp-2 font-semibold text-gray-900 hover:text-brand-600 dark:text-gray-100"
                  >
                    {item.name}
                  </Link>
                  {Object.keys(item.attributes).length > 0 && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {Object.entries(item.attributes)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Qty: {item.quantity} · {formatMoney(item.unitPrice)} each
                  </p>
                  {order.status === 'delivered' && (
                    <button
                      onClick={() => setReviewing(item.variationId)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                      <Star className="h-3.5 w-3.5" />
                      Write a review
                    </button>
                  )}
                </div>
                <p className="text-sm font-bold">{formatMoney(item.lineTotal)}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              <MapPin className="mr-1 inline h-4 w-4 text-brand-600" />
              Shipping Address
            </h3>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              {order.shippingAddress.name}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {order.shippingAddress.addressLine1}
              {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {order.shippingAddress.city}, {order.shippingAddress.zipCode}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
              <Phone className="h-3.5 w-3.5" /> {order.shippingAddress.phone}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              <CreditCard className="mr-1 inline h-4 w-4 text-brand-600" />
              Payment
            </h3>
            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white uppercase">
              {order.paymentMethod}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Order Summary
            </h3>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Subtotal</dt>
                <dd className="font-semibold">{formatMoney(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Shipping</dt>
                <dd className="font-semibold">
                  {order.shipping === 0 ? 'FREE' : formatMoneyDecimal(order.shipping)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Tax</dt>
                <dd className="font-semibold">{formatMoneyDecimal(order.tax)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Discount</dt>
                  <dd className="font-semibold">−{formatMoney(order.discount)}</dd>
                </div>
              )}
            </dl>
            <div className="mt-3 flex items-baseline justify-between border-t border-gray-200 pt-3 dark:border-gray-800">
              <span className="text-sm font-bold">Total</span>
              <span className="text-xl font-black">{formatMoneyDecimal(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
