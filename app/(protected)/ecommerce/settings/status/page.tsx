'use client';

import { useState, useEffect } from 'react';
import { Power, PowerOff, ExternalLink, Building2, Clock } from 'lucide-react';
import { notify } from '@/lib/notifications';
import storefrontSettingsService from '@/services/storefrontSettingsService';
import { useAuthStore } from '@/stores/auth-store';
import { usePermissions } from '@/hooks/use-permissions';
import { useStorefrontStatus } from '@/hooks/use-storefront-status';
import Spinner from '@/components/ui/spinner';
import TenantSelect from '@/components/ui/tenant-select';
import { formatDate } from '@/lib/utils/date';
import Link from 'next/link';

export default function StatusActivationPage() {
  const authUser = useAuthStore(s => s.user);
  const { isSuperAdmin } = usePermissions();
  const { active, activeTenantId, loading, fetch } = useStorefrontStatus();

  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const targetTenantId = isSuperAdmin ? selectedTenantId : (authUser?.tenant_id ?? '');

  // Preselect the active tenant while a storefront is active (super admin view).
  useEffect(() => {
    if (isSuperAdmin && active && activeTenantId) {
      setSelectedTenantId(String(activeTenantId));
    }
  }, [isSuperAdmin, active, activeTenantId]);

  // Refresh the "last updated" timestamp whenever the status changes.
  useEffect(() => {
    if (!loading) setUpdatedAt(new Date().toISOString());
  }, [loading, active]);

  const handleToggle = async () => {
    if (saving) return;
    if (!targetTenantId) {
      notify.error('Select a tenant first');
      return;
    }
    setSaving(true);
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
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="md" /></div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Power className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Status &amp; Activation
        </h1>
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
              onClick={handleToggle}
              disabled={saving || !targetTenantId}
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
  );
}
