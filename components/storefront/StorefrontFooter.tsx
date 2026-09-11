'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useBranding } from '@/hooks/use-branding';
import { useStorefrontCategories } from '@/hooks/use-storefront-categories';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import ScrollReveal from '@/components/storefront/ScrollReveal';
import footerService from '@/services/footerService';
import storefrontService from '@/services/storefrontService';
import type { FooterConfig, SocialLink } from '@/types/api.types';
import {
  Mail,
  Phone,
  MapPin,
  Truck,
  RotateCcw,
  ShieldCheck,
  Headphones,
  Gift,
  Sparkles,
  Star,
  Zap,
  HeartHandshake,
  Package,
  Clock,
  BadgePercent,
  Copyright,
} from 'lucide-react';
import { useStorefrontTheme } from '@/contexts/storefront-theme-context';
import GroceryFooter from '@/components/storefront/grocery/GroceryFooter';
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaLinkedin,
  FaTiktok,
  FaXTwitter,
} from 'react-icons/fa6';

const VALUE_PROP_ICONS: Record<string, any> = {
  Truck, RotateCcw, ShieldCheck, Headphones, Gift, Sparkles,
  Star, Zap, HeartHandshake, Package, Clock, BadgePercent,
};

const SOCIAL_PLATFORMS: Record<string, any> = {
  facebook: FaFacebook,
  instagram: FaInstagram,
  twitter: FaXTwitter,
  youtube: FaYoutube,
  linkedin: FaLinkedin,
  tiktok: FaTiktok,
};

function getSocialColor(platform: string) {
  const map: Record<string, string> = {
    facebook: 'hover:bg-blue-500 hover:border-blue-500',
    instagram: 'hover:bg-pink-500 hover:border-pink-500',
    twitter: 'hover:bg-sky-500 hover:border-sky-500',
    youtube: 'hover:bg-red-500 hover:border-red-500',
    linkedin: 'hover:bg-blue-700 hover:border-blue-700',
    tiktok: 'hover:bg-gray-900 hover:border-gray-900 dark:hover:bg-gray-100 dark:hover:border-gray-100 dark:hover:text-gray-900',
  };
  return map[platform] || 'hover:bg-gray-600 hover:border-gray-600';
}

function getBadgeColor(name: string) {
  const map: Record<string, string> = {
    Visa: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
    Mastercard: 'text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800',
    Amex: 'text-sky-700 bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800',
    PayPal: 'text-blue-800 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
    Stripe: 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800',
    bKash: 'text-red-700 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
    Nagad: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    Rocket: 'text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
    COD: 'text-gray-700 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  };
  return map[name] || 'text-gray-700 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
}

const FALLBACK_CONFIG: FooterConfig = {
  value_props_enabled: true,
  value_props: [
    { id: '1', icon: 'Truck', title: 'Free Shipping', description: 'On orders over \u09F75,000', is_active: true, sort_order: 0 },
    { id: '2', icon: 'RotateCcw', title: 'Easy Returns', description: '7-day return policy', is_active: true, sort_order: 1 },
    { id: '3', icon: 'ShieldCheck', title: 'Secure Payment', description: '100% protected checkout', is_active: true, sort_order: 2 },
    { id: '4', icon: 'Headphones', title: '24/7 Support', description: 'Dedicated customer care', is_active: true, sort_order: 3 },
  ],
  newsletter_enabled: true,
  newsletter_title: 'Subscribe to our newsletter',
  newsletter_subtitle: 'Be the first to get exclusive deals, new arrivals & insider updates.',
  columns: [
    {
      id: 'c1', title: 'Shop', sort_order: 1,
      links: [
        { id: 'l1', label: 'All Categories', url: '/store/products', sort_order: 1, open_in_new_tab: false, is_active: true },
        { id: 'l2', label: 'New Arrivals', url: '/store/products?filter=new', sort_order: 1, open_in_new_tab: false, is_active: true },
        { id: 'l3', label: 'Best Sellers', url: '/store/products?filter=bestseller', sort_order: 2, open_in_new_tab: false, is_active: true },
        { id: 'l4', label: 'Featured Products', url: '/store/products?filter=featured', sort_order: 3, open_in_new_tab: false, is_active: true },
        { id: 'l5', label: 'Flash Sale', url: '/store/products?filter=sale', sort_order: 4, open_in_new_tab: false, is_active: true },
      ],
    },
    {
      id: 'c2', title: 'Customer Service', sort_order: 1,
      links: [
        { id: 'l6', label: 'Contact Us', url: '/help', sort_order: 0, open_in_new_tab: false, is_active: true },
        { id: 'l7', label: 'Track Order', url: '/order/track', sort_order: 1, open_in_new_tab: false, is_active: true },
        { id: 'l8', label: 'Returns & Refunds', url: '/help/returns', sort_order: 2, open_in_new_tab: false, is_active: true },
        { id: 'l9', label: 'Shipping Policy', url: '/help/shipping', sort_order: 3, open_in_new_tab: false, is_active: true },
        { id: 'l10', label: 'FAQs', url: '/help/faq', sort_order: 4, open_in_new_tab: false, is_active: true },
      ],
    },
    {
      id: 'c3', title: 'About Us', sort_order: 2,
      links: [
        { id: 'l11', label: 'Our Story', url: '/about', sort_order: 0, open_in_new_tab: false, is_active: true },
        { id: 'l12', label: 'Careers', url: '/careers', sort_order: 1, open_in_new_tab: false, is_active: true },
        { id: 'l13', label: 'Press', url: '/press', sort_order: 2, open_in_new_tab: false, is_active: true },
        { id: 'l14', label: 'Sell With Us', url: '/sell', sort_order: 3, open_in_new_tab: false, is_active: true },
        { id: 'l15', label: 'Affiliates', url: '/affiliates', sort_order: 4, open_in_new_tab: false, is_active: true },
      ],
    },
    {
      id: 'c4', title: 'Legal', sort_order: 3,
      links: [
        { id: 'l16', label: 'Terms & Conditions', url: '/terms', sort_order: 0, open_in_new_tab: false, is_active: true },
        { id: 'l17', label: 'Privacy Policy', url: '/privacy', sort_order: 1, open_in_new_tab: false, is_active: true },
        { id: 'l18', label: 'Cookie Policy', url: '/cookies', sort_order: 2, open_in_new_tab: false, is_active: true },
        { id: 'l19', label: 'Accessibility', url: '/accessibility', sort_order: 3, open_in_new_tab: false, is_active: true },
      ],
    },
  ],
  contact_address: 'House 12, Road 5, Dhanmondi, Dhaka 1205, Bangladesh',
  contact_phone: '+880 1700-000000',
  contact_email: 'support@example.com',
  about_text: 'Your one-stop online shop for quality products across electronics, fashion, home & living, and more.',
  social_links: [
    { id: 's1', platform: 'facebook', url: 'https://facebook.com', is_active: true },
    { id: 's2', platform: 'instagram', url: 'https://instagram.com', is_active: true },
    { id: 's3', platform: 'twitter', url: 'https://x.com', is_active: true },
    { id: 's4', platform: 'youtube', url: 'https://youtube.com', is_active: true },
  ],
  copyright_text: '{year} {store}. All rights reserved.',
  show_payment_badges: true,
  payment_badges: [
    { id: 'p1', name: 'Visa', is_active: true },
    { id: 'p2', name: 'Mastercard', is_active: true },
    { id: 'p3', name: 'bKash', is_active: true },
    { id: 'p4', name: 'Nagad', is_active: true },
    { id: 'p5', name: 'Rocket', is_active: true },
    { id: 'p6', name: 'COD', is_active: true },
  ],
};

export default function StorefrontFooter() {
  const { isGrocery } = useStorefrontTheme();
  if (isGrocery) return <GroceryFooter />;
  const [email, setEmail] = useState('');
  const { footerLogo, ready } = useBranding();
  const { storeName } = useStorefrontStatus();
  const siteName = storeName || 'Our Store';
  const [subscribed, setSubscribed] = useState(false);
  const [config, setConfig] = useState<FooterConfig | null>(null);
  const [storeStats, setStoreStats] = useState<{ productCount: number; categoryCount: number } | null>(null);

  // Category data is shared via the storefront categories store (fetched once),
  // so we reuse it here instead of firing a second /storefront/categories call.
  const { categories, ready: catsReady } = useStorefrontCategories();

  useEffect(() => {
    footerService.get().then(setConfig).catch(() => setConfig(FALLBACK_CONFIG));
  }, []);

  // Live product & category counts (from dashboard-managed catalog).
  const [productCount, setProductCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    storefrontService
      .getProducts({ per_page: 1 })
      .then((res) => { if (!cancelled) setProductCount(res?.meta?.total ?? 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!catsReady) return;
    const categoryCount = categories.length;
    if (productCount > 0 || categoryCount > 0) {
      setStoreStats({ productCount, categoryCount });
    }
  }, [catsReady, categories, productCount]);

  if (!config) return null;

  const {
    value_props_enabled,
    value_props,
    newsletter_enabled,
    newsletter_title,
    newsletter_subtitle,
    columns,
    contact_address,
    contact_phone,
    contact_email,
    about_text,
    social_links,
    copyright_text,
    show_payment_badges,
    payment_badges,
  } = config;

  const activeValueProps = value_props.filter(v => v.is_active);
  const activeSocialLinks = social_links.filter((s: SocialLink) => s.is_active);
  const activeBadges = payment_badges.filter(b => b.is_active);
  const displayColumns = columns.filter(c => c.links.some(l => l.is_active));
  const rawCopyright = (copyright_text || '').trim() || '{year} {store}. All rights reserved.';
  const copyrightDisplay = rawCopyright
    .replace('{year}', String(new Date().getFullYear()))
    .replace('{store}', siteName);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 4000);
  };

  return (
    <ScrollReveal animation="fade-up" duration="normal" as="footer" className="mt-16 bg-linear-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Value props strip */}
      {value_props_enabled && activeValueProps.length > 0 && (
        <div className="bg-linear-to-r from-brand-50 via-purple-50 to-pink-50 dark:from-brand-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border-y border-brand-100 dark:border-gray-800">
          <div className="mx-auto grid max-w-screen-2xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4">
            {activeValueProps.map(({ icon, title, description }) => {
              const Icon = VALUE_PROP_ICONS[icon] || Truck;
              return (
                <div key={title} className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-gray-100">{title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Newsletter */}
      {newsletter_enabled && (
        <div className="bg-linear-to-r from-brand-100 via-purple-100 to-pink-100 dark:from-brand-950/40 dark:via-purple-950/40 dark:to-pink-950/40 border-y border-brand-200 dark:border-gray-800">
          <div className="mx-auto max-w-screen-2xl px-4 py-10">
            <div className="grid items-center gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{newsletter_title}</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{newsletter_subtitle}</p>
              </div>
              <form onSubmit={handleSubscribe} className="flex w-full max-w-md gap-2">
                <div className="relative flex-1">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="Your email address"
                    className="w-full rounded-full border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
                >
                  {subscribed ? '\u2713 Subscribed' : 'Subscribe'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main links */}
      <div className="mx-auto max-w-screen-2xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center" aria-label={siteName}>
              {footerLogo ? (
                <Image
                  src={footerLogo}
                  alt={siteName}
                  width={144}
                  height={36}
                  className="h-[70px] w-auto object-contain"
                  unoptimized={footerLogo.startsWith('data:')}
                />
              ) : ready ? (
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {siteName}<span className="text-brand-600">.</span>
                </span>
              ) : (
                <div className="h-9 w-24 rounded bg-gray-100 dark:bg-gray-800" />
              )}
            </Link>
            <p className="mt-3 max-w-xs text-sm text-gray-600 dark:text-gray-400">{about_text}</p>
            <ul className="mt-5 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {contact_address && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  {contact_address}
                </li>
              )}
              {contact_phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-brand-600" />
                  {contact_phone}
                </li>
              )}
              {contact_email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-brand-600" />
                  {contact_email}
                </li>
              )}
            </ul>
            {activeSocialLinks.length > 0 && (
              <div className="mt-5 flex items-center gap-2">
                {activeSocialLinks.map(sl => {
                  const Icon = SOCIAL_PLATFORMS[sl.platform] || FaFacebook;
                  return (
                    <a
                      key={sl.id}
                      href={sl.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-all hover:text-white dark:border-gray-700 dark:text-gray-400 ${getSocialColor(sl.platform)}`}
                      aria-label={sl.platform}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {displayColumns.map(col => (
            <div key={col.id}>
              <p className="text-sm font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.filter(l => l.is_active).map(link => (
                  <li key={link.id}>
                    <Link
                      href={link.url}
                      target={link.open_in_new_tab ? '_blank' : undefined}
                      rel={link.open_in_new_tab ? 'noopener noreferrer' : undefined}
                      className="text-gray-600 transition-colors hover:text-brand-600 dark:text-gray-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic storefront stats — live dashboard data (products/categories) */}
      {storeStats && (storeStats.productCount > 0 || storeStats.categoryCount > 0) && (
        <div className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-center gap-6 px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-brand-600" />
              <span className="font-bold text-gray-900 dark:text-gray-100">{storeStats.productCount.toLocaleString()}</span> products live
            </span>
            <span className="hidden h-3 w-px bg-gray-300 dark:bg-gray-700 sm:block" aria-hidden />
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-brand-600" />
              <span className="font-bold text-gray-900 dark:text-gray-100">{storeStats.categoryCount}</span> categories
            </span>
            <span className="text-gray-500">— catalog synced from dashboard</span>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="border-t border-brand-200 bg-linear-to-r from-brand-50 via-purple-50 to-pink-50 dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-4 px-4 py-5 text-xs text-gray-600 sm:flex-row dark:text-gray-400">
          <p className="inline-flex items-center gap-1.5">
            <Copyright className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" />
            <span>{copyrightDisplay}</span>
          </p>
          {show_payment_badges && activeBadges.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-semibold">We accept:</span>
              <div className="flex items-center gap-1.5">
                {activeBadges.map(b => (
                  <span
                    key={b.id}
                    className={`rounded border px-2 py-1 text-[10px] font-bold ${getBadgeColor(b.name)}`}
                  >
                    {b.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ScrollReveal>
  );
}
