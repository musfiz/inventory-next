'use client';

import { ListTodo } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Status Transitions', description: 'Configure allowed status transitions in the order workflow.' },
  { name: 'Auto-Emails per Status', description: 'Set which automated emails are triggered at each status transition.' },
  { name: 'Cancellation Rules', description: 'Define rules for when orders can be cancelled (time limit, payment status).' },
];

export default function OrderStatusPage() {
  return <PageStub title="Order Status Workflow" icon={ListTodo} features={features} />;
}
