'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, notFound } from 'next/navigation';
import {
  Star,
  Heart,
  Minus,
  Plus,
  Truck,
  RotateCcw,
  ShieldCheck,
  Share2,
  ChevronRight,
  Check,
  Zap,
} from 'lucide-react';
import { IoCartSharp } from 'react-icons/io5';
import {
  PRODUCTS,
  REVIEWS,
  formatMoney,
  formatMoneyDecimal,
  STORE_INFO,
} from '@/lib/storefront/mock-data';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { useCartFly } from '@/components/storefront/CartFlyProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { notify } from '@/lib/notifications';
import ecommerceSettingsService from '@/services/ecommerceSettingsService';
import Rating from '@/components/storefront/Rating';
import Badge from '@/components/storefront/Badge';
import ProductCard from '@/components/storefront/ProductCard';

export default function ProductDetailPage() {
  const { productSlug } = useParams<{ productSlug: string }>();
  const router = useRouter();
  const product = PRODUCTS.find(p => p.slug === productSlug);
  const { trackView } = useRecentlyViewed();

  useEffect(() => {
    if (product) trackView(product.id);
  }, [product, trackView]);

  const [activeImg, setActiveImg] = useState(0);
  const [selectedVariationId, setSelectedVariationId] = useState<string>('');
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [tab, setTab] = useState<'description' | 'specs' | 'reviews' | 'shipping'>('description');
  const [showSimilar, setShowSimilar] = useState(true);

  useEffect(() => {
    ecommerceSettingsService.get().then(s => setShowSimilar(s.show_similar_products)).catch(() => {});
  }, []);

  const addItem = useCartStore(s => s.addItem);
  const openCart = useCartStore(s => s.openDrawer);
  const wishlist = useWishlistStore();
  const isWished = product ? wishlist.has(product.id) : false;
  const { flyToCart } = useCartFly();

  const variation = useMemo(() => {
    if (!product) return null;
    const def = product.variations.find(v => v.isDefault) || product.variations[0];
    return product.variations.find(v => v.id === selectedVariationId) || def;
  }, [product, selectedVariationId]);

  if (!product || !variation) {
    notFound();
  }

  const mrp = variation.mrp;
  const price = variation.sellingPrice;
  const discountPct = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const inStock = variation.stock > 0;

  // Group attributes for selectors
  const attributeKeys = Object.keys(variation.attributes);
  // For variable products: group variations by attribute to build swatches
  const variationsByAttr = useMemo(() => {
    const map: Record<string, Record<string, typeof product.variations[0]>> = {};
    product.variations.forEach(v => {
      Object.entries(v.attributes).forEach(([k, val]) => {
        if (!map[k]) map[k] = {};
        if (!map[k][val]) map[k][val] = v;
      });
    });
    return map;
  }, [product]);

  const reviews = REVIEWS.filter(r => r.productId === product.id);
  const ratingDist = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => Math.round(r.rating) === stars).length,
  }));
  const related = PRODUCTS.filter(
    p => p.category.id === product.category.id && p.id !== product.id
  ).slice(0, 5);

  const handleAdd = (e: React.MouseEvent) => {
    const res = addItem(product.id, variation.id, qty);
    if (res.ok) {
      flyToCart(e, variation.image || product.images[0]);
    } else {
      notify.error(res.message || 'Could not add to bag');
    }
  };
  const handleBuyNow = () => {
    const res = addItem(product.id, variation.id, qty);
    if (res.ok) router.push('/store/checkout');
  };
  const handleWish = () => {
    wishlist.toggle(product.id);
    notify.success(isWished ? 'Removed from wishlist' : 'Added to wishlist');
  };

  return (
    <div className="bg-white dark:bg-gray-950">
      {/* Breadcrumb */}
      <div className="border-b border-gray-100 dark:border-gray-800">
        <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-1.5 px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/category/${product.category.slug}`} className="hover:text-brand-600">
            {product.category.name}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="line-clamp-1 text-gray-900 dark:text-gray-100">
            {product.name}
          </span>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:py-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Gallery */}
          <div className="lg:flex lg:gap-3">
            {/* Thumbnails on desktop */}
            {product.images.length > 1 && (
              <div className="order-2 mt-3 flex gap-2 lg:order-1 lg:mt-0 lg:flex-col">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all lg:w-20 ${
                      activeImg === i
                        ? 'border-brand-500 ring-2 ring-brand-500/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} ${i + 1}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
            {/* Main image */}
            <div className="order-1 flex-1">
              <div
                className="relative aspect-square overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
                onMouseEnter={() => setZoom(true)}
                onMouseLeave={() => setZoom(false)}
                onMouseMove={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setZoomPos({
                    x: ((e.clientX - rect.left) / rect.width) * 100,
                    y: ((e.clientY - rect.top) / rect.height) * 100,
                  });
                }}
              >
                <Image
                  src={product.images[activeImg]}
                  alt={product.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                  className={`object-cover transition-transform duration-300 ${
                    zoom ? 'scale-[1.6]' : 'scale-100'
                  }`}
                  style={
                    zoom
                      ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                      : undefined
                  }
                />
                <div className="absolute left-4 top-4 flex flex-col gap-1.5">
                  {discountPct > 0 && <Badge variant="sale">-{discountPct}%</Badge>}
                  {product.isNew && <Badge variant="new">New</Badge>}
                  {product.isBestseller && <Badge variant="bestseller">Bestseller</Badge>}
                </div>
                <button
                  onClick={handleWish}
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-all hover:scale-110 dark:bg-gray-900/90"
                  aria-label="Toggle wishlist"
                >
                  <Heart className={`h-5 w-5 transition-colors ${isWished ? 'fill-accent-500 text-accent-500' : 'text-gray-600 dark:text-gray-400'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Buy Box */}
          <div className="lg:py-2">
            {product.brand && (
              <Link
                href={`/brand/${product.brand.slug}`}
                className="text-xs font-bold uppercase tracking-wider text-brand-600 hover:underline dark:text-brand-400"
              >
                {product.brand.name}
              </Link>
            )}
            <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              {product.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4">
              <button
                onClick={() => setTab('reviews')}
                className="inline-flex items-center gap-2"
              >
                <Rating value={product.rating} size="md" showValue showCount={false} />
                <span className="text-sm text-gray-500 underline-offset-2 hover:underline">
                  {product.reviewCount} reviews
                </span>
              </button>
              <span className="text-gray-300">|</span>
              <span className={`inline-flex items-center gap-1 text-sm font-semibold ${inStock ? 'text-emerald-600' : 'text-red-600'}`}>
                <span className={`h-2 w-2 rounded-full ${inStock ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {inStock ? 'In stock' : 'Out of stock'}
              </span>
              {product.freeShipping && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                    <Truck className="h-4 w-4" /> Free shipping
                  </span>
                </>
              )}
            </div>

            {/* Price */}
            <div className="mt-5 flex flex-wrap items-end gap-3">
              <span className="text-4xl font-black text-gray-900 dark:text-white">
                {formatMoney(price)}
              </span>
              {mrp && mrp > price && (
                <span className="text-lg text-gray-400 line-through">
                  {formatMoney(mrp)}
                </span>
              )}
              {discountPct > 0 && (
                <span className="rounded-md bg-accent-50 px-2 py-1 text-xs font-bold text-accent-700 dark:bg-accent-950/30 dark:text-accent-400">
                  Save {formatMoney(mrp! - price)} ({discountPct}% off)
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">Inclusive of all taxes</p>

            {/* Short description */}
            {product.shortDescription && (
              <p className="mt-5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {product.shortDescription}
              </p>
            )}

            {/* Variation selectors */}
            {product.variations.length > 1 && (
              <div className="mt-6 space-y-4">
                {Object.keys(variationsByAttr).map(attrKey => {
                  const options = variationsByAttr[attrKey];
                  const values = Object.keys(options);
                  return (
                    <div key={attrKey}>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                        {attrKey}: <span className="text-gray-900 dark:text-gray-100">{variation.attributes[attrKey]}</span>
                      </p>
                      {attrKey.toLowerCase().includes('color') ? (
                        <div className="flex flex-wrap gap-2">
                          {values.map(val => {
                            const v = options[val];
                            const active = variation.id === v.id;
                            return (
                              <button
                                key={val}
                                onClick={() => setSelectedVariationId(v.id)}
                                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                                  active
                                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500/30 dark:bg-brand-950/30'
                                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                                }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {values.map(val => {
                            const v = options[val];
                            const active = variation.id === v.id;
                            const oos = v.stock <= 0;
                            return (
                              <button
                                key={val}
                                disabled={oos}
                                onClick={() => setSelectedVariationId(v.id)}
                                className={`min-w-[44px] rounded-lg border px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                                  active
                                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500/30 dark:bg-brand-950/30'
                                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                                }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quantity + Add to cart */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="flex h-11 w-11 items-center justify-center text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center text-base font-bold text-gray-900 dark:text-gray-100">
                  {qty}
                </span>
                <button
                  onClick={() => setQty(q => Math.min(variation.stock || 99, q + 1))}
                  disabled={qty >= variation.stock}
                  className="flex h-11 w-11 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {variation.stock > 0 && variation.stock <= 5 && (
                <span className="text-xs font-semibold text-accent-600">
                  Only {variation.stock} left — order soon
                </span>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={handleAdd}
                disabled={!inStock}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gray-900 py-3.5 text-sm font-bold text-white transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                <IoCartSharp className="h-5 w-5" />
                {inStock ? 'Add to Cart' : 'Sold Out'}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!inStock}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Zap className="h-5 w-5" />
                Buy Now
              </button>
              <button
                onClick={handleWish}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-accent-300 hover:text-accent-500 dark:border-gray-700 dark:text-gray-300"
                aria-label="Wishlist"
              >
                <Heart className={`h-5 w-5 ${isWished ? 'fill-accent-500 text-accent-500' : ''}`} />
              </button>
            </div>

            {/* Trust row */}
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
              {[
                { icon: Truck, title: 'Fast delivery', desc: `${product.estimatedDeliveryDays ?? 2}-${(product.estimatedDeliveryDays ?? 2) + 1} days` },
                { icon: RotateCcw, title: '7-day returns', desc: 'Hassle-free' },
                { icon: ShieldCheck, title: 'Secure', desc: 'Protected payment' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex flex-col items-center gap-1 text-center">
                  <Icon className="h-5 w-5 text-brand-600" />
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{title}</p>
                  <p className="text-[10px] text-gray-500">{desc}</p>
                </div>
              ))}
            </div>

            {/* SKU + share */}
            <div className="mt-5 flex items-center justify-between text-xs text-gray-500">
              <span>SKU: <span className="font-semibold text-gray-700 dark:text-gray-300">{variation.sku}</span></span>
              <button className="inline-flex items-center gap-1.5 font-semibold text-gray-600 hover:text-brand-600">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-12 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {([
              ['description', 'Description'],
              ['specs', 'Specifications'],
              ['reviews', `Reviews (${reviews.length})`],
              ['shipping', 'Shipping & Returns'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`relative whitespace-nowrap px-5 py-3 text-sm font-bold transition-colors ${
                  tab === id
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {label}
                {tab === id && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-600" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="prose prose-sm mt-6 max-w-none dark:prose-invert">
          {tab === 'description' && (
            <div>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                {product.description}
              </p>
            </div>
          )}
          {tab === 'specs' && (
            <dl className="grid gap-3 sm:grid-cols-2">
              {Object.entries(variation.attributes).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-gray-100 py-2 text-sm dark:border-gray-800">
                  <dt className="font-semibold text-gray-600 dark:text-gray-400">{k}</dt>
                  <dd className="text-gray-900 dark:text-gray-100">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between border-b border-gray-100 py-2 text-sm dark:border-gray-800">
                <dt className="font-semibold text-gray-600 dark:text-gray-400">Brand</dt>
                <dd className="text-gray-900 dark:text-gray-100">{product.brand?.name}</dd>
              </div>
              <div className="flex justify-between border-b border-gray-100 py-2 text-sm dark:border-gray-800">
                <dt className="font-semibold text-gray-600 dark:text-gray-400">Category</dt>
                <dd className="text-gray-900 dark:text-gray-100">{product.category.name}</dd>
              </div>
              <div className="flex justify-between border-b border-gray-100 py-2 text-sm dark:border-gray-800">
                <dt className="font-semibold text-gray-600 dark:text-gray-400">SKU</dt>
                <dd className="text-gray-900 dark:text-gray-100">{variation.sku}</dd>
              </div>
            </dl>
          )}
          {tab === 'reviews' && (
            <div>
              {/* Summary */}
              <div className="grid gap-6 sm:grid-cols-[260px_1fr]">
                <div className="text-center">
                  <p className="text-5xl font-black text-gray-900 dark:text-white">
                    {product.rating.toFixed(1)}
                  </p>
                  <div className="mt-2 flex justify-center">
                    <Rating value={product.rating} size="md" showValue={false} showCount={false} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Based on {product.reviewCount} reviews
                  </p>
                </div>
                <div className="space-y-1.5">
                  {ratingDist.map(r => (
                    <div key={r.stars} className="flex items-center gap-2 text-xs">
                      <span className="w-8 text-gray-500">{r.stars}★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full bg-amber-400"
                          style={{ width: `${reviews.length > 0 ? (r.count / reviews.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-8 text-gray-500">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* List */}
              <ul className="mt-8 space-y-6">
                {reviews.length === 0 && (
                  <li className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500 dark:border-gray-700">
                    No reviews yet. Be the first to review this product.
                  </li>
                )}
                {reviews.map(r => (
                  <li key={r.id} className="border-b border-gray-100 pb-6 dark:border-gray-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950/40">
                            {r.customerName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{r.customerName}</p>
                            {r.isVerifiedPurchase && (
                              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                                <Check className="h-3 w-3" /> Verified purchase
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <Rating value={r.rating} size="sm" showValue={false} showCount={false} />
                    </div>
                    <h4 className="mt-3 text-sm font-bold text-gray-900 dark:text-gray-100">{r.title}</h4>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{r.body}</p>
                    <p className="mt-2 text-xs text-gray-400">{r.date}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tab === 'shipping' && (
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <p>
                <strong className="text-gray-900 dark:text-gray-100">Delivery:</strong>{' '}
                Estimated {product.estimatedDeliveryDays ?? 2}-{(product.estimatedDeliveryDays ?? 2) + 1} business days
                within major cities. Up to 5 days elsewhere.
              </p>
              <p>
                <strong className="text-gray-900 dark:text-gray-100">Returns:</strong>{' '}
                Free returns within {STORE_INFO.freeShippingThreshold >= 0 ? '7' : '7'} days of delivery.
                Items must be unused and in original packaging.
              </p>
              <p>
                <strong className="text-gray-900 dark:text-gray-100">Warranty:</strong>{' '}
                Manufacturer warranty applies. Contact our support team for assistance.
              </p>
            </div>
          )}
        </div>

        {/* Related products */}
        {showSimilar && related.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-5 text-xl font-black text-gray-900 dark:text-white sm:text-2xl">
              You may also like
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {related.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile sticky add-to-cart bar */}
      <div className="fixed inset-x-0 bottom-14 z-30 flex items-center gap-3 border-t border-gray-200 bg-white/95 p-3 backdrop-blur-md lg:hidden dark:border-gray-800 dark:bg-gray-950/95">
        <div className="flex-1">
          <p className="line-clamp-1 text-xs font-semibold text-gray-900 dark:text-gray-100">{product.name}</p>
          <p className="text-sm font-black text-brand-600">{formatMoney(price)}</p>
        </div>
        <button
          onClick={handleAdd}
          disabled={!inStock}
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          <IoCartSharp className="h-4 w-4" />
          Add
        </button>
        <button
          onClick={handleBuyNow}
          disabled={!inStock}
          className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
          <Zap className="h-4 w-4" />
          Buy
        </button>
      </div>
    </div>
  );
}