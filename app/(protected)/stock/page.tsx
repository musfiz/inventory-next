'use client';

import { useState } from 'react';
import { Package2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';

export default function StockListPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: ColumnDef<any>[] = [
    {
      id: 'serial',
      header: 'SL',
      cell: ({ row, table }) => (
        <span className="text-gray-600">
          {table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
            row.index +
            1}
        </span>
      ),
    },
    {
      accessorKey: 'product',
      header: 'Product',
      cell: ({ row }) => <div className="font-medium">{row.original.product?.name || '-'}</div>,
    },
    {
      id: 'variation',
      header: 'Variation',
      cell: ({ row }) => (
        <div className="text-sm text-gray-600">
          {row.original.variation?.sku || row.original.variation?.name || '-'}
        </div>
      ),
    },
    {
      id: 'warehouse',
      header: 'Warehouse',
      cell: ({ row }) => <div className="text-sm">{row.original.warehouse?.name || '-'}</div>,
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
      cell: ({ row }) => <div>{Math.round(row.original.quantity) ?? 0}</div>,
    },
    {
      accessorKey: 'reserved_quantity',
      header: 'Reserved',
      cell: ({ row }) => <div>{Math.round(row.original.reserved_quantity) ?? 0}</div>,
    },
    {
      id: 'available',
      header: 'Available',
      cell: ({ row }) => (
        <div>{Math.round((row.original.quantity ?? 0) - (row.original.reserved_quantity ?? 0))}</div>
      ),
    },
  ];

  const buildApiEndpoint = () => {
    return 'stocks';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          {' '}
          <Package2 className="w-5 h-5 text-blue-600" /> Stocks
        </h1>
      </div>

      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by product, variation or warehouse..."
      />
    </div>
  );
}
