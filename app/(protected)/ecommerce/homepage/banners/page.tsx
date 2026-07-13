'use client';

import { Megaphone } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Banner Placements', description: 'Add banners to 2-column, side, or bottom placements on the homepage.' },
  { name: 'Image Upload & Link', description: 'Upload banner image and set click-through URL.' },
  { name: 'Order & Active Toggle', description: 'Reorder banners and toggle active state per banner.' },
];

export default function BannersPage() {
  return <PageStub title="Promotional Banners" icon={Megaphone} features={features} />;
}
