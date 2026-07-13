'use client';

import { TrendingUp } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Orders & Revenue Trend', description: 'Chart showing order volume and revenue over time (daily/weekly/monthly).' },
  { name: 'Conversion Rate', description: 'Track storefront conversion rate (orders / visitors).' },
  { name: 'Cart Abandonment', description: 'Monitor cart abandonment rate and recovery trends.' },
  { name: 'Period Comparison', description: 'Compare current period metrics against previous periods.' },
];

export default function SalesAnalyticsPage() {
  return <PageStub title="Sales & Conversion" icon={TrendingUp} features={features} />;
}
