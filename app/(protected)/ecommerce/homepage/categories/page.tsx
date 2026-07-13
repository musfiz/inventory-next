'use client';

import { Boxes } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Category Selection', description: 'Choose which categories are displayed on the homepage.' },
  { name: 'Display Order', description: 'Reorder selected categories for homepage display.' },
  { name: 'Image Override', description: 'Upload custom category image per category for homepage use.' },
  { name: 'Display Style', description: 'Choose between grid or carousel display mode.' },
];

export default function CategoriesPage() {
  return <PageStub title="Category Showcase" icon={Boxes} features={features} />;
}
