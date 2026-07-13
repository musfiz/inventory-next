'use client';

import { Star } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Product Picker', description: 'Search and multi-select products to feature on the homepage.' },
  { name: 'Drag to Reorder', description: 'Reorder featured products to control display sequence.' },
  { name: 'Section Title Override', description: 'Custom title for the featured products section.' },
];

export default function FeaturedPage() {
  return <PageStub title="Featured Products" icon={Star} features={features} />;
}
