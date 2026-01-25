'use client';

import { useState } from 'react';
import { Building2, Eye, Edit, Trash2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '../components/DataTable';

interface Tenant {
  id: number;
  business_name: string;
  business_type: string;
  email: string;
  phone: string;
  slug: string;
  is_active: boolean;
  users_count: number;
  created_at: string;
}

export default function TenantsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>('all');

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        Active
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
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

  const columns: ColumnDef<Tenant>[] = [
    {
      accessorKey: 'business_name',
      header: 'Business Name',
      cell: ({ row }) => (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm mr-3">
            {row.original.business_name.charAt(0).toUpperCase()}
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {row.original.business_name}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'business_type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
          {row.original.business_type}
        </span>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Contact',
      cell: ({ row }) => (
        <div>
          <div className="text-sm text-gray-900 dark:text-gray-100">{row.original.email}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.original.phone}</div>
        </div>
      ),
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      cell: ({ row }) => (
        <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
          {row.original.slug}
        </code>
      ),
    },
    {
      accessorKey: 'users_count',
      header: 'Users',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.original.users_count}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original.is_active),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
            title="View Details"
            onClick={() => console.log('View', row.original.id)}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
            title="Edit"
            onClick={() => console.log('Edit', row.original.id)}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
            title="Delete"
            onClick={() => console.log('Delete', row.original.id)}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Build API endpoint with filters
  const buildApiEndpoint = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (businessTypeFilter !== 'all') params.append('business_type', businessTypeFilter);
    
    const queryString = params.toString();
    return `/api/proxy/api/v1/tenants${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Tenant Management
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage all tenants and their information
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Business Type Filter */}
          <select
            value={businessTypeFilter}
            onChange={(e) => setBusinessTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
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
      </div>

      {/* DataTable */}
      <DataTable
        key={`${statusFilter}-${businessTypeFilter}`}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        searchable={true}
        searchPlaceholder="Search by business name, email, or slug..."
      />
    </div>
  );
}