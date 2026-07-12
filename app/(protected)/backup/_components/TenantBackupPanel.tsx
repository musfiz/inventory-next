'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, Building2, Search, Mail, Users, Briefcase, X } from 'lucide-react';
import apiClient from '@/lib/api/axios';
import { backupService } from '@/services';
import { notify, confirm } from '@/lib/notifications';
import type { BackupJobStatus } from '@/services/backupService';

interface TenantBackupPanelProps {
  onJobStarted: (job: BackupJobStatus) => void;
}

interface TenantRow {
  id: number;
  business_name: string;
  business_type_name?: string;
  email: string;
  phone?: string;
  users_count?: number;
}

export function TenantBackupPanel({ onJobStarted }: TenantBackupPanelProps) {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startingFor, setStartingFor] = useState<number | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { per_page: 100 };
      if (searchQuery) params.search = searchQuery;
      const res = await apiClient.get('/api/v1/tenants', { params });
      const data = res.data?.data ?? res.data?.tenants ?? [];
      setTenants(Array.isArray(data) ? data : []);
    } catch {
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleExport = async (tenant: TenantRow) => {
    const ok = await confirm({
      title: 'Export tenant data?',
      html: `<p class="text-sm">This will export <b>${tenant.business_name}</b> (ID: ${tenant.id}) to a <code>.sql</code> file.</p>` +
            `<p class="text-sm mt-2">The export includes the tenant's 59 scoped tables plus the related shared data for its business type.</p>`,
      icon: 'question',
      confirmButtonText: 'Start export',
      cancelButtonText: 'Cancel',
    });
    if (!ok.isConfirmed) return;

    try {
      setStartingFor(tenant.id);
      const result = await backupService.exportTenant(tenant.id);
      notify.success('Tenant export started. Tracking job #' + result.job_id);
      const status = await backupService.getTenantExportStatus(result.job_id);
      onJobStarted({ ...status, mode: 'tenant', tenant_id: tenant.id } as BackupJobStatus);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to start export');
    } finally {
      setStartingFor(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Tenants</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
              Click Download SQL on any card to export that tenant's data.
            </span>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tenants..."
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && tenants.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : tenants.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          {searchQuery ? 'No tenants match your search.' : 'No tenants found.'}
        </div>
      ) : (
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {tenants.map((tenant) => {
              const isStarting = startingFor === tenant.id;
              return (
                <div
                  key={tenant.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                >
                  <div className="p-3.5 space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {tenant.business_name}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {tenant.business_type_name || '—'}
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono shrink-0">
                        #{tenant.id}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1 min-w-0">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{tenant.email}</span>
                      </span>
                      {tenant.users_count !== undefined && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Users className="w-3 h-3" />
                          {tenant.users_count}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleExport(tenant)}
                      disabled={isStarting}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isStarting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      {isStarting ? 'Starting…' : 'Download SQL'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
