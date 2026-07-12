'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  ShieldCheck,
  Truck,
  RotateCcw,
  CreditCard,
  Headphones,
} from 'lucide-react';

const FOOTER_LINKS = [
  {
    title: 'Shop',
    links: [
      { label: 'New Arrivals', href: '/store/products?filter=new' },
      { label: 'Best Sellers', href: '/store/products?filter=bestseller' },
      { label: 'Featured Products', href: '/store/products?filter=featured' },
      { label: 'Flash Sale', href: '/store/products?filter=sale' },
      { label: 'All Categories', href: '/store/products' },
    ],
  },
  {
    title: 'Customer Service',
    links: [
      { label: 'Contact Us', href: '/help' },
      { label: 'Track Order', href: '/order/track' },
      { label: 'Returns & Refunds', href: '/help/returns' },
      { label: 'Shipping Policy', href: '/help/shipping' },
      { label: 'FAQs', href: '/help/faq' },
    ],
  },
  {
    title: 'About UIMS',
    links: [
      { label: 'Our Story', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
      { label: 'Sell on UIMS', href: '/sell' },
      { label: 'Affiliates', href: '/affiliates' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms & Conditions', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Accessibility', href: '/accessibility' },
    ],
  },
];

const VALUE_PROPS = [
  {
    icon: Truck,
    title: 'Free Shipping',
    description: 'On orders over ৳5,000',
  },
  {
    icon: RotateCcw,
    title: 'Easy Returns',
    description: '7-day return policy',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Payment',
    description: '100% protected checkout',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Dedicated customer care',
  },
];

export default function StorefrontFooter() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 4000);
  };

  return (
    <footer className="mt-16 bg-gray-50 dark:bg-gray-950">
      {/* Value props strip */}
      <div className="border-y border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4">
          {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100">
                  {title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Newsletter */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid items-center gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                Subscribe to our newsletter
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Be the first to get exclusive deals, new arrivals & insider
                updates.
              </p>
            </div>
            <form
              onSubmit={handleSubscribe}
              className="flex w-full max-w-md gap-2"
            >
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
                {subscribed ? '✓ Subscribed' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main links */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="text-2xl font-black text-gray-900 dark:text-white"
            >
              UIMS<span className="text-brand-600">.</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-gray-600 dark:text-gray-400">
              Your one-stop online shop for quality products across
              electronics, fashion, home & living, and more.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                House 12, Road 5, Dhanmondi, Dhaka 1205, Bangladesh
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand-600" />
                +880 1700-000000
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-600" />
                support@uims.shop
              </li>
            </ul>
            <div className="mt-5 flex items-center gap-2">
              {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-all hover:border-brand-500 hover:bg-brand-500 hover:text-white dark:border-gray-700 dark:text-gray-400"
                  aria-label="social"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {FOOTER_LINKS.map(group => (
            <div key={group.title}>
              <p className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
                {group.title}
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {group.links.map(l => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-gray-600 transition-colors hover:text-brand-600 dark:text-gray-400"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 text-xs text-gray-500 sm:flex-row dark:text-gray-400">
          <p>
            © {new Date().getFullYear()} UIMS Store. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="font-semibold">We accept:</span>
            <div className="flex items-center gap-1.5">
              {['Visa', 'Mastercard', 'bKash', 'Nagad', 'Rocket', 'COD'].map(
                p => (
                  <span
                    key={p}
                    className="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {p}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
