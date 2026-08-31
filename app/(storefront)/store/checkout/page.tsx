'use client';

import { useState, useEffect } from 'react';
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
import type { Address, Product } from '@/types/storefront';
import { notify } from '@/lib/notifications';
import checkoutService, { type ValidateCartResult } from '@/services/checkoutService';
import type { PlaceOrderPayload } from '@/services/checkoutService';
import storefrontService from '@/services/storefrontService';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import VariantSelector from '@/components/storefront/VariantSelector';

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
    updateItemVariation,
  } = useCartStore();

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSelected, setEditSelected] = useState('');

  const openVariantEditor = async (item: (typeof items)[number]) => {
    setEditingItemId(item.variationId);
    setEditSelected(item.variationId);
    setEditProduct(null);
    setEditLoading(true);
    try {
      const product = await storefrontService.getProductBySlug(item.slug);
      setEditProduct(product);
    } catch {
      notify.error('Failed to load product options');
      setEditingItemId(null);
    } finally {
      setEditLoading(false);
    }
  };

  const confirmVariantChange = () => {
    if (!editProduct || !editingItemId) return;
    const res = updateItemVariation(editingItemId, editProduct, editSelected);
    if (res.ok) {
      notify.success('Variant updated');
      setEditingItemId(null);
    } else {
      notify.error(res.message ?? 'Could not update variant');
    }
  };
  const { user, isAuthenticated } = useCustomerAuthStore();
  const { storeName } = useStorefrontStatus();

  const [openStep, setOpenStep] = useState<Step>('contact');
  const [completed, setCompleted] = useState<Set<Step>>(new Set());
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [shipping, setShipping] = useState(SHIPPING_METHODS[0]?.id ?? 'ship-standard');
  const [payment, setPayment] = useState('pm-cod');
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
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
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingAddresses(true);
    checkoutService
      .getAddresses()
      .then(setSavedAddresses)
      .catch(() => setSavedAddresses([]))
      .finally(() => setLoadingAddresses(false));
  }, [isAuthenticated]);

  const selectSavedAddress = (a: Address) => setAddress({ ...a });

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

    // Checkout form validation (shipping address + payment method)
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      notify.error('Please enter a valid email');
      return;
    }
    if (!address.name || !address.addressLine1 || !address.city || !address.phone) {
      notify.error('Please complete all required address fields');
      setOpenStep('address');
      return;
    }
    if (!payment) {
      notify.error('Please select a payment method');
      setOpenStep('payment');
      return;
    }

    setSubmitting(true);
    try {
      const payload: PlaceOrderPayload = {
        email,
        phone: address.phone || phone,
        address: {
          name: address.name,
          phone: address.phone || phone,
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
                                className={`rounded-xl border p-3 text-left text-sm transition-all ${
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
                    className="mt-4 w-full rounded-full bg-brand-600 py-4 text-base font-black text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
                  >
                    {submitting ? 'Placing order…' : `Place order · ${formatMoneyDecimal(total)}`}
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
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900"
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