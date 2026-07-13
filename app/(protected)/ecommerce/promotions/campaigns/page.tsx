'use client';

import { Timer } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Flash Sale Campaigns', description: 'Schedule flash sale campaigns with start/end dates and linked products.' },
  { name: 'Product Tagging', description: 'Tag products to include in each campaign.' },
  { name: 'Countdown Banner', description: 'Link a countdown banner to each campaign for homepage display.' },
  { name: 'Campaign Status', description: 'Active, scheduled, or ended campaign status tracking.' },
];

export default function CampaignsPage() {
  return <PageStub title="Flash Sale Campaigns" icon={Timer} features={features} />;
}
