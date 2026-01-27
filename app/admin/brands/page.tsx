'use client';

import { useState, useEffect } from 'react';
import { Eye, Edit, Trash2, Building2, Plus } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '../components/DataTable';
import CustomSelect, { SelectOption } from '../components/CustomSelect';
import { Brand, Tenant } from "@/types";
import { useAuth } from '@/hooks/useAuth';
import { confirm, notify } from '@/lib/notifications';

export default function BrandsPage() {
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const { user: currentUser } = useAuth();

  // Check if current user is super admin
  const isSuperAdmin = currentUser?.user_type === 'super_admin';

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Fetch tenants for superadmin filter
  useEffect(() => {
    if (isSuperAdmin) {
      fetch('/api/proxy/api/v1/tenant', {
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.tenants) {
            setTenants(data.tenants);
          }
        })
        .catch((error) => {
          console.error('Failed to fetch tenants:', error);
        });
    }
  }, [isSuperAdmin]);

  // Create tenant options for React Select
  const tenantOptions = [
    { value: 'all', label: 'All Tenants' },
    { value: 'chocolate', label: 'Chocolate' },
    { value: 'strawberry', label: 'Strawberry' },
    { value: 'vanilla', label: 'Vanilla' }
    // ...tenants.map((tenant) => ({
    //   value: tenant.id,
    //   label: tenant.business_name,
    // })),
  ];

  const columns: ColumnDef<Brand>[] = [
    {
      id: 'serial',
      header: '#',
      meta: { width: '4%' },
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
      accessorKey: 'name',
      header: 'Brand Name',
      meta: { width: '20%' },
      cell: ({ row }) => {
        const name = row.original.name;
        const maxLength = 20; // Maximum characters to display
        const truncatedName = name.length > maxLength ? name.substring(0, maxLength) + '...' : name;

        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div
              className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate w-full"
              title={name} // Show full name on hover
            >
              {truncatedName}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      meta: { width: '25%' },
      cell: ({ row }) => (
        <div className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-xs" title={row.original.description}>
          {row.original.description || 'No description'}
        </div>
      ),
    },
    {
      accessorKey: 'tenant.business_name',
      header: 'Tenant',
      meta: { width: '15%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.original.tenant?.business_name || 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      meta: { width: '15%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.original.created_at ? formatDate(row.original.created_at) : 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      meta: { width: '8%' },
      cell: ({ row }) => getStatusBadge(row.original.is_active),
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { width: '13%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            className="p-1 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded cursor-pointer"
            title="View Details"
            onClick={() => console.log('View', row.original.id)}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer"
            title="Edit"
            onClick={() => console.log('Edit', row.original.id)}
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
            title="Delete"
            onClick={() => console.log('Delete', row.original.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // Build API endpoint with filters
  const buildApiEndpoint = () => {
    const params = new URLSearchParams();
    // if (statusFilter !== 'all') params.append('status', statusFilter);
    if (isSuperAdmin && tenantFilter !== 'all') params.append('tenant_id', tenantFilter);
    const queryString = params.toString();
    return `/api/proxy/api/v1/brand${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Brand List
          </h1>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          onClick={() => console.log('Add new brand')}
        >
          <Plus className="w-4 h-4" />
          Add Brand
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1.5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div> */}

          {/* Tenant Filter - Only for Super Admin */}
          {isSuperAdmin && (
            <div>
              <CustomSelect
                value={tenantOptions.find(option => option.value === tenantFilter)}
                onChange={(selectedOption) => setTenantFilter(selectedOption?.value || 'all')}
                options={tenantOptions}
                placeholder="Select Tenants"
              />
            </div>
          )}

          {/* Placeholder for future filters */}
          <div></div>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        searchable={true}
        searchPlaceholder="Search by brand name, description..."
      />
    </div>
  );
}