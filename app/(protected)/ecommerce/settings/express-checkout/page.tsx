'use client';

import { useState, useEffect } from 'react';
import { Zap, Loader2, Info } from 'lucide-react';
import { notify } from '@/lib/notifications';
import storefrontSettingsService from '@/services/storefrontSettingsService';
import Spinner from '@/components/ui/spinner';

export default function ExpressCheckoutSettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await storefrontSettingsService.get();
      setEnabled(data.express_checkout_enabled ?? false);
    } catch {
      notify.error('Failed to load express checkout settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (saving) return;
    setSaving(true);
    const next = !enabled;
    try {
      const data = await storefrontSettingsService.update({
        express_checkout_enabled: next,
      });
      setEnabled(data.express_checkout_enabled ?? next);
      notify.success(next ? 'Express Checkout enabled' : 'Express Checkout disabled');
    } catch {
      notify.error('Failed to update express checkout');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Express Checkout
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Enable Express Checkout
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md">
              When active, an Express Checkout button appears on product detail pages and
              product grid cards, letting customers buy a single product immediately
              (Cash on Delivery only) without using the cart.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={saving}
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            {saving && (
              <Loader2 className="absolute left-1 h-3 w-3 animate-spin text-white" />
            )}
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div
          className={`mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded ${
            enabled
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          {enabled ? 'Active' : 'Inactive'}
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Express Checkout currently supports <strong>Cash on Delivery (COD)</strong> only.
            The payment step is locked to COD on the express checkout page.
          </p>
        </div>
      </div>
    </div>
  );
}
