'use client';

import type { ReactNode } from 'react';

type Variant = 'sale' | 'new' | 'bestseller' | 'success' | 'warning' | 'info' | 'neutral';

const STYLES: Record<Variant, string> = {
  sale: 'bg-accent-500 text-white shadow-sm shadow-accent-500/30',
  new: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30',
  bestseller: 'bg-amber-500 text-white shadow-sm shadow-amber-500/30',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export default function Badge({
  children,
  variant = 'neutral',
  className = '',
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${STYLES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
