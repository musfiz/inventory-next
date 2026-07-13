'use client';

import { Search } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Top Search Queries', description: 'Most searched terms on the storefront, ranked by frequency.' },
  { name: 'Zero-Result Searches', description: 'Searches that returned no results — identify product gaps.' },
  { name: 'Page Views', description: 'Page view statistics for storefront pages (if analytics wired).' },
];

export default function TrafficAnalyticsPage() {
  return <PageStub title="Traffic & Search Terms" icon={Search} features={features} />;
}
