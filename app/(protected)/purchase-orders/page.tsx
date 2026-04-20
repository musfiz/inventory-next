'use client';

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { List, Plus, Edit, Trash2, Eye, Printer } from 'lucide-react';
import DataTable from '@/components/ui/datatable';
import { notify, confirm } from '@/lib/notifications';
import purchaseOrderService from '@/services/purchaseOrderService';
import { useRouter } from 'next/navigation';

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const formatDate = (val?: string | null) => {
    if (!val) return '-';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '-';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [detailItems, setDetailItems] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadItems = async (id: number) => {
    try {
      setDetailLoading(true);
      const items = await purchaseOrderService.getPurchaseOrderItems(id);
      setDetailItems(items || []);
      setShowDetails(true);
    } catch (err: any) {
      notify.error(err?.response?.data?.message || 'Failed to load items');
    } finally {
      setDetailLoading(false);
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
      cell: ({ row }) => formatDate(row.original.order_date),
    },
    {
      accessorKey: 'expected_delivery_date',
      header: 'Expected Delivery',
      cell: ({ row }) => formatDate(row.original.expected_delivery_date),
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
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            title="Details"
            onClick={() => loadItems(row.original.id)}
            className="p-1 text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            title="Edit"
            onClick={() => handleEdit(row.original)}
            className="p-1 text-green-600 hover:text-green-800 cursor-pointer"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            title="Print"
            onClick={() => window.open(`/purchase-orders/print/${row.original.id}`, '_blank')}
            className="p-1 text-gray-600 hover:text-gray-800 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
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

  const buildApiEndpoint = () => '/purchase-order';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <List className="w-5 h-5 text-blue-600" /> Purchase Orders
        </h1>
        <button
          onClick={() => router.push('/purchase-orders/add')}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200"
        >
          <Plus className="w-4 h-4" /> Add Purchase
        </button>
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
              <h3 className="text-lg font-medium">Purchase Order Items</h3>
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
                          <td className="px-2 py-2">{it.quantity_ordered}</td>
                          <td className="px-2 py-2">{it.quantity_received}</td>
                          <td className="px-2 py-2">{it.unit_cost}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
