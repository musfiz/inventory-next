'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, RotateCcw, SlidersHorizontal, Layers, Minus, AlertTriangle, Clock } from 'lucide-react';
import DataTable from '@/components/ui/datatable';
import { formatDate } from '@/lib/utils/date';
import stockService, { StockMovementSummary } from '@/services/stockService';
import type { StockMovement } from '@/types/api.types';

const MOVEMENT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'sales', label: 'Sale' },
  { value: 'return', label: 'Return' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'transfer_in', label: 'Transfer In' },
  { value: 'transfer_out', label: 'Transfer Out' },
  { value: 'production', label: 'Production' },
  { value: 'consumption', label: 'Consumption' },
  { value: 'damage', label: 'Damage' },
  { value: 'expiry', label: 'Expiry' },
];

type MovementType = 'purchase' | 'sales' | 'return' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'production' | 'consumption' | 'damage' | 'expiry';

const TYPE_CONFIG: Record<MovementType, { icon: React.ReactNode; badge: string; activeBtn: string }> = {
  purchase: { icon: <ArrowDownToLine className="w-3 h-3" />, badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', activeBtn: 'bg-green-600 text-white' },
  sales: { icon: <ArrowUpFromLine className="w-3 h-3" />, badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', activeBtn: 'bg-red-600 text-white' },
  return: { icon: <RotateCcw className="w-3 h-3" />, badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', activeBtn: 'bg-orange-500 text-white' },
  adjustment: { icon: <SlidersHorizontal className="w-3 h-3" />, badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500', activeBtn: 'bg-yellow-500 text-white' },
  transfer_in: { icon: <ArrowDownToLine className="w-3 h-3" />, badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', activeBtn: 'bg-cyan-600 text-white' },
  transfer_out: { icon: <ArrowUpFromLine className="w-3 h-3" />, badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', activeBtn: 'bg-purple-600 text-white' },
  production: { icon: <Layers className="w-3 h-3" />, badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', activeBtn: 'bg-blue-600 text-white' },
  consumption: { icon: <Minus className="w-3 h-3" />, badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', activeBtn: 'bg-rose-600 text-white' },
  damage: { icon: <AlertTriangle className="w-3 h-3" />, badge: 'bg-red-200 text-red-800 dark:bg-red-950/50 dark:text-red-300', activeBtn: 'bg-red-800 text-white' },
  expiry: { icon: <Clock className="w-3 h-3" />, badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300', activeBtn: 'bg-gray-500 text-white' },
};

const INBOUND_TYPES = ['purchase', 'return', 'transfer_in', 'production'];
const OUTBOUND_TYPES = ['sales', 'transfer_out', 'consumption', 'damage', 'expiry'];

function MovementTypeBadge({ type }: { type: string }) {
  const config = TYPE_CONFIG[type as MovementType];
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize';

  if (config) {
    return (
      <span className={`${base} ${config.badge}`}>
        {config.icon}
        {type.replace(/_/g, ' ')}
      </span>
    );
  }

  return (
    <span className={`${base} bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300`}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}

export default function StockMovementsPage() {
  const [selectedType, setSelectedType] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [summary, setSummary] = useState<StockMovementSummary>({ total: 0, inbound: 0, outbound: 0, adjustment: 0 });

  useEffect(() => {
    stockService.getStockMovementsSummary()
      .then(setSummary)
      .catch(() => { });
  }, []);

  const columns: ColumnDef<StockMovement>[] = [
    {
      id: 'serial',
      header: 'SL',
      cell: ({ row, table }) => (
        <span className="text-xs text-gray-500">
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
        <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {formatDate(row.original.created_at, 'DD/MM/YYYY')}
        </span>
      ),
    },
    {
      id: 'product',
      header: 'Product',
      cell: ({ row }) => (
        <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{row.original.product?.name || '-'}</div>
      ),
    },
    {
      id: 'variation',
      header: 'SKU / Variation',
      cell: ({ row }) => (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {row.original.variation?.sku || row.original.variation?.name || '-'}
        </div>
      ),
    },
    {
      id: 'warehouse',
      header: 'Warehouse',
      cell: ({ row }) => (
        <div className="text-xs text-gray-700 dark:text-gray-300">{row.original.warehouse?.name || '-'}</div>
      ),
    },
    {
      accessorKey: 'movement_type',
      header: 'Type',
      cell: ({ row }) => <MovementTypeBadge type={row.original.movement_type} />,
    },
    {
      accessorKey: 'quantity_change',
      header: 'Quantity',
      cell: ({ row }) => {
        const qty = Number(row.original.quantity_change ?? 0);
        const isOut = OUTBOUND_TYPES.includes(row.original.movement_type);
        return (
          <div>
            <span
              className={`text-xs font-semibold ${isOut ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
            >
              {isOut ? '-' : '+'}{Math.abs(qty)}
            </span>
            <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {row.original.quantity_before ?? 0} → {row.original.quantity_after ?? 0}
            </div>
          </div>
        );
      },
    },
    {
      id: 'reference_type',
      header: 'Reference',
      cell: ({ row }) => (
        <div className="text-xs capitalize text-gray-500 dark:text-gray-400">
          {row.original.reference_type?.replace('_', ' ') || '-'}
        </div>
      ),
    },
    {
      id: 'reference_number',
      header: 'Ref. No',
      cell: ({ row }) => (
        <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
          {row.original.reference_number || '-'}
        </div>
      ),
    },
    {
      id: 'notes',
      header: 'Note',
      cell: ({ row }) => (
        <div className="text-xs text-gray-500 dark:text-gray-400 max-w-[180px] truncate">
          {row.original.notes || row.original.reason || '-'}
        </div>
      ),
    },
  ];

  const buildApiEndpoint = () => {
    const params = new URLSearchParams();
    if (selectedType) params.set('movement_type', selectedType);
    const qs = params.toString();
    return qs ? `stocks/movements?${qs}` : 'stocks/movements';
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
            value: summary.total,
          },
          {
            label: 'Inbound',
            icon: <ArrowDownToLine className="w-4 h-4 text-green-500" />,
            color: 'green',
            value: summary.inbound,
          },
          {
            label: 'Outbound',
            icon: <ArrowUpFromLine className="w-4 h-4 text-red-500" />,
            color: 'red',
            value: summary.outbound,
          },
          {
            label: 'Adjustments',
            icon: <ArrowLeftRight className="w-4 h-4 text-yellow-500" />,
            color: 'yellow',
            value: summary.adjustment,
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
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-1">Filter by type:</span>
        {MOVEMENT_TYPES.map(({ value, label }) => {
          const isActive = selectedType === value;
          const typeConfig = value ? TYPE_CONFIG[value as MovementType] : null;
          const activeCls = typeConfig ? typeConfig.activeBtn : 'bg-blue-600 text-white';
          return (
            <button
              key={value}
              onClick={() => {
                setSelectedType(value);
                setRefreshKey((k) => k + 1);
              }}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${isActive
                ? activeCls
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
            >
              {isActive && typeConfig ? typeConfig.icon : null}
              {label}
            </button>
          );
        })}
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
