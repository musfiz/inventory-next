'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Edit, Trash2, Rows4, X, Building2, MapPin, FileText, CreditCard, Settings } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import Spinner from '@/components/ui/spinner';
import tenantService from '@/services/tenantService';
import apiClient from '@/lib/api/axios';
import { notify } from '@/lib/notifications';
import { useStorefrontStatusStore } from '@/stores/storefront-status-store';
import { usePermissions } from '@/hooks/use-permissions';
import type { BusinessType, Tenant as TenantDetail } from '@/types/api.types';

interface TenantRow {
  id: number;
  business_name: string;
  business_type?: BusinessType | null;
  email: string;
  phone: string;
  is_active: boolean;
  storefront_active: boolean;
  users_count: number;
  created_at: string;
}

export default function TenantsPage() {
  const router = useRouter();
  const { isSuperAdmin, isHydrated, hasPermission } = usePermissions();

  useEffect(() => {
    if (isHydrated && !isSuperAdmin) {
      router.push('/access-denied');
    }
  }, [isSuperAdmin, isHydrated, router]);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTenant, setDetailsTenant] = useState<TenantDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [togglingStorefrontId, setTogglingStorefrontId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const openDetails = async (id: number) => {
    setDetailsOpen(true);
    setDetailsTenant(null);
    setDetailsLoading(true);
    try {
      const data = await tenantService.getTenantById(String(id));
      // API may return { tenant: ... } or the tenant object directly
      const tenant = (data as any).tenant ?? (data as any);
      setDetailsTenant(tenant as TenantDetail);
    } catch {
      setDetailsOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const fmt = (v?: string | null) =>
    v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const val = (v?: string | number | null) => (v !== undefined && v !== null && v !== '' ? String(v) : '—');

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        Active
      </span>
    ) : (
      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        Inactive
      </span>
    );
  };

  const handleStorefrontToggle = async (row: TenantRow) => {
    if (togglingStorefrontId !== null) return;
    const next = !row.storefront_active;

    // Activating: only one storefront may be active at a time.
    if (next) {
      try {
        const res = await apiClient.get('/api/v1/storefront/status');
        const activeTenantId = res.data?.data?.active_tenant_id;
        if (
          res.data?.data?.storefront_active &&
          activeTenantId !== null &&
          activeTenantId !== undefined &&
          Number(activeTenantId) !== row.id
        ) {
          notify.error(
            'A storefront is already active',
            'Only one storefront can be active at a time. Please deactivate the current store first, then try again.'
          );
          return;
        }
      } catch {
        // Status check failed — fall through; the backend enforces single-active anyway.
      }
    }

    setTogglingStorefrontId(row.id);
    try {
      // Tenant update requires business_name + email, so load full details first.
      const data = await tenantService.getTenantById(String(row.id));
      const tenant = ((data as any).tenant ?? (data as any)) as TenantDetail;
      await tenantService.updateTenant(String(row.id), {
        business_name: tenant.business_name,
        email: tenant.email,
        storefront_active: next,
      });
      notify.success(next ? 'Storefront activated' : 'Storefront deactivated');
      setRefreshKey(k => k + 1);
      useStorefrontStatusStore.getState().fetch();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.storefront_active?.[0] ||
        'Failed to update storefront status';
      notify.error('Storefront update failed', message);
    } finally {
      setTogglingStorefrontId(null);
    }
  };

  const columns: ColumnDef<TenantRow>[] = [
    {
      id: 'serial',
      header: '#',
      cell: ({ row, table }) => {
        const page = table.getState().pagination?.pageIndex ?? 0;
        const pageSize = table.getState().pagination?.pageSize ?? 15;
        return (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {page * pageSize + row.index + 1}
          </span>
        );
      },
    },
    {
      accessorKey: 'business_name',
      header: 'Business Name',
      cell: ({ row }) => (
        <div className="flex items-center">
          <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
            {row.original.business_name}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'business_type',
      header: 'Type',
      cell: ({ row }) => {
        const businessTypeName = row.original.business_type?.name;
        return (
          <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
            {businessTypeName || '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <div>
          <div className="text-xs text-gray-900 dark:text-gray-100">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Mobile No',
      cell: ({ row }) => (
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.original.phone}</div>
        </div>
      ),
    },
    {
      accessorKey: 'users_count',
      header: () => <div className="text-center">Users</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {row.original.users_count}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original.is_active),
    },
    {
      accessorKey: 'storefront_active',
      header: () => <div className="text-center">Storefront</div>,
      cell: ({ row }) => {
        const tenant = row.original;
        const isOn = !!tenant.storefront_active;
        const isBusy = togglingStorefrontId === tenant.id;
        if (!hasPermission('update-tenants')) {
          return (
            <div className="text-center">
              <span
                className={`px-1.5 py-0.5 text-xs font-medium rounded ${isOn ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}
              >
                {isOn ? 'On' : 'Off'}
              </span>
            </div>
          );
        }
        return (
          <div className="flex justify-center">
            <button
              type="button"
              role="switch"
              aria-checked={isOn}
              aria-label={`Storefront for ${tenant.business_name}`}
              title={isOn ? 'Deactivate storefront' : 'Activate storefront'}
              disabled={isBusy}
              onClick={() => handleStorefrontToggle(tenant)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                isOn ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  isOn ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            className="p-1 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
            title="View Details"
            onClick={() => openDetails(row.original.id)}
           aria-label="View Details">
            <Eye className="w-3.5 h-3.5" />
          </button>
          {hasPermission('update-tenants') && (
            <button
              className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              title="Edit"
              onClick={() => router.push(`/tenants/edit?id=${row.original.id}`)}
             aria-label="Edit">
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
          {hasPermission('update-tenants') && (
            <button
              className="p-1 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded"
              title="Settings"
              onClick={() => router.push(`/tenants/settings?id=${row.original.id}`)}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
          {hasPermission('delete-tenants') && (
            <button
              className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:bg-red-900/20 rounded"
              title="Delete"
              onClick={() => console.log('Delete', row.original.id)}
             aria-label="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Build API endpoint with filters
  const buildApiEndpoint = () => {
    const params = new URLSearchParams();
    const queryString = params.toString();
    return `tenants${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Rows4 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Tenant List
          </h1>
        </div>
      </div>

      {/* Filters */}
      {/* <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div> */}

      {/* DataTable */}
      <DataTable
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by business name, email, or slug..."
        refreshKey={refreshKey}
      />

      {/* Details Modal */}
      {detailsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setDetailsOpen(false)}
        >
          <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[88vh]">

            {/* Sticky Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {detailsTenant?.business_name ?? 'Tenant Details'}
                </h2>
                {detailsTenant && (
                  <>
                    <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${detailsTenant.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                      {detailsTenant.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {detailsTenant.is_verified && (
                      <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                        Verified
                      </span>
                    )}
                  </>
                )}
              </div>
              <button
                onClick={() => setDetailsOpen(false)}
                className="shrink-0 ml-2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div
              className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3
                [&::-webkit-scrollbar]:w-1.5
                [&::-webkit-scrollbar-track]:bg-transparent
                [&::-webkit-scrollbar-thumb]:bg-gray-200
                dark:[&::-webkit-scrollbar-thumb]:bg-gray-700
                [&::-webkit-scrollbar-thumb]:rounded-full"
            >
              {detailsLoading && (
                <div className="flex items-center justify-center py-16 text-sm text-gray-400 dark:text-gray-500">
                  <Spinner size="sm" className="mr-2" />
                  Loading...
                </div>
              )}

              {!detailsLoading && detailsTenant && (
                <>
                  {/* Quick summary strip — gradient */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 bg-linear-to-r from-indigo-600 to-violet-600 rounded-xl text-xs shadow-md">
                    {detailsTenant.slug && (
                      <span><span className="text-indigo-200">Slug: </span><span className="font-semibold text-white">{detailsTenant.slug}</span></span>
                    )}
                    {detailsTenant.email && (
                      <span><span className="text-indigo-200">Email: </span><span className="font-semibold text-white">{detailsTenant.email}</span></span>
                    )}
                    {detailsTenant.phone && (
                      <span><span className="text-indigo-200">Phone: </span><span className="font-semibold text-white">{detailsTenant.phone}</span></span>
                    )}
                    {detailsTenant.created_at && (
                      <span><span className="text-indigo-200">Since: </span><span className="font-semibold text-white">{fmt(detailsTenant.created_at)}</span></span>
                    )}
                  </div>

                  {/* 2-column section grid */}
                  <div className="grid grid-cols-2 gap-3">

                    {/* Business — indigo */}
                    <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/50 overflow-hidden shadow-sm">
                      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-100 dark:bg-indigo-900/60 border-b border-indigo-200 dark:border-indigo-800/50">
                        <span className="p-1 bg-indigo-600 rounded-md shadow-sm">
                          <Building2 className="w-3 h-3 text-white" />
                        </span>
                        <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Business</span>
                      </div>
                      <dl className="bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2">
                        {([
                          ['Type', val(detailsTenant.business_type?.name)],
                          ['Contact Person', val(detailsTenant.contact_person)],
                          ['Currency', val(detailsTenant.currency)],
                          ['Timezone', val(detailsTenant.timezone)],
                          ['Theme Color', val(detailsTenant.theme_color)],
                        ] as [string, string][]).map(([label, value]) => (
                          <div key={label} className="flex justify-between items-center gap-2 py-1.5 border-b border-indigo-100 dark:border-indigo-900/40 last:border-0">
                            <dt className="text-[10px] text-indigo-400 dark:text-indigo-500 shrink-0">{label}</dt>
                            <dd className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-200 text-right capitalize break-all">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    {/* Location — teal */}
                    <div className="rounded-xl border border-teal-200 dark:border-teal-800/50 overflow-hidden shadow-sm">
                      <div className="flex items-center gap-2 px-3 py-2 bg-teal-100 dark:bg-teal-900/60 border-b border-teal-200 dark:border-teal-800/50">
                        <span className="p-1 bg-teal-600 rounded-md shadow-sm">
                          <MapPin className="w-3 h-3 text-white" />
                        </span>
                        <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider">Location</span>
                      </div>
                      <dl className="bg-teal-50 dark:bg-teal-950/30 px-3 py-2">
                        {([
                          ['City', val(detailsTenant.city)],
                          ['Country', val(detailsTenant.country)],
                          ['Address', val(detailsTenant.address)],
                        ] as [string, string][]).map(([label, value]) => (
                          <div key={label} className="flex justify-between items-center gap-2 py-1.5 border-b border-teal-100 dark:border-teal-900/40 last:border-0">
                            <dt className="text-[10px] text-teal-500 dark:text-teal-500 shrink-0">{label}</dt>
                            <dd className="text-[11px] font-semibold text-teal-800 dark:text-teal-200 text-right">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    {/* Legal & Tax — cyan */}
                    <div className="rounded-xl border border-cyan-200 dark:border-cyan-800/50 overflow-hidden shadow-sm">
                      <div className="flex items-center gap-2 px-3 py-2 bg-cyan-100 dark:bg-cyan-900/60 border-b border-cyan-200 dark:border-cyan-800/50">
                        <span className="p-1 bg-cyan-500 rounded-md shadow-sm">
                          <FileText className="w-3 h-3 text-white" />
                        </span>
                        <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider">Legal & Tax</span>
                      </div>
                      <dl className="bg-cyan-50 dark:bg-cyan-950/30 px-3 py-2">
                        {([
                          ['Trade License', val(detailsTenant.trade_license)],
                          ['TIN Number', val(detailsTenant.tin_number)],
                          ['BIN Number', val(detailsTenant.bin_number)],
                          ['VAT Number', val(detailsTenant.vat_number)],
                        ] as [string, string][]).map(([label, value]) => (
                          <div key={label} className="flex justify-between items-center gap-2 py-1.5 border-b border-cyan-100 dark:border-cyan-900/40 last:border-0">
                            <dt className="text-[10px] text-cyan-500 dark:text-cyan-500 shrink-0">{label}</dt>
                            <dd className="text-[11px] font-semibold text-cyan-800 dark:text-cyan-200 text-right">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    {/* Subscription — fuchsia */}
                    <div className="rounded-xl border border-fuchsia-200 dark:border-fuchsia-800/50 overflow-hidden shadow-sm">
                      <div className="flex items-center gap-2 px-3 py-2 bg-fuchsia-100 dark:bg-fuchsia-900/60 border-b border-fuchsia-200 dark:border-fuchsia-800/50">
                        <span className="p-1 bg-fuchsia-600 rounded-md shadow-sm">
                          <CreditCard className="w-3 h-3 text-white" />
                        </span>
                        <span className="text-[11px] font-bold text-fuchsia-700 dark:text-fuchsia-300 uppercase tracking-wider">Subscription</span>
                      </div>
                      <dl className="bg-fuchsia-50 dark:bg-fuchsia-950/30 px-3 py-2">
                        {([
                          ['Plan', val(detailsTenant.subscription_plan)],
                          ['Status', val(detailsTenant.subscription_status)],
                          ['Ends At', fmt(detailsTenant.subscription_ends_at)],
                          ['Trial Ends At', fmt(detailsTenant.trial_ends_at)],
                          ['Max Users', val(detailsTenant.max_users)],
                          ['Max Products', val(detailsTenant.max_products)],
                          ['Max Warehouses', val(detailsTenant.max_warehouses)],
                        ] as [string, string][]).map(([label, value]) => (
                          <div key={label} className="flex justify-between items-center gap-2 py-1.5 border-b border-fuchsia-100 dark:border-fuchsia-900/40 last:border-0">
                            <dt className="text-[10px] text-fuchsia-500 dark:text-fuchsia-500 shrink-0">{label}</dt>
                            <dd className="text-[11px] font-semibold text-fuchsia-800 dark:text-fuchsia-200 text-right capitalize">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>

                  {/* System — violet, full width */}
                  <div className="rounded-xl border border-violet-200 dark:border-violet-800/50 overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2 px-3 py-2 bg-violet-100 dark:bg-violet-900/60 border-b border-violet-200 dark:border-violet-800/50">
                      <span className="p-1 bg-violet-600 rounded-md shadow-sm">
                        <Settings className="w-3 h-3 text-white" />
                      </span>
                      <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider">System</span>
                    </div>
                    <div className="bg-violet-50 dark:bg-violet-950/30 px-3 py-2 grid grid-cols-4 gap-x-2">
                      <div className="flex flex-col gap-0.5 py-1.5 border-b border-violet-100 dark:border-violet-900/40">
                        <span className="text-[10px] text-violet-400 dark:text-violet-500">Status</span>
                        <span className={`mt-0.5 self-start px-1.5 py-0.5 text-[10px] font-bold rounded-full ${detailsTenant.is_active ? 'bg-green-200 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                          {detailsTenant.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 py-1.5 border-b border-violet-100 dark:border-violet-900/40">
                        <span className="text-[10px] text-violet-400 dark:text-violet-500">Verified</span>
                        <span className={`mt-0.5 self-start px-1.5 py-0.5 text-[10px] font-bold rounded-full ${detailsTenant.is_verified ? 'bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                          {detailsTenant.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                      {([
                        ['Created', fmt(detailsTenant.created_at)],
                        ['Updated', fmt(detailsTenant.updated_at)],
                      ] as [string, string][]).map(([label, value]) => (
                        <div key={label} className="flex flex-col gap-0.5 py-1.5 border-b border-violet-100 dark:border-violet-900/40">
                          <span className="text-[10px] text-violet-400 dark:text-violet-500">{label}</span>
                          <span className="text-[11px] font-semibold text-violet-800 dark:text-violet-200">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setDetailsOpen(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
              {detailsTenant && hasPermission('update-tenants') && (
                <button
                  onClick={() => { setDetailsOpen(false); router.push(`/tenants/edit?id=${detailsTenant.id}`); }}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                >
                  Edit Tenant
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

