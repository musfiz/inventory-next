'use client';

import { MessageSquareText } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Announcement Text', description: 'Custom text for the announcement bar displayed at the top of the storefront.' },
  { name: 'Link & Schedule', description: 'Optional click-through link and schedule start/end dates.' },
  { name: 'Color Customization', description: 'Choose background and text colors for the announcement bar.' },
  { name: 'Dismissible Toggle', description: 'Allow visitors to dismiss the announcement bar.' },
];

export default function AnnouncementPage() {
  return <PageStub title="Announcement Bar" icon={MessageSquareText} features={features} />;
}
