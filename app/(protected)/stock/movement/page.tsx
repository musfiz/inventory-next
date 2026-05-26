'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, RotateCcw, SlidersHorizontal, Layers, Minus, AlertTriangle, Clock, Eye, X } from 'lucide-react';
import DataTable from '@/components/ui/datatable';
import { formatDate } from '@/lib/utils/date';
import stockService, { StockMovementSummary } from '@/services/stockService';
import type { StockMovement } from '@/types/api.types';
import apiClient from '@/lib/api/axios';

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
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);
  const [refItemData, setRefItemData] = useState<{
    label: string;
    unitPrice: number | null;
    quantity: number | null;
    discountAmount: number | null;
    subtotal: number | null;
  } | null>(null);

  useEffect(() => {
    setRefItemData(null);
    if (!selectedMovement?.reference_id) return;

    const { reference_type, reference_id, product_id, variation_id } = selectedMovement;

    let endpoint: string | null = null;
    let label = '';
    if (reference_type === 'sales_order') {
      endpoint = `/api/v1/sales-order/${reference_id}/items`;
      label = 'Invoice (Sales Order)';
    } else if (reference_type === 'purchase_order') {
      endpoint = `/api/v1/purchase-order/${reference_id}/items`;
      label = 'Invoice (Purchase Order)';
    }
    if (!endpoint) return;

    apiClient.get(endpoint)
      .then(res => {
        const items: any[] = res.data?.data ?? [];
        const match = items.find(it =>
          String(it.product_id) === String(product_id) &&
          (!variation_id || String(it.variation_id) === String(variation_id))
        );
        if (match) {
          const unitPrice = match.unit_price != null ? Number(match.unit_price) : (match.unit_cost != null ? Number(match.unit_cost) : null);
          const qty = match.quantity != null ? Number(match.quantity) : (match.quantity_ordered != null ? Number(match.quantity_ordered) : null);
          const discount = match.discount_amount != null ? Number(match.discount_amount) : null;
          const subtotal = match.subtotal != null ? Number(match.subtotal) : (unitPrice != null && qty != null ? unitPrice * qty - (discount ?? 0) : null);
          setRefItemData({ label, unitPrice, quantity: qty, discountAmount: discount, subtotal });
        }
      })
      .catch(() => { });
  }, [selectedMovement]);

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
      header: 'Variation',
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
      id: 'actions',
      header: 'Action',
      cell: ({ row }) => (
        <button
          onClick={() => setSelectedMovement(row.original)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
        >
          <Eye className="w-3 h-3" />
          Details
        </button>
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

      {/* Details Dialog */}
      {selectedMovement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">

            {/* Gradient header */}
            <div className={`px-6 py-4 text-white rounded-t-2xl flex items-start justify-between ${INBOUND_TYPES.includes(selectedMovement.movement_type)
              ? 'bg-gradient-to-r from-green-600 to-emerald-600'
              : OUTBOUND_TYPES.includes(selectedMovement.movement_type)
                ? 'bg-gradient-to-r from-red-600 to-rose-600'
                : 'bg-gradient-to-r from-yellow-500 to-amber-500'
              }`}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-0.5">Stock Movement</p>
                <h2 className="text-xl font-bold leading-tight">{selectedMovement.product?.name || '—'}</h2>
                <p className="text-sm opacity-80">{selectedMovement.warehouse?.name || '—'}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => setSelectedMovement(null)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <MovementTypeBadge type={selectedMovement.movement_type} />
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* Quantity flow */}
              <div className="flex items-center justify-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Before</p>
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{selectedMovement.quantity_before ?? 0}</p>
                </div>
                <div className="flex flex-col items-center">
                  <ArrowLeftRight className="w-5 h-5 text-gray-400" />
                  <span className={`mt-1 text-lg font-bold ${OUTBOUND_TYPES.includes(selectedMovement.movement_type) ? 'text-red-500' : 'text-green-500'
                    }`}>
                    {OUTBOUND_TYPES.includes(selectedMovement.movement_type) ? '-' : '+'}
                    {Math.abs(Number(selectedMovement.quantity_change ?? 0))}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">After</p>
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{selectedMovement.quantity_after ?? 0}</p>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">

                {/* Product & Variation */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3">
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">Product</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{selectedMovement.product?.name || '—'}</p>
                  {selectedMovement.variation && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Variation: <span className="font-mono font-medium font-semibold text-gray-700 dark:text-gray-300">{selectedMovement.variation.sku || selectedMovement.variation.name || '—'}</span>
                    </p>
                  )}
                </div>

                {/* Warehouse & Date */}
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-3">
                  <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2">Location & Date</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{selectedMovement.warehouse?.name || '—'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDate(selectedMovement.created_at, 'DD/MM/YYYY HH:mm')}</p>
                </div>

                {/* Reference */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl p-3">
                  <p className="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-2">Reference</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Type</span>
                      <span className="font-medium capitalize text-gray-800 dark:text-gray-200">
                        {selectedMovement.reference_type?.replace(/_/g, ' ') || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Ref. No</span>
                      <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
                        {selectedMovement.reference_number || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cost — always shows COGS from stock_movements */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">Cost (COGS)</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Unit Cost</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {selectedMovement.unit_cost != null ? Number(selectedMovement.unit_cost).toFixed(2) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-amber-200 dark:border-amber-800 pt-1 mt-1">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Total COGS</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        {selectedMovement.total_cost != null ? Number(selectedMovement.total_cost).toFixed(2) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Pricing — only shown when reference SO/PO data is available */}
              {refItemData && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-3">
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-2">{refItemData.label}</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        {selectedMovement.reference_type === 'sales_order' ? 'Selling Price' : 'Purchase Price'}
                      </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {refItemData.unitPrice != null ? refItemData.unitPrice.toFixed(2) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Quantity</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {refItemData.quantity ?? '—'}
                      </span>
                    </div>
                    {refItemData.discountAmount != null && refItemData.discountAmount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Discount</span>
                        <span className="font-medium text-red-500 dark:text-red-400">
                          -{refItemData.discountAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Line Total</span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-300">
                        {refItemData.subtotal != null ? refItemData.subtotal.toFixed(2) : '—'}
                      </span>
                    </div>
                  </div>
                  {/* Margin — only meaningful for sales orders */}
                  {selectedMovement.reference_type === 'sales_order' &&
                    refItemData.subtotal != null &&
                    selectedMovement.total_cost != null && (() => {
                      const revenue = refItemData.subtotal;
                      const cogs = Number(selectedMovement.total_cost);
                      const margin = revenue - cogs;
                      const marginPct = revenue !== 0 ? (margin / revenue) * 100 : 0;
                      const isPositive = margin >= 0;
                      return (
                        <div className={`mt-2 pt-2 border-t ${isPositive ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Gross Margin</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {isPositive ? '+' : ''}{margin.toFixed(2)}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isPositive ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                                {isPositive ? '+' : ''}{marginPct.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  }
                </div>
              )}

              {/* Notes & Reason */}
              {(selectedMovement.notes || selectedMovement.reason) && (
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes / Reason</p>
                  {selectedMovement.reason && (
                    <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">
                      <span className="font-medium">Reason:</span> {selectedMovement.reason}
                    </p>
                  )}
                  {selectedMovement.notes && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">{selectedMovement.notes}</p>
                  )}
                </div>
              )}

              {/* Created by */}
              {selectedMovement.creator && (
                <div className="flex justify-end">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Recorded by <span className="font-medium text-gray-600 dark:text-gray-300">{selectedMovement.creator.name}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setSelectedMovement(null)}
                className="px-4 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
