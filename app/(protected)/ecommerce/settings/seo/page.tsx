'use client';

import { useState, useEffect } from 'react';
import { Search, Save } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { notify } from '@/lib/notifications';
import ecommerceSettingsService from '@/services/ecommerceSettingsService';
import Spinner from '@/components/ui/spinner';
import type { EcommerceSettings } from '@/types/ecommerce';

export default function SeoPage() {
  const [form, setForm] = useState({ meta_title: '', meta_description: '', robots_enabled: true, sitemap_enabled: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await ecommerceSettingsService.get();
      setForm({ meta_title: data.meta_title, meta_description: data.meta_description, robots_enabled: true, sitemap_enabled: true });
    } catch { notify.error('Failed to load'); }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ecommerceSettingsService.update({ meta_title: form.meta_title, meta_description: form.meta_description });
      notify.success('SEO settings saved');
    } catch { notify.error('Failed to save'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="md" /></div>;

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        SEO & Meta Defaults
      </h1>
      <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 space-y-2">
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Default Meta Title</label>
            <input type="text" value={form.meta_title} onChange={e => setForm({...form, meta_title: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Default Meta Description</label>
            <textarea value={form.meta_description} onChange={e => setForm({...form, meta_description: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 h-20 resize-none" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.robots_enabled} onChange={e => setForm({...form, robots_enabled: e.target.checked})} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 cursor-pointer" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Enable robots.txt</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.sitemap_enabled} onChange={e => setForm({...form, sitemap_enabled: e.target.checked})} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 cursor-pointer" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Enable sitemap</span>
            </label>
          </div>
        </div>
        <button type="submit" className="flex items-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm cursor-pointer">
          <GiSave className="w-4 h-4" /> Save
        </button>
      </form>
    </div>
  );
}
