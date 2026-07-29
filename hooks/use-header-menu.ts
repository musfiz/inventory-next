'use client';

import { useEffect } from 'react';
import { useHeaderMenuStore } from '@/stores/header-menu-store';
import type { HeaderMenuConfig } from '@/types/api.types';

export interface HeaderMenuState {
  config: HeaderMenuConfig;
  loading: boolean;
  ready: boolean;
}

export function useHeaderMenu(): HeaderMenuState {
  const config = useHeaderMenuStore((s) => s.config);
  const loading = useHeaderMenuStore((s) => s.loading);
  const ready = useHeaderMenuStore((s) => s.ready);
  const fetch = useHeaderMenuStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { config, loading, ready };
}
