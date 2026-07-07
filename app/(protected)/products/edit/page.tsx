'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductFormPage } from '@/app/(protected)/products/add/page';

function EditProductContent() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') || undefined;
  return <ProductFormPage editRef={id} />;
}

export default function EditProductPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm">Loading…</div>}>
      <EditProductContent />
    </Suspense>
  );
}
