'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Image as ImageIcon,
} from 'lucide-react';
import { IoCartSharp } from 'react-icons/io5';
import ProductMagnifier from '@/components/storefront/ProductMagnifier';
import {
  STORE_INFO,
} from '@/lib/storefront/mock-data';
import { formatMoney, formatMoneyDecimal } from '@/lib/utils/format';
import { useSeo } from '@/lib/utils/use-seo';
import { productJsonLd } from '@/lib/utils/seo';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import {
  useProductBySlug,
  useRelatedProducts,
  useProductReviews,
  useShowSimilarProducts,
} from '@/hooks/use-storefront-data';
import { useCartFly } from '@/components/storefront/CartFlyProvider';
import { useRouter } from 'next/navigation';
import { notify } from '@/lib/notifications';
import { imageUrl } from '@/lib/image-url';
import SafeHTML from '@/components/ui/safe-html';
import storefrontService from '@/services/storefrontService';
import { useCustomerAuthStore } from '@/stores/customer-auth-store';
import Rating from '@/components/storefront/Rating';
import Badge from '@/components/storefront/Badge';
import ProductCard from '@/components/storefront/ProductCard';
import ScrollReveal from '@/components/storefront/ScrollReveal';
import VariantSelector from '@/components/storefront/VariantSelector';

export default function ProductDetailPage() {
  const { productSlug } = useParams<{ productSlug: string }>();
  const router = useRouter();
  const { trackView } = useRecentlyViewed();

  // Product + related + reviews — all SWR; keys stay null until the product loads.
  const { product, is404, loading } = useProductBySlug(productSlug);
  const { related } = useRelatedProducts(product?.category?.id, product?.id);
  const {
    reviews,
    summary: reviewSummary,
    loading: reviewsLoading,
    mutate: mutateReviews,
  } = useProductReviews(product?.slug);
  const showSimilar = useShowSimilarProducts();

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewDraft, setReviewDraft] = useState({ rating: 5, title: '', body: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewPendingMsg, setReviewPendingMsg] = useState(false);

  const isAuthed = useCustomerAuthStore(s => s.isAuthenticated);
  const { expressCheckoutEnabled, storeName } = useStorefrontStatus();
  const siteName = storeName || 'Our Store';

  useEffect(() => {
    if (product) trackView(product.id);
  }, [product, trackView]);

  const [activeImg, setActiveImg] = useState(0);
  const [selectedVariationId, setSelectedVariationId] = useState<string>('');
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'description' | 'specs' | 'reviews' | 'shipping'>('description');

  const productImage = product?.images?.[0];
  const defaultVariation = product?.variations?.[0];
  useSeo({
    title: product ? `${product.name} | ${siteName}` : `Product | ${siteName}`,
    description: product?.shortDescription || product?.description?.slice(0, 160),
    image: productImage,
    type: 'product',
    url: `/store/products/${productSlug}`,
    jsonLd: product
      ? productJsonLd({
          name: product.name,
          description: product.shortDescription || product.description,
          image: productImage,
          url: `/store/products/${productSlug}`,
          sku: defaultVariation?.sku,
          price: defaultVariation?.sellingPrice,
          availability: (defaultVariation?.stock ?? 0) > 0,
          brand: product.brand?.name,
        })
      : undefined,
  });

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

  if (is404) notFound();

  if (loading) {
    return (
      <div className="mx-auto max-w-screen-2xl px-4 py-6 lg:py-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="aspect-square animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="space-y-4">
            <div className="h-4 w-1/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-8 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-10 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-24 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-12 w-full animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!product || !variation) {
    notFound();
  }

  const mrp = variation.mrp;
  const price = variation.sellingPrice;
  const discountPct = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const inStock = variation.stock > 0;
  const showExpress = expressCheckoutEnabled && inStock && !!product?.slug;

  // Group attributes for selectors
  const attributeKeys = Object.keys(variation.attributes);

  const totalReviews = reviewSummary?.total ?? reviews.length;
  const avgRating = reviewSummary?.average ?? product?.rating ?? 0;
  const ratingDist = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviewSummary ? (reviewSummary.distribution[stars] ?? 0) : reviews.filter(r => Math.round(r.rating) === stars).length,
  }));

  const handleAdd = (e: React.MouseEvent) => {
    const res = addItem(product, variation.id, qty);
    if (res.ok) {
      flyToCart(e, imageUrl(variation.image) || imageUrl(product.images[0]) || '', product.name);
    } else {
      notify.error(res.message || 'Could not add to bag');
    }
  };
  const handleBuyNow = () => {
    const res = addItem(product, variation.id, qty);
    if (res.ok) router.push('/store/checkout');
  };
  const handleWish = () => {
    wishlist.toggle(product.id);
    notify.success(isWished ? 'Removed from wishlist' : 'Added to wishlist');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setReviewSubmitting(true);
    try {
      await storefrontService.submitReview({
        product_slug: product.slug,
        rating: reviewDraft.rating,
        title: reviewDraft.title,
        review: reviewDraft.body,
      });
      notify.success('Review submitted! It will appear after moderation.');
      setShowReviewForm(false);
      setReviewDraft({ rating: 5, title: '', body: '' });
      setReviewPendingMsg(true);
      mutateReviews(); // refresh count/summary from SWR cache
    } catch {
      notify.error('Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-950">
      {/* Breadcrumb */}
      <div className="border-b border-gray-100 dark:border-gray-800">
        <nav className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-1.5 px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/store/category/${product.category.slug}`} className="hover:text-brand-600">
            {product.category.name}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="line-clamp-1 text-gray-900 dark:text-gray-100">
            {product.name}
          </span>
        </nav>
      </div>

      <div className="mx-auto max-w-screen-2xl px-4 py-6 lg:py-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Gallery */}
          <ScrollReveal animation="fade-up" duration="normal" as="div" className="lg:flex lg:gap-3">
            {/* Thumbnails on desktop */}
            {product.images.length > 1 && (
              <div className="order-2 mt-3 flex gap-2 lg:order-1 lg:mt-0 lg:flex-col">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-md border-2 transition-all lg:w-20 ${activeImg === i
                      ? 'border-brand-500 ring-2 ring-brand-500/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                      }`}
                  >
                    <Image
                      src={imageUrl(img) || ''}
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
              <div className="relative aspect-square overflow-hidden rounded-lg border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                {product.images[activeImg] ? (
                  <ProductMagnifier
                    src={imageUrl(product.images[activeImg]) || ''}
                    largeSrc={
                      imageUrl(product.imagesLarge?.[activeImg]) ||
                      imageUrl(product.images[activeImg]) ||
                      ''
                    }
                    alt={product.name}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-16 w-16 text-gray-300 dark:text-gray-600" />
                  </div>
                )}
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

          </ScrollReveal>

          {/* Buy Box */}
          <ScrollReveal animation="slide-right" duration="normal" as="div" className="lg:py-2">
            {product.brand && (
              <Link
                href={`/store/brand/${product.brand.slug}`}
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
                <Rating value={avgRating} size="md" showValue showCount={false} />
                <span className="text-sm text-gray-500 underline-offset-2 hover:underline">
                  {totalReviews} reviews
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
                <VariantSelector
                  variations={product.variations}
                  value={variation.id}
                  onChange={setSelectedVariationId}
                />
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
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-gray-900 text-sm font-bold text-white transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                <IoCartSharp className="h-4 w-4" />
                {inStock ? 'Add to Cart' : 'Sold Out'}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!inStock}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-brand-600 text-sm font-bold text-white transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Zap className="h-4 w-4" />
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

            {showExpress && (
              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => router.push(`/store/products/${product?.slug}/checkout`)}
                  title="Express checkout — pay with Cash on Delivery (COD)"
                  className="group relative flex h-11 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition-all hover:from-emerald-600 hover:to-emerald-700 hover:shadow-md"
                >
                  {/* Shine sweep on hover */}
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/25 transition-transform duration-700 ease-out group-hover:translate-x-full" />
                  <Zap className="h-4 w-4 shrink-0" />
                  Express Checkout
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">COD</span>
                </button>
                {/* Spacer to match the Add to Cart button width */}
                <div className="flex-1" />
              </div>
            )}

            {/* Trust row */}
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
              {[
                { icon: Truck, title: 'Fast delivery', desc: `${product.estimatedDeliveryDays ?? 2}-${(product.estimatedDeliveryDays ?? 2) + 1} days` },
                { icon: RotateCcw, title: '7-day returns', desc: 'Hassle-free' },
                { icon: ShieldCheck, title: 'Secure', desc: 'Protected payment' },
              ].map(({ icon: Icon, title, desc }, i) => (
                <ScrollReveal key={title} animation="pop" staggerIndex={i} staggerGap={100}>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <Icon className="h-5 w-5 text-brand-600" />
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{title}</p>
                    <p className="text-[10px] text-gray-500">{desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* SKU + share */}
            <div className="mt-5 flex items-center justify-between text-xs text-gray-500">
              <span>SKU: <span className="font-semibold text-gray-700 dark:text-gray-300">{variation.sku}</span></span>
              <button className="inline-flex items-center gap-1.5 font-semibold text-gray-600 hover:text-brand-600">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </ScrollReveal>
        </div>

        {/* Tabs */}
        <div className="mt-12 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {([
              ['description', 'Description'],
              ['specs', 'Specifications'],
              ['reviews', `Reviews (${totalReviews})`],
              ['shipping', 'Shipping & Returns'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`relative whitespace-nowrap px-5 py-3 text-sm font-bold transition-colors ${tab === id
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
              <SafeHTML
                html={product.description}
                className="text-sm leading-relaxed text-gray-700 dark:text-gray-300"
              />
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
                    {avgRating.toFixed(1)}
                  </p>
                  <div className="mt-2 flex justify-center">
                    <Rating value={avgRating} size="md" showValue={false} showCount={false} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Based on {totalReviews} reviews
                  </p>
                </div>
                <div className="space-y-1.5">
                  {ratingDist.map(r => (
                    <div key={r.stars} className="flex items-center gap-2 text-xs">
                      <span className="w-8 text-gray-500">{r.stars}★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full bg-amber-400"
                          style={{ width: `${totalReviews > 0 ? (r.count / totalReviews) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-8 text-gray-500">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Write a review */}
              <div className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-800">
                {reviewPendingMsg && (
                  <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                    Thanks! Your review is awaiting moderation and will be published shortly.
                  </div>
                )}
                {!showReviewForm && (
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(true)}
                    className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    <Star className="h-4 w-4" /> Write a Review
                  </button>
                )}
                {showReviewForm && !isAuthed && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Please{' '}
                    <Link href="/store/account/login" className="font-semibold text-brand-600 underline">
                      log in
                    </Link>{' '}
                    to write a review.
                  </p>
                )}
                {showReviewForm && isAuthed && (
                  <form onSubmit={handleReviewSubmit} className="space-y-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button
                          type="button"
                          key={s}
                          onClick={() => setReviewDraft(d => ({ ...d, rating: s }))}
                          aria-label={`${s} star`}
                          className="cursor-pointer"
                        >
                          <Star
                            className={`h-6 w-6 ${s <= reviewDraft.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
                          />
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={reviewDraft.title}
                      onChange={e => setReviewDraft(d => ({ ...d, title: e.target.value }))}
                      placeholder="Review title"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <textarea
                      value={reviewDraft.body}
                      onChange={e => setReviewDraft(d => ({ ...d, body: e.target.value }))}
                      placeholder="Share your experience with this product..."
                      rows={4}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={reviewSubmitting}
                        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                      >
                        {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReviewForm(false)}
                        className="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* List */}
              <ul className="mt-8 space-y-6">
                {reviewsLoading && (
                  <li className="py-10 text-center text-sm text-gray-400">Loading reviews...</li>
                )}
                {!reviewsLoading && reviews.length === 0 && (
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
            <ScrollReveal animation="fade-up" as="div" className="mb-5">
              <h2 className="text-xl font-black text-gray-900 dark:text-white sm:text-2xl">
                You may also like
              </h2>
            </ScrollReveal>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {related.map((p, i) => (
                <ScrollReveal key={p.id} animation="zoom-in" staggerIndex={i}>
                  <ProductCard product={p} />
                </ScrollReveal>
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