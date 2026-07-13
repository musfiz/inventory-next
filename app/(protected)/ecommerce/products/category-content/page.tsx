'use client';

import { FileText } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Per-Category Banner', description: 'Upload custom banner image for individual category pages.' },
  { name: 'Category Description', description: 'Rich-text description block displayed on category pages.' },
  { name: 'SEO Override', description: 'Per-category meta title and description override for SEO.' },
  { name: 'Per-Brand Content', description: 'Same content management features for brand pages.' },
];

export default function CategoryContentPage() {
  return <PageStub title="Category & Brand Page Content" icon={FileText} features={features} />;
}
