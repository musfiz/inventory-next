'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLoader from '@/components/ui/page-loader';

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/store/account/login?tab=register');
  }, [router]);

  return <PageLoader />;
}