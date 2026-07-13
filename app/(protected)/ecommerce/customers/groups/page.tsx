'use client';

import { Users2 } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Create Groups', description: 'Create customer groups (VIP, Wholesale, Retail) for targeted pricing.' },
  { name: 'Assign Customers', description: 'Add or remove customers from groups.' },
  { name: 'Group Discounts', description: 'Set group-specific discount tiers for pricing.' },
];

export default function CustomerGroupsPage() {
  return <PageStub title="Customer Groups" icon={Users2} features={features} />;
}
