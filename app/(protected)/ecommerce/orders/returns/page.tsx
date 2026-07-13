'use client';

import { RotateCcw } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Return Requests Queue', description: 'List of return requests from customers with status tracking.' },
  { name: 'Approve / Reject', description: 'Approve or reject return requests with reason input.' },
  { name: 'Link to Sales Return', description: 'Approved returns link to the Sales Return module for inventory adjustment.' },
];

export default function ReturnsPage() {
  return <PageStub title="Returns & Refunds" icon={RotateCcw} features={features} />;
}
