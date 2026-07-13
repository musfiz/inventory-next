'use client';

import { Tag } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Featured Flag', description: 'Bulk or individual toggle of `is_featured` flag on products.' },
  { name: 'New Arrival Flag', description: 'Bulk or individual toggle of `is_new` flag to mark new arrivals.' },
  { name: 'Bestseller Flag', description: 'Bulk or individual toggle of `is_bestseller` flag.' },
  { name: 'On Sale Flag', description: 'Bulk or individual toggle of `is_on_sale` flag.' },
];

export default function FlagsPage() {
  return <PageStub title="Featured / New / Bestseller Flags" icon={Tag} features={features} />;
}
