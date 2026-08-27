'use client';

import { useState, useEffect } from 'react';
import { Globe2, Save } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { notify } from '@/lib/notifications';
import ecommerceSettingsService from '@/services/ecommerceSettingsService';
import Spinner from '@/components/ui/spinner';
import type { EcommerceSettings } from '@/types/ecommerce';

export default function LocalizationPage() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await ecommerceSettingsService.get();
      setForm({
        currency_code: data.currency_code,
        currency_symbol: data.currency_symbol,
        tax_rate: String(data.tax_rate),
        free_shipping_threshold: String(data.free_shipping_threshold),
        default_delivery_days: String(data.default_delivery_days),
      });
    } catch { notify.error('Failed to load'); }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await ecommerceSettingsService.update({
        currency_code: form.currency_code,
        currency_symbol: form.currency_symbol,
        tax_rate: Number(form.tax_rate),
        free_shipping_threshold: Number(form.free_shipping_threshold),
        default_delivery_days: Number(form.default_delivery_days),
      });
      setForm({
        currency_code: updated.currency_code,
        currency_symbol: updated.currency_symbol,
        tax_rate: String(updated.tax_rate),
        free_shipping_threshold: String(updated.free_shipping_threshold),
        default_delivery_days: String(updated.default_delivery_days),
      });
      notify.success('Localization settings saved');
    } catch { notify.error('Failed to save'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="md" /></div>;

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Globe2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        Localization & Currency
      </h1>
      <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Currency Code</label>
            <input type="text" value={form.currency_code || ''} onChange={e => setForm({...form, currency_code: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" placeholder="BDT" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Currency Symbol</label>
            <input type="text" value={form.currency_symbol || ''} onChange={e => setForm({...form, currency_symbol: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" placeholder="৳" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Tax Rate (%)</label>
            <input type="number" value={form.tax_rate || '0'} onChange={e => setForm({...form, tax_rate: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" min="0" max="100" step="0.1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Free Shipping Threshold</label>
            <input type="number" value={form.free_shipping_threshold || '0'} onChange={e => setForm({...form, free_shipping_threshold: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" min="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Default Delivery Days</label>
            <input type="number" value={form.default_delivery_days || '3'} onChange={e => setForm({...form, default_delivery_days: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" min="1" />
          </div>
        </div>
        <button type="submit" className="flex items-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm cursor-pointer">
          <GiSave className="w-4 h-4" /> Save
        </button>
      </form>
    </div>
  );
}
