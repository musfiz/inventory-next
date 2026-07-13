import { useEffect, useState } from 'react';
import apiClient from '@/lib/api/axios';

export function useStorefrontStatus() {
  const [active, setActive] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await apiClient.get('/api/v1/storefront/status');
        setActive(res.data?.data?.storefront_active ?? false);
      } catch {
        setActive(false);
      }
    };
    check();
  }, []);

  return { active, loading: active === null };
}
