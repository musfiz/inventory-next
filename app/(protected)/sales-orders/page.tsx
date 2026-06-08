'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { List, Plus, Edit, Trash2, Eye, X, DollarSign } from 'lucide-react';
import DataTable from '@/components/ui/datatable';
import { formatDate } from '@/lib/utils/date';
import { notify, confirm } from '@/lib/notifications';
import salesOrderService from '@/services/salesOrderService';
import { useRouter } from 'next/navigation';
import { SalesOrderPrintMenu } from '@/components/print';

export default function SalesOrdersPage() {
  const router = useRouter();

  const [refreshKey, setRefreshKey] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentSO, setCurrentSO] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);

  // ── Record-Payment dialog state ──────────────────────────────────────────────
  // Replaces the old "edit paid_amount in place" flow, which did not
  // create a Payment row or a journal entry.
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '' as string,
    payment_method: 'cash' as string,
    payment_date: '' as string,
    notes: '' as string,
    tendered_amount: '' as string,
    change_amount: '0' as string,
    card_last_four: '' as string,
    processing_fee: '0' as string,
    transaction_reference: '' as string,
    mobile_number: '' as string,
    mobile_transaction_id: '' as string,
    bank_name: '' as string,
    bank_account: '' as string,
    check_number: '' as string,
    check_date: '' as string,
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});

  // Derived: the authoritative outstanding balance for the current
  // sales order. Matches SalesOrder::getDueAmountAttribute() on the
  // backend.
  const outstandingBalance = (() => {
    if (!currentSO) return 0;
    const grand = Number(currentSO.grand_total ?? 0);
    const ret = Number(currentSO.returned_amount ?? 0);
    const paid = Number(currentSO.paid_amount ?? 0);
    return grand - ret - paid;
  })();

  const STATUS_LIST = [
    'draft',
    'pending',
    'confirmed',
    'processing',
    'ready',
    'shipped',
    'delivered',
    'cancelled',
    'returned',
  ];
  const PAYMENT_STATUS_LIST = [
    { value: 'pending', label: 'Pending' },
    { value: 'partial', label: 'Partial' },
    { value: 'paid', label: 'Paid' },
    // F-6 FIX: removed 'overdue' — not a valid backend enum value.
    // The backend writes `pending | partial | paid`; an 'overdue'
    // value was silently rejected or stored, breaking reports.
    // If overdue is needed in the UI, derive it on the frontend
    // from `due_date < now && payment_status === 'pending'`.
  ];

  const loadItems = async (id: string) => {
    try {
      setDetailLoading(true);
      const so = await salesOrderService.getSalesOrder(id);
      const data = so || {};
      setCurrentSO(data);
      setDetailItems(data.items || []);
      setShowDetails(true);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to load details');
    } finally {
      setDetailLoading(false);
    }
  };

  const preventMinus = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-') e.preventDefault();
  };

  const handleUpdate = async () => {
    if (!currentSO) return;
    try {
      setUpdating(true);
      const payload: any = {
        status: currentSO.status,
        payment_status: currentSO.payment_status,
        paid_amount: currentSO.paid_amount ?? 0,
      };
      await salesOrderService.updateSalesOrderFromDetails(currentSO.uuid, payload);
      notify.success('Sales order updated');
      setShowDetails(false);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const handleEdit = (row: any) => {
    router.push(`/sales-orders/add?edit=${row.uuid}`);
  };

  // ── Record-Payment dialog handlers ───────────────────────────────────────────
  const openPaymentDialog = () => {
    if (!currentSO) return;
    if (outstandingBalance <= 0.005) {
      notify.error(
        outstandingBalance === 0
          ? 'This order has no outstanding balance — no payment is due.'
          : 'This order is overpaid. Use the return\'s Settle Payment dialog to refund the customer.'
      );
      return;
    }
    // Pre-fill amount with the full outstanding balance.
    setPaymentForm((prev) => ({
      ...prev,
      amount: outstandingBalance.toFixed(2),
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: 'cash',
    }));
    setPaymentErrors({});
    setShowPaymentDialog(true);
  };

  const closePaymentDialog = () => {
    setShowPaymentDialog(false);
    setPaymentErrors({});
  };

  const submitPayment = async () => {
    if (!currentSO) return;
    const errs: Record<string, string> = {};
    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      errs.amount = 'Amount must be greater than zero';
    } else if (amount > outstandingBalance + 0.005) {
      errs.amount = `Amount cannot exceed the outstanding balance of ৳${outstandingBalance.toFixed(2)}`;
    }
    if (!paymentForm.payment_method) {
      errs.payment_method = 'Payment method is required';
    }
    if (Object.keys(errs).length > 0) {
      setPaymentErrors(errs);
      return;
    }

    setPaymentSubmitting(true);
    try {
      const payload: any = {
        amount,
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date || undefined,
        notes: paymentForm.notes || undefined,
      };

      // Method-specific fields.
      if (paymentForm.payment_method === 'cash') {
        if (paymentForm.tendered_amount) {
          payload.tendered_amount = Number(paymentForm.tendered_amount);
          // Auto-compute change if tendered > amount.
          const tendered = Number(paymentForm.tendered_amount);
          if (tendered > amount) {
            payload.change_amount = Number((tendered - amount).toFixed(2));
          } else {
            payload.change_amount = 0;
          }
        }
      } else if (paymentForm.payment_method === 'card') {
        payload.card_last_four = paymentForm.card_last_four || undefined;
        payload.processing_fee = paymentForm.processing_fee
          ? Number(paymentForm.processing_fee)
          : undefined;
        payload.transaction_reference = paymentForm.transaction_reference || undefined;
      } else if (['bkash', 'nagad', 'rocket'].includes(paymentForm.payment_method)) {
        payload.mobile_number = paymentForm.mobile_number || undefined;
        payload.mobile_transaction_id = paymentForm.mobile_transaction_id || undefined;
      } else if (paymentForm.payment_method === 'bank_transfer') {
        payload.bank_name = paymentForm.bank_name || undefined;
        payload.bank_account = paymentForm.bank_account || undefined;
        payload.transaction_reference = paymentForm.transaction_reference || undefined;
      } else if (paymentForm.payment_method === 'check') {
        payload.check_number = paymentForm.check_number || undefined;
        payload.check_date = paymentForm.check_date || undefined;
      }

      const res = await salesOrderService.recordPayment(currentSO.uuid, payload);
      if (!res?.success) {
        setPaymentErrors(res?.errors ?? { _: res?.message ?? 'Failed to record payment' });
        notify.error(res?.message ?? 'Failed to record payment');
        return;
      }

      notify.success(res?.message ?? 'Payment recorded successfully');

      // Refresh the SO details from the response (the new
      // sales_order reflects updated paid_amount / payment_status)
      // so the modal updates in place.
      if (res?.data?.sales_order) {
        setCurrentSO(res.data.sales_order);
      } else if (res?.sales_order) {
        setCurrentSO(res.sales_order);
      } else {
        // Fallback: re-fetch.
        await loadItems(currentSO.uuid);
      }
      setRefreshKey((k) => k + 1);
      closePaymentDialog();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.errors) {
        setPaymentErrors(data.errors);
      }
      notify.error(data?.message || err?.message || 'Failed to record payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleDelete = async (row: any) => {
    const result = await confirm({
      title: 'Delete Sales Order',
      html: `Are you sure you want to delete <strong>${row.order_number}</strong>?`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });
    if (!result.isConfirmed) return;
    try {
      await salesOrderService.deleteSalesOrder(row.uuid);
      notify.success('Sales order deleted');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to delete');
    }
  };

  // Self-contained two-button print menu. The component itself
  // loads the full SO detail on first click and caches it, so no
  // parent wrapper is needed — matches the pattern used by the
  // Payments list's `<PrintMenu payment={row.original} />`.

  const columns: ColumnDef<any>[] = [
    {
      id: 'serial',
      header: 'SL',
      cell: ({ row, table }) => (
        <span>
          {table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
            row.index +
            1}
        </span>
      ),
    },
    { accessorKey: 'invoice_number', header: 'Inv No.' },
    {
      accessorKey: 'customer',
      header: 'Customer',
      cell: ({ row }) => row.original.customer?.name || '-',
    },
    {
      accessorKey: 'warehouse',
      header: 'Warehouse',
      cell: ({ row }) => row.original.warehouse?.name || '-',
    },
    {
      accessorKey: 'order_date',
      header: 'Order Date',
      cell: ({ row }) => formatDate(row.original.order_date, 'DD/MM/YYYY'),
    },
    {
      accessorKey: 'due_date',
      header: 'Due Date',
      cell: ({ row }) => formatDate(row.original.due_date, 'DD/MM/YYYY'),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status || '';
        const map: Record<string, string> = {
          draft: 'bg-gray-100 text-gray-800',
          pending: 'bg-yellow-100 text-yellow-800',
          confirmed: 'bg-blue-100 text-blue-800',
          processing: 'bg-indigo-100 text-indigo-800',
          ready: 'bg-cyan-100 text-cyan-800',
          shipped: 'bg-purple-100 text-purple-800',
          delivered: 'bg-teal-100 text-teal-800',
          cancelled: 'bg-red-100 text-red-800',
          returned: 'bg-orange-100 text-orange-800',
        };
        const cls = map[s] || 'bg-gray-100 text-gray-800';
        const label = String(s).replace(/_/g, ' ');
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
            {label.charAt(0).toUpperCase() + label.slice(1)}
          </span>
        );
      },
    },
    { accessorKey: 'grand_total', header: 'Total' },
    {
      accessorKey: 'payment_status',
      header: 'Payment',
      cell: ({ row }) => {
        const p = row.original.payment_status || '';
        const map: Record<string, string> = {
          pending: 'bg-yellow-100 text-yellow-800',
          partial: 'bg-blue-100 text-blue-800',
          paid: 'bg-emerald-100 text-emerald-800',
          overdue: 'bg-red-100 text-red-800',
        };
        const cls = map[p] || 'bg-gray-100 text-gray-800';
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
            {p.charAt(0).toUpperCase() + p.slice(1) || '-'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      meta: { width: '120px' },
      cell: ({ row }) => {
        // Self-contained two-button print menu — loads the full SO
        // on first click and caches it. No parent wrapper needed.
        return (
          <div className="flex items-center gap-2">
            <button
              title="Details"
              onClick={() => loadItems(row.original.uuid)}
              className="p-1 text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
            </button>
            <SalesOrderPrintMenu order={row.original} />
            <button
              title="Edit"
              onClick={() => handleEdit(row.original)}
              className="p-1 text-green-600 hover:text-green-800 cursor-pointer"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              title="Delete"
              onClick={() => handleDelete(row.original)}
              className="p-1 text-red-600 hover:text-red-800 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  const buildApiEndpoint = () => '/sales-order';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <List className="w-5 h-5 text-blue-600" /> Sales Orders
        </h1>
        <button
          onClick={() => router.push('/sales-orders/add')}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200"
        >
          <Plus className="w-4 h-4" /> Add Sales Order
        </button>
      </div>

      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        enableSearch
        searchPlaceholder="Search by SO number, customer..."
      />

      {/* Details modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">

            {/* Gradient header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-4 text-white rounded-t-2xl flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-0.5">Sales Order</p>
                <h2 className="text-xl font-bold leading-tight">{currentSO?.invoice_number || '—'}</h2>
                <p className="text-sm opacity-80">{currentSO?.customer?.name || '—'}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => setShowDetails(false)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                {(() => {
                  const s = currentSO?.status || '';
                  const badgeMap: Record<string, string> = {
                    draft: 'bg-gray-200 text-gray-800',
                    pending: 'bg-yellow-200 text-yellow-900',
                    confirmed: 'bg-blue-200 text-blue-900',
                    processing: 'bg-indigo-200 text-indigo-900',
                    ready: 'bg-cyan-200 text-cyan-900',
                    shipped: 'bg-purple-200 text-purple-900',
                    delivered: 'bg-teal-200 text-teal-900',
                    cancelled: 'bg-red-200 text-red-900',
                    returned: 'bg-orange-200 text-orange-900',
                  };
                  return (
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeMap[s] || 'bg-gray-200 text-gray-800'}`}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <>
                  {/* Info cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                      <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1.5">Customer Info</p>
                      <p className="text-sm font-semibold text-gray-800 leading-tight">
                        {currentSO?.customer?.name || '—'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Warehouse:{' '}
                        <span className="font-medium text-gray-700">
                          {currentSO?.warehouse?.name || '—'}
                        </span>
                      </p>
                      {currentSO?.shipping_address && (
                        <p className="text-xs text-gray-400 mt-0.5">{currentSO.shipping_address}</p>
                      )}
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                      <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1.5">Order Dates</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Order Date</span>
                          <span className="font-medium text-gray-800">
                            {formatDate(currentSO?.order_date, 'DD/MM/YYYY')}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Due Date</span>
                          <span className="font-medium text-gray-800">
                            {formatDate(currentSO?.due_date, 'DD/MM/YYYY')}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs items-center">
                          <span className="text-gray-500">Payment</span>
                          {(() => {
                            const pm = currentSO?.payment_status || '';
                            const pmMap: Record<string, string> = {
                              pending: 'bg-yellow-100 text-yellow-700',
                              partial: 'bg-blue-100 text-blue-700',
                              paid: 'bg-emerald-100 text-emerald-700',
                              overdue: 'bg-red-100 text-red-700',
                            };
                            return (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pmMap[pm] || 'bg-gray-100 text-gray-600'}`}>
                                {pm.charAt(0).toUpperCase() + pm.slice(1)}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial summary */}
                  <div className="grid grid-cols-5 gap-2">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-2.5 text-white text-center shadow-sm">
                      <p className="text-xs opacity-80 mb-0.5">Grand Total</p>
                      <p className="text-base font-bold leading-tight">{Number(currentSO?.grand_total ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-2.5 text-white text-center shadow-sm">
                      <p className="text-xs opacity-80 mb-0.5">Paid</p>
                      <p className="text-base font-bold leading-tight">{Number(currentSO?.paid_amount ?? 0).toFixed(2)}</p>
                    </div>
                    <div className={`bg-gradient-to-br ${Number(currentSO?.returned_amount ?? 0) > 0 ? 'from-orange-500 to-red-500' : 'from-gray-400 to-gray-500'} rounded-xl p-2.5 text-white text-center shadow-sm`}>
                      <p className="text-xs opacity-80 mb-0.5">Returned</p>
                      <p className="text-base font-bold leading-tight">{Number(currentSO?.returned_amount ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-2.5 text-white text-center shadow-sm">
                      <p className="text-xs opacity-80 mb-0.5">Discount</p>
                      <p className="text-base font-bold leading-tight">
                        {currentSO?.discount_type === 'percentage'
                          ? `${currentSO.discount_value}%`
                          : Number(currentSO?.discount_amount ?? 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-2.5 text-white text-center shadow-sm">
                      <p className="text-xs opacity-80 mb-0.5">Tax + Ship</p>
                      <p className="text-base font-bold leading-tight">
                        {(Number(currentSO?.tax_amount ?? 0) + Number(currentSO?.shipping_charge ?? 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Status / payment controls */}
                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider mb-2">Update Order</p>
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="flex-1 min-w-[120px]">
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Order Status</label>
                        <select
                          value={currentSO?.status || 'draft'}
                          onChange={e =>
                            setCurrentSO((prev: any) =>
                              prev ? { ...prev, status: e.target.value } : prev
                            )
                          }
                          className="w-full px-3 py-1.5 border border-violet-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        >
                          {STATUS_LIST.map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Payment Status</label>
                        <select
                          value={currentSO?.payment_status || 'pending'}
                          onChange={e =>
                            setCurrentSO((prev: any) =>
                              prev ? { ...prev, payment_status: e.target.value } : prev
                            )
                          }
                          className="w-full px-3 py-1.5 border border-violet-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        >
                          {PAYMENT_STATUS_LIST.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      {/* Bug fix: the "Paid Amount" field used to be
                          an editable input here. Editing it directly
                          (and saving via /update/details) updated the
                          SO row in place but did NOT create a Payment
                          record or post a journal entry, breaking
                          the audit trail. The "Record Payment" button
                          now opens a dialog that calls the canonical
                          /record-payment endpoint. */}
                      <button
                        type="button"
                        onClick={openPaymentDialog}
                        disabled={outstandingBalance <= 0.005}
                        title={
                          outstandingBalance <= 0.005
                            ? 'No outstanding balance'
                            : `Record a payment of up to ৳${outstandingBalance.toFixed(2)}`
                        }
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium shadow-sm transition-all"
                      >
                        <DollarSign className="w-4 h-4" />
                        Record Payment
                      </button>
                      <button
                        onClick={handleUpdate}
                        disabled={updating}
                        className="px-5 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
                      >
                        {updating ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </div>

                  {/* Items table */}
                  {(() => {
                    const itemsSubtotal = detailItems.reduce(
                      (sum, it) => sum + Number(it.quantity ?? 0) * Number(it.unit_price ?? 0), 0
                    );
                    const returns: any[] = currentSO?.returns ?? [];
                    const returnsTotal = returns.reduce(
                      (sum, r) => sum + Number(r.refund_amount ?? r.total_amount ?? 0), 0
                    );
                    const net = itemsSubtotal - returnsTotal;
                    const paidAmount = Number(currentSO?.paid_amount ?? 0);
                    const balanceDue = net - paidAmount;
                    const balanceAmount = Math.abs(balanceDue).toFixed(2);
                    const balanceText =
                      balanceDue > 0 ? 'Amount Due' : balanceDue < 0 ? 'Customer Return' : 'Settled';

                    return (
                      <>
                        <div className="rounded-xl overflow-hidden border border-blue-100 shadow-sm">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                                <th className="px-3 py-2 text-left text-xs font-semibold">#</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold">Product</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold">Variation</th>
                                <th className="px-3 py-2 text-center text-xs font-semibold">Qty</th>
                                <th className="px-3 py-2 text-center text-xs font-semibold">Delivered</th>
                                <th className="px-3 py-2 text-center text-xs font-semibold">Returned</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold">Unit Price</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold">Line Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-50">
                              {detailItems.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="px-3 py-8 text-center text-gray-400 text-sm">
                                    No items found
                                  </td>
                                </tr>
                              ) : (
                                detailItems.map((it, idx) => (
                                  <tr
                                    key={it.id}
                                    className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}
                                  >
                                    <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                                    <td className="px-3 py-2 font-medium text-gray-800">
                                      {it.product?.name || it.item_name || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-gray-500">
                                      {it.variation?.name || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                                        {Math.abs(it.quantity)}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                                        {Math.abs(it.delivered_quantity)}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${Number(it.quantity_returned) > 0
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-gray-100 text-gray-400'
                                        }`}>
                                        {Math.abs(Number(it.quantity_returned ?? 0))}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold text-gray-800">
                                      {Number(it.unit_price ?? 0).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold text-gray-800">
                                      {(Number(it.quantity ?? 0) * Number(it.unit_price ?? 0)).toFixed(2)}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                            {detailItems.length > 0 && (
                              <tfoot>
                                <tr className="bg-blue-50 border-t-2 border-blue-200">
                                  <td colSpan={7} className="px-3 py-2 text-right text-xs font-semibold text-blue-700 uppercase tracking-wide">
                                    Items Subtotal
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-blue-800 text-sm">
                                    {itemsSubtotal.toFixed(2)}
                                  </td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>

                        {/* Sales Returns section */}
                        {returns.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 border-b border-orange-100 pb-1">
                              Sales Returns ({returns.length})
                            </p>
                            {returns.map((ret: any) => {
                              const statusMap: Record<string, string> = {
                                pending: 'bg-yellow-100 text-yellow-800',
                                approved: 'bg-blue-100 text-blue-800',
                                completed: 'bg-emerald-100 text-emerald-800',
                                cancelled: 'bg-gray-100 text-gray-600',
                                rejected: 'bg-red-100 text-red-800',
                              };
                              const retItems: any[] = ret.items ?? [];
                              const retSubtotal = retItems.reduce(
                                (s: number, ri: any) => s + Number(ri.quantity_returned ?? 0) * Number(ri.unit_price ?? 0), 0
                              );
                              return (
                                <div key={ret.id} className="rounded-xl border border-orange-100 overflow-hidden shadow-sm">
                                  {/* Return header */}
                                  <div className="flex items-center justify-between bg-orange-50 px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-bold text-orange-700">{ret.return_number}</span>
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusMap[ret.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                        {ret.status}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                      {ret.return_date && (
                                        <span>{new Date(ret.return_date).toLocaleDateString()}</span>
                                      )}
                                      {ret.reason && (
                                        <span className="capitalize">{String(ret.reason).replace(/_/g, ' ')}</span>
                                      )}
                                      <span className="font-semibold text-orange-700">
                                        Refund: {Number(ret.refund_amount ?? ret.total_amount ?? 0).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                  {/* Return items */}
                                  {retItems.length > 0 && (
                                    <table className="min-w-full text-xs">
                                      <thead>
                                        <tr className="bg-orange-100/60">
                                          <th className="px-3 py-1.5 text-left font-semibold text-orange-700">Product</th>
                                          <th className="px-3 py-1.5 text-left font-semibold text-orange-700">Variation</th>
                                          <th className="px-3 py-1.5 text-center font-semibold text-orange-700">Qty Returned</th>
                                          <th className="px-3 py-1.5 text-right font-semibold text-orange-700">Unit Price</th>
                                          <th className="px-3 py-1.5 text-right font-semibold text-orange-700">Line Total</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-orange-50">
                                        {retItems.map((ri: any, ri_idx: number) => (
                                          <tr key={ri.id ?? ri_idx} className="bg-white">
                                            <td className="px-3 py-1.5 font-medium text-gray-800">
                                              {ri.product?.name ?? '-'}
                                            </td>
                                            <td className="px-3 py-1.5 text-gray-500">
                                              {ri.variation?.name ?? '-'}
                                            </td>
                                            <td className="px-3 py-1.5 text-center">
                                              <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                                                {Number(ri.quantity_returned ?? 0)}
                                              </span>
                                            </td>
                                            <td className="px-3 py-1.5 text-right text-gray-700">
                                              {Number(ri.unit_price ?? 0).toFixed(2)}
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-semibold text-gray-800">
                                              {(Number(ri.quantity_returned ?? 0) * Number(ri.unit_price ?? 0)).toFixed(2)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                      <tfoot>
                                        <tr className="bg-orange-50 border-t border-orange-200">
                                          <td colSpan={4} className="px-3 py-1.5 text-right text-xs font-semibold text-orange-700">
                                            Return Subtotal
                                          </td>
                                          <td className="px-3 py-1.5 text-right font-bold text-orange-800">
                                            {retSubtotal.toFixed(2)}
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Net financial summary */}
                        {detailItems.length > 0 && (
                          <div className="rounded-xl border border-gray-200 overflow-hidden">
                            <table className="w-full text-sm">
                              <tbody>
                                <tr className="border-b border-gray-100">
                                  <td className="px-4 py-2 text-gray-500 text-xs">Items Subtotal</td>
                                  <td className="px-4 py-2 text-right font-semibold text-gray-800">{itemsSubtotal.toFixed(2)}</td>
                                </tr>
                                {Number(currentSO?.discount_amount ?? 0) > 0 && (
                                  <tr className="border-b border-gray-100">
                                    <td className="px-4 py-2 text-gray-500 text-xs">
                                      Discount
                                      {currentSO?.discount_type === 'percentage' ? ` (${currentSO.discount_value}%)` : ''}
                                    </td>
                                    <td className="px-4 py-2 text-right font-semibold text-amber-600">
                                      − {Number(currentSO?.discount_amount ?? 0).toFixed(2)}
                                    </td>
                                  </tr>
                                )}
                                {(Number(currentSO?.tax_amount ?? 0) + Number(currentSO?.shipping_charge ?? 0)) > 0 && (
                                  <tr className="border-b border-gray-100">
                                    <td className="px-4 py-2 text-gray-500 text-xs">Tax + Shipping</td>
                                    <td className="px-4 py-2 text-right font-semibold text-gray-600">
                                      + {(Number(currentSO?.tax_amount ?? 0) + Number(currentSO?.shipping_charge ?? 0)).toFixed(2)}
                                    </td>
                                  </tr>
                                )}
                                <tr className="border-b border-gray-100 bg-blue-50">
                                  <td className="px-4 py-2 text-blue-700 text-xs font-semibold">Grand Total</td>
                                  <td className="px-4 py-2 text-right font-bold text-blue-800">{Number(currentSO?.grand_total ?? 0).toFixed(2)}</td>
                                </tr>
                                {returnsTotal > 0 && (
                                  <tr className="border-b border-gray-100">
                                    <td className="px-4 py-2 text-orange-600 text-xs font-semibold">
                                      Returns ({returns.length} return{returns.length > 1 ? 's' : ''})
                                    </td>
                                    <td className="px-4 py-2 text-right font-bold text-orange-600">
                                      − {returnsTotal.toFixed(2)}
                                    </td>
                                  </tr>
                                )}
                                {returnsTotal > 0 && (
                                  <tr className="border-b border-gray-100 bg-indigo-50">
                                    <td className="px-4 py-2 text-indigo-700 text-xs font-semibold">Net Order Total</td>
                                    <td className="px-4 py-2 text-right font-bold text-indigo-800">{Math.max(0, net).toFixed(2)}</td>
                                  </tr>
                                )}
                                <tr className="border-b border-gray-100">
                                  <td className="px-4 py-2 text-emerald-600 text-xs font-semibold">Paid</td>
                                  <td className="px-4 py-2 text-right font-bold text-emerald-700">{paidAmount.toFixed(2)}</td>
                                </tr>
                                <tr className={`${balanceDue > 0 ? 'bg-red-50' : balanceDue < 0 ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                                  <td className="px-4 py-2 text-xs font-bold text-gray-700">Balance Due</td>
                                  <td className={`px-4 py-2 text-right font-bold text-base ${balanceDue > 0 ? 'text-red-600' : balanceDue < 0 ? 'text-emerald-600' : 'text-gray-600'}`}>
                                    <span>{balanceAmount}</span>
                                    <span className="ml-2 text-xs font-semibold uppercase tracking-wide">
                                      {balanceText}
                                    </span>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Payment History */}
                        {(() => {
                          const payments: any[] = currentSO?.payments ?? [];
                          if (payments.length === 0) return null;
                          return (
                            <div className="rounded-xl border border-emerald-100 overflow-hidden">
                              <div className="bg-emerald-50 px-3 py-2 flex items-center justify-between">
                                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                  Payment History ({payments.length})
                                </p>
                                <p className="text-xs font-semibold text-emerald-800">
                                  Total: ৳{payments.reduce((s, p) => s + Number(p.amount ?? 0), 0).toFixed(2)}
                                </p>
                              </div>
                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr className="bg-emerald-100/60">
                                    <th className="px-3 py-1.5 text-left font-semibold text-emerald-700">Receipt #</th>
                                    <th className="px-3 py-1.5 text-left font-semibold text-emerald-700">Date</th>
                                    <th className="px-3 py-1.5 text-left font-semibold text-emerald-700">Method</th>
                                    <th className="px-3 py-1.5 text-right font-semibold text-emerald-700">Amount</th>
                                    <th className="px-3 py-1.5 text-left font-semibold text-emerald-700">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-emerald-50">
                                  {payments.map((p: any, pi: number) => (
                                    <tr key={p.id ?? pi} className="bg-white">
                                      <td className="px-3 py-1.5 font-mono font-semibold text-emerald-700">
                                        {p.receipt_number ?? '-'}
                                      </td>
                                      <td className="px-3 py-1.5 text-gray-600">
                                        {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-'}
                                      </td>
                                      <td className="px-3 py-1.5 text-gray-700 capitalize">
                                        {String(p.payment_method ?? '-').replace(/_/g, ' ')}
                                      </td>
                                      <td className="px-3 py-1.5 text-right font-semibold text-emerald-800">
                                        ৳{Number(p.amount ?? 0).toFixed(2)}
                                      </td>
                                      <td className="px-3 py-1.5">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                            p.status === 'completed'
                                              ? 'bg-emerald-100 text-emerald-700'
                                              : p.status === 'pending'
                                              ? 'bg-yellow-100 text-yellow-700'
                                              : 'bg-gray-100 text-gray-600'
                                          }`}
                                        >
                                          {p.status ?? '-'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </>
                    );
                  })()}
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

      {/* Record Payment dialog */}
      {showPaymentDialog && currentSO && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-4 text-white rounded-t-2xl flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-0.5">Record Payment</p>
                <h2 className="text-xl font-bold leading-tight">{currentSO.invoice_number}</h2>
                <p className="text-sm opacity-80">{currentSO.customer?.name || '—'}</p>
                <p className="text-md opacity-75 mt-1 font-semibold text-rose-600">
                  Outstanding balance: ৳{outstandingBalance.toFixed(2)}
                </p>
              </div>
              <button
                onClick={closePaymentDialog}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={outstandingBalance}
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    onFocus={e => e.target.select()}
                    onKeyDown={preventMinus}
                    className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  {paymentErrors.amount && (
                    <p className="text-xs text-red-600 mt-1">{paymentErrors.amount}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={e => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="rocket">Rocket</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Cheque</option>
                    <option value="credit">Credit</option>
                    <option value="other">Other</option>
                  </select>
                  {paymentErrors.payment_method && (
                    <p className="text-xs text-red-600 mt-1">{paymentErrors.payment_method}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={e => {
                      setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }));
                      if (paymentErrors.payment_date) {
                        const { payment_date: _, ...rest } = paymentErrors;
                        setPaymentErrors(rest);
                      }
                    }}
                    className={`w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 ${
                      paymentErrors.payment_date
                        ? 'border-red-500 focus:ring-red-400'
                        : 'border-emerald-200 focus:ring-emerald-400'
                    }`}
                  />
                  {paymentErrors.payment_date && (
                    <p className="text-xs text-red-600 mt-1">
                      {Array.isArray(paymentErrors.payment_date)
                        ? paymentErrors.payment_date[0]
                        : paymentErrors.payment_date}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
                  <input
                    type="text"
                    value={paymentForm.notes}
                    onChange={e => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional"
                    className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              {/* Method-specific fields */}
              {paymentForm.payment_method === 'cash' && (
                <div className="grid grid-cols-2 gap-3 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Tendered Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentForm.tendered_amount}
                      onChange={e => setPaymentForm(prev => ({ ...prev, tendered_amount: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Change</label>
                    <input
                      type="number"
                      step="0.01"
                      value={
                        paymentForm.tendered_amount && Number(paymentForm.tendered_amount) > Number(paymentForm.amount)
                          ? (Number(paymentForm.tendered_amount) - Number(paymentForm.amount)).toFixed(2)
                          : '0.00'
                      }
                      readOnly
                      className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg text-sm bg-gray-50 text-gray-600"
                    />
                  </div>
                </div>
              )}

              {paymentForm.payment_method === 'card' && (
                <div className="grid grid-cols-3 gap-3 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Card Last 4</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={paymentForm.card_last_four}
                      onChange={e => setPaymentForm(prev => ({ ...prev, card_last_four: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg text-sm bg-white text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Processing Fee</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentForm.processing_fee}
                      onChange={e => setPaymentForm(prev => ({ ...prev, processing_fee: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg text-sm bg-white text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Transaction Ref</label>
                    <input
                      type="text"
                      value={paymentForm.transaction_reference}
                      onChange={e => setPaymentForm(prev => ({ ...prev, transaction_reference: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg text-sm bg-white text-gray-800"
                    />
                  </div>
                </div>
              )}

              {['bkash', 'nagad', 'rocket'].includes(paymentForm.payment_method) && (
                <div className="grid grid-cols-2 gap-3 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Mobile Number</label>
                    <input
                      type="text"
                      value={paymentForm.mobile_number}
                      onChange={e => setPaymentForm(prev => ({ ...prev, mobile_number: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg text-sm bg-white text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Transaction ID</label>
                    <input
                      type="text"
                      value={paymentForm.mobile_transaction_id}
                      onChange={e => setPaymentForm(prev => ({ ...prev, mobile_transaction_id: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg text-sm bg-white text-gray-800"
                    />
                  </div>
                </div>
              )}

              {paymentForm.payment_method === 'bank_transfer' && (
                <div className="grid grid-cols-3 gap-3 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Bank Name</label>
                    <input
                      type="text"
                      value={paymentForm.bank_name}
                      onChange={e => setPaymentForm(prev => ({ ...prev, bank_name: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg text-sm bg-white text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Account #</label>
                    <input
                      type="text"
                      value={paymentForm.bank_account}
                      onChange={e => setPaymentForm(prev => ({ ...prev, bank_account: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg text-sm bg-white text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Transaction Ref</label>
                    <input
                      type="text"
                      value={paymentForm.transaction_reference}
                      onChange={e => setPaymentForm(prev => ({ ...prev, transaction_reference: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg text-sm bg-white text-gray-800"
                    />
                  </div>
                </div>
              )}

              {paymentForm.payment_method === 'check' && (
                <div className="grid grid-cols-2 gap-3 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Cheque Number</label>
                    <input
                      type="text"
                      value={paymentForm.check_number}
                      onChange={e => setPaymentForm(prev => ({ ...prev, check_number: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg text-sm bg-white text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Cheque Date</label>
                    <input
                      type="date"
                      value={paymentForm.check_date}
                      onChange={e => setPaymentForm(prev => ({ ...prev, check_date: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-emerald-200 rounded-lg text-sm bg-white text-gray-800"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2 bg-white rounded-b-2xl">
              <button
                onClick={closePaymentDialog}
                disabled={paymentSubmitting}
                className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={submitPayment}
                disabled={paymentSubmitting}
                className="flex items-center gap-1.5 px-5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
              >
                {paymentSubmitting ? 'Saving…' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
