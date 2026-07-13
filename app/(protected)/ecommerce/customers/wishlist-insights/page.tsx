'use client';

import { Heart } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Most Wishlisted', description: 'Report of most-wishlisted products to inform merchandising decisions.' },
  { name: 'Wishlist Trends', description: 'View wishlist activity trends over time.' },
  { name: 'Export Data', description: 'Export wishlist insights data for further analysis.' },
];

export default function WishlistInsightsPage() {
  return <PageStub title="Wishlist Insights" icon={Heart} features={features} />;
}
