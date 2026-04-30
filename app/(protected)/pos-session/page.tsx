'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { notify, confirm } from '@/lib/notifications';
import { posSessionService, posRegisterService, commonService, userService } from '@/services';
import type { PosSession } from '@/services/posSessionService';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';

export default function PosSessionPage() {
  const { isSuperAdmin } = usePermissions();

  const [showForm, setShowForm] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRegister, setSelectedRegister] = useState<any>(null);
  const [defaultRegisterOptions, setDefaultRegisterOptions] = useState<any[]>([]);
  const authUser = useAuthStore(s => s.user);

  type FormDataType = {
    tenant_id?: string | undefined;
    register_id?: string | undefined;
    user_id?: string | undefined;
    session_number?: number | string;
    start_time?: string;
    end_time?: string | null;
    opening_balance?: number | string;
    closing_balance?: number | string | null;
    actual_cash?: number | string | null;
    total_sales?: number | string;
    total_refunds?: number | string;
    total_discount?: number | string;
    total_tax?: number | string;
    cash_sales?: number | string;
    card_sales?: number | string;
    bkash_sales?: number | string;
    nagad_sales?: number | string;
    rocket_sales?: number | string;
    bank_transfer_sales?: number | string;
    credit_sales?: number | string;
    cash_in?: number | string;
    cash_out?: number | string;
    sale_count?: number | string;
    refund_count?: number | string;
    item_count?: number | string;
    customer_count?: number | string;
    status?: string;
    opening_notes?: string;
    closing_notes?: string;
    closing_reason?: string;
    closed_by?: string;
  };

  const [formData, setFormData] = useState<FormDataType>({
    tenant_id: isSuperAdmin ? undefined : authUser?.tenant_id,
    register_id: undefined,
    user_id: undefined,
    session_number: '',
    start_time: '',
    end_time: null,
    opening_balance: 0,
    closing_balance: null,
    actual_cash: null,
    total_sales: 0,
    total_refunds: 0,
    total_discount: 0,
    total_tax: 0,
    cash_sales: 0,
    card_sales: 0,
    bkash_sales: 0,
    nagad_sales: 0,
    rocket_sales: 0,
    bank_transfer_sales: 0,
    credit_sales: 0,
    cash_in: 0,
    cash_out: 0,
    sale_count: 0,
    refund_count: 0,
    item_count: 0,
    customer_count: 0,
    status: 'open',
    opening_notes: '',
    closing_notes: '',
    closing_reason: '',
    closed_by: undefined,
  });

  const loadRegisterOptions = async (input: string) => {
    const list = await posRegisterService.dropdown().catch(() => []);
    return (list || []).map((r: any) => ({ value: r.id, label: r.name }));
  };

  const loadTenantOptions = async (input: string) => {
    if (!isSuperAdmin) return [];
    const list = await commonService.getTenantsForDropdown({ search: input }).catch(() => []);
    return (list || []).map((t: any) => ({ value: t.id, label: t.business_name }));
  };

  const loadUserOptions = async (input: string) => {
    const users = await userService.getUsersByRole('cashier').catch(() => []);
    return (users || []).map((u: any) => ({ value: u.id, label: u.name }));
  };

  useEffect(() => {
    // prefetch registers
    const prefetch = async () => {
      const list = await posRegisterService.dropdown().catch(() => []);
      setDefaultRegisterOptions((list || []).map((r: any) => ({ value: r.id, label: r.name })));
    };
    prefetch();
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      loadTenantOptions('');
    }
  }, [isSuperAdmin]);

  const handleOpenForm = () => {
    setIsOpening(true);
    setSelectedRegister(null);
    setFormData({
      ...formData,
      register_id: undefined,
      user_id: undefined,
      session_number: '',
      start_time: '',
      end_time: null,
      opening_balance: 0,
      closing_balance: null,
      actual_cash: null,
      total_sales: 0,
      total_refunds: 0,
      total_discount: 0,
      total_tax: 0,
      cash_sales: 0,
      card_sales: 0,
      bkash_sales: 0,
      nagad_sales: 0,
      rocket_sales: 0,
      bank_transfer_sales: 0,
      credit_sales: 0,
      cash_in: 0,
      cash_out: 0,
      sale_count: 0,
      refund_count: 0,
      item_count: 0,
      customer_count: 0,
      status: 'open',
      opening_notes: '',
      closing_notes: '',
      closing_reason: '',
      closed_by: undefined,
    });
    setShowForm(true);
  };

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegister && !formData.register_id) return notify.error('Select a register');
    try {
      const payload = {
        tenant_id: formData.tenant_id,
        register_id: selectedRegister?.value || formData.register_id,
        user_id: formData.user_id,
        session_number: formData.session_number,
        start_time: formData.start_time,
        end_time: formData.end_time,
        opening_balance: Number(formData.opening_balance) || 0,
        closing_balance: formData.closing_balance,
        actual_cash: formData.actual_cash,
        total_sales: formData.total_sales,
        total_refunds: formData.total_refunds,
        total_discount: formData.total_discount,
        total_tax: formData.total_tax,
        cash_sales: formData.cash_sales,
        card_sales: formData.card_sales,
        bkash_sales: formData.bkash_sales,
        nagad_sales: formData.nagad_sales,
        rocket_sales: formData.rocket_sales,
        bank_transfer_sales: formData.bank_transfer_sales,
        credit_sales: formData.credit_sales,
        cash_in: formData.cash_in,
        cash_out: formData.cash_out,
        sale_count: formData.sale_count,
        refund_count: formData.refund_count,
        item_count: formData.item_count,
        customer_count: formData.customer_count,
        status: formData.status,
        opening_notes: formData.opening_notes,
        closing_notes: formData.closing_notes,
        closing_reason: formData.closing_reason,
        closed_by: formData.closed_by,
      };
      await posSessionService.open(payload);
      notify.success('Session opened');
      setShowForm(false);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      console.error(err);
      notify.error(err?.response?.data?.message || 'Failed to open session');
    }
  };

  const handleDelete = async (r: PosSession) => {
    const result = await confirm({ title: 'Delete Session', html: `Delete session <strong>${r.session_number}</strong>?`, confirmButtonText: 'Delete', cancelButtonText: 'Cancel', icon: 'warning' });
    if (!result.isConfirmed) return;
    try {
      await posSessionService.destroy(r.id);
      notify.success('Session deleted');
      setRefreshKey(k => k + 1);
    } catch (error: any) {
      notify.error(error?.response?.data?.message || 'Failed to delete session');
    }
  };

  const columns: ColumnDef<PosSession>[] = [
    { id: 'serial', header: 'SL', cell: ({ row, table }) => (table.getState().pagination.pageIndex * table.getState().pagination.pageSize + row.index + 1) },
    { accessorKey: 'session_number', header: 'Session #', cell: ({ row }) => <div className="font-medium">{row.original.session_number}</div> },
    { accessorKey: 'register_id', header: 'Register', cell: ({ row }) => <div>{(row.original as any).register?.name || '-'}</div> },
    { accessorKey: 'user_id', header: 'User', cell: ({ row }) => <div>{(row.original as any).user?.name || '-'}</div> },
    { accessorKey: 'start_time', header: 'Start', cell: ({ row }) => <div>{row.original.start_time ? new Date(row.original.start_time).toLocaleString() : '-'}</div> },
    { accessorKey: 'end_time', header: 'End', cell: ({ row }) => <div>{row.original.end_time ? new Date(row.original.end_time).toLocaleString() : '-'}</div> },
    { accessorKey: 'opening_balance', header: 'Opening', cell: ({ row }) => <div className="font-mono">{row.original.opening_balance}</div> },
    { accessorKey: 'closing_balance', header: 'Closing', cell: ({ row }) => <div className="font-mono">{row.original.closing_balance ?? '-'}</div> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
      <span className={`px-2 py-1 text-xs rounded-full ${row.original.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{row.original.status || '-'}</span>
    ) },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <button onClick={() => { /* TODO: view/close */ }} className="p-1 text-blue-600"><Edit className="w-4 h-4" /></button>
        <button onClick={() => handleDelete(row.original)} className="p-1 text-red-600"><Trash2 className="w-4 h-4" /></button>
      </div>
    ) },
  ];

  const buildApiEndpoint = () => `pos/sessions`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">POS Sessions</h1>
        <button onClick={handleOpenForm} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200 cursor-pointer">
          <Plus className="w-4 h-4" /> Add Session
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-md shadow-sm p-2">
          <h2 className="text-lg font-semibold mb-2">Add Session</h2>
          <form onSubmit={handleOpen} className="space-y-3">
            {isSuperAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">Tenant</label>
                  <CustomSelect
                    value={formData.tenant_id ? { value: formData.tenant_id, label: '' } : null}
                    onChange={opt => setFormData({ ...formData, tenant_id: opt?.value })}
                    loadOptions={loadTenantOptions}
                    placeholder="Select tenant"
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Register <span className="text-red-500">*</span></label>
                <CustomSelect
                  value={selectedRegister}
                  onChange={opt => { setSelectedRegister(opt); setFormData({ ...formData, register_id: opt?.value }); }}
                  loadOptions={loadRegisterOptions}
                  defaultOptions={defaultRegisterOptions}
                  placeholder="Select register"
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">User</label>
                <CustomSelect
                  value={formData.user_id ? { value: formData.user_id, label: '' } : null}
                  onChange={opt => setFormData({ ...formData, user_id: opt?.value })}
                  loadOptions={loadUserOptions}
                  placeholder="Select user"
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Session #</label>
                <input type="text" value={formData.session_number as any} onChange={e => setFormData({ ...formData, session_number: e.target.value })} className="w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Start Time</label>
                <input type="datetime-local" value={formData.start_time as any} onChange={e => setFormData({ ...formData, start_time: e.target.value })} className="w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Opening Balance</label>
                <input type="number" step={0.01} value={formData.opening_balance as any} onChange={e => setFormData({ ...formData, opening_balance: e.target.value })} className="w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Cash In</label>
                <input type="number" step={0.01} value={formData.cash_in as any} onChange={e => setFormData({ ...formData, cash_in: e.target.value })} className="w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Total Sales</label>
                <input type="number" step={0.01} value={formData.total_sales as any} onChange={e => setFormData({ ...formData, total_sales: e.target.value })} className="w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Cash Sales</label>
                <input type="number" step={0.01} value={formData.cash_sales as any} onChange={e => setFormData({ ...formData, cash_sales: e.target.value })} className="w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Card Sales</label>
                <input type="number" step={0.01} value={formData.card_sales as any} onChange={e => setFormData({ ...formData, card_sales: e.target.value })} className="w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Actual Cash</label>
                <input type="number" step={0.01} value={formData.actual_cash as any} onChange={e => setFormData({ ...formData, actual_cash: e.target.value })} className="w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Sale Count</label>
                <input type="number" value={formData.sale_count as any} onChange={e => setFormData({ ...formData, sale_count: e.target.value })} className="w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Item Count</label>
                <input type="number" value={formData.item_count as any} onChange={e => setFormData({ ...formData, item_count: e.target.value })} className="w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Customer Count</label>
                <input type="number" value={formData.customer_count as any} onChange={e => setFormData({ ...formData, customer_count: e.target.value })} className="w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Status</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300">
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Closing Balance</label>
                <input type="number" step={0.01} value={formData.closing_balance as any} onChange={e => setFormData({ ...formData, closing_balance: e.target.value })} className="w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Cash Out</label>
                <input type="number" step={0.01} value={formData.cash_out as any} onChange={e => setFormData({ ...formData, cash_out: e.target.value })} className="w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300" />
              </div>
            </div>

            {/* Notes row: two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Opening Notes</label>
                <textarea value={formData.opening_notes} onChange={e => setFormData({ ...formData, opening_notes: e.target.value })} className="w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300" rows={4} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Closing Notes</label>
                <textarea value={formData.closing_notes} onChange={e => setFormData({ ...formData, closing_notes: e.target.value })} className="w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300" rows={4} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Closing Reason</label>
                <input type="text" value={formData.closing_reason as any} onChange={e => setFormData({ ...formData, closing_reason: e.target.value })} className="w-full px-2 py-1.25 text-sm border rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">Closed By</label>
                <CustomSelect
                  value={formData.closed_by ? { value: formData.closed_by, label: '' } : null}
                  onChange={opt => setFormData({ ...formData, closed_by: opt?.value })}
                  loadOptions={loadUserOptions}
                  placeholder="Select user"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-sm hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer">
                <Edit className="w-4 h-4" />
                Store Session
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-sm hover:bg-gray-700 transition-colors flex items-center gap-2 cursor-pointer">
                <Trash2 className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <DataTable key={refreshKey} columns={columns} apiEndpoint={buildApiEndpoint()} pageSize={15} enableSearch={true} searchPlaceholder="Search sessions..." />
    </div>
  );
}
