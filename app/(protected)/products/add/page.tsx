'use client';

import { Suspense } from 'react';
import { ProductForm } from '@/components/products/ProductForm';
import PageLoader from '@/components/ui/page-loader';

export default function AddProductPageWrapper() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProductForm />
    </Suspense>
  );
}
