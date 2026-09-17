'use client';

import { Suspense } from 'react';
import { ProductFormPage } from '../_components/product-form';
import PageLoader from '@/components/ui/page-loader';

export default function AddProductPageWrapper() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProductFormPage />
    </Suspense>
  );
}
