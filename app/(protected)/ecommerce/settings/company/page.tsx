'use client';

import { useState, useEffect } from 'react';
import { Building2, Save } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { notify } from '@/lib/notifications';
import ecommerceSettingsService from '@/services/ecommerceSettingsService';
import type { EcommerceSettings } from '@/types/ecommerce';

export default function CompanyInfoPage() {
  const [settings, setSettings] = useState<EcommerceSettings | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await ecommerceSettingsService.get();
      setSettings(data);
      setForm({
        store_name: data.store_name,
        store_tagline: data.store_tagline,
        store_email: data.store_email,
        store_phone: data.store_phone,
        store_address: data.store_address,
      });
    } catch { notify.error('Failed to load'); }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await ecommerceSettingsService.update(form);
      setSettings(updated);
      notify.success('Company info saved');
    } catch { notify.error('Failed to save'); }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        Store / Company Information
      </h1>
      <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Store Name</label>
            <input type="text" value={form.store_name || ''} onChange={e => setForm({...form, store_name: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Tagline</label>
            <input type="text" value={form.store_tagline || ''} onChange={e => setForm({...form, store_tagline: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Support Email</label>
            <input type="email" value={form.store_email || ''} onChange={e => setForm({...form, store_email: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Support Phone</label>
            <input type="text" value={form.store_phone || ''} onChange={e => setForm({...form, store_phone: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Physical Address</label>
            <input type="text" value={form.store_address || ''} onChange={e => setForm({...form, store_address: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" />
          </div>
        </div>
        <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm cursor-pointer">
          <GiSave className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
}
