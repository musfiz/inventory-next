'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TenantForm from '@/app/(protected)/tenants/_components/TenantForm';

function TenantEditContent() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') || undefined;
  return <TenantForm editRef={id} />;
}

export default function TenantEditPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-40 text-sm text-gray-500">Loading…</div>}>
      <TenantEditContent />
    </Suspense>
  );
}
