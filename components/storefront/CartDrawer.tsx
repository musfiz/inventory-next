'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Tag,
} from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import {
  formatMoney,
  formatMoneyDecimal,
  STORE_INFO,
} from '@/lib/storefront/mock-data';
import { notify } from '@/lib/notifications';

export default function CartDrawer() {
  const {
    items,
    drawerOpen,
    closeDrawer: storeClose,
    updateQuantity,
    removeItem,
    getSubtotal,
    getItemCount,
    couponCode,
    couponDiscount,
    applyCoupon,
    removeCoupon,
  } = useCartStore();

  const [isClosing, setIsClosing] = useState(false);

  const closeDrawer = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      storeClose();
      setIsClosing(false);
    }, 300);
  };

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setIsClosing(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) closeDrawer();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen && !isClosing) return null;

  const subtotal = getSubtotal();
  const itemCount = getItemCount();
  const qualifiesFreeShip = subtotal >= STORE_INFO.freeShippingThreshold;
  const shipping = qualifiesFreeShip ? 0 : 60;
  const tax = subtotal * (STORE_INFO.taxRate / 100);
  const total = subtotal + shipping + tax - couponDiscount;

  const handleApplyCoupon = () => {
    const code = window.prompt('Enter coupon code (try WELCOME10 or FREESHIP):');
    if (!code) return;
    const c = code.toUpperCase().trim();
    if (c === 'WELCOME10') {
      applyCoupon('WELCOME10', subtotal * 0.1);
      notify.success('Coupon applied! 10% off');
    } else if (c === 'FREESHIP') {
      applyCoupon('FREESHIP', shipping);
      notify.success('Free shipping applied!');
    } else {
      notify.error('Invalid coupon code');
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${isClosing ? 'sf-fade-out' : 'sf-fade-in'}`}
        onClick={closeDrawer}
        aria-hidden
      />
      <div className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-gray-950 ${isClosing ? 'sf-slide-out-right' : 'sf-slide-in-right'}`}>
        {/* Drawer handlebar */}
        <button
          onClick={closeDrawer}
          className="absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 flex h-16 w-5 items-center justify-center rounded-l-md bg-white shadow-md transition-colors hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800"
          aria-label="Close cart drawer"
        >
          <span className="flex flex-col gap-1">
            <span className="h-4 w-0.5 rounded-full bg-gray-400" />
            <span className="h-4 w-0.5 rounded-full bg-gray-400" />
          </span>
        </button>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/50">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-100">
                Shopping Bag
              </p>
              <p className="text-xs text-gray-500">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          <button
            onClick={closeDrawer}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free shipping progress */}
        {!qualifiesFreeShip && items.length > 0 && (
          <div className="shrink-0 border-b border-gray-200 bg-amber-50 px-5 py-3 dark:border-gray-800 dark:bg-amber-950/20">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">
              Add {formatMoney(STORE_INFO.freeShippingThreshold - subtotal)}{' '}
              more for FREE shipping 🚚
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900/40">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    (subtotal / STORE_INFO.freeShippingThreshold) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <ShoppingBag className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Your bag is empty
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Add items you love to your bag
              </p>
              <Link
                href="/store/products"
                onClick={closeDrawer}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
              >
                Start shopping
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map(item => (
                <li
                  key={item.variationId}
                  className="flex gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                >
                  <Link
                    href={`/store/products/${item.slug}`}
                    onClick={closeDrawer}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/store/products/${item.slug}`}
                        onClick={closeDrawer}
                        className="min-w-0 flex-1"
                      >
                        <p className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-brand-600 dark:text-gray-100">
                          {item.name}
                        </p>
                        {Object.keys(item.attributes).length > 0 && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            {Object.entries(item.attributes)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ')}
                          </p>
                        )}
                      </Link>
                      <button
                        onClick={() => removeItem(item.variationId)}
                        className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() =>
                            updateQuantity(item.variationId, item.quantity - 1)
                          }
                          className="flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                          aria-label="Decrease"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-9 text-center text-sm font-bold text-gray-900 dark:text-gray-100">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.variationId, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.stock}
                          className="flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
                          aria-label="Increase"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
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
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900/50">
            {/* Coupon */}
            {couponCode ? (
              <div className="mb-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/30">
                <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  <Tag className="h-4 w-4" />
                  {couponCode} applied · −{formatMoney(couponDiscount)}
                </span>
                <button
                  onClick={removeCoupon}
                  className="text-xs font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={handleApplyCoupon}
                className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400"
              >
                <Tag className="h-4 w-4" />
                Have a coupon code?
              </button>
            )}

            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <dt>Subtotal</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatMoney(subtotal)}
                </dd>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <dt>Shipping</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">
                  {qualifiesFreeShip ? (
                    <span className="text-emerald-600">FREE</span>
                  ) : (
                    formatMoneyDecimal(shipping)
                  )}
                </dd>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <dt>Tax ({STORE_INFO.taxRate}%)</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatMoneyDecimal(tax)}
                </dd>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <dt>Discount</dt>
                  <dd className="font-semibold">
                    −{formatMoney(couponDiscount)}
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-3 flex items-baseline justify-between border-t border-gray-200 pt-3 dark:border-gray-800">
              <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                Total
              </span>
              <span className="text-xl font-black text-gray-900 dark:text-gray-100">
                {formatMoneyDecimal(total)}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href="/store/cart"
                onClick={closeDrawer}
                className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                View Cart
              </Link>
              <Link
                href="/store/checkout"
                onClick={closeDrawer}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
              >
                Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
