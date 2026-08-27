'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import PageLoader from '@/components/ui/page-loader';

export default function RootPage() {
  const router = useRouter();
  const { active, loading } = useStorefrontStatus();

  useEffect(() => {
    if (loading) return;
    router.replace(active ? '/store' : '/welcome');
  }, [active, loading, router]);

  return <PageLoader />;
}
