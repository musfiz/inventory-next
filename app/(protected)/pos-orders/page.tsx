'use client';

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { List, Building2 } from 'lucide-react';
import DataTable from '@/components/ui/datatable';
import { usePermissions } from '@/hooks/use-permissions';
import CustomSelect from '@/components/ui/custom-select';
import { commonService, posRegisterService } from '@/services';

export default function PosOrdersPage() {
  const { isSuperAdmin, isHydrated } = usePermissions();

  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [selectedRegister, setSelectedRegister] = useState<any>(null);
  const [tenantOptions, setTenantOptions] = useState<any[]>([]);
  const [registerOptions, setRegisterOptions] = useState<any[]>([]);
  const [registerLoading, setRegisterLoading] = useState(false);

  // Load tenants for super admin
  useEffect(() => {
    if (!isHydrated || !isSuperAdmin) return;
    commonService
      .getTenantsForDropdown({})
      .then((list: any[]) =>
        setTenantOptions((list || []).map((t: any) => ({ value: t.id, label: t.business_name })))
      )
      .catch(() => { });
  }, [isHydrated, isSuperAdmin]);

  const handleTenantChange = (opt: any) => {
    setSelectedTenant(opt);
    setSelectedRegister(null);
    setRegisterOptions([]);
    if (opt?.value) {
      setRegisterLoading(true);
      posRegisterService
        .dropdown(opt.value)
        .then((list: any[]) =>
          setRegisterOptions((list || []).map((r: any) => ({ value: r.id, label: r.name })))
        )
        .catch(() => { })
        .finally(() => setRegisterLoading(false));
    }
    setRefreshKey(k => k + 1);
  };

  const handleRegisterChange = (opt: any) => {
    setSelectedRegister(opt);
    setRefreshKey(k => k + 1);
  };

  const buildApiEndpoint = () => {
    const params = new URLSearchParams();
    if (isSuperAdmin && selectedTenant?.value) params.set('tenant_id', String(selectedTenant.value));
    if (selectedRegister?.value) params.set('register_id', String(selectedRegister.value));
    const qs = params.toString();
    return `/pos/orders${qs ? `?${qs}` : ''}`;
  };

  const columns: ColumnDef<any>[] = [
    {
      id: 'serial',
      header: 'SL',
      cell: ({ row, table }) =>
        table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
        row.index +
        1,
    },
    { accessorKey: 'invoice_number', header: 'Invoice No.' },
    {
      accessorKey: 'customer_name',
      header: 'Customer',
      cell: ({ row }) => row.original.customer_name || 'Walk-in Customer',
    },
    {
      accessorKey: 'session',
      header: 'Session',
      cell: ({ row }) => row.original.session?.session_number || '—',
    },
    {
      accessorKey: 'register',
      header: 'Register',
      cell: ({ row }) => row.original.register?.name || '—',
    },
    {
      accessorKey: 'payment_method',
      header: 'Method',
      cell: ({ row }) => {
        const m: string = row.original.payment_method || '';
        return <span className="capitalize">{m.replace(/_/g, ' ')}</span>;
      },
    },
    {
      accessorKey: 'payment_status',
      header: 'Payment',
      cell: ({ row }) => {
        const s: string = row.original.payment_status || '';
        const map: Record<string, string> = {
          paid: 'bg-emerald-100 text-emerald-800',
          partial: 'bg-amber-100 text-amber-800',
          pending: 'bg-yellow-100 text-yellow-800',
          failed: 'bg-red-100 text-red-800',
        };
        const cls = map[s] || 'bg-gray-100 text-gray-800';
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
            {s.charAt(0).toUpperCase() + s.slice(1) || '—'}
          </span>
        );
      },
    },
    {
      accessorKey: 'grand_total',
      header: 'Total (৳)',
      cell: ({ row }) => (
        <span className="font-semibold">
          ৳{Number(row.original.grand_total ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: ({ row }) =>
        row.original.created_at
          ? new Date(row.original.created_at).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
          : '—',
    },
  ];

  return (
    <div className="space-y-2">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <List className="w-5 h-5 text-blue-600" /> POS Orders
        </h1>
      </div>

      {/* Super Admin Tenant / Register Filter */}
      {isSuperAdmin && (
        <div className="bg-white border border-gray-200 rounded-sm p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Filter by Tenant &amp; Register
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="w-72">
              <CustomSelect
                value={selectedTenant}
                onChange={handleTenantChange}
                defaultOptions={tenantOptions}
                loadOptions={async (input: string) => {
                  const list = await commonService
                    .getTenantsForDropdown({ search: input })
                    .catch(() => []);
                  return (list || []).map((t: any) => ({ value: t.id, label: t.business_name }));
                }}
                placeholder="All Tenants"
                isClearable
                className="text-sm"
              />
            </div>
            <div className="w-72">
              <CustomSelect
                key={`reg-${selectedTenant?.value ?? 'none'}`}
                value={selectedRegister}
                onChange={handleRegisterChange}
                defaultOptions={registerOptions}
                isLoading={registerLoading}
                placeholder={selectedTenant ? 'All Registers' : 'Select tenant first'}
                isDisabled={!selectedTenant}
                isClearable
                className="text-sm"
              />
            </div>
          </div>
        </div>
      )}

      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        enableSearch
        searchPlaceholder="Search by invoice, customer name..."
      />
    </div>
  );
}

