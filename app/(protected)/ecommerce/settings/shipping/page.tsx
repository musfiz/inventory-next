'use client';

import { useState, useEffect } from 'react';
import { Truck, Save } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { notify } from '@/lib/notifications';
import ecommerceSettingsService from '@/services/ecommerceSettingsService';

export default function ShippingDeliveryPage() {
  const [form, setForm] = useState({ flat_rate: 0, free_shipping_threshold: 0, delivery_days: 3, pickup_enabled: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await ecommerceSettingsService.get();
      setForm({
        flat_rate: 0,
        free_shipping_threshold: data.free_shipping_threshold,
        delivery_days: data.default_delivery_days,
        pickup_enabled: true,
      });
    } catch { notify.error('Failed to load'); }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ecommerceSettingsService.update({ free_shipping_threshold: form.free_shipping_threshold, default_delivery_days: form.delivery_days });
      notify.success('Shipping settings saved');
    } catch { notify.error('Failed to save'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        Shipping & Delivery
      </h1>
      <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Flat Rate (৳)</label>
            <input type="number" value={form.flat_rate} onChange={e => setForm({...form, flat_rate: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" min="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Free Shipping Threshold (৳)</label>
            <input type="number" value={form.free_shipping_threshold} onChange={e => setForm({...form, free_shipping_threshold: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" min="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Default Delivery Days</label>
            <input type="number" value={form.delivery_days} onChange={e => setForm({...form, delivery_days: Number(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" min="1" />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input type="checkbox" checked={form.pickup_enabled} onChange={e => setForm({...form, pickup_enabled: e.target.checked})} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 cursor-pointer" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Enable Pickup from Store</span>
        </label>
        <button type="submit" className="flex items-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm cursor-pointer">
          <GiSave className="w-4 h-4" /> Save
        </button>
      </form>
    </div>
  );
}
