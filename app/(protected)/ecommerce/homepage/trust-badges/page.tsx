'use client';

import { ClipboardCheck } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Trust Items List', description: 'Editable list of trust items with icon and text (e.g., "Free shipping", "7-day returns").' },
  { name: 'Promo Strip Text', description: 'Marquee-style promotional strip text below the header.' },
  { name: 'Item Order', description: 'Reorder trust badges to control display sequence.' },
];

export default function TrustBadgesPage() {
  return <PageStub title="Trust Badges & Promo Strip" icon={ClipboardCheck} features={features} />;
}
