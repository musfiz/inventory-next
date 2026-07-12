'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Check,
  ChevronDown,
  Lock,
  ShieldCheck,
  ArrowRight,
  Truck,
  Wallet,
  CreditCard,
  Smartphone,
  Banknote,
} from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import {
  formatMoney,
  formatMoneyDecimal,
  STORE_INFO,
  SHIPPING_METHODS,
  PAYMENT_METHODS,
} from '@/lib/storefront/mock-data';
import type { Address } from '@/types/storefront';
import { notify } from '@/lib/notifications';

type Step = 'contact' | 'address' | 'shipping' | 'payment';

const emptyAddress: Address = {
  id: '',
  label: 'Shipping',
  name: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  zipCode: '',
  country: 'Bangladesh',
  isDefault: true,
};

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    getSubtotal,
    getItemCount,
    couponCode,
    couponDiscount,
    clearCart,
  } = useCartStore();
  const { user, isAuthenticated } = useCustomerAuthStore();

  const [openStep, setOpenStep] = useState<Step>('contact');
  const [completed, setCompleted] = useState<Set<Step>>(new Set());
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [shipping, setShipping] = useState(SHIPPING_METHODS[0].id);
  const [payment, setPayment] = useState('pm-cod');

  const subtotal = getSubtotal();
  const itemCount = getItemCount();
  const shipMethod = SHIPPING_METHODS.find(s => s.id === shipping)!;
  const shippingCost = subtotal >= STORE_INFO.freeShippingThreshold ? 0 : shipMethod.rate;
  const tax = subtotal * (STORE_INFO.taxRate / 100);
  const total = subtotal + shippingCost + tax - couponDiscount;

  const toggleStep = (step: Step) => {
    if (completed.has(step)) {
      setCompleted(prev => { const n = new Set(prev); n.delete(step); return n; });
    }
    setOpenStep(step);
  };

  const completeStep = (step: Step, next?: Step) => {
    setCompleted(prev => new Set(prev).add(step));
    if (next) setOpenStep(next);
  };

  const handlePlaceOrder = () => {
    if (!email || !address.name || !address.addressLine1 || !address.city) {
      notify.error('Please complete all required fields');
      return;
    }
    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    clearCart();
    notify.success('Order placed successfully!');
    router.push(`/store/checkout/success?o=${orderId}&email=${encodeURIComponent(email)}`);
  };

  if (items.length === 0) {
    return (
      <div className="bg-gray-50 px-4 py-20 text-center dark:bg-gray-950">
        <p className="text-lg font-bold text-gray-900 dark:text-white">
          Your cart is empty
        </p>
        <Link href="/store/products" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600">
          Continue shopping <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const StepHeader = ({ step, label, icon: Icon }: { step: Step; label: string; icon: any }) => {
    const isDone = completed.has(step);
    const isOpen = openStep === step;
    return (
      <button
        onClick={() => toggleStep(step)}
        className="flex w-full items-center gap-3 border-b border-gray-100 px-5 py-4 text-left dark:border-gray-800"
      >
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
          isDone ? 'bg-emerald-500 text-white' : isOpen ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
        }`}>
          {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </span>
        <span className={`flex-1 text-base font-bold ${isDone || isOpen ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
          {label}
        </span>
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
    );
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      {/* Slim header (distraction-free per spec) */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-black text-gray-900 dark:text-white">
            UIMS<span className="text-brand-600">.</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <Lock className="h-3.5 w-3.5" /> Secure Checkout
          </span>
          <Link href="/store/cart" className="text-sm font-semibold text-gray-600 hover:text-brand-600 dark:text-gray-400">
            Back to cart
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left: Accordion form */}
          <div className="space-y-4">
            {/* Contact */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <StepHeader step="contact" label="1. Contact information" icon={Wallet} />
              {openStep === 'contact' && (
                <div className="space-y-3 p-5">
                  {!isAuthenticated && (
                    <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 dark:bg-brand-950/30 dark:text-brand-400">
                      Have an account? <Link href="/store/account/login?redirect=/store/checkout" className="underline">Sign in for faster checkout</Link>
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Email</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Phone</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+880 1XXX-XXXXXX"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <input type="checkbox" className="sf-check" defaultChecked />
                    Email me with news & offers (optional)
                  </label>
                  <button
                    onClick={() => completeStep('contact', 'address')}
                    disabled={!email || !phone}
                    className="w-full rounded-lg bg-brand-600 py-3 text-sm font-bold text-white disabled:opacity-50 sm:w-auto sm:px-8"
                  >
                    Continue to shipping address
                  </button>
                </div>
              )}
            </div>

            {/* Address */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <StepHeader step="address" label="2. Shipping address" icon={Truck} />
              {openStep === 'address' && (
                <div className="space-y-3 p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Full name</label>
                      <input
                        required value={address.name}
                        onChange={e => setAddress({ ...address, name: e.target.value })}
                        placeholder="John Doe"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Phone</label>
                      <input
                        required value={address.phone}
                        onChange={e => setAddress({ ...address, phone: e.target.value })}
                        placeholder="+880 1XXX-XXXXXX"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Address line 1</label>
                    <input
                      required value={address.addressLine1}
                      onChange={e => setAddress({ ...address, addressLine1: e.target.value })}
                      placeholder="House, road, block"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Address line 2 (optional)</label>
                    <input
                      value={address.addressLine2 || ''}
                      onChange={e => setAddress({ ...address, addressLine2: e.target.value })}
                      placeholder="Apartment, suite, area"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">City</label>
                      <input
                        required value={address.city}
                        onChange={e => setAddress({ ...address, city: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">ZIP</label>
                      <input
                        value={address.zipCode}
                        onChange={e => setAddress({ ...address, zipCode: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Country</label>
                      <input
                        value={address.country}
                        onChange={e => setAddress({ ...address, country: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => completeStep('address', 'shipping')}
                    disabled={!address.name || !address.addressLine1 || !address.city}
                    className="w-full rounded-lg bg-brand-600 py-3 text-sm font-bold text-white disabled:opacity-50 sm:w-auto sm:px-8"
                  >
                    Continue to shipping method
                  </button>
                </div>
              )}
            </div>

            {/* Shipping method */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <StepHeader step="shipping" label="3. Shipping method" icon={Truck} />
              {openStep === 'shipping' && (
                <div className="space-y-2 p-5">
                  {SHIPPING_METHODS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setShipping(m.id)}
                      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                        shipping === m.id
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          shipping === m.id ? 'border-brand-600' : 'border-gray-300 dark:border-gray-700'
                        }`}>
                          {shipping === m.id && <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{m.name}</p>
                          <p className="text-xs text-gray-500">{m.description} · {m.estimatedDays}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {subtotal >= STORE_INFO.freeShippingThreshold || m.isFree ? (
                          <span className="text-emerald-600">FREE</span>
                        ) : formatMoney(m.rate)}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => completeStep('shipping', 'payment')}
                    className="mt-2 w-full rounded-lg bg-brand-600 py-3 text-sm font-bold text-white sm:w-auto sm:px-8"
                  >
                    Continue to payment
                  </button>
                </div>
              )}
            </div>

            {/* Payment */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <StepHeader step="payment" label="4. Payment" icon={CreditCard} />
              {openStep === 'payment' && (
                <div className="space-y-2 p-5">
                  <div className="grid gap-2">
                    {PAYMENT_METHODS.map(m => {
                      const Icon = { CreditCard, Smartphone, Banknote, ShieldCheck, Wallet }[m.icon] || Banknote;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setPayment(m.id)}
                          className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                            payment === m.id
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{m.name}</p>
                              <p className="text-xs text-gray-500">{m.description}</p>
                            </div>
                          </div>
                          {m.badge && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                              {m.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={handlePlaceOrder}
                    className="mt-4 w-full rounded-full bg-brand-600 py-4 text-base font-black text-white transition-colors hover:bg-brand-700"
                  >
                    Place order · {formatMoneyDecimal(total)}
                  </button>
                  <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                    <ShieldCheck className="h-3.5 w-3.5" /> 256-bit SSL encrypted. By placing your order you agree to our Terms.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Order summary */}
          <div>
            <div className="sticky top-32 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-base font-black text-gray-900 dark:text-white">
                Order Summary
              </h2>
              <ul className="max-h-72 space-y-3 overflow-y-auto scrollbar-thin">
                {items.map(item => (
                  <li key={item.variationId} className="flex gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-bold text-white">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <p className="line-clamp-1 text-xs font-semibold text-gray-900 dark:text-gray-100">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatMoney(item.unitPrice)} × {item.quantity}
                      </p>
                    </div>
                    <p className="self-center text-sm font-bold text-gray-900 dark:text-gray-100">
                      {formatMoney(item.lineTotal)}
                    </p>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm dark:border-gray-800">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <dt>Subtotal</dt><dd className="font-semibold text-gray-900 dark:text-gray-100">{formatMoney(subtotal)}</dd>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <dt>Shipping ({shipMethod.name})</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100">
                    {shippingCost === 0 ? <span className="text-emerald-600">FREE</span> : formatMoney(shippingCost)}
                  </dd>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <dt>Tax</dt><dd className="font-semibold text-gray-900 dark:text-gray-100">{formatMoneyDecimal(tax)}</dd>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <dt>Discount ({couponCode})</dt><dd className="font-semibold">−{formatMoney(couponDiscount)}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-4 flex items-baseline justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                <span className="text-base font-bold text-gray-900 dark:text-gray-100">Total</span>
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {formatMoneyDecimal(total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}