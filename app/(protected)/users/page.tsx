'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Edit, Trash2, Rows4, UserCheck } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import { User } from "@/types";
import { useAuthStore } from '@/stores/auth-store';
import { confirm, notify, success } from '@/lib/notifications';

export default function TenantsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [switchingUser, setSwitchingUser] = useState<string | null>(null);
  const currentUser = useAuthStore((state) => state.user);
  const switchUser = useAuthStore((state) => state.switchUser);

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

  const columns: ColumnDef<User>[] = [
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
      header: 'Name',
      meta: { width: '10%' }, // Custom metadata for width
      cell: ({ row }) => {
        const name = row.original.name;
        const maxLength = 15; // Maximum characters to display
        const truncatedName = name.length > maxLength ? name.substring(0, maxLength) + '...' : name;

        return (
          <div className="flex items-center">
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
      accessorKey: 'user_type',
      header: 'Type',
      meta: { width: '10%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
          {row.original.user_type}
        </span>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      meta: { width: '20%' },
      cell: ({ row }) => (
        <div>
          <div className="text-xs text-gray-900 dark:text-gray-100">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Mobile No',
      meta: { width: '15%' },
      cell: ({ row }) => (
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.original.phone}</div>
        </div>
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
      meta: { width: '14%' },
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
          {isSuperAdmin && row.original.user_type !== 'super_admin' && (
            <button
              className={`p-1 rounded transition-colors ${switchingUser === row.original.id
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer'
                }`}
              title={switchingUser === row.original.id ? 'Switching...' : 'Switch to User'}
              disabled={switchingUser === row.original.id}
              onClick={async () => {
                const result = await confirm({
                  title: 'Switch User Account',
                  html: `Are you sure you want to switch to <strong>${row.original.name}</strong>'s account?<br><br>
                          <div style="color: #6b7280; font-size: 13px; line-height: 1.5;">
                            <strong>Email:</strong> ${row.original.email}<br>
                            <strong>Type:</strong> ${row.original.user_type}
                          </div><br>
                          <em style="color: #6b7280; font-size: 12px;">This is for debugging purposes only.
                            You can switch back from the header menu.
                          </em>`,
                  confirmButtonText: 'Switch',
                  cancelButtonText: 'Cancel',
                });

                if (!result.isConfirmed) return;

                setSwitchingUser(row.original.id);
                try {
                  const switchSuccess = await switchUser(row.original.id.toString());
                  if (switchSuccess) {
                    router.push('/admin');
                  } else {
                    notify.switchUserError();
                  }
                } catch (error) {
                  notify.error('An error occurred while switching user. Please try again.');
                } finally {
                  setSwitchingUser(null);
                }
              }}
            >
              {switchingUser === row.original.id ? (
                <div className="w-3.5 h-3.5 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
              ) : (
                <UserCheck className="w-3.5 h-3.5" />
              )}
            </button>
          )}
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
    if (statusFilter !== 'all') params.append('status', statusFilter);
    const queryString = params.toString();
    return `/api/v1/user${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Rows4 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            User List
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

          <select
            value={businessTypeFilter}
            onChange={(e) => setBusinessTypeFilter(e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">All Types</option>
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="distribution">Distribution</option>
            <option value="ecommerce">E-commerce</option>
            <option value="service">Service</option>
            <option value="restaurant">Restaurant</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div> */}

      {/* DataTable */}
      <DataTable
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        searchable={true}
        searchPlaceholder="Search by business name, email, or slug..."
      />
    </div>
  );
}