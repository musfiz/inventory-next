'use client';

import { useParams } from 'next/navigation';
import { ProductFormPage } from '../../add/page';

export default function EditProductPage() {
  const params = useParams<{ uuid: string }>();
  const uuid = typeof params?.uuid === 'string' ? params.uuid : '';

  return <ProductFormPage editRef={uuid} />;
}
