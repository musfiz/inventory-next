'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { List, Plus, Edit, Trash2, Eye, Printer, ReceiptText, X } from 'lucide-react';
import DataTable from '@/components/ui/datatable';
import { formatDate } from '@/lib/utils/date';
import { notify, confirm } from '@/lib/notifications';
import salesOrderService from '@/services/salesOrderService';
import { useRouter } from 'next/navigation';

type PrintMode = 'invoice' | 'pos';

type PrintState = {
  mode: PrintMode;
  so: any;
} | null;

export default function SalesOrdersPage() {
  const router = useRouter();

  const [refreshKey, setRefreshKey] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentSO, setCurrentSO] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);
  const [printState, setPrintState] = useState<PrintState>(null);

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
    { value: 'overdue', label: 'Overdue' },
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

  const handlePrint = async (id: string, mode: PrintMode = 'invoice') => {
    try {
      const so = await salesOrderService.getSalesOrder(id);
      setPrintState({ mode, so });
      setTimeout(() => {
        window.print();
        setTimeout(() => setPrintState(null), 500);
      }, 300);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to load sales order');
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
      meta: { width: '96px' },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            title="Details"
            onClick={() => loadItems(row.original.uuid)}
            className="p-1 text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            title="Print"
            onClick={() => handlePrint(row.original.uuid, 'invoice')}
            className="p-1 text-gray-600 hover:text-gray-800 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button>
          {/* <button
            title="POS Print"
            onClick={() => handlePrint(row.original.id, 'pos')}
            className="p-1 text-amber-600 hover:text-amber-800 cursor-pointer"
          >
            <ReceiptText className="w-4 h-4" />
          </button> */}
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
      ),
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
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-2.5 text-white text-center shadow-sm">
                      <p className="text-xs opacity-80 mb-0.5">Grand Total</p>
                      <p className="text-base font-bold leading-tight">{Number(currentSO?.grand_total ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-2.5 text-white text-center shadow-sm">
                      <p className="text-xs opacity-80 mb-0.5">Paid</p>
                      <p className="text-base font-bold leading-tight">{Number(currentSO?.paid_amount ?? 0).toFixed(2)}</p>
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
                      <div className="min-w-[120px]">
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Paid Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          value={currentSO?.paid_amount ?? 0}
                          onChange={e =>
                            setCurrentSO((prev: any) =>
                              prev ? { ...prev, paid_amount: e.target.value } : prev
                            )
                          }
                          onFocus={e => e.target.select()}
                          onKeyDown={preventMinus}
                          className="w-full px-3 py-1.5 text-right border border-violet-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
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
                  <div className="rounded-xl overflow-hidden border border-blue-100 shadow-sm">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                          <th className="px-3 py-2 text-left text-xs font-semibold">#</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold">Product</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold">Variation</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold">Qty</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold">Delivered</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold">Unit Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-50">
                        {detailItems.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-8 text-center text-gray-400 text-sm">
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
                              <td className="px-3 py-2 text-right font-semibold text-gray-800">
                                {Number(it.unit_price ?? 0).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
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

      {/* Print-specific styles */}
      <style jsx global>{`
        @media screen {
          .print-only {
            display: none !important;
          }
        }

        @media print {
          body * {
            visibility: hidden;
          }
          #print-invoice,
          #print-invoice * {
            visibility: visible;
          }
          #print-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
