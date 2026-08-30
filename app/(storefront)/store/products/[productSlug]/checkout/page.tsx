'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import {
  Check,
  ChevronDown,
  Lock,
  Truck,
  Wallet,
  Zap,
  Loader2,
  ArrowRight,
  Banknote,
} from 'lucide-react';
import storefrontService from '@/services/storefrontService';
import checkoutService, { type PlaceOrderPayload } from '@/services/checkoutService';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import { formatMoney, STORE_INFO, SHIPPING_METHODS } from '@/lib/storefront/mock-data';
import { imageUrl } from '@/lib/image-url';
import { notify } from '@/lib/notifications';
import type { Product, ProductVariation, Address } from '@/types/storefront';
import Spinner from '@/components/ui/spinner';

type Step = 'contact' | 'address' | 'shipping' | 'payment';

/**
 * A product may have no variations in the storefront payload. In that case we
 * treat the product itself as a single implicit variation so Express Checkout
 * can still operate on it (using the product's own stock/price).
 */
function normalizeVariations(p: Product): ProductVariation[] {
  if (p.variations.length > 0) return p.variations;
  return [
    {
      id: p.id,
      productId: p.id,
      sku: '',
      name: p.name,
      sellingPrice: p.sellingPrice ?? 0,
      stock: p.stock ?? 0,
      attributes: {},
      isDefault: true,
    },
  ];
}

/** Prefer an in-stock variation as the default selection. */
function pickDefaultVariation(list: ProductVariation[]): ProductVariation | undefined {
  return (
    list.find(v => (v.isDefault ?? false) && (v.stock ?? 0) > 0) ||
    list.find(v => (v.stock ?? 0) > 0) ||
    list.find(v => v.isDefault) ||
    list[0]
  );
}

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

const COD_METHOD = 'pm-cod';

export default function ExpressCheckoutPage() {
  const router = useRouter();
  const { productSlug } = useParams<{ productSlug: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [is404, setIs404] = useState(false);

  const [selectedVariationId, setSelectedVariationId] = useState('');
  const [qty, setQty] = useState(1);

  const { user, isAuthenticated } = useCustomerAuthStore();

  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [shipping] = useState(SHIPPING_METHODS[0]?.id ?? 'ship-standard');
  const [payment] = useState(COD_METHOD);

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  const [openStep, setOpenStep] = useState<Step>('contact');
  const [completed, setCompleted] = useState<Set<Step>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  // Authoritative stock status from the backend's cart/validate endpoint.
  const [stockStatus, setStockStatus] = useState<{
    valid: boolean;
    inStock: boolean;
    available: number;
    message?: string;
  } | null>(null);

  // ── Load product ───────────────────────────────────────────────
  useEffect(() => {
    if (!productSlug) return;
    let cancelled = false;
    setLoading(true);
    storefrontService
      .getProductBySlug(productSlug)
      .then(data => {
        if (cancelled) return;
        setProduct(data);
        // Prefer an in-stock variation as the default selection so the page
        // doesn't falsely report "out of stock" when only the default/first
        // variation lacks stock. Falls back to the product itself if it has no
        // variations.
        const list = normalizeVariations(data);
        const def = pickDefaultVariation(list);
        setSelectedVariationId(def?.id ?? '');
      })
      .catch(err => {
        if (cancelled) return;
        if (err?.response?.status === 404) setIs404(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productSlug]);

  // ── Load saved addresses (authenticated) ───────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingAddresses(true);
    checkoutService
      .getAddresses()
      .then(setSavedAddresses)
      .catch(() => setSavedAddresses([]))
      .finally(() => setLoadingAddresses(false));
  }, [isAuthenticated]);

  const variations = useMemo(
    () => (product ? normalizeVariations(product) : []),
    [product],
  );

  const variation = useMemo(
    () => variations.find(v => v.id === selectedVariationId) || variations[0],
    [variations, selectedVariationId],
  );

  const unitPrice = variation?.sellingPrice ?? 0;

  // ── Server-authoritative stock check ───────────────────────────
  // The storefront product payload's `stock` may not reflect the real
  // tenant-aware stock (it can read 0 even when the product is in stock), so we
  // ask the backend to validate availability whenever the selection/quantity
  // changes and treat that as the single source of truth.
  useEffect(() => {
    if (!product || !selectedVariationId || qty <= 0) {
      setStockStatus(null);
      return;
    }
    let cancelled = false;
    setValidating(true);
    checkoutService
      .validateCart([
        {
          variation_id: selectedVariationId,
          product_id: product.id,
          quantity: qty,
          unit_price: unitPrice,
        },
      ])
      .then((res) => {
        if (cancelled) return;
        const item = res.items?.[0];
        setStockStatus({
          valid: !!res.valid && !!item?.in_stock,
          inStock: !!item?.in_stock,
          available: item?.available ?? 0,
          message: res.message || item?.message,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setStockStatus({
          valid: false,
          inStock: false,
          available: 0,
          message: 'Unable to verify product availability. Please try again.',
        });
      })
      .finally(() => {
        if (!cancelled) setValidating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product, selectedVariationId, qty, unitPrice]);

  // Until the server responds we don't block on the (possibly stale) client
  // stock; once it responds, `serverOutOfStock` is authoritative.
  const serverOutOfStock = stockStatus ? !stockStatus.inStock || !stockStatus.valid : false;
  const stockMessage = stockStatus?.message || 'This product is unavailable or out of stock.';
  const maxQty = stockStatus ? stockStatus.available : (variation?.stock ?? 99);
  const qtyCap = maxQty > 0 ? maxQty : 99;
  const subtotal = unitPrice * qty;
  const shipMethod = SHIPPING_METHODS.find(s => s.id === shipping);
  const shippingCost =
    subtotal >= STORE_INFO.freeShippingThreshold || shipMethod?.isFree
      ? 0
      : (shipMethod?.rate ?? 0);
  // Tax is not configured in ecommerce settings yet — leave at 0 (disabled).
  const tax = 0;
  const total = subtotal + shippingCost + tax;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <Spinner size="lg" />
      </div>
    );
  }

  if (is404 || !product) {
    return (
      <div className="bg-gray-50 px-4 py-20 text-center dark:bg-gray-950">
        <p className="text-lg font-bold text-gray-900 dark:text-white">Product not found</p>
        <Link href="/store/products" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600">
          Continue shopping <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const selectSavedAddress = (a: Address) => setAddress({ ...a });

  const toggleStep = (step: Step) => {
    setOpenStep(step);
    setCompleted(prev => {
      const n = new Set(prev);
      if (n.has(step)) n.delete(step);
      return n;
    });
  };

  const completeStep = (step: Step, next?: Step) => {
    setCompleted(prev => new Set(prev).add(step));
    if (next) setOpenStep(next);
  };

  const handlePlaceOrder = async () => {
    if (!variation) return;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      notify.error('Please enter a valid email');
      setOpenStep('contact');
      return;
    }
    if (!address.name || !address.addressLine1 || !address.city || !address.phone) {
      notify.error('Please complete all required address fields');
      setOpenStep('address');
      return;
    }

    // Validate stock before placing.
    setValidating(true);
    setValidationError(null);
    try {
      const result = await checkoutService.validateCart([
        { variation_id: variation.id, product_id: variation.productId, quantity: qty, unit_price: unitPrice },
      ]);
      if (!result.valid) {
        const msg = result.message || 'This product is unavailable or out of stock.';
        setValidationError(msg);
        setValidating(false);
        notify.error(msg);
        return;
      }
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Validation failed. Please try again.');
      setValidating(false);
      return;
    }
    setValidating(false);

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
        payment_method: COD_METHOD,
        items: [
          {
            variation_id: variation.id,
            product_id: variation.productId,
            quantity: qty,
            unit_price: unitPrice,
          },
        ],
        customer_id: user?.id ? String(user.id) : undefined,
        express: true,
      };

      const order = await checkoutService.placeOrder(payload);
      notify.success('Order placed successfully!');

      const ref = order.uuid || order.id || order.invoice_number || '';
      router.push(
        `/store/checkout/success?o=${encodeURIComponent(String(ref))}&email=${encodeURIComponent(email)}`,
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Could not place your order. Please try again.';
      notify.error(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

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
      {/* Slim header */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-black text-gray-900 dark:text-white">
            UIMS<span className="text-brand-600">.</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <Zap className="h-3.5 w-3.5" /> Express Checkout · Cash on Delivery
          </span>
          <Link href={`/store/products/${product.slug}`} className="text-sm font-semibold text-gray-600 hover:text-brand-600 dark:text-gray-400">
            Back to product
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left: accordion form */}
          <div className="space-y-4">
            {/* Product summary */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {product.images[0] && (
                    <Image src={imageUrl(product.images[0]) || ''} alt={product.name} fill sizes="80px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{product.brand?.name}</p>
                  <h2 className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">{product.name}</h2>
                  {variation && Object.keys(variation.attributes).length > 0 && (
                    <p className="mt-0.5 text-xs text-gray-500">{Object.values(variation.attributes).join(' / ')}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-gray-900 dark:text-gray-100">{formatMoney(unitPrice)}</span>
                </div>
              </div>

              {/* Variant selector */}
              {variations.length > 1 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Select option</p>
                  <div className="flex flex-wrap gap-2">
                    {variations.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        disabled={v.stock <= 0}
                        onClick={() => setSelectedVariationId(v.id)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          v.id === selectedVariationId
                            ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300'
                            : 'border-gray-200 text-gray-700 hover:border-brand-400 dark:border-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {Object.values(v.attributes).join(' ') || v.name}
                        {v.stock <= 0 && ' (out)'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Quantity</span>
                <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    className="px-3 py-1.5 text-gray-600 disabled:opacity-40 dark:text-gray-300"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm font-bold">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(q => Math.min(qtyCap, q + 1))}
                    disabled={qty >= qtyCap}
                    className="px-3 py-1.5 text-gray-600 disabled:opacity-40 dark:text-gray-300"
                  >
                    +
                  </button>
                </div>
                {serverOutOfStock && <span className="text-xs font-semibold text-red-600">Out of stock</span>}
              </div>
            </div>

            {/* Contact */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <StepHeader step="contact" label="1. Contact information" icon={Wallet} />
              {openStep === 'contact' && (
                <div className="space-y-3 p-5">
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
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Saved addresses</p>
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
                                <p className="font-bold text-gray-900 dark:text-gray-100">{a.label || a.name}</p>
                                <p className="text-xs text-gray-500">{a.addressLine1}, {a.city}</p>
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
                        required
                        value={address.name}
                        onChange={e => setAddress({ ...address, name: e.target.value })}
                        placeholder="John Doe"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Phone</label>
                      <input
                        required
                        value={address.phone}
                        onChange={e => setAddress({ ...address, phone: e.target.value })}
                        placeholder="+880 1XXX-XXXXXX"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Address line 1</label>
                    <input
                      required
                      value={address.addressLine1}
                      onChange={e => setAddress({ ...address, addressLine1: e.target.value })}
                      placeholder="House, road, block"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">City</label>
                    <input
                      required
                      value={address.city}
                      onChange={e => setAddress({ ...address, city: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    />
                  </div>
                  <button
                    onClick={() => completeStep('address', 'shipping')}
                    disabled={!address.name || !address.addressLine1 || !address.city || !address.phone}
                    className="w-full rounded-lg bg-brand-600 py-3 text-sm font-bold text-white disabled:opacity-50 sm:w-auto sm:px-8"
                  >
                    Continue to shipping
                  </button>
                </div>
              )}
            </div>

            {/* Shipping */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <StepHeader step="shipping" label="3. Shipping method" icon={Truck} />
              {openStep === 'shipping' && (
                <div className="space-y-3 p-5">
                  {/* Express checkout uses a single default shipping method. */}
                  <div className="flex w-full items-center justify-between rounded-xl border border-brand-500 bg-brand-50 p-4 dark:bg-brand-950/30">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{shipMethod?.name}</p>
                      <p className="text-xs text-gray-500">{shipMethod?.estimatedDays}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {shipMethod?.isFree ? 'Free' : formatMoney(shipMethod?.rate ?? 0)}
                    </span>
                  </div>
                  <button
                    onClick={() => completeStep('shipping', 'payment')}
                    className="w-full rounded-lg bg-brand-600 py-3 text-sm font-bold text-white sm:w-auto sm:px-8"
                  >
                    Continue to payment
                  </button>
                </div>
              )}
            </div>

            {/* Payment (COD only) */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <StepHeader step="payment" label="4. Payment" icon={Lock} />
              {openStep === 'payment' && (
                <div className="space-y-3 p-5">
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <Banknote className="h-5 w-5 text-emerald-600" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Cash on Delivery</p>
                      <p className="text-xs text-gray-500">Express Checkout currently supports COD only.</p>
                    </div>
                    <Check className="h-5 w-5 text-emerald-600" />
                  </div>

                  {(serverOutOfStock || validationError) && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
                      {serverOutOfStock ? stockMessage : validationError}
                    </p>
                  )}

                  <button
                    onClick={handlePlaceOrder}
                    disabled={submitting || validating || serverOutOfStock}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
                  >
                    {submitting || validating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    {submitting
                      ? 'Placing order…'
                      : validating
                        ? 'Validating…'
                        : serverOutOfStock
                          ? stockMessage
                          : `Place Express Order · ${formatMoney(total)}`}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: order summary */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Order summary</h3>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal ({qty} item{qty > 1 ? 's' : ''})</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Shipping</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {shippingCost === 0 ? 'Free' : formatMoney(shippingCost)}
                  </span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Tax ({STORE_INFO.taxRate}%)</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formatMoney(tax)}</span>
                  </div>
                )}
                <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                  <span className="text-base font-bold text-gray-900 dark:text-gray-100">Total</span>
                  <span className="text-base font-bold text-gray-900 dark:text-gray-100">{formatMoney(total)}</span>
                </div>
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-500">
                <Lock className="h-3.5 w-3.5" /> Secure Express Checkout · Pay on delivery
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
