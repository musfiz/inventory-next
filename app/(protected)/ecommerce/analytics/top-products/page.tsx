'use client';

import { PieChart } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Best Sellers', description: 'Top-selling products ranked by quantity and revenue.' },
  { name: 'Most Viewed', description: 'Products with the highest page views on the storefront.' },
  { name: 'Most Wishlisted', description: 'Products most frequently added to customer wishlists.' },
  { name: 'Data Export', description: 'Export top products data as CSV for further analysis.' },
];

export default function TopProductsPage() {
  return <PageStub title="Top Products" icon={PieChart} features={features} />;
}
