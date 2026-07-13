'use client';

import { useState } from 'react';
import { MdPayment } from 'react-icons/md';
import { GiSave } from 'react-icons/gi';
import { notify } from '@/lib/notifications';
import PageStub from '@/components/ecommerce/page-stub';

const features = [
  { name: 'Enable / Disable Gateways', description: 'Toggle payment methods: COD, bKash, Nagad, Rocket, SSLCommerz, bank transfer.' },
  { name: 'Min / Max Order Limits', description: 'Set minimum and maximum order amounts per payment method.' },
  { name: 'COD City Restriction', description: 'Restrict Cash on Delivery to specific cities or areas.' },
  { name: 'Gateway Configuration', description: 'Configure API keys, merchant IDs, and secrets for each gateway.' },
];

export default function PaymentsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <MdPayment className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        Payment Methods
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {features.map((f, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{f.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{f.description}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 italic">Payment gateway configuration requires actual API credentials. This page will be connected to the backend in a future phase.</p>
    </div>
  );
}
