'use client';

import { useEffect } from 'react';
import { useBranding } from '@/hooks/use-branding';

export default function FaviconSetter() {
  const { favicon } = useBranding();

  useEffect(() => {
    if (!favicon) return;

    // Mutate existing <link rel="icon"> nodes in place instead of removing/recreating them.
    // Next.js/React manages the default favicon link it injects from app/favicon.ico, so
    // removing that node directly via the DOM API leaves React holding a stale fiber
    // reference, which later throws "Cannot read properties of null (reading 'removeChild')"
    // when React tries to reconcile it.
    const existing = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]');

    if (existing.length > 0) {
      existing.forEach(el => {
        el.rel = 'icon';
        el.href = favicon;
      });
      return;
    }

    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = favicon;
    document.head.appendChild(link);
  }, [favicon]);

  return null;
}
