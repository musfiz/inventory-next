'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import DataTable from '@/components/ui/datatable';
import { formatDate } from '@/lib/utils/date';

const MOVEMENT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'sale', label: 'Sale' },
  { value: 'return', label: 'Return' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'transfer_in', label: 'Transfer In' },
  { value: 'transfer_out', label: 'Transfer Out' },
  { value: 'production', label: 'Production' },
  { value: 'consumption', label: 'Consumption' },
  { value: 'damage', label: 'Damage' },
  { value: 'expiry', label: 'Expiry' },
];

const INBOUND_TYPES = ['purchase', 'return', 'transfer_in', 'production'];
const OUTBOUND_TYPES = ['sale', 'transfer_out', 'consumption', 'damage', 'expiry'];

function MovementTypeBadge({ type }: { type: string }) {
  const isInbound = INBOUND_TYPES.includes(type);
  const isOutbound = OUTBOUND_TYPES.includes(type);

  const base =
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize';

  if (isInbound)
    return (
      <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`}>
        <ArrowDownToLine className="w-3 h-3" />
        {type.replace('_', ' ')}
      </span>
    );
  if (isOutbound)
    return (
      <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`}>
        <ArrowUpFromLine className="w-3 h-3" />
        {type.replace('_', ' ')}
      </span>
    );

  return (
    <span className={`${base} bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300`}>
      {type.replace('_', ' ')}
    </span>
  );
}

export default function StockMovementsPage() {
  const [selectedType, setSelectedType] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const columns: ColumnDef<any>[] = [
    {
      id: 'serial',
      header: 'SL',
      cell: ({ row, table }) => (
        <span className="text-gray-500 text-sm">
          {table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
            row.index +
            1}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {formatDate(row.original.created_at, 'DD/MM/YYYY')}
        </span>
      ),
    },
    {
      id: 'product',
      header: 'Product',
      cell: ({ row }) => (
        <div className="font-medium text-sm">{row.original.product?.name || '-'}</div>
      ),
    },
    {
      id: 'variation',
      header: 'SKU / Variation',
      cell: ({ row }) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {row.original.variation?.sku || row.original.variation?.name || '-'}
        </div>
      ),
    },
    {
      id: 'warehouse',
      header: 'Warehouse',
      cell: ({ row }) => (
        <div className="text-sm">{row.original.warehouse?.name || '-'}</div>
      ),
    },
    {
      accessorKey: 'movement_type',
      header: 'Type',
      cell: ({ row }) => <MovementTypeBadge type={row.original.movement_type} />,
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
      cell: ({ row }) => {
        const qty = row.original.quantity ?? 0;
        const isOut = OUTBOUND_TYPES.includes(row.original.movement_type);
        return (
          <span
            className={`font-semibold ${isOut ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
          >
            {isOut ? '-' : '+'}
            {Math.abs(qty)}
          </span>
        );
      },
    },
    {
      id: 'reference_type',
      header: 'Reference',
      cell: ({ row }) => (
        <div className="text-sm capitalize text-gray-500 dark:text-gray-400">
          {row.original.reference_type?.replace('_', ' ') || '-'}
        </div>
      ),
    },
    {
      id: 'reference_id',
      header: 'Ref. No',
      cell: ({ row }) => (
        <div className="text-sm font-mono text-gray-600 dark:text-gray-400">
          {row.original.reference_id ? `#${row.original.reference_id}` : '-'}
        </div>
      ),
    },
    {
      accessorKey: 'note',
      header: 'Note',
      cell: ({ row }) => (
        <div className="text-sm text-gray-500 dark:text-gray-400 max-w-[180px] truncate">
          {row.original.note || '-'}
        </div>
      ),
    },
  ];

  const buildApiEndpoint = () => {
    const params = new URLSearchParams();
    if (selectedType) params.set('movement_type', selectedType);
    const qs = params.toString();
    return qs ? `stock-movements?${qs}` : 'stock-movements';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-blue-600" />
          Stock Movements
        </h1>
        <Link
          href="/stock"
          className="inline-flex items-center px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          &larr; Back to Stocks
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Movements',
            icon: <ArrowLeftRight className="w-4 h-4 text-blue-500" />,
            color: 'blue',
          },
          {
            label: 'Inbound',
            icon: <ArrowDownToLine className="w-4 h-4 text-green-500" />,
            color: 'green',
          },
          {
            label: 'Outbound',
            icon: <ArrowUpFromLine className="w-4 h-4 text-red-500" />,
            color: 'red',
          },
          {
            label: 'Adjustments',
            icon: <ArrowLeftRight className="w-4 h-4 text-yellow-500" />,
            color: 'yellow',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 flex items-center gap-3"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center bg-${card.color}-50 dark:bg-${card.color}-900/20`}
            >
              {card.icon}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">—</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-1">Filter by type:</span>
        {MOVEMENT_TYPES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => {
              setSelectedType(value);
              setRefreshKey((k) => k + 1);
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedType === value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable
        key={refreshKey}
        columns={columns}
        apiEndpoint={buildApiEndpoint()}
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by product, warehouse or reference..."
      />
    </div>
  );
}
