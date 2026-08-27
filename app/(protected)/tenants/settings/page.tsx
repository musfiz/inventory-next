'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TenantSettingsForm from '@/app/(protected)/tenants/_components/TenantSettingsForm';
import PageLoader from '@/components/ui/page-loader';

function TenantSettingsContent() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') || undefined;
  return <TenantSettingsForm tenantId={id} />;
}

export default function TenantSettingsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <TenantSettingsContent />
    </Suspense>
  );
}
