'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter, useParams } from 'next/navigation';
import {
  Check,
  Lock,
  Truck,
  Zap,
  Loader2,
  ArrowRight,
  Banknote,
} from 'lucide-react';
import checkoutService, { type PlaceOrderPayload } from '@/services/checkoutService';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import { useProductBySlug } from '@/hooks/use-storefront-data';
import { formatMoney } from '@/lib/storefront/mock-data';
import { imageUrl } from '@/lib/image-url';
import { notify } from '@/lib/notifications';
import type { Product, ProductVariation, Address } from '@/types/storefront';
import Spinner from '@/components/ui/spinner';
import {
  expressCheckoutPayloadSchema,
  flattenFieldErrors,
  EXPRESS_CITY,
  EXPRESS_COUNTRY,
  EXPRESS_SHIPPING_METHOD,
  EXPRESS_PAYMENT_METHOD,
} from '@/lib/utils/validation';

/** Fixed express delivery fee (৳) — always applied inside Dhaka. */
const EXPRESS_SHIPPING_FEE = 120;

/** Payload path → form field key for inline error display. */
const FIELD_ALIAS: Record<string, string> = {
  email: 'email',
  phone: 'phone',
  'address.name': 'name',
  'address.phone': 'phone',
  'address.address_line1': 'addressLine1',
  'address.address_line2': 'addressLine2',
  'address.city': 'city',
  'address.zip_code': 'zipCode',
  'address.country': 'country',
  'items.0.quantity': 'quantity',
};

/** Client-only captcha (canvas + reload) to block bots on order placement. */
const CaptchaBox = dynamic(() => import('@/components/storefront/CaptchaBox'), {
  ssr: false,
  loading: () => <div className="h-10 w-40 animate-pulse rounded-sm bg-gray-200 dark:bg-gray-800" />,
});

const inputCls =
  'w-full rounded-sm border bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500';

/** Border colour for an input — red when the field has a validation error. */
const borderCls = (hasError: boolean) =>
  hasError
    ? 'border-red-400 dark:border-red-500/70'
    : 'border-gray-300 dark:border-gray-700';

/** Inline field-error text helper. */
const fieldError = (message?: string) =>
  message ? <p className="mt-1 text-xs font-medium text-red-600">{message}</p> : null;

const labelCls = 'mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300';

const cardCls = 'rounded-md border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900';

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

const emptyAddress = (): Address => ({
  id: '',
  label: 'Shipping',
  name: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: EXPRESS_CITY,
  zipCode: '',
  country: EXPRESS_COUNTRY,
  isDefault: true,
});

export default function ExpressCheckoutPage() {
  const router = useRouter();
  const { productSlug } = useParams<{ productSlug: string }>();
  const { user } = useCustomerAuthStore();
  const { storeName } = useStorefrontStatus();

  // Product — SWR (shared cache with the product detail page); 404 is terminal.
  const { product, loading, is404 } = useProductBySlug(productSlug);

  const [selectedVariationId, setSelectedVariationId] = useState('');
  const [qty, setQty] = useState(1);

  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState<Address>(() => ({
    ...emptyAddress(),
    name: user?.name || '',
    phone: user?.phone || '',
  }));

  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [captchaInput, setCaptchaInput] = useState('');
  // Inline field errors from the zod payload schema (keyed by form field).
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Refs for focusing the first invalid field on submit.
  const qtyRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLSelectElement>(null);

  /** Drop an inline error once the user edits the affected field. */
  const clearFieldError = (field: string) =>
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  // Authoritative stock status from the backend's cart/validate endpoint.
  const [stockStatus, setStockStatus] = useState<{
    valid: boolean;
    inStock: boolean;
    available: number;
    message?: string;
  } | null>(null);

  // ── Default variation once the product arrives from SWR ─────────
  useEffect(() => {
    if (!product) return;
    // Prefer an in-stock variation as the default selection so the page
    // doesn't falsely report "out of stock" when only the default/first
    // variation lacks stock. Falls back to the product itself if it has no
    // variations.
    const def = pickDefaultVariation(normalizeVariations(product));
    setSelectedVariationId(def?.id ?? '');
  }, [product]);

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
  const shippingCost = EXPRESS_SHIPPING_FEE;
  const tax = 0;
  const total = subtotal + shippingCost + tax;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
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

  const handlePlaceOrder = async () => {
    if (!variation) return;

    // Zod payload validation — mirrors the backend rules. Replaces the old ad-hoc
    // per-field checks so the UI can't drift from what the server accepts.
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
      shipping_method_id: EXPRESS_SHIPPING_METHOD,
      payment_method: EXPRESS_PAYMENT_METHOD,
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

    const parsed = expressCheckoutPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      const issues = flattenFieldErrors(parsed.error.issues);
      const mapped: Record<string, string> = {};
      for (const [key, msg] of Object.entries(issues)) {
        mapped[FIELD_ALIAS[key] ?? key] = msg;
      }
      setFieldErrors(mapped);

      // Focus the first invalid field (top-down order) without a toast.
      const focusOrder: Array<[string, HTMLElement | null]> = [
        ['quantity', qtyRef.current],
        ['name', nameRef.current],
        ['phone', phoneRef.current],
        ['email', emailRef.current],
        ['addressLine1', addressRef.current],
        ['city', cityRef.current],
      ];
      const first = focusOrder.find(([field]) => mapped[field]);
      first?.[1]?.focus();
      return;
    }
    setFieldErrors({});

    // Human verification — blocks automated bots from placing orders.
    if (!captchaInput.trim()) {
      notify.error('Please enter the captcha code');
      return;
    }
    const { validateCaptcha } = await import('react-simple-captcha');
    if (!validateCaptcha(captchaInput.trim())) {
      notify.error('Captcha does not match. Please try again.');
      setCaptchaInput('');
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

  return (
    <div className="bg-gray-50 dark:bg-gray-950">
      {/* Slim header */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-black text-gray-900 dark:text-white">
            {storeName || 'Store'}<span className="text-brand-600">.</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <Zap className="h-3.5 w-3.5" /> Express Checkout · Cash on Delivery
          </span>
          <Link href={`/store/products/${product.slug}`} className="text-sm font-semibold text-gray-600 hover:text-brand-600 dark:text-gray-400">
            Back to product
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left: product + single delivery form */}
          <div className="space-y-4">
            {/* Product summary */}
            <div className={`${cardCls} p-4`}>
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
                        className={`rounded-sm border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
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
                <div className="flex items-center rounded-sm border border-gray-300 dark:border-gray-700">
                  <button
                    type="button"
                    ref={qtyRef}
                    onClick={() => {
                      setQty(q => Math.max(1, q - 1));
                      clearFieldError('quantity');
                    }}
                    disabled={qty <= 1}
                    className="px-3 py-1.5 text-gray-600 disabled:opacity-40 dark:text-gray-300"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm font-bold">{qty}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setQty(q => Math.min(qtyCap, q + 1));
                      clearFieldError('quantity');
                    }}
                    disabled={qty >= qtyCap}
                    className="px-3 py-1.5 text-gray-600 disabled:opacity-40 dark:text-gray-300"
                  >
                    +
                  </button>
                </div>
                {serverOutOfStock && <span className="text-xs font-semibold text-red-600">Out of stock</span>}
                {fieldErrors.quantity && <span className="text-xs font-semibold text-red-600">{fieldErrors.quantity}</span>}
              </div>
            </div>

            {/* Delivery details */}
            <div className={`${cardCls} p-5`}>
              <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-gray-100">Delivery details</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Full name</label>
                  <input
                    required
                    ref={nameRef}
                    value={address.name}
                    onChange={e => {
                      setAddress({ ...address, name: e.target.value });
                      clearFieldError('name');
                    }}
                    placeholder="John Doe"
                    className={`${inputCls} ${borderCls(!!fieldErrors.name)}`}
                  />
                  {fieldError(fieldErrors.name)}
                </div>
                <div>
                  <label className={labelCls}>Mobile</label>
                  <input
                    type="tel"
                    required
                    ref={phoneRef}
                    value={address.phone}
                    onChange={e => {
                      setAddress({ ...address, phone: e.target.value });
                      clearFieldError('phone');
                    }}
                    placeholder="+880 1XXX-XXXXXX"
                    className={`${inputCls} ${borderCls(!!fieldErrors.phone)}`}
                  />
                  {fieldError(fieldErrors.phone)}
                </div>
              </div>
              <div className="mt-3">
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  required
                  ref={emailRef}
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    clearFieldError('email');
                  }}
                  placeholder="you@example.com"
                  className={`${inputCls} ${borderCls(!!fieldErrors.email)}`}
                />
                {fieldError(fieldErrors.email)}
              </div>
              <div className="mt-3">
                <label className={labelCls}>Address</label>
                <input
                  required
                  ref={addressRef}
                  value={address.addressLine1}
                  onChange={e => {
                    setAddress({ ...address, addressLine1: e.target.value });
                    clearFieldError('addressLine1');
                  }}
                  placeholder="House, road, area"
                  className={`${inputCls} ${borderCls(!!fieldErrors.addressLine1)}`}
                />
                {fieldError(fieldErrors.addressLine1)}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>City</label>
                  <select
                    value={address.city}
                    ref={cityRef}
                    onChange={e => {
                      setAddress({ ...address, city: e.target.value });
                      clearFieldError('city');
                    }}
                    className={`${inputCls} ${borderCls(!!fieldErrors.city)}`}
                  >
                    <option value={EXPRESS_CITY}>{EXPRESS_CITY}</option>
                  </select>
                  {fieldError(fieldErrors.city)}
                </div>
                <div>
                  <label className={labelCls}>Country</label>
                  <input
                    disabled
                    value={address.country}
                    className={`${inputCls} cursor-not-allowed bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-400 ${borderCls(!!fieldErrors.country)}`}
                  />
                  {fieldError(fieldErrors.country)}
                </div>
              </div>
            </div>

            {/* Shipping (fixed, always selected) */}
            <div className={`${cardCls} p-4`}>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="mt-0.5 h-4 w-4 disabled:cursor-not-allowed"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-gray-100">
                      <Truck className="h-4 w-4 text-brand-600" /> Express Delivery
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-500">Inside Dhaka · 1-2 days</span>
                  </span>
                </label>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatMoney(shippingCost)}</span>
              </div>
            </div>

            {/* Payment (COD only) */}
            <div className={`${cardCls} flex items-center justify-between gap-3 p-4`}>
              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Cash on Delivery</p>
                  <p className="text-xs text-gray-500">Pay when you receive your order</p>
                </div>
              </div>
              <Check className="h-5 w-5 text-emerald-600" />
            </div>

            {(serverOutOfStock || validationError) && (
              <p className="rounded-sm bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
                {serverOutOfStock ? stockMessage : validationError}
              </p>
            )}

            {/* Security captcha */}
            <div className={`${cardCls} p-4`}>
              <label className={labelCls}>Security Check</label>
              <div className="flex flex-wrap items-start gap-3">
                <CaptchaBox />
                <input
                  value={captchaInput}
                  onChange={e => setCaptchaInput(e.target.value.toUpperCase())}
                  placeholder="Enter the code above"
                  maxLength={6}
                  autoComplete="off"
                  className={`${inputCls} min-w-40 flex-1`}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">Type the characters shown above. Click the link to reload a new code.</p>
            </div>

            {/* Place order */}
            <button
              onClick={handlePlaceOrder}
              disabled={submitting || validating || serverOutOfStock}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-emerald-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
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
            <p className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
              <Lock className="h-3.5 w-3.5" /> Secure Express Checkout · Pay on delivery
            </p>
          </div>

          {/* Right: order summary */}
          <div className="space-y-4">
            <div className={`${cardCls} p-5`}>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Order summary</h3>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal ({qty} item{qty > 1 ? 's' : ''})</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Shipping (Express)</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{formatMoney(shippingCost)}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Tax ({tax}%)</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formatMoney(tax)}</span>
                  </div>
                )}
                <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                  <span className="text-base font-bold text-gray-900 dark:text-gray-100">Total</span>
                  <span className="text-base font-bold text-brand-600">{formatMoney(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}