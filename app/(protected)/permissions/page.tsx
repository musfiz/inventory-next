'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Edit, Trash2, Plus, Key } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import { Permission } from "@/types";
import { usePermissions } from '@/hooks/use-permissions';
import { confirm, notify } from '@/lib/notifications';
import permissionService from '@/services/permissionService';

export default function PermissionsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { hasPermission } = usePermissions();

  const getModuleBadge = (module?: string) => {
    if (!module) return null;

    return (
      <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
        {module.replace('-', ' ')}
      </span>
    );
  };

  const columns: ColumnDef<Permission>[] = [
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
      header: 'Permission Name',
      meta: { width: '25%' },
      cell: ({ row }) => (
        <div className="flex items-center">
          <Key className="w-4 h-4 mr-2 text-gray-400" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {row.original.name}
            </div>
            {row.original.display_name && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {row.original.display_name}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'module',
      header: 'Module',
      meta: { width: '15%' },
      cell: ({ row }) => getModuleBadge(row.original.module),
    },
    {
      accessorKey: 'guard_name',
      header: 'Guard',
      meta: { width: '15%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          {row.original.guard_name}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      meta: { width: '25%' },
      cell: ({ row }) => (
        <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs" title={row.original.description}>
          {row.original.description || 'No description'}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { width: '16%' },
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
            onClick={() => router.push(`/permissions/${row.original.id}/edit`)}
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
            title="Delete"
            onClick={async () => {
              const result = await confirm({
                title: 'Delete Permission',
                html: `Are you sure you want to delete the permission <strong>${row.original.name}</strong>?<br><br>This action cannot be undone.`,
                confirmButtonText: 'Delete',
                cancelButtonText: 'Cancel',
              });

              if (result.isConfirmed) {
                try {
                  await permissionService.deletePermission(row.original.id);
                  notify.success('Permission deleted successfully');
                  // Refresh the table
                  window.location.reload();
                } catch (error) {
                  notify.error('Failed to delete permission');
                }
              }
            }}
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
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (moduleFilter !== 'all') params.append('module', moduleFilter);
    if (searchQuery) params.append('search', searchQuery);
    const queryString = params.toString();
    return `/api/v1/permissions${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Permissions</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage system permissions</p>
        </div>
        {hasPermission('create-permissions') && (
          <button
            onClick={() => router.push('/permissions/add')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Permission
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search permissions..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="module" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Module
            </label>
            <select
              id="module"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
            >
              <option value="all">All Modules</option>
              <option value="users">Users</option>
              <option value="tenants">Tenants</option>
              <option value="settings">Settings</option>
              <option value="analytics">Analytics</option>
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          apiEndpoint={buildApiEndpoint()}
          searchQuery={searchQuery}
          enableSearch={false} // We handle search via filters
        />
      </div>
    </div>
  );
}