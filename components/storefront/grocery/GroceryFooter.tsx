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
  Leaf,
  CreditCard,
} from 'lucide-react';
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaLinkedin,
  FaTiktok,
  FaXTwitter,
} from 'react-icons/fa6';

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

const FALLBACK_CONFIG: FooterConfig = {
  value_props_enabled: true,
  value_props: [
    { id: '1', icon: 'Truck', title: 'Free Delivery', description: 'On orders over ₹500', is_active: true, sort_order: 0 },
    { id: '2', icon: 'Clock', title: 'Same Day Delivery', description: 'Order before 2PM', is_active: true, sort_order: 1 },
    { id: '3', icon: 'ShieldCheck', title: 'Fresh Guarantee', description: '100% Fresh or Money Back', is_active: true, sort_order: 2 },
    { id: '4', icon: 'Headphones', title: '24/7 Support', description: 'Dedicated customer care', is_active: true, sort_order: 3 },
  ],
  newsletter_enabled: true,
  newsletter_title: 'Subscribe for fresh deals',
  newsletter_subtitle: 'Get weekly offers on fresh produce & groceries.',
  columns: [
    {
      id: 'c1', title: 'Shop', sort_order: 1,
      links: [
        { id: 'l1', label: 'Fresh Vegetables', url: '/store/category/vegetables', sort_order: 1, open_in_new_tab: false, is_active: true },
        { id: 'l2', label: 'Fruits', url: '/store/category/fruits', sort_order: 1, open_in_new_tab: false, is_active: true },
        { id: 'l3', label: 'Meat & Fish', url: '/store/category/meat-fish', sort_order: 2, open_in_new_tab: false, is_active: true },
        { id: 'l4', label: 'Dairy & Eggs', url: '/store/category/dairy-eggs', sort_order: 3, open_in_new_tab: false, is_active: true },
        { id: 'l5', label: 'Daily Essentials', url: '/store/products?filter=essential', sort_order: 4, open_in_new_tab: false, is_active: true },
      ],
    },
    {
      id: 'c2', title: 'Customer Service', sort_order: 1,
      links: [
        { id: 'l6', label: 'Contact Us', url: '/help', sort_order: 0, open_in_new_tab: false, is_active: true },
        { id: 'l7', label: 'Track Order', url: '/order/track', sort_order: 1, open_in_new_tab: false, is_active: true },
        { id: 'l8', label: 'Returns & Refunds', url: '/help/returns', sort_order: 2, open_in_new_tab: false, is_active: true },
        { id: 'l9', label: 'Delivery Policy', url: '/help/shipping', sort_order: 3, open_in_new_tab: false, is_active: true },
        { id: 'l10', label: 'FAQs', url: '/help/faq', sort_order: 4, open_in_new_tab: false, is_active: true },
      ],
    },
    {
      id: 'c3', title: 'About', sort_order: 2,
      links: [
        { id: 'l11', label: 'Our Story', url: '/about', sort_order: 0, open_in_new_tab: false, is_active: true },
        { id: 'l12', label: 'Careers', url: '/careers', sort_order: 1, open_in_new_tab: false, is_active: true },
        { id: 'l13', label: 'Sell With Us', url: '/sell', sort_order: 2, open_in_new_tab: false, is_active: true },
      ],
    },
    {
      id: 'c4', title: 'Legal', sort_order: 3,
      links: [
        { id: 'l16', label: 'Terms & Conditions', url: '/terms', sort_order: 0, open_in_new_tab: false, is_active: true },
        { id: 'l17', label: 'Privacy Policy', url: '/privacy', sort_order: 1, open_in_new_tab: false, is_active: true },
        { id: 'l18', label: 'Cookie Policy', url: '/cookies', sort_order: 2, open_in_new_tab: false, is_active: true },
      ],
    },
  ],
  contact_address: 'House 12, Road 5, Dhanmondi, Dhaka 1205, Bangladesh',
  contact_phone: '+880 1700-000000',
  contact_email: 'support@example.com',
  about_text: 'Your trusted online grocery store for fresh produce, meat, dairy, and daily essentials. Delivered to your doorstep.',
  social_links: [
    { id: 's1', platform: 'facebook', url: 'https://facebook.com', is_active: true },
    { id: 's2', platform: 'instagram', url: 'https://instagram.com', is_active: true },
  ],
  copyright_text: '{year} {store}. All rights reserved.',
  show_payment_badges: true,
  payment_badges: [
    { id: 'p1', name: 'Visa', is_active: true },
    { id: 'p2', name: 'Mastercard', is_active: true },
    { id: 'p3', name: 'bKash', is_active: true },
    { id: 'p4', name: 'Nagad', is_active: true },
    { id: 'p5', name: 'COD', is_active: true },
  ],
};

const VALUE_PROP_ICONS: Record<string, any> = {
  Truck, RotateCcw, ShieldCheck, Headphones, Gift, Sparkles,
  Star, Zap, HeartHandshake, Package, Clock, BadgePercent,
};

export default function GroceryFooter() {
  const [email, setEmail] = useState('');
  const { footerLogo, ready } = useBranding();
  const { storeName } = useStorefrontStatus();
  const siteName = storeName || 'Grocery Store';
  const [subscribed, setSubscribed] = useState(false);
  const [config, setConfig] = useState<FooterConfig | null>(null);
  const [productCount, setProductCount] = useState(0);

  const { categories } = useStorefrontCategories();

  useEffect(() => {
    footerService.get().then(setConfig).catch(() => setConfig(FALLBACK_CONFIG));
  }, []);

  useEffect(() => {
    storefrontService
      .getProducts({ per_page: 1 })
      .then((res) => setProductCount(res?.meta?.total ?? 0))
      .catch(() => {});
  }, []);

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
    <ScrollReveal animation="fade-up" duration="normal" as="footer" className="mt-16 bg-linear-to-b from-green-50 via-white to-green-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Value props strip */}
      {value_props_enabled && activeValueProps.length > 0 && (
        <div className="bg-green-600 border-y border-green-700">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-6 md:grid-cols-4">
            {activeValueProps.map(({ icon, title, description }) => {
              const Icon = VALUE_PROP_ICONS[icon] || Truck;
              return (
                <div key={title} className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">{title}</p>
                    <p className="text-xs text-green-100">{description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Freshness guarantee banner */}
      <div className="bg-green-50 border-b border-green-100 dark:bg-green-950/20 dark:border-green-900/30">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-4 text-green-800 dark:text-green-300">
          <Leaf className="h-5 w-5" />
          <span className="text-sm font-bold">100% Fresh or Money Back</span>
          <span className="text-green-400">•</span>
          <span className="text-sm">Free delivery on orders over ₹500</span>
        </div>
      </div>

      {/* Newsletter */}
      {newsletter_enabled && (
        <div className="bg-linear-to-r from-green-100 via-green-50 to-orange-50 dark:from-green-950/40 dark:via-green-950/20 dark:to-orange-950/20 border-y border-green-200 dark:border-green-900/30">
          <div className="mx-auto max-w-7xl px-4 py-10">
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
                    className="w-full rounded-full border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-full bg-green-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-green-700"
                >
                  {subscribed ? '✓ Subscribed' : 'Subscribe'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main links */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center" aria-label={siteName}>
              {footerLogo ? (
                <Image
                  src={footerLogo}
                  alt={siteName}
                  width={144}
                  height={36}
                  className="h-9 w-auto object-contain"
                  unoptimized={footerLogo.startsWith('data:')}
                />
              ) : ready ? (
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {siteName}<span className="text-green-600">.</span>
                </span>
              ) : (
                <div className="h-9 w-24 rounded bg-gray-100 dark:bg-gray-800" />
              )}
            </Link>
            <p className="mt-3 max-w-xs text-sm text-gray-600 dark:text-gray-400">{about_text}</p>
            <ul className="mt-5 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {contact_address && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  {contact_address}
                </li>
              )}
              {contact_phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-green-600" />
                  {contact_phone}
                </li>
              )}
              {contact_email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-green-600" />
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
              <p className="text-sm font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.filter(l => l.is_active).map(link => (
                  <li key={link.id}>
                    <Link
                      href={link.url}
                      target={link.open_in_new_tab ? '_blank' : undefined}
                      rel={link.open_in_new_tab ? 'noopener noreferrer' : undefined}
                      className="text-gray-600 transition-colors hover:text-green-600 dark:text-gray-400"
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

      {/* Bottom bar */}
      <div className="border-t border-green-200 bg-green-50 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 text-xs text-gray-600 sm:flex-row dark:text-gray-400">
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
                    className="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
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
