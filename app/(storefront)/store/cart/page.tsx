'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Tag,
  X,
} from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import {
  formatMoney,
  formatMoneyDecimal,
  STORE_INFO,
} from '@/lib/storefront/mock-data';
import { notify } from '@/lib/notifications';

export default function CartPage() {
  const {
    items,
    updateQuantity,
    removeItem,
    getSubtotal,
    getItemCount,
    couponCode,
    couponDiscount,
    applyCoupon,
    removeCoupon,
    clearCart,
  } = useCartStore();

  const [couponInput, setCouponInput] = useState('');

  const subtotal = getSubtotal();
  const itemCount = getItemCount();
  const qualifiesFreeShip = subtotal >= STORE_INFO.freeShippingThreshold;
  const shipping = qualifiesFreeShip ? 0 : 60;
  const tax = subtotal * (STORE_INFO.taxRate / 100);
  const total = subtotal + shipping + tax - couponDiscount;

  const handleApplyCoupon = () => {
    const code = couponInput.toUpperCase().trim();
    if (!code) return;
    if (code === 'WELCOME10') {
      applyCoupon('WELCOME10', subtotal * 0.1);
      notify.success('Coupon applied! 10% off');
    } else if (code === 'FREESHIP') {
      applyCoupon('FREESHIP', shipping);
      notify.success('Free shipping applied!');
    } else {
      notify.error('Invalid coupon code');
    }
    setCouponInput('');
  };

  if (items.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-900">
            <ShoppingBag className="h-12 w-12 text-gray-300" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            Your cart is empty
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Looks like you haven&apos;t added anything to your cart yet.
          </p>
          <Link
            href="/store/products"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
          >
            Start shopping <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-xs text-gray-500 dark:text-gray-400">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 dark:text-gray-100">Shopping Cart</span>
        </nav>

        <h1 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
          Shopping Cart
          <span className="ml-2 text-base font-semibold text-gray-500">
            ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </span>
        </h1>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Line items */}
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map(item => (
                  <li key={item.variationId} className="flex gap-4 p-4 sm:p-5">
                    <Link
                      href={`/products/${item.slug}`}
                      className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
                    >
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/products/${item.slug}`}>
                          <h3 className="line-clamp-2 text-sm font-bold text-gray-900 hover:text-brand-600 dark:text-gray-100">
                            {item.name}
                          </h3>
                        </Link>
                        <button
                          onClick={() => removeItem(item.variationId)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {Object.keys(item.attributes).length > 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                          {Object.entries(item.attributes).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                        </p>
                      )}
                      <div className="mt-auto flex items-end justify-between pt-3">
                        <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => updateQuantity(item.variationId, item.quantity - 1)}
                            className="flex h-9 w-9 items-center justify-center text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                            aria-label="Decrease"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-10 text-center text-sm font-bold text-gray-900 dark:text-gray-100">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.variationId, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                            className="flex h-9 w-9 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
                            aria-label="Increase"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-gray-900 dark:text-gray-100">
                            {formatMoney(item.lineTotal)}
                          </p>
                          {item.mrp && item.mrp > item.unitPrice && (
                            <p className="text-xs text-gray-400 line-through">
                              {formatMoney(item.mrp * item.quantity)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-800">
                <Link
                  href="/store/products"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Continue shopping
                </Link>
                <button
                  onClick={clearCart}
                  className="text-sm font-medium text-gray-500 hover:text-red-600"
                >
                  Clear cart
                </button>
              </div>
            </div>

            {/* Free shipping progress */}
            {!qualifiesFreeShip && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                  Add {formatMoney(STORE_INFO.freeShippingThreshold - subtotal)} more to qualify for FREE shipping 🚚
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900/40">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${Math.min(100, (subtotal / STORE_INFO.freeShippingThreshold) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div>
            <div className="sticky top-32 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-base font-black text-gray-900 dark:text-white">
                Order Summary
              </h2>

              {/* Coupon */}
              <div className="mt-4">
                {couponCode ? (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      <Tag className="h-4 w-4" /> {couponCode} · −{formatMoney(couponDiscount)}
                    </span>
                    <button onClick={removeCoupon} className="text-xs font-medium hover:underline">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={couponInput}
                        onChange={e => setCouponInput(e.target.value)}
                        placeholder="Coupon code"
                        className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                      />
                    </div>
                    <button
                      onClick={handleApplyCoupon}
                      className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"
                    >
                      Apply
                    </button>
                  </div>
                )}
                <p className="mt-1.5 text-[10px] text-gray-400">
                  Try WELCOME10 (10% off) or FREESHIP (free shipping)
                </p>
              </div>

              <dl className="mt-5 space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <dt>Subtotal ({itemCount} items)</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100">{formatMoney(subtotal)}</dd>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <dt>Shipping</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100">
                    {qualifiesFreeShip ? <span className="text-emerald-600">FREE</span> : formatMoneyDecimal(shipping)}
                  </dd>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <dt>Tax ({STORE_INFO.taxRate}%)</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100">{formatMoneyDecimal(tax)}</dd>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <dt>Discount</dt>
                    <dd className="font-semibold">−{formatMoney(couponDiscount)}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-4 flex items-baseline justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                <span className="text-base font-bold text-gray-900 dark:text-gray-100">Total</span>
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {formatMoneyDecimal(total)}
                </span>
              </div>

              <Link
                href="/store/checkout"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
              >
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-center text-[11px] text-gray-400">
                Secure 256-bit SSL encrypted checkout
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}