'use client';

import { GitBranch } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Related Products', description: 'Pick related products per product using a search/select interface.' },
  { name: 'Cross-Sell Products', description: 'Manage cross-sell recommendations shown on the cart page.' },
  { name: 'Up-Sell Products', description: 'Configure up-sell recommendations shown on the product page.' },
];

export default function RelationsPage() {
  return <PageStub title="Related / Cross-sell / Up-sell" icon={GitBranch} features={features} />;
}
