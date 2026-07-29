'use client';

import Link from 'next/link';
import {
  HelpCircle,
  Package,
  Truck,
  RotateCcw,
  CreditCard,
  Shield,
  MessageCircle,
  ChevronRight,
  Search,
  Phone,
  Mail,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';

const TOPICS = [
  {
    icon: Package,
    title: 'Orders & Shipping',
    description: 'Track your order, delivery times, and shipping policies',
    href: '/help/orders',
  },
  {
    icon: RotateCcw,
    title: 'Returns & Refunds',
    description: 'How to return items, refund timelines, and exchange policies',
    href: '/help/returns',
  },
  {
    icon: CreditCard,
    title: 'Payments & Pricing',
    description: 'Accepted payment methods, taxes, coupons, and billing',
    href: '/help/payments',
  },
  {
    icon: Shield,
    title: 'Account & Security',
    description: 'Managing your account, passwords, and privacy settings',
    href: '/help/account',
  },
  {
    icon: Truck,
    title: 'Tracking',
    description: 'Real-time order tracking and delivery status updates',
    href: '/order/track',
  },
  {
    icon: MessageCircle,
    title: 'Contact Us',
    description: 'Get in touch with our support team',
    href: '/help/contact',
  },
];

const FAQS = [
  {
    q: 'How do I track my order?',
    a: 'You can track your order by visiting the Track Order page and entering your order number. For registered users, all your trackable orders are listed in your account dashboard under Track Orders.',
  },
  {
    q: 'What is the estimated delivery time?',
    a: 'Delivery times vary depending on your location. Typically, orders are delivered within 3-7 business days for standard shipping and 1-3 business days for express shipping within major cities.',
  },
  {
    q: 'Can I change or cancel my order?',
    a: 'Orders can be modified or cancelled within 1 hour of placing them. Once the order is confirmed and being processed, changes may not be possible. Contact our support team for assistance.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit/debit cards, mobile banking (bKash, Nagad, Rocket), and cash on delivery (COD) for eligible orders.',
  },
  {
    q: 'How do I return a product?',
    a: 'You can request a return within 7 days of delivery for most items. Visit your Orders page, select the item you want to return, and follow the return process. Items must be unused and in original packaging.',
  },
  {
    q: 'Is my personal information secure?',
    a: 'Yes, we take data security seriously. All transactions are encrypted using industry-standard SSL technology, and we never share your personal information with third parties without your consent.',
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 dark:border-gray-800">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{question}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="pb-4">
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function HelpCenterPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <div className="bg-linear-to-br from-brand-600 via-purple-700 to-brand-800">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-sm">
            <HelpCircle className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            How can we help you?
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-white/80">
            Browse our help topics, check the FAQs, or reach out to our support team
          </p>

          {/* Search bar */}
          <div className="mx-auto mt-8 max-w-xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search for help topics..."
                className="w-full rounded-xl border-0 bg-white/95 py-3.5 pl-11 pr-4 text-sm text-gray-900 shadow-lg shadow-black/10 backdrop-blur-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        {/* Topic categories */}
        <div className="mb-16">
          <h2 className="mb-2 text-lg font-black text-gray-900 dark:text-white">Help Topics</h2>
          <p className="mb-6 text-sm text-gray-500">Choose a category to find what you need</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map(topic => (
              <Link
                key={topic.title}
                href={topic.href}
                className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md hover:shadow-brand-100/30 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-800"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-brand-50 to-purple-50 text-brand-600 dark:from-brand-950/30 dark:to-purple-950/30 dark:text-brand-400">
                  <topic.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1 text-sm font-bold text-gray-900 dark:text-gray-100">{topic.title}</h3>
                <p className="text-xs text-gray-500">{topic.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="mb-2 text-lg font-black text-gray-900 dark:text-white">Frequently Asked Questions</h2>
          <p className="mb-6 text-sm text-gray-500">Quick answers to common questions</p>
          <div className="rounded-2xl border border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
            {FAQS.map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Still need help?</h2>
          <p className="mt-1 text-sm text-gray-500">
            Our support team is here for you
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
                <Phone className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">+880 1700-000000</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
                <Mail className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">support@uims.store</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
                <Clock className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-500">Hours</p>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">9 AM — 8 PM, Sat–Thu</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
