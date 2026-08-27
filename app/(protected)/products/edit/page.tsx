'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductFormPage } from '@/app/(protected)/products/add/page';
import PageLoader from '@/components/ui/page-loader';

function EditProductContent() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') || undefined;
  return <ProductFormPage editRef={id} />;
}

export default function EditProductPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EditProductContent />
    </Suspense>
  );
}
