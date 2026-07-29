'use client';

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { List, Building2, Eye, CreditCard, X } from 'lucide-react';
import DataTable from '@/components/ui/datatable';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import CustomSelect from '@/components/ui/custom-select';
import { commonService, posRegisterService } from '@/services';
import posService from '@/services/posService';
import { notify } from '@/lib/notifications';
import type { PosOrderDetail } from '@/types/api.types';
import { PosOrderPrintMenu } from '@/components/print';

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'credit', label: 'Credit' },
  { value: 'other', label: 'Other' },
];

export default function PosOrdersPage() {
  const { isSuperAdmin, isHydrated } = usePermissions();
  const { user } = useAuthStore();

  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [selectedRegister, setSelectedRegister] = useState<any>(null);
  const [tenantOptions, setTenantOptions] = useState<any[]>([]);
  const [registerOptions, setRegisterOptions] = useState<any[]>([]);
  const [registerLoading, setRegisterLoading] = useState(false);

  // Details modal
  const [showDetails, setShowDetails] = useState(false);
  const [detailOrder, setDetailOrder] = useState<PosOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Due payment modal
  const [showPayment, setShowPayment] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<PosOrderDetail | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

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

  // Load registers for non-super-admin users on mount
  useEffect(() => {
    if (!isHydrated || isSuperAdmin) return;
    setRegisterLoading(true);
    posRegisterService
      .dropdown()
      .then((list: any[]) =>
        setRegisterOptions((list || []).map((r: any) => ({ value: r.id, label: r.name })))
      )
      .catch(() => { })
      .finally(() => setRegisterLoading(false));
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
    if (isSuperAdmin && selectedTenant?.value) {
      params.set('tenant_id', String(selectedTenant.value));
    } else if (!isSuperAdmin && user?.tenant_id) {
      params.set('tenant_id', String(user.tenant_id));
    }
    if (selectedRegister?.value) params.set('register_id', String(selectedRegister.value));
    const qs = params.toString();
    return `/pos/orders${qs ? `?${qs}` : ''}`;
  };

  // ── Details modal handlers ─────────────────────────────────────────────────

  const openDetails = async (uuid: string) => {
    try {
      setDetailLoading(true);
      setShowDetails(true);
      setDetailOrder(null);
      const order = await posService.getPosOrder(uuid);
      setDetailOrder(order);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to load order details');
      setShowDetails(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Due payment modal handlers ─────────────────────────────────────────────

  const openPayment = async (uuid: string) => {
    try {
      const order = await posService.getPosOrder(uuid);
      setPaymentOrder(order);
      setPaymentAmount(String(Number(order.due_amount ?? 0).toFixed(2)));
      setPaymentMethod('cash');
      setPaymentNotes('');
      setShowPayment(true);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to load order');
    }
  };

  const handlePaymentSubmit = async () => {
    if (!paymentOrder) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      notify.error('Please enter a valid amount');
      return;
    }
    try {
      setPaymentSubmitting(true);
      await posService.recordDuePayment(paymentOrder.uuid, {
        amount,
        payment_method: paymentMethod,
        notes: paymentNotes || undefined,
      });
      notify.success('Payment recorded successfully');
      setShowPayment(false);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      const msg = err?.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : err?.response?.data?.message || 'Failed to record payment';
      notify.error(msg);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // ── Table columns ──────────────────────────────────────────────────────────

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
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => orderStatusBadge(row.original.status),
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
      cell: ({ row }) => {
        const r = row.original;
        const total = Number(r.grand_total ?? 0);
        const returned = Number(r.returned_amount ?? 0);
        if (returned > 0) {
          return (
            <div className="flex flex-col">
              <span className={`font-semibold ${r.status === 'refunded' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                ৳{total.toFixed(2)}
              </span>
              <span className="text-[10px] font-medium text-purple-600">
                −৳{returned.toFixed(2)} returned
              </span>
            </div>
          );
        }
        return <span className="font-semibold">৳{total.toFixed(2)}</span>;
      },
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
    {
      id: 'actions',
      header: 'Actions',
      meta: { width: '130px' },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            title="View Details"
            onClick={() => openDetails(row.original.uuid)}
            className="p-1 text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
          </button>
          <PosOrderPrintMenu order={row.original} />
          {(() => {
            // "Record Due Payment" is the action for collecting the
            // remaining balance from a customer. The right state is:
            //   - the customer has paid *something* (paid > 0)
            //   - the customer still owes the *rest* (due > 0)
            //
            // The list endpoint returns `returned_amount` and
            // `grand_total` / `paid_amount` so we can compute the
            // backend's authoritative `due_amount`:
            //     due = grand_total - returned_amount - paid_amount
            // (matches `PosOrder::getDueAmountAttribute()`).
            //
            // We do NOT blanket-hide on status='refunded' /
            // 'partially_refunded' — a partially-refunded order can
            // still have an outstanding client balance, and the
            // fully-refunded case returns returned_amount == grand,
            // which makes due <= 0 anyway. When the store owes the
            // client, the right flow is the pos-refund "Settle
            // Payment" dialog (action=refund) — not this button.
            const grand = Number(row.original.grand_total ?? 0);
            const paid = Number(row.original.paid_amount ?? 0);
            const returned = Number(row.original.returned_amount ?? 0);
            const due = grand - returned - paid;
            if (!(paid > 0 && due > 0)) return null;
            return (
              <button
                title="Record Due Payment"
                onClick={() => openPayment(row.original.uuid)}
                className="p-1 text-emerald-600 hover:text-emerald-800 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
              </button>
            );
          })()}
        </div>
      ),
    },
  ];

  // ── Payment status badge helper ────────────────────────────────────────────

  const paymentStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      paid: 'bg-emerald-100 text-emerald-700',
      partial: 'bg-amber-100 text-amber-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-100 text-gray-600'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // ── Order lifecycle status badge (refund-aware) ────────────────────────────

  const orderStatusBadge = (status?: string) => {
    // The order lifecycle reflects refunds: 'refunded' (all qty returned)
    // and 'partially_refunded' (some qty returned). Cashier must see this
    // distinctly from the payment badge above.
    const s = (status ?? '').toLowerCase();
    const map: Record<string, string> = {
      completed: 'bg-gray-100 text-gray-700',
      confirmed: 'bg-blue-100 text-blue-700',
      pending: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-red-100 text-red-700',
      refunded: 'bg-purple-100 text-purple-700',
      partially_refunded: 'bg-amber-100 text-amber-700',
    };
    const label = s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[s] || 'bg-gray-100 text-gray-600'}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-2">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <List className="w-5 h-5 text-blue-600" /> POS Orders
        </h1>
      </div>

      {/* Tenant / Register Filter */}
      <div className="bg-white border border-gray-200 rounded-sm p-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5" /> Filter by {isSuperAdmin ? 'Tenant & Register' : 'Register'}
        </p>
        <div className="flex flex-wrap gap-3">
          {isSuperAdmin && (
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
                className="text-sm"
              />
            </div>
          )}
          <div className="w-72">
            <CustomSelect
              key={isSuperAdmin ? `reg-${selectedTenant?.value ?? 'none'}` : 'reg-non-super'}
              value={selectedRegister}
              onChange={handleRegisterChange}
              options={registerOptions}
              isLoading={registerLoading}
              placeholder={isSuperAdmin && !selectedTenant ? 'Select tenant first' : 'All Registers'}
              isDisabled={isSuperAdmin && !selectedTenant}
              className="text-sm"
            />
          </div>
        </div>
      </div>

      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        enableSearch
        searchPlaceholder="Search by invoice, customer name..."
      />

      {/* ── Details Modal ──────────────────────────────────────────────────── */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">

            {/* Header */}
            <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-4 text-white rounded-t-2xl flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-0.5">POS Order</p>
                <h2 className="text-xl font-bold leading-tight">{detailOrder?.invoice_number || '—'}</h2>
                <p className="text-sm opacity-80">{detailOrder?.customer_name || 'Walk-in Customer'}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => setShowDetails(false)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                {detailOrder && (
                  <div className="flex items-center gap-1.5">
                    {orderStatusBadge(detailOrder.status)}
                    {paymentStatusBadge(detailOrder.payment_status)}
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
              {detailLoading || !detailOrder ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <>
                  {/* Info cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                      <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1.5">Customer / Order Info</p>
                      <p className="text-sm font-semibold text-gray-800 leading-tight">
                        {detailOrder.customer_name || 'Walk-in Customer'}
                      </p>
                      {detailOrder.customer_phone && (
                        <p className="text-xs text-gray-500 mt-0.5">{detailOrder.customer_phone}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Session:{' '}
                        <span className="font-medium text-gray-700">
                          {detailOrder.session?.session_number || '—'}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        Register:{' '}
                        <span className="font-medium text-gray-700">
                          {detailOrder.register?.name || '—'}
                        </span>
                      </p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                      <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1.5">Payment Info</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Method</span>
                          <span className="font-medium text-gray-800 capitalize">
                            {(detailOrder.payment_method || '').replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs items-center">
                          <span className="text-gray-500">Status</span>
                          {paymentStatusBadge(detailOrder.payment_status)}
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Date</span>
                          <span className="font-medium text-gray-800">
                            {detailOrder.order_date
                              ? new Date(detailOrder.order_date).toLocaleString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })
                              : '—'}
                          </span>
                        </div>
                        {detailOrder.notes && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Notes</span>
                            <span className="font-medium text-gray-800 text-right max-w-[140px] truncate">{detailOrder.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial summary */}
                  <div className={`grid gap-2 ${Number(detailOrder.returned_amount ?? 0) > 0 ? 'grid-cols-5' : 'grid-cols-4'}`}>
                    <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-xl p-2.5 text-white text-center shadow-sm">
                      <p className="text-xs opacity-80 mb-0.5">Grand Total</p>
                      <p className={`text-base font-bold leading-tight ${detailOrder.status === 'refunded' ? 'line-through opacity-70' : ''}`}>৳{Number(detailOrder.grand_total ?? 0).toFixed(2)}</p>
                    </div>
                    {Number(detailOrder.returned_amount ?? 0) > 0 && (
                      <div className="bg-linear-to-br from-purple-500 to-purple-600 rounded-xl p-2.5 text-white text-center shadow-sm">
                        <p className="text-xs opacity-80 mb-0.5">Returned</p>
                        <p className="text-base font-bold leading-tight">৳{Number(detailOrder.returned_amount ?? 0).toFixed(2)}</p>
                      </div>
                    )}
                    <div className="bg-linear-to-br from-emerald-500 to-emerald-600 rounded-xl p-2.5 text-white text-center shadow-sm">
                      <p className="text-xs opacity-80 mb-0.5">Paid</p>
                      <p className="text-base font-bold leading-tight">৳{Number(detailOrder.paid_amount ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-linear-to-br from-amber-500 to-orange-500 rounded-xl p-2.5 text-white text-center shadow-sm">
                      <p className="text-xs opacity-80 mb-0.5">Due</p>
                      <p className="text-base font-bold leading-tight">৳{Number(detailOrder.due_amount ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-linear-to-br from-violet-500 to-purple-600 rounded-xl p-2.5 text-white text-center shadow-sm">
                      <p className="text-xs opacity-80 mb-0.5">Change</p>
                      <p className="text-base font-bold leading-tight">৳{Number(detailOrder.change_amount ?? 0).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Items table */}
                  <div className="rounded-xl overflow-hidden border border-blue-100 shadow-sm">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-linear-to-r from-blue-600 to-indigo-600 text-white">
                          <th className="px-3 py-2 text-left text-xs font-semibold">#</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold">Product</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold">Variation</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold">Qty</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold">Returned</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold">Unit Price</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-50">
                        {detailOrder.items.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 py-8 text-center text-gray-400 text-sm">No items found</td>
                          </tr>
                        ) : (
                          detailOrder.items.map((it, idx) => {
                            const returned = Number(it.returned_quantity ?? 0);
                            const qty = Number(it.quantity ?? 0);
                            return (
                              <tr key={it.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                                <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                                <td className="px-3 py-2 font-medium text-gray-800">
                                  {it.product?.name || it.item_name || '—'}
                                </td>
                                <td className="px-3 py-2 text-gray-500">{it.variation?.name || '—'}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${returned > 0 && returned >= qty ? 'bg-gray-100 text-gray-500 line-through' : 'bg-blue-100 text-blue-700'}`}>
                                    {it.quantity}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {returned > 0 ? (
                                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold" title={`${returned} of ${qty} returned`}>
                                      {returned}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300 text-xs">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-800">
                                  ৳{Number(it.unit_price ?? 0).toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-800">
                                  ৳{Number(it.line_total ?? 0).toFixed(2)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Payment history */}
                  {detailOrder.payments.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment History</p>
                      <div className="space-y-1.5">
                        {detailOrder.payments.map((p) => {
                          // Per-payment status badge. The Payment row's
                          // own status is the cashier-facing "what state
                          // is THIS receipt in?" — independent of the
                          // order's overall payment_status. A partial
                          // cash sales records one Payment row with
                          // status='pending' (awaiting the rest); a
                          // full sales records status='completed'.
                          // We surface them distinctly so the cashier
                          // doesn't read the plain "pending" text and
                          // think something is broken.
                          const statusCls =
                            p.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                              p.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                p.status === 'refunded' ? 'bg-purple-100 text-purple-700' :
                                  p.status === 'failed' ? 'bg-red-100 text-red-700' :
                                    p.status === 'cancelled' ? 'bg-gray-200 text-gray-700' :
                                      'bg-gray-100 text-gray-600';
                          return (
                            <div key={p.id} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-1.5 border border-gray-100">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 font-mono">{p.receipt_number}</span>
                                <span className="capitalize text-gray-600">{(p.payment_method || '').replace(/_/g, ' ')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {p.notes && <span className="text-gray-400 italic truncate max-w-[100px]">{p.notes}</span>}
                                <span className="font-semibold text-gray-800">৳{Number(p.amount ?? 0).toFixed(2)}</span>
                                <span className={`px-1.5 py-0.5 rounded-full font-medium ${statusCls}`}>
                                  {p.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-gray-100 flex justify-end bg-white rounded-b-2xl">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Due Payment Modal ──────────────────────────────────────────────── */}
      {showPayment && paymentOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Header */}
            <div className="bg-linear-to-r from-emerald-500 to-teal-600 px-6 py-4 text-white flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-0.5">Record Due Payment</p>
                <h2 className="text-lg font-bold leading-tight">{paymentOrder.invoice_number}</h2>
                <p className="text-sm opacity-80">{paymentOrder.customer_name || 'Walk-in Customer'}</p>
              </div>
              <button
                onClick={() => setShowPayment(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary bar */}
            <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50 border-b border-gray-200">
              <div className="px-4 py-2.5 text-center">
                <p className="text-xs text-gray-500">Grand Total</p>
                <p className="text-sm font-bold text-gray-800">৳{Number(paymentOrder.grand_total ?? 0).toFixed(2)}</p>
              </div>
              <div className="px-4 py-2.5 text-center">
                <p className="text-xs text-gray-500">Paid</p>
                <p className="text-sm font-bold text-emerald-600">৳{Number(paymentOrder.paid_amount ?? 0).toFixed(2)}</p>
              </div>
              <div className="px-4 py-2.5 text-center">
                <p className="text-xs text-gray-500">Due</p>
                <p className="text-sm font-bold text-amber-600">৳{Number(paymentOrder.due_amount ?? 0).toFixed(2)}</p>
              </div>
            </div>

            {/* Form */}
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Amount to Pay <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Number(paymentOrder.due_amount ?? 0)}
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  onFocus={e => e.target.select()}
                  onKeyDown={e => { if (e.key === '-') e.preventDefault(); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-right font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <p className="text-xs text-gray-400 mt-0.5">Max: ৳{Number(paymentOrder.due_amount ?? 0).toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {PAYMENT_METHOD_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <textarea
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Any additional notes…"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
              <button
                onClick={() => setShowPayment(false)}
                className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentSubmit}
                disabled={paymentSubmitting}
                className="px-5 py-1.5 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
              >
                {paymentSubmitting ? 'Recording…' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

