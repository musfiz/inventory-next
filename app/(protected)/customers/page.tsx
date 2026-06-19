"use client";

import { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, Edit, Trash2, X, Eye } from 'lucide-react';
import { GiSave } from 'react-icons/gi';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm } from '@/lib/notifications';
import customerService from '@/services/customerService';
import type { Customer, CustomerStatementResponse } from '@/services/customerService';
import DataTable from '@/components/ui/datatable';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import TenantSelect from '@/components/ui/tenant-select';
import { useAuthStore } from '@/stores/auth-store';

export default function CustomersPage() {
  const { isSuperAdmin, hasPermission, isHydrated } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!hasPermission('view-customer')) router.replace('/dashboard');
  }, [isHydrated, hasPermission, router]);

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
    notes: '',
    credit_limit: '',
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [showStatement, setShowStatement] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementData, setStatementData] = useState<CustomerStatementResponse | null>(null);
  const [statementTarget, setStatementTarget] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const fmtMoney = (v?: number | string | null) => Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : '-');

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
      notes: '',
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
      notes: customer.notes || '',
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
        notes: formData.notes,
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

  const openStatement = async (customer: Customer) => {
    try {
      setStatementLoading(true);
      setStatementTarget(customer);
      setShowStatement(true);
      const data = await customerService.getCustomerStatement(customer.id);
      setStatementData(data);
      setPayAmount('');
      setPayMethod('cash');
      setPayNotes('');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      notify.error(axiosError.response?.data?.message || 'Failed to load statement');
      setShowStatement(false);
      setStatementTarget(null);
    } finally {
      setStatementLoading(false);
    }
  };

  const recordPayment = async () => {
    if (!statementTarget) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      notify.error('Amount must be greater than 0');
      return;
    }
    try {
      setRecordingPayment(true);
      await customerService.recordCustomerPayment(statementTarget.id, {
        amount,
        payment_method: payMethod,
        notes: payNotes || undefined,
      });
      notify.success('Customer payment recorded successfully');
      const data = await customerService.getCustomerStatement(statementTarget.id);
      setStatementData(data);
      setPayAmount('');
      setPayNotes('');
      setRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      notify.error(axiosError.response?.data?.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
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
      <span className="text-sm font-medium">{fmtMoney(row.original.current_balance ?? 0)}</span>
    ),
  });

  columns.push({
    id: 'outstanding',
    header: 'Outstanding',
    cell: ({ row }) => {
      const outstanding = Number(row.original.outstanding_balance ?? 0);
      return (
        <span className={`text-sm font-semibold ${outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
          {fmtMoney(outstanding)}
        </span>
      );
    },
  });

  columns.push({
    id: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = String(row.original.type || '').toLowerCase();
      const typeStyle: Record<string, string> = {
        own: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
        retail: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
        wholesale: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
        corporate: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
        dealer: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
      };

      if (!type) {
        return <span className="text-xs text-gray-500 dark:text-gray-400">-</span>;
      }

      return (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full capitalize ${typeStyle[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
          {type}
        </span>
      );
    },
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
          onClick={() => openStatement(row.original)}
          className="p-1 text-blue-600 hover:text-blue-800 cursor-pointer"
          title="Statement"
        >
          <Eye className="w-4 h-4" />
        </button>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 dark:text-gray-100 ${formErrors.type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  <option value="own">Own</option>
                  <option value="retail">Retail</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="corporate">Corporate</option>
                  <option value="dealer">Dealer</option>
                </select>
                {formErrors.type && <p className="text-red-600 text-xs mt-1">{formErrors.type}</p>}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Address</label>
                <textarea
                  placeholder="Dhaka"
                  rows={3}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.address ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">Notes</label>
                <textarea
                  placeholder="Optional notes"
                  rows={3}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${formErrors.notes ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {formErrors.notes && <p className="text-red-600 text-xs mt-1">{formErrors.notes}</p>}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex items-center justify-center gap-2 px-5 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-sm transition-colors cursor-pointer"> <GiSave className="w-4 h-4" /> {isEditing ? 'Update Customer' : 'Save Customer'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 transition-colors flex items-center gap-2"> <X className="w-4 h-4" /> Cancel</button>
            </div>
          </form>
        </div>
      )}

      <DataTable key={refreshKey} columns={columns} apiEndpoint={buildApiEndpoint()} pageSize={15} enableSearch={true} searchPlaceholder="Search by customer name, tenant_id, phone..." />

      {showStatement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Customer Statement</h3>
                <p className="text-sm opacity-80">{statementData?.customer?.name || statementTarget?.name || '-'}</p>
              </div>
              <button
                onClick={() => {
                  setShowStatement(false);
                  setStatementData(null);
                  setStatementTarget(null);
                }}
                className="p-1 rounded-full hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {statementLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-700/60 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Credit Limit</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{fmtMoney(statementData?.customer?.credit_limit ?? 0)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
                      <p className="text-xs text-blue-500">Current Balance</p>
                      <p className="font-semibold text-blue-700 dark:text-blue-200">{fmtMoney(statementData?.customer?.current_balance ?? 0)}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3">
                      <p className="text-xs text-red-500">Outstanding</p>
                      <p className="font-bold text-red-700 dark:text-red-200 text-lg">{fmtMoney(statementData?.summary?.total_outstanding ?? 0)}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-700/70">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Invoice</th>
                          <th className="px-3 py-2 text-left font-semibold">Date</th>
                          <th className="px-3 py-2 text-right font-semibold">Total</th>
                          <th className="px-3 py-2 text-right font-semibold">Returned</th>
                          <th className="px-3 py-2 text-right font-semibold">Paid</th>
                          <th className="px-3 py-2 text-right font-semibold">Due</th>
                          <th className="px-3 py-2 text-center font-semibold">Payment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {(statementData?.orders?.data ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 py-6 text-center text-gray-400">No orders found</td>
                          </tr>
                        ) : (
                          (statementData?.orders?.data ?? []).map((o) => (
                            <tr key={o.id} className="bg-white dark:bg-gray-800">
                              <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-200">{o.invoice_number || '-'}</td>
                              <td className="px-3 py-2 text-gray-500 dark:text-gray-300">{fmtDate(o.order_date)}</td>
                              <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200">{fmtMoney(o.grand_total ?? 0)}</td>
                              <td className="px-3 py-2 text-right text-orange-600">{fmtMoney(o.returned_amount ?? 0)}</td>
                              <td className="px-3 py-2 text-right text-emerald-600">{fmtMoney(o.paid_amount ?? 0)}</td>
                              <td className="px-3 py-2 text-right font-semibold text-red-600">{fmtMoney(o.due_amount ?? 0)}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${String(o.payment_status) === 'paid'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : String(o.payment_status) === 'partial'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                  {o.payment_status || '-'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {Number(statementData?.summary?.total_outstanding ?? 0) > 0 && (
                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-900/20 p-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Record Customer Payment</p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="Amount"
                          className="w-full px-2 py-1.5 text-sm border rounded-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                        <select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border rounded-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="bkash">bKash</option>
                          <option value="nagad">Nagad</option>
                          <option value="rocket">Rocket</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="check">Check</option>
                          <option value="other">Other</option>
                        </select>
                        <input
                          type="text"
                          value={payNotes}
                          onChange={(e) => setPayNotes(e.target.value)}
                          placeholder="Notes (optional)"
                          className="w-full px-2 py-1.5 text-sm border rounded-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 md:col-span-2"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={recordPayment}
                          disabled={recordingPayment}
                          className="px-4 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-sm font-medium"
                        >
                          {recordingPayment ? 'Recording...' : 'Record Payment'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
