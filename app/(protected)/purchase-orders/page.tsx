'use client';

import { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { List, Plus, Edit, Trash2, Eye, Printer, Receipt, ReceiptText, PackageCheck, Undo2 } from 'lucide-react';
import DataTable from '@/components/ui/datatable';
import { formatDate } from '@/lib/utils/date';
import { notify, confirm } from '@/lib/notifications';
import purchaseOrderService from '@/services/purchaseOrderService';
import purchaseReturnService from '@/services/purchaseReturnService';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import PurchaseOrderInvoice from '@/components/print/invoices/PurchaseOrderInvoice';
import PurchaseOrderThermal from '@/components/print/invoices/PurchaseOrderThermal';

type PrintMode = 'invoice' | 'pos';

type PrintState = {
  mode: PrintMode;
  po: any;
} | null;

type ReceiveState = {
  po: any;
  items: any[];
} | null;

/** Why goods were refused at the GRN check. Mirrors the backend's reason codes. */
const REJECT_REASONS = [
  { value: 'damaged', label: 'Damaged' },
  { value: 'defective', label: 'Defective' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'expired', label: 'Expired' },
  { value: 'short_shelf_life', label: 'Short Shelf Life' },
  { value: 'quality_mismatch', label: 'Quality Mismatch' },
  { value: 'other', label: 'Other' },
];

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { hasPermission, isHydrated } = usePermissions();

  useEffect(() => {
    if (isHydrated && !hasPermission('view-purchase-order')) {
      router.push('/access-denied');
    }
  }, [hasPermission, isHydrated, router]);

  const [refreshKey, setRefreshKey] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentPO, setCurrentPO] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);
  const [printState, setPrintState] = useState<PrintState>(null);
  const [receiveState, setReceiveState] = useState<ReceiveState>(null);
  const [receiveRows, setReceiveRows] = useState<Record<number, number>>({});
  const [rejectRows, setRejectRows] = useState<Record<number, number>>({});
  const [rejectReasonRows, setRejectReasonRows] = useState<Record<number, string>>({});
  const [rejectNoteRows, setRejectNoteRows] = useState<Record<number, string>>({});
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receiving, setReceiving] = useState(false);

  // Returns raised against the PO open in the details modal.
  const [detailReturns, setDetailReturns] = useState<any[]>([]);

  const STATUS_LIST = [
    'draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'completed', 'cancelled'
  ];
  const PAYMENT_STATUS_LIST = [
    { value: 'pending', label: 'Pending' },
    { value: 'partial', label: 'Partial' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
  ];

  const loadItems = async (id: number) => {
    try {
      setDetailLoading(true);
      const po = await purchaseOrderService.getPurchaseOrder(id);
      // if API returns wrapped data
      const data = po || {};
      setCurrentPO(data);
      setDetailItems(data.items || []);
      setShowDetails(true);

      // Returns are a separate endpoint and only relevant to someone who can
      // see them, so a failure here must not blank the details modal.
      setDetailReturns([]);
      if (hasPermission('view-purchase-order-return')) {
        try {
          setDetailReturns((await purchaseReturnService.getOrderReturns(id)) ?? []);
        } catch {
          setDetailReturns([]);
        }
      }
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to load details');
    } finally {
      setDetailLoading(false);
    }
  };

  // Prevent entering minus sign in numeric inputs
  const preventMinus = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-') e.preventDefault();
  };

  // Compact field height matching CustomSelect/DatePicker compact (28px, text-xs).
  const compactFieldCls =
    'w-full h-7 px-2 text-xs leading-7 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 ' +
    'rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 ' +
    'focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent';


  const handleUpdate = async () => {
    if (!currentPO) return;
    try {
      setUpdating(true);
      const payload: any = {
        status: currentPO.status,
        payment_status: currentPO.payment_status,
        paid_amount: currentPO.paid_amount ?? 0,
      };
      await purchaseOrderService.updatePurchaseOrderFromDetails(currentPO.id, payload);
      notify.success('Purchase order updated');
      setShowDetails(false);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const handleEdit = (row: any) => {
    router.push(`/purchase-orders/add?edit=${row.id}`);
  };

  const handleDelete = async (row: any) => {
    const result = await confirm({
      title: 'Delete Purchase Order',
      html: `Are you sure you want to delete <strong>${row.po_number}</strong>?`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });
    if (!result.isConfirmed) return;
    try {
      await purchaseOrderService.deletePurchaseOrder(row.id);
      notify.success('Purchase order deleted');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to delete');
    }
  };

  const openReceive = async (row: any) => {
    try {
      const po = await purchaseOrderService.getPurchaseOrder(row.id);
      const items = (po?.items || []).map((it: any) => ({
        id: it.id,
        product_name: it.product?.name || it.product_name || '-',
        variation_name: it.variation?.name || it.variation_name || '',
        quantity_ordered: Number(it.quantity_ordered ?? 0),
        quantity_received: Number(it.quantity_received ?? 0),
        // Rejected goods count towards closing the line: they were delivered
        // and refused, so received + rejected cannot exceed ordered.
        quantity_rejected: Number(it.quantity_rejected ?? 0),
        unit_cost: Number(it.unit_cost ?? 0),
      }));
      setReceiveState({ po, items });
      // Default receive-rows to "remaining" qty (so the user can save in one click)
      const defaults: Record<number, number> = {};
      items.forEach((it: any) => {
        defaults[it.id] = Math.max(
          0,
          it.quantity_ordered - it.quantity_received - it.quantity_rejected
        );
      });
      setReceiveRows(defaults);
      setRejectRows({});
      setRejectReasonRows({});
      setRejectNoteRows({});
      setReceiveNotes('');
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to load purchase order');
    }
  };

  /** Ceiling for either the accepted or the rejected input on one line. */
  const receiveLineCap = (it: any) =>
    Math.max(0, it.quantity_ordered - it.quantity_received - it.quantity_rejected);

  /**
   * Send one GRN.
   *
   * The backend treats `quantity_received` as the ABSOLUTE total on that line
   * and books the delta — so this must send already-received + receiving-now,
   * not just the increment. Sending the increment alone made a second partial
   * receipt book nothing, and `quantity_received` is the cap for returns, so the
   * error silently poisoned every return against the PO.
   *
   * `quantity_rejected` is a separate, additive field: it is recorded on the line
   * but never enters stock, and it creates a pending rejected_at_receipt return
   * server-side.
   */
  const handleReceive = async () => {
    if (!receiveState) return;

    const rows = receiveState.items
      .map((it) => {
        const accepting = Number(receiveRows[it.id] ?? 0);
        const rejecting = Number(rejectRows[it.id] ?? 0);
        if (accepting <= 0 && rejecting <= 0) return null;
        return {
          purchase_order_item_id: it.id,
          // Absolute total, not the increment.
          quantity_received: it.quantity_received + accepting,
          quantity_rejected: rejecting,
          reject_reason_code: rejecting > 0 ? (rejectReasonRows[it.id] || 'quality_mismatch') : undefined,
          reject_note: rejecting > 0 ? (rejectNoteRows[it.id] || undefined) : undefined,
        };
      })
      .filter(Boolean) as any[];

    if (rows.length === 0) {
      notify.error('Please enter at least one received or rejected quantity');
      return;
    }

    const totalRejected = rows.reduce((sum, r) => sum + (r.quantity_rejected || 0), 0);

    try {
      setReceiving(true);
      const result: any = await purchaseOrderService.receiveStock(receiveState.po.id, {
        items: rows,
        notes: receiveNotes || undefined,
      });
      setReceiveState(null);
      setRefreshKey((k) => k + 1);

      // The backend auto-creates a pending return for anything rejected, so
      // point the clerk straight at it rather than making them find it.
      const createdReturn = result?.purchase_return;
      if (createdReturn) {
        notify.success(
          `Stock received — ${totalRejected} unit(s) rejected. A purchase return (${createdReturn.return_number}) is pending approval.`
        );
        if (hasPermission('view-purchase-order-return')) {
          router.push('/purchase-order-return');
        }
      } else {
        notify.success('Stock received — stock ledger updated');
      }
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to receive stock');
    } finally {
      setReceiving(false);
    }
  };

  const handlePrint = async (id: number, mode: PrintMode = 'invoice') => {
    try {
      const po = await purchaseOrderService.getPurchaseOrder(id);
      setPrintState({ mode, po });
      // Delay to ensure DOM is fully updated and rendered before printing
      setTimeout(() => {
        window.print();
        // Clean up after print dialog is closed
        setTimeout(() => setPrintState(null), 500);
      }, 300);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to load purchase order');
    }
  };

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
    { accessorKey: 'po_number', header: 'PO Number' },
    {
      accessorKey: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => row.original.supplier?.name || '-',
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
      accessorKey: 'expected_delivery_date',
      header: 'Expected Delivery',
      cell: ({ row }) => formatDate(row.original.expected_delivery_date,
        'DD/MM/YYYY'
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status || '';
        const map: Record<string, string> = {
          draft: 'bg-gray-100 text-gray-800',
          pending: 'bg-yellow-100 text-yellow-800',
          approved: 'bg-green-100 text-green-800',
          ordered: 'bg-blue-100 text-blue-800',
          partial: 'bg-orange-100 text-orange-800',
          received: 'bg-teal-100 text-teal-800',
          completed: 'bg-green-200 text-green-900',
          cancelled: 'bg-red-100 text-red-800',
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
    { accessorKey: 'total_amount', header: 'Total' },
    {
      id: 'actions',
      header: 'Actions',
      meta: { width: '120px' },
      cell: ({ row }) => {
        const s = row.original.status || '';
        const canReceive = !['completed', 'cancelled', 'received'].includes(s);
        // A return needs goods to have arrived. `received_quantity` is not on
        // the list payload, so infer from the items when the row carries them
        // and otherwise let the return page report nothing returnable.
        const items = row.original.items ?? [];
        const hasReceived = items.length
          ? items.some((it: any) => Number(it.quantity_received ?? 0) > 0)
          : s !== 'draft' && s !== 'pending' && s !== 'approved' && s !== 'ordered';
        const canReturn =
          hasPermission('create-purchase-order-return') &&
          hasReceived &&
          s !== 'cancelled' &&
          s !== 'draft';
        return (
          <div className="flex items-center gap-2">
            <button
              title="Details"
              onClick={() => loadItems(row.original.id)}
              className="p-1 text-blue-600 hover:text-blue-800 cursor-pointer"
             aria-label="Details">
              <Eye className="w-4 h-4" />
            </button>
            {canReceive && hasPermission('receive-purchase-orders') && (
              <button
                title="Receive stock"
                onClick={() => openReceive(row.original)}
                className="p-1 text-emerald-600 hover:text-emerald-800 cursor-pointer"
              >
                <PackageCheck className="w-4 h-4" />
              </button>
            )}
            {canReturn && (
              <button
                title="Return to vendor"
                onClick={() => router.push(`/purchase-order-return?po=${encodeURIComponent(String(row.original.id))}`)}
                className="p-1 text-orange-600 hover:text-orange-800 cursor-pointer"
                aria-label="Return to vendor"
              >
                <Undo2 className="w-4 h-4" />
              </button>
            )}
            {hasPermission('print-purchase-orders') && (
              <button
                title="Print"
                onClick={() => handlePrint(row.original.id, 'invoice')}
                className="p-1 text-gray-600 hover:text-gray-800 cursor-pointer"
               aria-label="Print">
                <Printer className="w-4 h-4" />
              </button>
            )}
            {hasPermission('print-purchase-orders') && (
              <button
                title="POS Print"
                onClick={() => handlePrint(row.original.id, 'pos')}
                className="p-1 text-amber-600 hover:text-amber-800 cursor-pointer"
               aria-label="POS Print">
                <ReceiptText className="w-4 h-4" />
              </button>
            )}
            {hasPermission('update-purchase-orders') && (
              <button
                title="Edit"
                onClick={() => handleEdit(row.original)}
                className="p-1 text-green-600 hover:text-green-800 cursor-pointer"
               aria-label="Edit">
                <Edit className="w-4 h-4" />
              </button>
            )}
            {hasPermission('delete-purchase-orders') && (
              <button
                title="Delete"
                onClick={() => handleDelete(row.original)}
                className="p-1 text-red-600 hover:text-red-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={s === 'cancelled'}
                aria-label="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const buildApiEndpoint = () => '/purchase-order';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <List className="w-5 h-5 text-blue-600" /> Purchase Orders
        </h1>
        {hasPermission('create-purchase-orders') && (
          <button
            onClick={() => router.push('/purchase-orders/add')}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200"
          >
            <Plus className="w-4 h-4" /> Add Purchase
          </button>
        )}
      </div>

      {/* Inline add/edit form removed — Add button navigates to separate add page */}

      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        enableSearch
        searchPlaceholder="Search by PO number, supplier..."
      />

      {/* Details modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-md w-11/12 md:w-3/4 lg:w-1/2 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium">Purchase Order Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="px-2 py-1 text-sm bg-gray-200 rounded"
              >
                Close
              </button>
            </div>
            {detailLoading ? (
              <div className="text-sm">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex flex-col gap-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold">{currentPO?.po_number || '-'}</div>
                      <div className="text-xs text-gray-500">{currentPO?.supplier?.name || '-'}</div>
                      <div className="text-xs text-gray-500">Warehouse: {currentPO?.warehouse?.name || '-'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs">Order Date: {formatDate(currentPO?.order_date, 'DD/MM/YYYY')}</div>
                      <div className="text-xs">Expected: {formatDate(currentPO?.expected_delivery_date, 'DD/MM/YYYY')}</div>
                      <div className="text-xs">Shipping: {Number(currentPO?.shipping_charge ?? currentPO?.shipping ?? 0).toFixed(2)}</div>
                      <div className="text-xs">
                        VAT: {currentPO?.vat ? `${currentPO.vat}%` : '-'}
                        {currentPO ? ` (${Number(((currentPO.sub_total ?? 0) - (currentPO.discount_amount ?? 0)) * ((currentPO.vat ?? 0) / 100)).toFixed(2)})` : ''}
                      </div>
                      <div className="text-xs">
                        Discount: {currentPO?.discount_percentage ? `${currentPO.discount_percentage}%` : (currentPO?.discount_amount ? `${Number(currentPO.discount_amount).toFixed(2)}` : '-')}
                      </div>
                      <div className="text-sm font-bold">Total: {currentPO?.total_amount ?? '-'}</div>
                      {/* Net payable is what the business actually owes:
                          total less goods sent back to the vendor, less paid. */}
                      {Number(currentPO?.returned_amount ?? 0) > 0 && (
                        <>
                          <div className="text-xs text-orange-600">
                            Returned: {Number(currentPO.returned_amount).toFixed(2)}
                          </div>
                          <div className="text-sm font-bold text-orange-700">
                            Net Payable:{' '}
                            {Number(
                              (currentPO?.total_amount ?? 0)
                              - (currentPO?.returned_amount ?? 0)
                              - (currentPO?.paid_amount ?? 0)
                            ).toFixed(2)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status controls */}
                  <div className="flex items-end gap-3">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Status</label>
                      <select
                        value={currentPO?.status || 'draft'}
                        onChange={e => setCurrentPO((prev: any) => prev ? { ...prev, status: e.target.value } : prev)}
                        className={compactFieldCls}
                      >
                        {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Payment Status</label>
                      <select
                        value={currentPO?.payment_status || 'pending'}
                        onChange={e => setCurrentPO((prev: any) => prev ? { ...prev, payment_status: e.target.value } : prev)}
                        className={compactFieldCls}
                      >
                        {PAYMENT_STATUS_LIST.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Paid Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={currentPO?.paid_amount ?? 0}
                        onChange={e => setCurrentPO((prev: any) => prev ? { ...prev, paid_amount: e.target.value } : prev)}
                        onFocus={e => e.target.select()}
                        onKeyDown={preventMinus}
                        className={`${compactFieldCls} text-right w-36 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      />
                    </div>
                    {hasPermission('update-purchase-orders') && (
                      <div className="ml-auto">
                        <button onClick={handleUpdate} disabled={updating} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                          {updating ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    )}
                  </div>

                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-600">
                        <th className="px-2 py-1">#</th>
                        <th className="px-2 py-1">Product</th>
                        <th className="px-2 py-1">Variation</th>
                        <th className="px-2 py-1">Ordered</th>
                        <th className="px-2 py-1">Received</th>
                        <th className="px-2 py-1">Rejected</th>
                        <th className="px-2 py-1">Returned</th>
                        <th className="px-2 py-1">Unit Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailItems.length === 0 ? (
                        <tr>
                          <td className="px-2 py-3" colSpan={8}>
                            No items found
                          </td>
                        </tr>
                      ) : (
                        detailItems.map((it, idx) => (
                          <tr key={it.id} className="border-t">
                            <td className="px-2 py-2">{idx + 1}</td>
                            <td className="px-2 py-2">
                              {it.product?.name || it.product_name || '-'}
                            </td>
                            <td className="px-2 py-2">
                              {it.variation?.name || it.variation_name || '-'}
                            </td>
                            <td className="px-2 py-2 text-center">{Math.abs(it.quantity_ordered)}</td>
                            <td className="px-2 py-2 text-center">{Math.abs(it.quantity_received)}</td>
                            <td className="px-2 py-2 text-center">
                              {Number(it.quantity_rejected ?? 0) > 0 ? (
                                <span className="text-orange-600 font-medium">
                                  {Math.abs(Number(it.quantity_rejected))}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {Number(it.quantity_returned ?? 0) > 0 ? (
                                <span className="text-orange-600 font-medium">
                                  {Math.abs(Number(it.quantity_returned))}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-2 py-2">{Number(it.unit_cost ?? 0).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Returns raised against this PO. Delete and cancel are
                      blocked server-side while a non-cancelled return exists;
                      this panel explains why rather than leaving a dead error. */}
                  {hasPermission('view-purchase-order-return') && (
                    <div className="mt-3 border-t pt-2">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-semibold text-gray-600">Purchase Returns</h4>
                        {detailReturns.length > 0 && (
                          <span className="text-[10px] text-gray-500">
                            Delete and cancel are blocked while returns exist.
                          </span>
                        )}
                      </div>
                      {detailReturns.length === 0 ? (
                        <p className="text-xs text-gray-500">No returns raised against this order.</p>
                      ) : (
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-600 border-b">
                              <th className="px-2 py-1">Return #</th>
                              <th className="px-2 py-1">Debit Note</th>
                              <th className="px-2 py-1">Type</th>
                              <th className="px-2 py-1 text-center">Items</th>
                              <th className="px-2 py-1">Date</th>
                              <th className="px-2 py-1">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailReturns.map((r) => (
                              <tr key={r.id} className="border-t">
                                <td className="px-2 py-1 font-mono">{r.return_number}</td>
                                <td className="px-2 py-1 font-mono">{r.debit_note_number ?? '—'}</td>
                                <td className="px-2 py-1">
                                  {r.return_type === 'rejected_at_receipt' ? 'Rejected at receipt' : 'After receipt'}
                                </td>
                                <td className="px-2 py-1 text-center">
                                  {(r.items ?? []).reduce(
                                    (sum: number, it: any) => sum + Number(it.quantity_returned ?? 0),
                                    0
                                  )}
                                </td>
                                <td className="px-2 py-1">{formatDate(r.return_date, 'DD/MM/YYYY')}</td>
                                <td className="px-2 py-1 capitalize">{r.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receive stock modal (GRN) */}
      {receiveState && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-md w-11/12 md:w-3/4 lg:w-2/3 p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium">
                Receive Stock — {receiveState.po.po_number}
              </h3>
              <button
                onClick={() => setReceiveState(null)}
                className="px-2 py-1 text-sm bg-gray-200 rounded"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-2">
              Enter what you are accepting into stock. Anything you reject never enters stock — it
              creates a purchase return for the vendor instead.
            </p>

            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-600 border-b">
                  <th className="px-2 py-1">#</th>
                  <th className="px-2 py-1">Product</th>
                  <th className="px-2 py-1 text-center">Ordered</th>
                  <th className="px-2 py-1 text-center">Already Received</th>
                  <th className="px-2 py-1 text-center">Already Rejected</th>
                  <th className="px-2 py-1 text-center">Receive Now</th>
                  <th className="px-2 py-1 text-center">Reject</th>
                  <th className="px-2 py-1">Reject Reason</th>
                </tr>
              </thead>
              <tbody>
                {receiveState.items.map((it: any, idx: number) => {
                  // One shared ceiling: accepted + rejected may never exceed
                  // what is still outstanding on the line. Each input is capped
                  // by the other so the pair cannot both claim the remainder.
                  const cap = receiveLineCap(it);
                  const accepted = Number(receiveRows[it.id] ?? 0);
                  const rejected = Number(rejectRows[it.id] ?? 0);
                  const numCls =
                    'w-20 px-2 py-1 text-right text-sm border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500';
                  return (
                    <tr key={it.id} className="border-t">
                      <td className="px-2 py-2">{idx + 1}</td>
                      <td className="px-2 py-2">
                        {it.product_name}
                        {it.variation_name ? ` — ${it.variation_name}` : ''}
                      </td>
                      <td className="px-2 py-2 text-center">{it.quantity_ordered}</td>
                      <td className="px-2 py-2 text-center">{it.quantity_received}</td>
                      <td className="px-2 py-2 text-center">{it.quantity_rejected || 0}</td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          max={Math.max(0, cap - rejected)}
                          value={accepted}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(cap - rejected, Number(e.target.value) || 0));
                            setReceiveRows((prev) => ({ ...prev, [it.id]: v }));
                          }}
                          onKeyDown={preventMinus}
                          onFocus={(e) => e.target.select()}
                          disabled={cap <= 0}
                          className={`${numCls} disabled:opacity-50`}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          max={Math.max(0, cap - accepted)}
                          value={rejected}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(cap - accepted, Number(e.target.value) || 0));
                            setRejectRows((prev) => ({ ...prev, [it.id]: v }));
                          }}
                          onKeyDown={preventMinus}
                          onFocus={(e) => e.target.select()}
                          disabled={cap <= 0}
                          className={`${numCls} disabled:opacity-50`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={rejectReasonRows[it.id] ?? ''}
                          onChange={(e) =>
                            setRejectReasonRows((prev) => ({ ...prev, [it.id]: e.target.value }))
                          }
                          disabled={rejected <= 0}
                          className="w-40 px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 disabled:opacity-50"
                        >
                          <option value="">Select reason…</option>
                          {REJECT_REASONS.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                        {rejected > 0 && (
                          <input
                            type="text"
                            value={rejectNoteRows[it.id] ?? ''}
                            onChange={(e) =>
                              setRejectNoteRows((prev) => ({ ...prev, [it.id]: e.target.value }))
                            }
                            placeholder="Optional note"
                            className="mt-1 w-40 px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-3">
              <label className="block text-xs text-gray-600 mb-1">Notes</label>
              <textarea
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
                rows={2}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded"
                placeholder="Optional notes for this receipt"
              />
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setReceiveState(null)}
                className="px-3 py-1 bg-gray-200 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReceive}
                disabled={receiving}
                className="px-3 py-1 bg-emerald-600 text-white rounded text-sm disabled:opacity-60"
              >
                {receiving ? 'Receiving…' : 'Confirm Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print preview - only visible when printing */}
      {printState && (
        <div className="print-only" id="print-invoice">
          {printState.mode === 'invoice' ? (
            <PurchaseOrderInvoice po={printState.po} />
          ) : (
            <PurchaseOrderThermal po={printState.po} />
          )}
        </div>
      )}

      {/* Print-specific styles */}
      <style jsx global>{`
        @media screen {
          .print-only {
            display: none !important;
          }
        }

        @media print {
          /* Hide everything */
          body * {
            visibility: hidden;
          }

          /* Show only print content and its children */
          #print-invoice,
          #print-invoice * {
            visibility: visible !important;
          }

          /* Position print content at top of page */
          #print-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          .invoice-content {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 20mm;
            background: white;
          }

          .pos-invoice-content {
            width: 80mm;
            min-height: auto;
            margin: 0 auto;
            padding: 6mm 4mm;
            background: white;
          }

          @page {
            size: A4;
            margin: 0;
          }

          /* Avoid page breaks inside tables */
          table,
          tr,
          td,
          th {
            page-break-inside: avoid;
          }
          
          /* Ensure backgrounds and colors print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
