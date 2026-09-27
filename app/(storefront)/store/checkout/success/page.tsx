'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useOrder } from '@/hooks/use-storefront-data';
import {
  CheckCircle2,
  Package,
  Truck,
  Download,
  ArrowRight,
  Home as HomeIcon,
  UserPlus,
} from 'lucide-react';
import PageLoader from '@/components/ui/page-loader';

function SuccessContent() {
  const params = useSearchParams();
  const orderId = params.get('o') || 'ORD-000000';
  const email = params.get('email') || '';
  const eta = `Wed, ${new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  // Order confirmation — SWR; the placeholder id means "no real order yet", skip the fetch.
  const { order } = useOrder(orderId && orderId !== 'ORD-000000' ? orderId : undefined);

  const displayId = order?.invoice_number || order?.order_number || orderId;

  const timeline = [
    { icon: CheckCircle2, label: 'Order placed', date: 'Just now', done: true },
    { icon: Package, label: 'Confirmed', date: 'Within 1 hour', done: false },
    { icon: Truck, label: 'Shipped', date: 'Tomorrow', done: false },
    { icon: HomeIcon, label: 'Delivered', date: `Est. ${eta}`, done: false },
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Hero confirmation */}
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/30">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">
            Thank you for your order!
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Order <span className="font-bold text-gray-900 dark:text-gray-100">#{displayId}</span> has been placed successfully.
          </p>
          {email && (
            <p className="mt-1 text-xs text-gray-400">
              A confirmation receipt has been emailed to <span className="font-semibold">{email}</span>
            </p>
          )}
        </div>

        {/* Timeline */}
        <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-5 text-base font-black text-gray-900 dark:text-white">
            Track your order
          </h2>
          <ol className="relative space-y-6 before:absolute before:left-[18px] before:top-2 before:h-[calc(100%-2rem)] before:w-0.5 before:bg-gray-100 dark:before:bg-gray-800">
            {timeline.map((t, i) => {
              const Icon = t.icon;
              return (
                <li key={i} className="relative flex items-start gap-4 pl-1">
                  <span className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full ${
                    t.done
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="pt-1.5">
                    <p className={`text-sm font-bold ${t.done ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                      {t.label}
                    </p>
                    <p className="text-xs text-gray-500">{t.date}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Actions */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <HomeIcon className="h-4 w-4" /> Continue shopping
          </Link>
          <button className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            <Download className="h-4 w-4" /> Download receipt
          </button>
        </div>

        {/* Create account (guest) */}
        <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-950/20">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-900 dark:text-brand-300">
                Create an account to keep your order history
              </p>
              <p className="mt-1 text-xs text-brand-700 dark:text-brand-400">
                Track this order, save addresses, and check out faster next time.
              </p>
              <Link
                href="/store/account/register"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline dark:text-brand-400"
              >
                Create account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SuccessContent />
    </Suspense>
  );
}