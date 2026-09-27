'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductForm } from '@/components/products/ProductForm';
import PageLoader from '@/components/ui/page-loader';

function EditProductContent() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') || undefined;
  return <ProductForm editRef={id} />;
}

export default function EditProductPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EditProductContent />
    </Suspense>
  );
}
