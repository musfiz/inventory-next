'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Tag,
  Clock,
  Truck,
  MessageSquare,
} from 'lucide-react';
import { GiPaperBagOpen } from 'react-icons/gi';
import { useCartStore } from '@/stores/cart-store';
import {
  formatMoney,
  formatMoneyDecimal,
  STORE_INFO,
} from '@/lib/storefront/mock-data';
import { imageUrl } from '@/lib/image-url';
import { notify } from '@/lib/notifications';

const DELIVERY_SLOTS = [
  { id: 'today-2pm', label: 'Today, 2PM - 5PM', available: true },
  { id: 'today-6pm', label: 'Today, 6PM - 9PM', available: true },
  { id: 'tomorrow-9am', label: 'Tomorrow, 9AM - 12PM', available: true },
  { id: 'tomorrow-2pm', label: 'Tomorrow, 2PM - 5PM', available: true },
  { id: 'tomorrow-6pm', label: 'Tomorrow, 6PM - 9PM', available: true },
];

export default function GroceryCartDrawer() {
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
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('today-2pm');
  const [allowSubstitutions, setAllowSubstitutions] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState('');

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
    const c = couponInput.toUpperCase().trim();
    if (!c) {
      setCouponError('Please enter a coupon code');
      return;
    }
    setApplyingCoupon(true);
    setCouponError(null);
    setTimeout(() => {
      if (c === 'WELCOME10') {
        applyCoupon('WELCOME10', subtotal * 0.1);
        notify.success('Coupon applied! 10% off');
        setShowCouponInput(false);
        setCouponInput('');
      } else if (c === 'FREESHIP') {
        applyCoupon('FREESHIP', shipping);
        notify.success('Free shipping applied!');
        setShowCouponInput(false);
        setCouponInput('');
      } else {
        setCouponError('Invalid or expired coupon code');
      }
      setApplyingCoupon(false);
    }, 400);
  };

  const cancelCouponInput = () => {
    setShowCouponInput(false);
    setCouponInput('');
    setCouponError(null);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${isClosing ? 'sf-fade-out' : 'sf-fade-in'}`}
        onClick={closeDrawer}
        aria-hidden
      />
      <div className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-gray-950 ${isClosing ? 'sf-slide-out-right' : 'sf-slide-in-right'}`}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2.5 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-50 text-green-600 dark:bg-green-950/50">
              <GiPaperBagOpen className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Your Cart
              </p>
              <p className="text-[11px] text-gray-500">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          <button
            onClick={closeDrawer}
            className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close cart"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Delivery time slot */}
        {items.length > 0 && (
          <div className="shrink-0 border-b border-gray-200 bg-green-50 px-4 py-3 dark:border-gray-800 dark:bg-green-950/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-xs font-bold text-green-800 dark:text-green-300">
                Delivery Time
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DELIVERY_SLOTS.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot.id)}
                  disabled={!slot.available}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedSlot === slot.id
                      ? 'border-green-500 bg-green-600 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-green-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Free shipping progress */}
        {!qualifiesFreeShip && items.length > 0 && (
          <div className="shrink-0 border-b border-gray-200 bg-orange-50 px-4 py-1.5 dark:border-gray-800 dark:bg-orange-950/20">
            <p className="text-xs font-semibold text-orange-900 dark:text-orange-300">
              Add {formatMoney(STORE_INFO.freeShippingThreshold - subtotal)}{' '}
              more for FREE delivery 🚚
            </p>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-orange-200 dark:bg-orange-900/40">
              <div
                className="h-full rounded-full bg-orange-500 transition-all duration-500"
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
                <GiPaperBagOpen className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Your cart is empty
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Add fresh groceries to your cart
              </p>
              <Link
                href="/store/products"
                onClick={closeDrawer}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-green-700"
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
                  className="flex gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                >
                  <Link
                    href={`/store/products/${item.slug}`}
                    onClick={closeDrawer}
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
                  >
                    {item.image ? (
                      <Image
                        src={imageUrl(item.image) || ''}
                        alt={item.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-lg font-bold text-gray-300 dark:text-gray-600">{item.name[0]}</span>
                      </div>
                    )}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/store/products/${item.slug}`}
                        onClick={closeDrawer}
                        className="min-w-0 flex-1"
                      >
                        <p className="line-clamp-1 text-xs font-semibold text-gray-900 hover:text-green-600 dark:text-gray-100">
                          {item.name}
                        </p>
                        {Object.keys(item.attributes).length > 0 && (
                          <p className="mt-0.5 flex flex-wrap gap-1">
                            {Object.entries(item.attributes).map(([k, v], ai) => (
                              <span
                                key={ai}
                                className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-950/40 dark:text-green-300"
                              >
                                {k}: <span className="font-semibold">{v}</span>
                              </span>
                            ))}
                          </p>
                        )}
                      </Link>
                      <button
                        onClick={() => removeItem(item.variationId)}
                        className="rounded-md p-0.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-1">
                      <div className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() =>
                            updateQuantity(item.variationId, item.quantity - 1)
                          }
                          className="flex h-5 w-5 items-center justify-center text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                          aria-label="Decrease"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-gray-900 dark:text-gray-100">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.variationId, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.stock}
                          className="flex h-5 w-5 items-center justify-center bg-green-50 text-green-600 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-900/60"
                          aria-label="Increase"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold tracking-tight text-green-600 dark:text-green-400">
                          {formatMoney(item.lineTotal)}
                        </p>
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
          <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900/50">
            {/* Coupon */}
            {couponCode ? (
              <div className="mb-2 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-950/30">
                <span className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400">
                  <Tag className="h-4 w-4" />
                  {couponCode} applied · −{formatMoney(couponDiscount)}
                </span>
                <button
                  onClick={removeCoupon}
                  className="text-xs font-medium text-green-700 underline-offset-2 hover:underline dark:text-green-400"
                >
                  Remove
                </button>
              </div>
            ) : showCouponInput ? (
              <div className="mb-2">
                <div className="flex items-stretch gap-2">
                  <div className="relative flex-1">
                    <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      autoFocus
                      type="text"
                      value={couponInput}
                      onChange={e => {
                        setCouponInput(e.target.value);
                        if (couponError) setCouponError(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleApplyCoupon();
                        if (e.key === 'Escape') cancelCouponInput();
                      }}
                      placeholder="Enter coupon code"
                      className={`w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm font-medium uppercase tracking-wide text-gray-900 placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 dark:bg-gray-900 dark:text-gray-100 ${
                        couponError
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20'
                          : 'border-gray-300 focus:border-green-400 focus:ring-green-500/20 dark:border-gray-700'
                      }`}
                    />
                  </div>
                  <button
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon || !couponInput.trim()}
                    className="shrink-0 rounded-lg bg-gray-900 px-4 text-sm font-bold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                  >
                    {applyingCoupon ? 'Applying…' : 'Apply'}
                  </button>
                  <button
                    onClick={cancelCouponInput}
                    className="shrink-0 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                    aria-label="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {couponError && (
                  <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                    {couponError}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowCouponInput(true)}
                className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-1 text-sm font-medium text-gray-600 transition-colors hover:border-green-400 hover:text-green-600 dark:border-gray-700 dark:text-gray-400"
              >
                <Tag className="h-4 w-4" />
                Have a coupon code?
              </button>
            )}

            {/* Delivery notes */}
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Delivery Note</span>
              </div>
              <input
                type="text"
                value={deliveryNote}
                onChange={e => setDeliveryNote(e.target.value)}
                placeholder="e.g., Leave at door, ring bell"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            {/* Substitution preference */}
            <div className="mb-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="substitutions"
                checked={allowSubstitutions}
                onChange={e => setAllowSubstitutions(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <label htmlFor="substitutions" className="text-xs text-gray-600 dark:text-gray-400">
                Allow substitutions if out of stock
              </label>
            </div>

            <dl className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <dt>Subtotal</dt>
                <dd className="font-semibold text-green-600 dark:text-green-400">
                  {formatMoney(subtotal)}
                </dd>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <dt>Delivery</dt>
                <dd className="font-semibold text-sky-600 dark:text-sky-400">
                  {qualifiesFreeShip ? (
                    <span className="font-bold text-green-600 dark:text-green-400">FREE</span>
                  ) : (
                    formatMoneyDecimal(shipping)
                  )}
                </dd>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <dt>Tax ({STORE_INFO.taxRate}%)</dt>
                <dd className="font-semibold text-amber-600 dark:text-amber-400">
                  {formatMoneyDecimal(tax)}
                </dd>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <dt>Discount</dt>
                  <dd className="font-bold">
                    −{formatMoney(couponDiscount)}
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 ring-1 ring-green-100 dark:bg-green-950/40 dark:ring-green-900/50">
              <span className="text-sm font-bold text-green-700 dark:text-green-300">
                Total
              </span>
              <span className="text-lg font-black tracking-tight text-green-700 dark:text-green-300">
                {formatMoneyDecimal(total)}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link
                href="/store/cart"
                onClick={closeDrawer}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                View Cart
              </Link>
              <Link
                href="/store/checkout"
                onClick={closeDrawer}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700"
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
