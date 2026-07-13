'use client';

import { Eye } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Bulk Toggle Visibility', description: 'Table with search and bulk actions to toggle `is_visible_on_storefront` per product.' },
  { name: 'Filter by Visibility', description: 'Filter products by their current storefront visibility status.' },
  { name: 'Individual Toggle', description: 'Quick-toggle visibility for individual products directly from the table.' },
];

export default function VisibilityPage() {
  return <PageStub title="Storefront Visibility" icon={Eye} features={features} />;
}
