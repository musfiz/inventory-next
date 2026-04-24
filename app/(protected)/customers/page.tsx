"use client";

import { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, Edit, Trash2, X } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm } from '@/lib/notifications';
import customerService from '@/services/customerService';
import type { Customer } from '@/services/customerService';
import DataTable from '@/components/ui/datatable';
import { usePermissions } from '@/hooks/use-permissions';
import TenantSelect from '@/components/ui/tenant-select';
import { useAuthStore } from '@/stores/auth-store';

export default function CustomersPage() {
  const { isSuperAdmin } = usePermissions();
  const authUser = useAuthStore(s => s.user);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<any>({
    tenant_id: '',
    name: '',
    company_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: 'Bangladesh',
    type: 'retail',
    credit_limit: '',
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);

  // tenant select handled by TenantSelect component

  const handleAddCustomer = () => {
    setIsEditing(false);
    setCurrentCustomer(null);
    setFormData({
      tenant_id: isSuperAdmin ? '' : (authUser?.tenant_id ? String(authUser.tenant_id) : ''),
      name: '',
      company_name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      country: 'Bangladesh',
      type: 'retail',
      credit_limit: '',
      status: 'active',
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setIsEditing(true);
    setCurrentCustomer(customer);
    setFormData({
      tenant_id: customer.tenant_id ? String(customer.tenant_id) : '',
      name: customer.name,
      company_name: customer.company_name || '',
      contact_person: customer.contact_person || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      country: customer.country || 'Bangladesh',
      type: customer.type || 'retail',
      credit_limit: customer.credit_limit || '',
      status: customer.status || 'active',
    });
    setFormErrors({});
    // TenantSelect will handle selected option rendering; we just set tenant_id value.
    setShowForm(true);
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    // Only require tenant selection for super admins. For normal users use their tenant implicitly.
    if (isSuperAdmin && (!formData.tenant_id || !String(formData.tenant_id).trim())) errors.tenant_id = 'Tenant is required';
    if (!formData.name || !formData.name.trim()) errors.name = 'Customer name is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const submitData: any = {
        // tenant_id handled below (super admin vs normal user)
        name: formData.name,
        company_name: formData.company_name,
        contact_person: formData.contact_person,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        type: formData.type,
        credit_limit: formData.credit_limit || 0,
        status: formData.status,
      };

      const tenantId = isSuperAdmin ? formData.tenant_id : authUser?.tenant_id;
      if (tenantId) submitData.tenant_id = String(tenantId);

      if (isEditing && currentCustomer) {
        await customerService.updateCustomer(currentCustomer.id, submitData);
        notify.success('Customer updated successfully');
      } else {
        await customerService.storeCustomer(submitData);
        notify.success('Customer created successfully');
      }

      setShowForm(false);
      setRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      if (axiosError.response?.data?.errors) {
        const transformed: { [key: string]: string } = {};
        Object.entries(axiosError.response.data.errors).forEach(([key, msgs]) => {
          transformed[key] = Array.isArray(msgs) ? msgs.join(', ') : (msgs as any);
        });
        setFormErrors(transformed);
      } else {
        notify.error(axiosError.response?.data?.message || 'Failed to save customer');
      }
    }
  };

  const handleDelete = async (customer: Customer) => {
    const result = await confirm({
      title: 'Delete Customer',
      html: `Are you sure you want to delete customer <strong>${customer.name}</strong>?`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });

    if (!result.isConfirmed) return;

    try {
      await customerService.deleteCustomer(customer.id);
      notify.success('Customer deleted successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      notify.error(axiosError.response?.data?.message || 'Failed to delete customer');
    }
  };

  const columns: ColumnDef<Customer>[] = [];

  // Serial column
  columns.push({
    id: 'serial',
    header: 'SL',
    cell: ({ row, table }) => (
      <span className="text-gray-600 dark:text-gray-400">
        {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + row.index + 1}
      </span>
    ),
  });

  // Tenant column - only visible to super admins
  if (isSuperAdmin) {
    columns.push({
      id: 'tenant',
      header: 'Tenant',
      cell: ({ row }) => (
        <span className="text-sm">
          {(row.original as any).tenant?.business_name || (row.original as any).tenant?.name || row.original.tenant_id}
        </span>
      ),
    });
  }

  // Name column
  columns.push({
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div>
        <div className="font-medium text-gray-900 dark:text-gray-100">{row.original.name}</div>
        {row.original.company_name && (
          <div className="text-xs text-gray-500">{row.original.company_name}</div>
        )}
      </div>
    ),
  });
  // Contact column
  columns.push({
    id: 'contact',
    header: 'Contact',
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.phone && <div className="text-gray-600">{row.original.phone}</div>}
        {row.original.email && <div className="text-xs text-gray-500">{row.original.email}</div>}
        {!row.original.phone && !row.original.email && <span className="text-gray-400">-</span>}
      </div>
    ),
  });

  // Balance column
  columns.push({
    id: 'balance',
    header: 'Balance',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.current_balance ?? 0}</span>
    ),
  });

  // Status column
  columns.push({
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span className={`px-2 py-1 text-xs rounded-full ${row.original.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {row.original.status || '-'}
      </span>
    ),
  });

  // Actions column
  columns.push({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleEditCustomer(row.original)}
          className="p-1 text-green-600 hover:text-green-800 cursor-pointer"
          title="Edit"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleDelete(row.original)}
          className="p-1 text-red-600 hover:text-red-800 cursor-pointer"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    ),
  });

  const buildApiEndpoint = () => {
    const params = new URLSearchParams();
    const queryString = params.toString();
    return `customers${queryString ? `?${queryString}` : ''}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-blue-600" />
            Customers
          </h1>
        </div>
        <button
          onClick={handleAddCustomer}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Add/Edit Customer Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 mb-1">
          <h2 className="text-lg font-semibold mb-1.5 text-gray-900 dark:text-gray-100">
            {isEditing ? 'Edit Customer' : 'Add Customer'}
          </h2>
          <form onSubmit={handleFormSubmit} className="space-y-3">
            {/* Tenant Selection - Only for Super Admin */}
            {isSuperAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Tenant <span className="text-red-500">*</span></label>
                  <TenantSelect
                    value={formData.tenant_id}
                    onChange={(tid) => {
                      setFormData({ ...formData, tenant_id: tid || '' });
                      if (tid && formErrors.tenant_id) {
                        const { tenant_id, ...rest } = formErrors;
                        setFormErrors(rest);
                      }
                    }}
                    placeholder="Select tenant"
                    isInvalid={!!formErrors.tenant_id}
                  />
                  {formErrors.tenant_id && <p className="text-red-600 text-xs mt-1">{formErrors.tenant_id}</p>}
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Customer Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={formData.name}
                  onChange={e => {
                    setFormData({ ...formData, name: e.target.value });
                    if (e.target.value.trim() && formErrors.name) {
                      const { name, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Phone <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="+880 1..."
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {formErrors.phone && <p className="text-red-600 text-xs mt-1">{formErrors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Email</label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={formData.email}
                  onChange={e => { setFormData({ ...formData, email: e.target.value }); if (e.target.value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value) && formErrors.email) { const { email, ...rest } = formErrors; setFormErrors(rest); } }}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {formErrors.email && <p className="text-red-600 text-xs mt-1">{formErrors.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Company</label>
                <input
                  type="text"
                  placeholder="Company Ltd"
                  value={formData.company_name}
                  onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Address</label>
                <input type="text" placeholder="Dhaka" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.address ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 dark:text-gray-100 ${formErrors.status ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="blacklisted">Blacklisted</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 transition-colors flex items-center gap-2"> <Edit className="w-4 h-4" /> {isEditing ? 'Update Customer' : 'Save Customer'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 transition-colors flex items-center gap-2"> <X className="w-4 h-4" /> Cancel</button>
            </div>
          </form>
        </div>
      )}

      <DataTable key={refreshKey} columns={columns} apiEndpoint={buildApiEndpoint()} pageSize={15} enableSearch={true} searchPlaceholder="Search by customer name, tenant_id, phone..." />
    </div>
  );
}
