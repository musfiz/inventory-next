'use client';

import { PanelBottom } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Footer Columns', description: 'Sortable footer columns, each with title and configurable link list.' },
  { name: 'Social Icons Row', description: 'Add/remove social media links (Facebook, Instagram, YouTube, etc.).' },
  { name: 'Copyright Text', description: 'Custom copyright notice displayed in the footer.' },
  { name: 'Payment Badges Toggle', description: 'Show or hide payment method badges in the footer.' },
];

export default function FooterPage() {
  return <PageStub title="Footer Builder" icon={PanelBottom} features={features} />;
}
