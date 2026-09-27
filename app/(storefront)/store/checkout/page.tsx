'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Check,
  Lock,
  ShieldCheck,
  ArrowRight,
  Truck,
  Wallet,
  CreditCard,
  Smartphone,
  Banknote,
  Loader2,
  X,
  AlertTriangle,
  Trash2,
  Minus,
  Plus,
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
import { imageUrl } from '@/lib/image-url';
import type { Address } from '@/types/storefront';
import { notify } from '@/lib/notifications';
import checkoutService, { type ValidateCartResult } from '@/services/checkoutService';
import type { PlaceOrderPayload } from '@/services/checkoutService';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import { useProductBySlug, useSavedAddresses } from '@/hooks/use-storefront-data';
import VariantSelector from '@/components/storefront/VariantSelector';

type Step = 'details' | 'shipping' | 'payment';

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
    updateItemVariation,
  } = useCartStore();

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editSelected, setEditSelected] = useState('');

  // Variant editor product data — SWR keyed on the clicked cart item's slug.
  const { product: editProduct, loading: editLoading } = useProductBySlug(editingSlug ?? undefined);
  const editProductRef = editProduct;

  const openVariantEditor = (item: (typeof items)[number]) => {
    setEditingItemId(item.variationId);
    setEditSelected(item.variationId);
    setEditingSlug(item.slug);
  };

  const confirmVariantChange = () => {
    if (!editProductRef || !editingItemId) return;
    const res = updateItemVariation(editingItemId, editProductRef, editSelected);
    if (res.ok) {
      notify.success('Variant updated');
      setEditingItemId(null);
      setEditingSlug(null);
    } else {
      notify.error(res.message ?? 'Could not update variant');
    }
  };
  const { user, isAuthenticated } = useCustomerAuthStore();
  const { storeName } = useStorefrontStatus();

  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState<Address>({ ...emptyAddress, phone: user?.phone || '' });
  const [shipping, setShipping] = useState(SHIPPING_METHODS[0]?.id ?? 'ship-standard');
  const [payment, setPayment] = useState('pm-cod');
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidateCartResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const subtotal = getSubtotal();
  const itemCount = getItemCount();
  const shipMethod = SHIPPING_METHODS.find(s => s.id === shipping);
  const shippingCost = subtotal >= STORE_INFO.freeShippingThreshold || shipMethod?.isFree
    ? 0
    : (shipMethod?.rate ?? 0);
  const tax = subtotal * (STORE_INFO.taxRate / 100);
  const total = subtotal + shippingCost + tax - couponDiscount;

  // Load the customer's saved addresses for quick selection at checkout.
  const { addresses: savedAddresses, loading: loadingAddresses } = useSavedAddresses(isAuthenticated);

  const selectSavedAddress = (a: Address) => setAddress({ ...a });

  // A step shows as complete as soon as its inputs are valid — no "Continue" buttons needed.
  const detailsValid =
    /^\S+@\S+\.\S+$/.test(email) &&
    !!address.name &&
    !!address.phone &&
    !!address.addressLine1 &&
    !!address.city;
  const stepValid: Record<Step, boolean> = { details: detailsValid, shipping: true, payment: true };

  const runValidation = async () => {
    setValidating(true);
    setValidationResult(null);
    setValidationError(null);
    try {
      const validationItems = items.map(i => ({
        variation_id: i.variationId,
        product_id: i.productId,
        quantity: i.quantity,
        unit_price: i.unitPrice,
      }));
      const result = await checkoutService.validateCart(validationItems);
      setValidationResult(result);
      if (!result.valid) {
        setValidationError(result.message || 'Some items are out of stock or have insufficient quantity.');
      }
    } catch (err: any) {
      setValidationError(err?.response?.data?.message || 'Validation failed. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  const removeItem = (variationId: string) => {
    useCartStore.getState().removeItem(variationId);
    setValidationResult(null);
    setValidationError(null);
    notify.info('Item removed from cart');
  };

  const updateItemQty = (variationId: string, delta: number) => {
    const item = useCartStore.getState().items.find(i => i.variationId === variationId);
    if (!item) return;
    const newQty = Math.max(1, item.quantity + delta);
    if (newQty > item.stock) {
      notify.error(`Only ${item.stock} available`);
      return;
    }
    useCartStore.getState().updateQuantity(variationId, newQty);
    setValidationResult(null);
  };

  const handlePlaceOrder = async () => {
    // Validate cart via backend before placing order.
    await runValidation();
    if (validationResult && !validationResult.valid) {
      notify.error(validationError || 'Please fix out-of-stock items before placing the order.');
      return;
    }

    // Checkout form validation (contact + shipping address)
    if (!detailsValid) {
      notify.error('Please complete your contact and shipping details');
      return;
    }
    if (!payment) {
      notify.error('Please select a payment method');
      return;
    }

    setSubmitting(true);
    try {
      const payload: PlaceOrderPayload = {
        email,
        phone: address.phone,
        address: {
          name: address.name,
          phone: address.phone,
          address_line1: address.addressLine1,
          address_line2: address.addressLine2,
          city: address.city,
          zip_code: address.zipCode,
          country: address.country,
          label: address.label,
        },
        shipping_method_id: shipping,
        payment_method: payment,
        coupon_code: couponCode || undefined,
        items: items.map(i => ({
          variation_id: i.variationId,
          product_id: i.productId,
          quantity: i.quantity,
          unit_price: i.unitPrice,
        })),
        customer_id: user?.id ? String(user.id) : undefined,
      };

      const order = await checkoutService.placeOrder(payload);
      clearCart();
      notify.success('Order placed successfully!');

      // Gateway methods (anything except COD) expect a redirect to complete payment.
      if (order.payment_url) {
        window.location.href = order.payment_url;
        return;
      }

      const ref = order.uuid || order.id || order.invoice_number || '';
      router.push(
        `/store/checkout/success?o=${encodeURIComponent(String(ref))}&email=${encodeURIComponent(email)}`,
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || 'Could not place your order. Please try again.';
      notify.error(String(msg));
    } finally {
      setSubmitting(false);
    }
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

  const SectionHeader = ({ step, label, icon: Icon }: { step: Step; label: string; icon: any }) => {
    const isDone = stepValid[step];
    return (
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <span className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold transition-colors ${
          isDone ? 'bg-emerald-500 text-white' : 'bg-brand-600 text-white'
        }`}>
          {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </span>
        <span className="flex-1 text-sm font-bold text-gray-900 dark:text-white">{label}</span>
      </div>
    );
  };

  const inputClass =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100';
  const labelClass = 'mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300';

  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      {/* Slim header (distraction-free per spec) */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-black text-gray-900 dark:text-white">
            {storeName || 'Store'}<span className="text-brand-600">.</span>
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
          {/* Left: form sections (all visible — no accordion clicks) */}
          <div className="space-y-4">
            {/* 1. Contact & shipping details */}
            <div id="checkout-details" className="scroll-mt-24 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <SectionHeader step="details" label="1. Contact & shipping details" icon={Wallet} />
              <div className="space-y-3 p-4">
                {!isAuthenticated && (
                  <p className="rounded-md bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 dark:bg-brand-950/30 dark:text-brand-400">
                    Have an account? <Link href="/store/account/login?redirect=/store/checkout" className="underline">Sign in for faster checkout</Link>
                  </p>
                )}
                {isAuthenticated && (
                  <div className="mb-1">
                    {loadingAddresses ? (
                      <p className="text-xs text-gray-400">Loading saved addresses…</p>
                    ) : savedAddresses.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Saved addresses
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {savedAddresses.map(a => (
                            <button
                              type="button"
                              key={a.id}
                              onClick={() => selectSavedAddress(a)}
                              className={`rounded-md border p-3 text-left text-sm transition-all ${
                                address.id === a.id
                                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
                              }`}
                            >
                              <p className="font-bold text-gray-900 dark:text-gray-100">
                                {a.label || a.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {a.addressLine1}, {a.city}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Full name</label>
                    <input
                      required value={address.name}
                      onChange={e => setAddress({ ...address, name: e.target.value })}
                      placeholder="John Doe"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input
                      type="tel"
                      required value={address.phone}
                      onChange={e => setAddress({ ...address, phone: e.target.value })}
                      placeholder="+880 1XXX-XXXXXX"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Address line 1</label>
                    <input
                      required value={address.addressLine1}
                      onChange={e => setAddress({ ...address, addressLine1: e.target.value })}
                      placeholder="House, road, block"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Address line 2 (optional)</label>
                  <input
                    value={address.addressLine2 || ''}
                    onChange={e => setAddress({ ...address, addressLine2: e.target.value })}
                    placeholder="Apartment, suite, area"
                    className={inputClass}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>City</label>
                    <input
                      required value={address.city}
                      onChange={e => setAddress({ ...address, city: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>ZIP (optional)</label>
                    <input
                      value={address.zipCode}
                      onChange={e => setAddress({ ...address, zipCode: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Country</label>
                    <input
                      value={address.country}
                      onChange={e => setAddress({ ...address, country: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Shipping method */}
            <div id="checkout-shipping" className="scroll-mt-24 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <SectionHeader step="shipping" label="2. Shipping method" icon={Truck} />
              <div className="space-y-2 p-4">
                {SHIPPING_METHODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setShipping(m.id)}
                    className={`flex w-full items-center justify-between rounded-md border p-3 text-left transition-all ${
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
              </div>
            </div>

            {/* 3. Payment */}
            <div id="checkout-payment" className="scroll-mt-24 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <SectionHeader step="payment" label="3. Payment" icon={CreditCard} />
              <div className="space-y-2 p-4">
                <div className="grid gap-2">
                  {PAYMENT_METHODS.map(m => {
                    const Icon = { CreditCard, Smartphone, Banknote, ShieldCheck, Wallet }[m.icon] || Banknote;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setPayment(m.id)}
                        className={`flex items-center justify-between rounded-md border p-3 text-left transition-all ${
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
                {payment !== 'pm-cod' && (
                  <p className="text-xs text-gray-500">
                    You'll be securely redirected to complete your{' '}
                    {PAYMENT_METHODS.find(m => m.id === payment)?.name} payment after
                    placing the order.
                  </p>
                )}
                <button
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                  className="mt-3 w-full rounded-md bg-brand-600 py-3.5 text-sm font-black text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
                >
                  {submitting ? 'Placing order…' : `Place order · ${formatMoneyDecimal(total)}`}
                </button>
                <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> 256-bit SSL encrypted. By placing your order you agree to our Terms.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Order summary */}
          <div>
            <div className="sticky top-32 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-4 text-base font-black text-gray-900 dark:text-white">
                Order Summary
              </h2>

              {/* Out-of-stock validation errors */}
              {validationError && validationResult && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <p className="text-sm font-bold text-red-700 dark:text-red-400">
                      Stock validation failed
                    </p>
                  </div>
                  <p className="mb-2 text-xs text-red-600 dark:text-red-400">{validationError}</p>
                  <div className="space-y-2">
                    {validationResult.invalidVariationIds.map(vid => {
                      const item = items.find(i => i.variationId === vid);
                      const cartItem = validationResult.items.find(v => v.variation_id === vid);
                      return (
                        <div key={vid} className="flex items-center justify-between rounded-lg bg-red-100 dark:bg-red-900/30 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-red-900 dark:text-red-100 truncate">
                              {item?.name ?? vid}
                            </p>
                            <p className="text-[10px] text-red-600 dark:text-red-400">
                              {cartItem && !cartItem.in_stock
                                ? `Out of stock`
                                : `Only ${cartItem?.available ?? '?'} available`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {cartItem?.available ? (
                              <>
                                <button
                                  onClick={() => updateItemQty(vid, -1)}
                                  className="flex h-5 w-5 items-center justify-center rounded bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 hover:bg-red-300 dark:hover:bg-red-700"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="text-xs font-bold text-red-900 dark:text-red-100 w-5 text-center">
                                  {item?.quantity ?? '?'}
                                </span>
                                <button
                                  onClick={() => updateItemQty(vid, 1)}
                                  className="flex h-5 w-5 items-center justify-center rounded bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 hover:bg-red-300 dark:hover:bg-red-700"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </>
                            ) : null}
                            <button
                              onClick={() => removeItem(vid)}
                              className="flex h-5 w-5 items-center justify-center rounded bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 hover:bg-red-300 dark:hover:bg-red-700"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={runValidation}
                    disabled={validating}
                    className="mt-3 w-full rounded-lg bg-red-600 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {validating ? 'Validating…' : 'Re-validate Cart'}
                  </button>
                </div>
              )}

              <ul className="max-h-72 space-y-3 overflow-y-auto scrollbar-thin">
                {items.map(item => (
                  <li key={item.variationId} className="flex gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      {item.image ? (
                        <Image src={imageUrl(item.image) || ''} alt={item.name} fill sizes="56px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="text-lg font-bold text-gray-300 dark:text-gray-600">{item.name[0]}</span>
                        </div>
                      )}
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-bold text-white">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <p className="line-clamp-1 text-xs font-semibold text-gray-900 dark:text-gray-100">{item.name}</p>
                      {Object.keys(item.attributes).length > 0 && (
                        <p className="mt-0.5 flex flex-wrap gap-1">
                          {Object.entries(item.attributes).map(([k, v]) => (
                            <span
                              key={k}
                              className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                            >
                              {k}: <span className="font-semibold">{v}</span>
                            </span>
                          ))}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {formatMoney(item.unitPrice)} × {item.quantity}
                      </p>
                      <button
                        type="button"
                        onClick={() => openVariantEditor(item)}
                        className="mt-1 inline-flex w-fit items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
                      >
                        Change variant
                      </button>
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
                  <dt>Shipping ({shipMethod?.name ?? 'Shipping'})</dt>
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

      {/* Change-variant modal */}
      {editingItemId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditingItemId(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 dark:text-white">
                Change variant{editProduct ? ` — ${editProduct.name}` : ''}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItemId(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {editLoading || !editProduct ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
              </div>
            ) : (
              <>
                {editProduct.variations.length > 1 ? (
                  <VariantSelector
                    variations={editProduct.variations}
                    value={editSelected}
                    onChange={setEditSelected}
                  />
                ) : (
                  <p className="py-4 text-center text-sm text-gray-500">
                    This product has only one option.
                  </p>
                )}
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingItemId(null)}
                    className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmVariantChange}
                    className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
                  >
                    Update
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}