'use client';

import { useEffect } from 'react';
import { useBranding } from '@/hooks/use-branding';

export default function FaviconSetter() {
  const { favicon } = useBranding();

  useEffect(() => {
    const existing = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]');
    existing.forEach(el => el.remove());

    if (!favicon) return;

    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = favicon;
    document.head.appendChild(link);
  }, [favicon]);

  return null;
}
