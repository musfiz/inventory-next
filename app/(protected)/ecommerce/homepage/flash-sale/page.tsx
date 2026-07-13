'use client';

import { Timer } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Flash Sale Toggle', description: 'Enable or disable the flash sale countdown section on the homepage.' },
  { name: 'Countdown Timer', description: 'Set end date/time for the flash sale countdown.' },
  { name: 'Product Tag / Collection', description: 'Link the flash sale to a specific product tag or collection.' },
  { name: 'Banner Text', description: 'Custom banner text displayed above the flash sale section.' },
];

export default function FlashSalePage() {
  return <PageStub title="Flash Sale / Countdown" icon={Timer} features={features} />;
}
