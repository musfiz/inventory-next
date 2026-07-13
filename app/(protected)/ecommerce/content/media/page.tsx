'use client';

import { Images } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Media Gallery', description: 'Central gallery of all uploaded storefront images with grid preview.' },
  { name: 'Search & Filter', description: 'Search images by name and filter by usage location.' },
  { name: 'Bulk Delete', description: 'Select and delete unused media files in bulk.' },
  { name: 'Upload New', description: 'Upload new images directly to the media library.' },
];

export default function MediaPage() {
  return <PageStub title="Media Library" icon={Images} features={features} />;
}
