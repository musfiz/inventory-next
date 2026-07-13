'use client';

import { Users } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Customer List', description: 'Registered storefront customers with name, email, phone, order count, total spent.' },
  { name: 'Customer Details', description: 'View individual customer profile, order history, and wishlist items.' },
  { name: 'Search & Filter', description: 'Search by name/email and filter by registration date or order count.' },
];

export default function CustomersPage() {
  return <PageStub title="Customer List" icon={Users} features={features} />;
}
