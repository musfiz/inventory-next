'use client';

import { useEffect } from 'react';
import { useBrandingStore } from '@/stores/branding-store';

export interface BrandingState {
  headerLogo: string | null;
  footerLogo: string | null;
  favicon: string | null;
  loading: boolean;
  ready: boolean;
}

export function useBranding(): BrandingState {
  const headerLogo = useBrandingStore((s) => s.headerLogo);
  const footerLogo = useBrandingStore((s) => s.footerLogo);
  const favicon = useBrandingStore((s) => s.favicon);
  const loading = useBrandingStore((s) => s.loading);
  const ready = useBrandingStore((s) => s.ready);
  const fetch = useBrandingStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { headerLogo, footerLogo, favicon, loading, ready };
}
