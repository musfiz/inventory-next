'use client';

import { useState, useEffect } from 'react';
import { Power, PowerOff, ExternalLink, Building2, Clock, Zap, Loader2, Info } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { notify } from '@/lib/notifications';
import storefrontSettingsService from '@/services/storefrontSettingsService';
import ecommerceSettingsService from '@/services/ecommerceSettingsService';
import { useAuthStore } from '@/stores/auth-store';
import { usePermissions } from '@/hooks/use-permissions';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import Spinner from '@/components/ui/spinner';
import TenantSelect from '@/components/ui/tenant-select';
import { formatDate } from '@/lib/utils/date';
import Link from 'next/link';
import type { EcommerceSettings } from '@/types/ecommerce';

export default function SettingsPage() {
  const authUser = useAuthStore(s => s.user);
  const { isSuperAdmin } = usePermissions();
  const { active, activeTenantId, loading, fetch, fetchSettings, expressCheckoutEnabled } = useStorefrontStatus();

  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const targetTenantId = isSuperAdmin ? selectedTenantId : (authUser?.tenant_id ?? '');

  useEffect(() => {
    if (isSuperAdmin && active && activeTenantId) {
      setSelectedTenantId(String(activeTenantId));
    }
  }, [isSuperAdmin, active, activeTenantId]);

  useEffect(() => {
    if (!loading) setUpdatedAt(new Date().toISOString());
  }, [loading, active]);

  const handleStatusToggle = async () => {
    if (statusSaving) return;
    if (!targetTenantId) {
      notify.error('Select a tenant first');
      return;
    }
    setStatusSaving(true);
    const next = !(active ?? false);
    try {
      await storefrontSettingsService.update({
        storefront_active: next,
        tenant_id: targetTenantId,
      });
      setUpdatedAt(new Date().toISOString());
      notify.success(next ? 'Storefront activated' : 'Storefront deactivated');
      fetch();
    } catch { notify.error('Failed to toggle storefront'); }
    finally { setStatusSaving(false); }
  };

  // Company info (also carries express_checkout_enabled)
  const [settings, setSettings] = useState<EcommerceSettings | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);
  const [expressCheckoutSaving, setExpressCheckoutSaving] = useState(false);

  useEffect(() => {
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
      setCompanyLoading(false);
    };
    load();
  }, []);

  const handleCompanySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanySaving(true);
    try {
      const updated = await ecommerceSettingsService.update(form);
      setSettings(updated);
      notify.success('Company info saved');
    } catch { notify.error('Failed to save'); }
    setCompanySaving(false);
  };

  const handleExpressCheckoutToggle = async () => {
    if (expressCheckoutSaving) return;
    setExpressCheckoutSaving(true);
    const next = !expressCheckoutEnabled;
    try {
      await storefrontSettingsService.update({ express_checkout_enabled: next });
      await fetchSettings();
      notify.success(next ? 'Express Checkout enabled' : 'Express Checkout disabled');
    } catch { notify.error('Failed to update Express Checkout'); }
    finally { setExpressCheckoutSaving(false); }
  };

  const isLoading = loading || companyLoading;

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size="md" /></div>;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mr-auto">
          <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Store Settings
        </h1>
      </div>

      {/* Status & Activation — superadmin only */}
      {isSuperAdmin && (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Power className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Status &amp; Activation
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Storefront Status</h2>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Tenant
              </label>
              {isSuperAdmin ? (
                <TenantSelect
                  value={selectedTenantId || null}
                  onChange={(id) => setSelectedTenantId(id ?? '')}
                  placeholder="Select tenant…"
                  isDisabled={!!active}
                />
              ) : (
                <div className="w-full rounded-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                  {authUser?.tenant?.business_name ?? 'Current tenant'}
                </div>
              )}
              {isSuperAdmin && active && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  The active tenant is locked while the storefront is active. Deactivate to change it.
                </p>
              )}
            </div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded ${active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {active ? <><Power className="w-4 h-4" /> Active</> : <><PowerOff className="w-4 h-4" /> Inactive</>}
                </span>
              </div>
              <button
                onClick={handleStatusToggle}
                disabled={statusSaving || !targetTenantId}
                className={`px-3 py-1.5 text-sm font-medium rounded-sm text-white cursor-pointer disabled:opacity-60 ${active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
            {active && (
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
              <Clock className="w-3 h-3" /> Last updated: {updatedAt ? formatDate(updatedAt) : 'N/A'}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Express Checkout */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Express Checkout
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Enable Express Checkout
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                When active, an Express Checkout button appears on product detail pages and product grid cards, letting customers buy a single product immediately (Cash on Delivery only) without using the cart.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={expressCheckoutEnabled}
              disabled={expressCheckoutSaving}
              onClick={handleExpressCheckoutToggle}
              className={`relative inline-flex h-5.5 w-10 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                expressCheckoutEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
              } ${expressCheckoutSaving ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
            >
              {expressCheckoutSaving && (
                <Loader2 className="absolute left-1 h-3 w-3 animate-spin text-white" />
              )}
              <span
                className={`pointer-events-none absolute top-0.75 left-0.75 h-3.5 w-3.5 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                  expressCheckoutEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div
            className={`mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded ${
              expressCheckoutEnabled
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {expressCheckoutEnabled ? 'Active' : 'Inactive'}
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Express Checkout currently supports <strong>Cash on Delivery (COD)</strong> only. The payment step is locked to COD on the express checkout page.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Quick details</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Payment method</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">Cash on Delivery (COD)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Shipping fee</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{(settings?.currency_symbol ?? '\u09F3')}120 (fixed)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Delivery zone</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">Dhaka only</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Checkout</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">Single-page form</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Store / Company Information */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Store / Company Information
        </h2>
        <form onSubmit={handleCompanySave} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 space-y-2">
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
          <button type="submit" disabled={companySaving} className="flex items-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm cursor-pointer">
            <GiSave className="w-4 h-4" /> {companySaving ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}