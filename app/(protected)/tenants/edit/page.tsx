'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TenantForm from '@/app/(protected)/tenants/_components/TenantForm';
import PageLoader from '@/components/ui/page-loader';

function TenantEditContent() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') || undefined;
  return <TenantForm editRef={id} />;
}

export default function TenantEditPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <TenantEditContent />
    </Suspense>
  );
}
