'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLoader from '@/components/ui/page-loader';

export default function EcommerceRootPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/ecommerce/settings/status'); }, [router]);
  return <PageLoader />;
}
