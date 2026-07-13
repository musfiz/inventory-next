'use client';

import { Mail } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Order Confirmation', description: 'Editable template for order confirmation email with variable placeholders.' },
  { name: 'Shipped Notification', description: 'Email sent when order status changes to shipped, with tracking info.' },
  { name: 'Delivered Notification', description: 'Email sent when order is marked as delivered.' },
  { name: 'Cancellation Email', description: 'Notification sent when an order is cancelled.' },
  { name: 'Variable Placeholders', description: 'Use {{order_number}}, {{customer_name}}, {{total}} etc. in email templates.' },
];

export default function EmailTemplatesPage() {
  return <PageStub title="Email Templates" icon={Mail} features={features} />;
}
