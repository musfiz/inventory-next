'use client';

import { Code2 } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Google Analytics', description: 'Enter GA measurement ID to enable Google Analytics tracking.' },
  { name: 'Facebook Pixel', description: 'Enter Facebook Pixel ID for conversion tracking and retargeting.' },
  { name: 'Custom Head Script', description: 'Inject custom scripts into the storefront <head> (sanitized input).' },
  { name: 'Preview & Test', description: 'Preview tracking implementation and test if codes are firing correctly.' },
];

export default function TrackingPage() {
  return <PageStub title="Tracking Codes (GA/FB Pixel)" icon={Code2} features={features} />;
}
