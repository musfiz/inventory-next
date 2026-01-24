'use client';

import { ColumnDef } from '@tanstack/react-table';
import DataTable from '../components/DataTable';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  joinDate: string;
}

export default function DataTablePage() {
  // Define columns with TanStack Table
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      enableSorting: true,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      enableSorting: true,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      enableSorting: true,
    },
    {
      accessorKey: 'role',
      header: 'Role',
      enableSorting: true,
      cell: ({ getValue }) => {
        const role = getValue() as string;
        const roleColors: Record<string, string> = {
          Admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
          Editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
          Viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        };

        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}
          >
            {role}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
      cell: ({ getValue }) => {
        const status = getValue() as string;
        const statusColors: Record<string, string> = {
          Active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
          Inactive: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
          Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        };

        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}
          >
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'joinDate',
      header: 'Join Date',
      enableSorting: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Server-Side DataTable
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Advanced datatable with server-side pagination, sorting, and search using TanStack Table
        </p>
      </div>

      <DataTable<User>
        columns={columns}
        apiEndpoint="/api/datatable"
        pageSize={10}
        searchable={true}
        searchPlaceholder="Search users..."
      />
    </div>
  );
}
