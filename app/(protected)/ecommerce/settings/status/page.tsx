'use client';

import { useState, useEffect } from 'react';
import { Power, PowerOff, ExternalLink, Building2, Clock } from 'lucide-react';
import { notify } from '@/lib/notifications';
import ecommerceSettingsService from '@/services/ecommerceSettingsService';
import type { EcommerceSettings } from '@/types/ecommerce';
import { formatDate } from '@/lib/utils/date';
import Link from 'next/link';

export default function StatusActivationPage() {
  const [settings, setSettings] = useState<EcommerceSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const data = await ecommerceSettingsService.get();
      setSettings(data);
    } catch { notify.error('Failed to load settings'); }
    setLoading(false);
  };

  const handleToggle = async () => {
    try {
      const active = await ecommerceSettingsService.toggleStorefront();
      setSettings(prev => prev ? { ...prev, storefront_active: active } : null);
      notify.success(active ? 'Storefront activated' : 'Storefront deactivated');
    } catch { notify.error('Failed to toggle storefront'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Power className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Status & Activation
        </h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Storefront Status</h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded ${settings?.storefront_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                {settings?.storefront_active ? <><Power className="w-4 h-4" /> Active</> : <><PowerOff className="w-4 h-4" /> Inactive</>}
              </span>
            </div>
            <button
              onClick={handleToggle}
              className={`px-3 py-1.5 text-sm font-medium rounded-sm text-white cursor-pointer ${settings?.storefront_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {settings?.storefront_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
          {settings?.storefront_active && (
            <Link href="/store" target="_blank" className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              <ExternalLink className="w-4 h-4" /> View Storefront
            </Link>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-500" /> Tenant
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">The storefront runs under the active tenant.</p>
          <Link href="/tenants" className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            Go to Tenant Management <ExternalLink className="w-3 h-3" />
          </Link>
          <div className="mt-3 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="w-3 h-3" /> Last updated: {settings?.updated_at ? formatDate(settings.updated_at) : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}
