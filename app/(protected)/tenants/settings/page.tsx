'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TenantSettingsForm from '@/app/(protected)/tenants/_components/TenantSettingsForm';

function TenantSettingsContent() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') || undefined;
  return <TenantSettingsForm tenantId={id} />;
}

export default function TenantSettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-40 text-sm text-gray-500">Loading…</div>}>
      <TenantSettingsContent />
    </Suspense>
  );
}
