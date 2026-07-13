'use client';

import { Users2 } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Customer Groups', description: 'Create pricing groups (Retail, Wholesale, Dealer) for tiered pricing.' },
  { name: 'Discount Tiers', description: 'Assign percentage or fixed discount per group.' },
  { name: 'Per-Product Override', description: 'Override group pricing for specific products.' },
];

export default function GroupPricingPage() {
  return <PageStub title="Customer Group Pricing" icon={Users2} features={features} />;
}
