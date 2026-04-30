'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm } from '@/lib/notifications';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import { posRefundService, commonService, salesOrderService, userService } from '@/services';
import { usePermissions } from '@/hooks/use-permissions';
import { useRouter } from 'next/navigation';

export default function PosRefundsPage() {
  const { isSuperAdmin } = usePermissions();
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  const [formData, setFormData] = useState<any>({
    tenant_id: undefined,
    original_order_id: undefined,
    refund_date: '',
    refund_reason: 'return',
    reason_details: '',
    total_refund_amount: '',
    refund_method: 'cash',
    status: 'pending',
    approved_by: undefined,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [defaultTenantOptions, setDefaultTenantOptions] = useState<any[]>([]);
  const [defaultOrderOptions, setDefaultOrderOptions] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  useEffect(() => {
    const prefetch = async () => {
      const orders = await salesOrderService.getSalesOrders({ per_page: 10 }).catch(() => ({ data: [] }));
      setDefaultOrderOptions((orders.data || []).map((o: any) => ({ value: o.id, label: o.order_number || o.invoice_number || String(o.id) })));
    };
    prefetch();
  }, []);

  const loadTenantOptions = async (input: string) => {
    if (!isSuperAdmin) return [];
    const tenants = await commonService.getTenantsForDropdown({ search: input }).catch(() => []);
    const options = tenants.map((t: any) => ({ value: t.id, label: t.business_name }));
    if (!input && defaultTenantOptions.length === 0) setDefaultTenantOptions(options);
    return options;
  };

  const loadOrderOptions = async (input: string) => {
    const res = await salesOrderService.getSalesOrders({ search: input }).catch(() => ({ data: [] }));
    return (res.data || []).map((o: any) => ({ value: o.id, label: o.order_number || o.invoice_number || String(o.id) }));
  };

  const loadUserOptions = async (input: string) => {
    try {
      const res = await userService.getUsers({ search: input, per_page: 10 });
      return (res.users || []).map((u: any) => ({ value: u.id, label: u.name || u.email || String(u.id) }));
    } catch {
      return [];
    }
  };

  const handleAddRefund = () => {
    setFormData({
      tenant_id: undefined,
      original_order_id: undefined,
      refund_date: '',
      refund_reason: 'return',
      reason_details: '',
      total_refund_amount: '',
      refund_method: 'cash',
      status: 'pending',
      approved_by: undefined,
    });
    setFormErrors({});
    setSelectedTenant(null);
    if (isSuperAdmin) {
      loadTenantOptions('');
    }
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    try {
      const payload = {
        tenant_id: formData.tenant_id,
        original_order_id: formData.original_order_id,
        refund_date: formData.refund_date,
        refund_reason: formData.refund_reason,
        reason_details: formData.reason_details,
        total_refund_amount: Number(formData.total_refund_amount) || 0,
        refund_method: formData.refund_method,
        status: formData.status,
        approved_by: formData.approved_by,
      };

      await posRefundService.store(payload);
      notify.success('Refund created successfully');
      setShowForm(false);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const transformed: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([k, v]: any) => {
          transformed[k] = Array.isArray(v) ? v.join(', ') : v;
        });
        setFormErrors(transformed);
      } else {
        notify.error(err?.response?.data?.message || 'Failed to create refund');
      }
    }
  };

  const columns: ColumnDef<any>[] = [
    { id: 'serial', header: 'SL', cell: ({ row, table }) => (table.getState().pagination.pageIndex * table.getState().pagination.pageSize + row.index + 1) },
    { accessorKey: 'refund_number', header: 'Refund #', cell: ({ row }) => <div className="font-mono">{row.original.refund_number || '-'}</div> },
    { accessorKey: 'refund_date', header: 'Refund Date', cell: ({ row }) => <div>{row.original.refund_date ? new Date(row.original.refund_date).toLocaleString() : '-'}</div> },
    { accessorKey: 'refund_reason', header: 'Reason', cell: ({ row }) => <div className="text-sm">{row.original.refund_reason || '-'}</div> },
    { accessorKey: 'total_refund_amount', header: 'Amount', cell: ({ row }) => <div className="font-medium">{row.original.total_refund_amount ?? '-'}</div> },
    { accessorKey: 'refund_method', header: 'Method', cell: ({ row }) => <div>{row.original.refund_method || '-'}</div> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
      <span className={`px-2 py-1 text-xs rounded-full ${row.original.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{row.original.status || '-'}</span>
    ) },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <button onClick={() => router.push(`/pos-refunds/add?edit=${row.original.id}`)} className="p-1 text-green-600"><Edit className="w-4 h-4" /></button>
        <button onClick={() => handleDelete(row.original)} className="p-1 text-red-600"><Trash2 className="w-4 h-4" /></button>
      </div>
    ) },
  ];

  const buildApiEndpoint = () => `pos/refunds`;

  const handleDelete = async (r: any) => {
    const result = await confirm({ title: 'Delete Refund', html: `Delete refund <strong>${r.refund_number || r.id}</strong>?`, confirmButtonText: 'Delete', cancelButtonText: 'Cancel', icon: 'warning' });
    if (!result.isConfirmed) return;
    try {
      await posRefundService.destroy(r.id);
      notify.success('Refund deleted');
      // trigger refresh by navigating to same page (DataTable listens to route change)
      router.refresh();
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to delete refund');
    }
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">POS Refunds</h1>
        <button
          onClick={handleAddRefund}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Refund
        </button>
      </div>

      {/* Add Refund Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 mb-1">
          <h2 className="text-lg font-semibold mb-1.5 text-gray-900 dark:text-gray-100">
            Add Refund
          </h2>
          <form onSubmit={handleFormSubmit} className="space-y-3">
            {/* Tenant Selection - Only for Super Admin */}
            {isSuperAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                    Tenant
                  </label>
                  <CustomSelect
                    value={selectedTenant}
                    onChange={(option: any) => {
                      setFormData({ ...formData, tenant_id: option?.value || undefined });
                      setSelectedTenant(option);
                      if (option?.value && formErrors.tenant_id) {
                        const { tenant_id, ...rest } = formErrors;
                        setFormErrors(rest);
                      }
                    }}
                    loadOptions={loadTenantOptions}
                    defaultOptions={defaultTenantOptions}
                    placeholder="Select tenant"
                    className="text-sm"
                    isInvalid={!!formErrors.tenant_id}
                  />
                  {formErrors.tenant_id && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.tenant_id}</p>
                  )}
                </div>
              </div>
            )}

            {/* Original Order, Refund Date, Refund Method */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Original Order
                </label>
                <CustomSelect
                  value={formData.original_order_id ? { value: formData.original_order_id, label: '' } : null}
                  onChange={(option: any) => {
                    setFormData({ ...formData, original_order_id: option?.value });
                    if (option?.value && formErrors.original_order_id) {
                      const { original_order_id, ...rest } = formErrors;
                      setFormErrors(rest);
                    }
                  }}
                  loadOptions={loadOrderOptions}
                  defaultOptions={defaultOrderOptions}
                  placeholder="Search orders..."
                  className="text-sm"
                  isInvalid={!!formErrors.original_order_id}
                />
                {formErrors.original_order_id && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.original_order_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Approved By
                </label>
                <CustomSelect
                  value={formData.approved_by ? { value: formData.approved_by, label: '' } : null}
                  onChange={(option: any) => setFormData({ ...formData, approved_by: option?.value })}
                  loadOptions={loadUserOptions}
                  placeholder="Select user"
                  className="text-sm"
                />
                {formErrors.approved_by && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.approved_by}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Refund Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.refund_date}
                  onChange={e => setFormData({ ...formData, refund_date: e.target.value })}
                  className={`w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${
                    formErrors.refund_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formErrors.refund_date && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.refund_date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Refund Method
                </label>
                <select
                  value={formData.refund_method}
                  onChange={e => setFormData({ ...formData, refund_method: e.target.value })}
                  className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bkash">Bkash</option>
                  <option value="store_credit">Store Credit</option>
                  <option value="exchange">Exchange</option>
                </select>
              </div>
            </div>

            {/* Reason (span 2), Total Refund Amount */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-1.5">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Reason
                </label>
                <select
                  value={formData.refund_reason}
                  onChange={e => setFormData({ ...formData, refund_reason: e.target.value })}
                  className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="return">Return</option>
                  <option value="damaged">Damaged</option>
                  <option value="wrong_item">Wrong Item</option>
                  <option value="customer_dissatisfaction">Customer Dissatisfaction</option>
                  <option value="expired">Expired</option>
                  <option value="exchange">Exchange</option>
                  <option value="other">Other</option>
                </select>
                {formErrors.refund_reason && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.refund_reason}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
                {formErrors.status && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.status}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Total Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_refund_amount}
                  onChange={e => setFormData({ ...formData, total_refund_amount: e.target.value })}
                  placeholder="0.00"
                  className={`w-full px-2 py-1.25 text-right text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 ${
                    formErrors.total_refund_amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formErrors.total_refund_amount && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.total_refund_amount}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                  Reason Details
                </label>
                <input
                  type="text"
                  value={formData.reason_details}
                  onChange={e => setFormData({ ...formData, reason_details: e.target.value })}
                  placeholder="Additional details..."
                  className="w-full px-2 py-1.25 text-sm border border-gray-300 dark:border-gray-600 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                />
                {formErrors.reason_details && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.reason_details}</p>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Save Refund
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DataTable */}
      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={10}
      />
    </div>
  );
}
