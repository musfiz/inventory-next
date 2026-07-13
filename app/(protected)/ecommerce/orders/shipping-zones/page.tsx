'use client';

import { Truck } from 'lucide-react';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Shipping Zones', description: 'Define shipping zones by city or area with custom rates per zone.' },
  { name: 'Zone Rates', description: 'Set shipping rate per zone with optional free-shipping threshold override.' },
  { name: 'Delivery Estimates', description: 'Configure estimated delivery time per zone.' },
];

export default function ShippingZonesPage() {
  return <PageStub title="Shipping Zones & Rates" icon={Truck} features={features} />;
}
