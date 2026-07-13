'use client';

import { List } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Default View', description: 'Choose between grid or list view as the default product display.' },
  { name: 'Items Per Page', description: 'Set the default number of products shown per page.' },
  { name: 'Default Sort Order', description: 'Set the default product sorting (newest, price, popularity, etc.).' },
  { name: 'Out-of-Stock Visibility', description: 'Hide, show, or show with "out of stock" badge for unavailable products.' },
];

export default function DisplayPage() {
  return <PageStub title="Display Settings" icon={List} features={features} />;
}
