'use client';

import { Menu } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Drag-Reorder Nav Links', description: 'Reorder navigation links. Each link maps to a category or a custom URL.' },
  { name: 'Show Search Bar Toggle', description: 'Enable or disable the search bar in the storefront header.' },
  { name: 'Utility Bar Text', description: 'Set top bar promotional text (e.g., "Free shipping over ৳500").' },
  { name: 'Account / Wishlist Icons', description: 'Toggle visibility of account and wishlist icons in the header.' },
];

export default function HeaderMenuPage() {
  return <PageStub title="Header & Menu Builder" icon={Menu} features={features} />;
}
