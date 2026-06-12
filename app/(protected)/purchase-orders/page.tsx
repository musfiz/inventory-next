'use client';

import { useState, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { List, Plus, Edit, Trash2, Eye, Printer, Receipt, ReceiptText, PackageCheck } from 'lucide-react';
import DataTable from '@/components/ui/datatable';
import { formatDate } from '@/lib/utils/date';
import { notify, confirm } from '@/lib/notifications';
import purchaseOrderService from '@/services/purchaseOrderService';
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
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receiving, setReceiving] = useState(false);

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
        unit_cost: Number(it.unit_cost ?? 0),
      }));
      setReceiveState({ po, items });
      // Default receive-rows to "remaining" qty (so the user can save in one click)
      const defaults: Record<number, number> = {};
      items.forEach((it: any) => {
        defaults[it.id] = Math.max(0, it.quantity_ordered - it.quantity_received);
      });
      setReceiveRows(defaults);
      setReceiveNotes('');
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to load purchase order');
    }
  };

  const handleReceive = async () => {
    if (!receiveState) return;
    const rows = receiveState.items
      .map((it) => ({
        purchase_order_item_id: it.id,
        quantity_received: Number(receiveRows[it.id] ?? 0),
      }))
      .filter((r) => r.quantity_received > 0);
    if (rows.length === 0) {
      notify.error('Please enter at least one received quantity');
      return;
    }
    try {
      setReceiving(true);
      await purchaseOrderService.receiveStock(receiveState.po.id, {
        items: rows,
        notes: receiveNotes || undefined,
      });
      notify.success('Stock received — stock ledger updated');
      setReceiveState(null);
      setRefreshKey((k) => k + 1);
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
      meta: { width: '96px' },
      cell: ({ row }) => {
        const s = row.original.status || '';
        const canReceive = !['completed', 'cancelled', 'received'].includes(s);
        return (
          <div className="flex items-center gap-2">
            <button
              title="Details"
              onClick={() => loadItems(row.original.id)}
              className="p-1 text-blue-600 hover:text-blue-800 cursor-pointer"
            >
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
            {hasPermission('print-purchase-orders') && (
              <button
                title="Print"
                onClick={() => handlePrint(row.original.id, 'invoice')}
                className="p-1 text-gray-600 hover:text-gray-800 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}
            {hasPermission('print-purchase-orders') && (
              <button
                title="POS Print"
                onClick={() => handlePrint(row.original.id, 'pos')}
                className="p-1 text-amber-600 hover:text-amber-800 cursor-pointer"
              >
                <ReceiptText className="w-4 h-4" />
              </button>
            )}
            {hasPermission('update-purchase-orders') && (
              <button
                title="Edit"
                onClick={() => handleEdit(row.original)}
                className="p-1 text-green-600 hover:text-green-800 cursor-pointer"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {hasPermission('delete-purchase-orders') && (
              <button
                title="Delete"
                onClick={() => handleDelete(row.original)}
                className="p-1 text-red-600 hover:text-red-800 cursor-pointer"
              >
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
                    </div>
                  </div>

                  {/* Status controls */}
                  <div className="flex items-center gap-3">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Status</label>
                      <select
                        value={currentPO?.status || 'draft'}
                        onChange={e => setCurrentPO((prev: any) => prev ? { ...prev, status: e.target.value } : prev)}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Payment Status</label>
                      <select
                        value={currentPO?.payment_status || 'pending'}
                        onChange={e => setCurrentPO((prev: any) => prev ? { ...prev, payment_status: e.target.value } : prev)}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                        className="px-2 py-1 text-right border border-gray-300 dark:border-gray-700 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-36 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                        <th className="px-2 py-1">Unit Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailItems.length === 0 ? (
                        <tr>
                          <td className="px-2 py-3" colSpan={6}>
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
                            <td className="px-2 py-2">{Number(it.unit_cost ?? 0).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
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

            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-600 border-b">
                  <th className="px-2 py-1">#</th>
                  <th className="px-2 py-1">Product</th>
                  <th className="px-2 py-1 text-center">Ordered</th>
                  <th className="px-2 py-1 text-center">Already Received</th>
                  <th className="px-2 py-1 text-center">Receive Now</th>
                </tr>
              </thead>
              <tbody>
                {receiveState.items.map((it: any, idx: number) => (
                  <tr key={it.id} className="border-t">
                    <td className="px-2 py-2">{idx + 1}</td>
                    <td className="px-2 py-2">
                      {it.product_name}
                      {it.variation_name ? ` — ${it.variation_name}` : ''}
                    </td>
                    <td className="px-2 py-2 text-center">{it.quantity_ordered}</td>
                    <td className="px-2 py-2 text-center">{it.quantity_received}</td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        max={it.quantity_ordered - it.quantity_received}
                        value={receiveRows[it.id] ?? 0}
                        onChange={(e) => {
                          const v = Math.max(
                            0,
                            Math.min(
                              it.quantity_ordered - it.quantity_received,
                              Number(e.target.value) || 0
                            )
                          );
                          setReceiveRows((prev) => ({ ...prev, [it.id]: v }));
                        }}
                        onKeyDown={preventMinus}
                        onFocus={(e) => e.target.select()}
                        className="w-24 px-2 py-1 text-right text-sm border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                ))}
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
