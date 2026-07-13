'use client';

import { Settings } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Verified Purchase', description: 'Require verified purchase to submit a review. Toggle on/off.' },
  { name: 'Auto-Approve', description: 'Automatically approve reviews from verified purchases.' },
  { name: 'Photo Uploads', description: 'Allow customers to upload photos with their reviews.' },
  { name: 'Review Moderation', description: 'Require all reviews to be approved before displaying on the storefront.' },
];

export default function ReviewSettingsPage() {
  return <PageStub title="Review Settings" icon={Settings} features={features} />;
}
