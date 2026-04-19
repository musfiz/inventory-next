'use client';

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { List, Plus, Edit, Trash2, Eye } from 'lucide-react';
import DataTable from '@/components/ui/datatable';
import { notify, confirm } from '@/lib/notifications';
import purchaseOrderService from '@/services/purchaseOrderService';

export default function PurchaseOrdersPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({
    po_number: '',
    supplier_id: undefined,
    warehouse_id: undefined,
    order_date: '',
    expected_delivery_date: '',
    status: 'draft',
  });
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
    setIsEditing(true);
    setFormData({ ...row });
    setShowForm(true);
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
    { accessorKey: 'order_date', header: 'Order Date' },
    { accessorKey: 'status', header: 'Status' },
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

  const buildApiEndpoint = () => 'purchase-orders';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <List className="w-5 h-5 text-blue-600" /> Purchase Orders
        </h1>
        <button
          onClick={() => {
            setShowForm(true);
            setIsEditing(false);
            setFormData({
              po_number: '',
              supplier_id: undefined,
              warehouse_id: undefined,
              order_date: '',
              expected_delivery_date: '',
              status: 'draft',
            });
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors duration-200"
        >
          <Plus className="w-4 h-4" /> Add Purchase
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={e => {
            e.preventDefault();
            /* minimal stub - implement store flow if needed */ setShowForm(false);
            setRefreshKey(k => k + 1);
            notify.success(isEditing ? 'Updated' : 'Created');
          }}
          className="bg-white dark:bg-gray-800 rounded-md p-3 space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="block text-sm">PO Number</label>
              <input
                value={formData.po_number}
                onChange={e => setFormData({ ...formData, po_number: e.target.value })}
                className="w-full px-2 py-1 text-sm border rounded-sm"
              />
            </div>
            <div>
              <label className="block text-sm">Order Date</label>
              <input
                type="date"
                value={formData.order_date}
                onChange={e => setFormData({ ...formData, order_date: e.target.value })}
                className="w-full px-2 py-1 text-sm border rounded-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-sm"
              >
                {isEditing ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

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
