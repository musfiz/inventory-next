'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ClipboardList, RefreshCw, Eye, Download, Loader2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import type { EcommerceOrder, OrderKPIs } from '@/types/ecommerce';
import { notify } from '@/lib/notifications';
import { formatDate } from '@/lib/utils/date';
import ecommerceOrderService from '@/services/ecommerceOrderService';
import OrderStatCards from '@/components/ecommerce/orders/order-stat-cards';
import OrderFilters, { type OrderFiltersState } from '@/components/ecommerce/orders/order-filters';
import OrderBulkActions from '@/components/ecommerce/orders/order-bulk-actions';
import OrderDetailPanel from '@/components/ecommerce/orders/order-detail-panel';

const defaultFilters: OrderFiltersState = {
  status: '', payment_status: '', payment_method: '',
  date_preset: 'all', date_from: '', date_to: '', search: '',
};

const STATUS_OPTIONS = [
  { value: 'placed', label: 'Placed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
  { value: 'packed', label: 'Packed', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'shipped', label: 'Shipped', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  { value: 'returned', label: 'Returned', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
];

const PAYMENT_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  { value: 'refunded', label: 'Refunded', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
];

export default function OrdersPage() {
  const [filters, setFilters] = useState<OrderFiltersState>(defaultFilters);
  const [kpis, setKpis] = useState<OrderKPIs | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Build filterParams for DataTable ─────────────────────────────────

  const filterParams = useMemo(() => {
    const p: Record<string, string | number | undefined | null> = {};
    if (filters.status) p.status = filters.status;
    if (filters.payment_status) p.payment_status = filters.payment_status;
    if (filters.payment_method) p.payment_method = filters.payment_method;
    if (filters.date_from) p.date_from = filters.date_from;
    if (filters.date_to) p.date_to = filters.date_to;
    if (filters.search) p.search = filters.search;
    return p;
  }, [filters]);

  // ── Load KPIs ────────────────────────────────────────────────────────

  const loadKPIs = useCallback(async () => {
    try {
      const data = await ecommerceOrderService.getKPIs();
      setKpis(data);
    } catch {
      // KPIs silently fail
    } finally {
      setKpiLoading(false);
    }
  }, []);

  useEffect(() => { loadKPIs(); }, [loadKPIs]);

  // ── Auto-refresh ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!autoRefresh) {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
      return;
    }
    autoRefreshRef.current = setInterval(() => {
      setRefreshKey(prev => prev + 1);
      setLastUpdated(new Date());
      loadKPIs();
    }, 30000);
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefresh, loadKPIs]);

  // Pause auto-refresh when tab is hidden
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
      } else if (autoRefresh) {
        autoRefreshRef.current = setInterval(() => {
          setRefreshKey(prev => prev + 1);
          setLastUpdated(new Date());
          loadKPIs();
        }, 30000);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [autoRefresh, loadKPIs]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleView = useCallback((order: EcommerceOrder) => {
    setSelectedOrderId(order.id);
    setShowDetail(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowDetail(false);
    setSelectedOrderId(null);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    setLastUpdated(new Date());
    loadKPIs();
    notify.success('Orders refreshed');
  }, [loadKPIs]);

  const handleBulkComplete = useCallback(() => {
    setSelectedIds([]);
    setRefreshKey(prev => prev + 1);
    loadKPIs();
  }, [loadKPIs]);

  // ── Table columns ───────────────────────────────────────────────────

  const columns: ColumnDef<EcommerceOrder>[] = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => {
            const checked = e.target.checked;
            table.toggleAllPageRowsSelected(checked);
            if (checked) {
              const pageRows = table.getRowModel().rows.map(r => r.original.id);
              setSelectedIds(prev => [...new Set([...prev, ...pageRows])]);
            } else {
              const pageRows = table.getRowModel().rows.map(r => r.original.id);
              setSelectedIds(prev => prev.filter(id => !pageRows.includes(id)));
            }
          }}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
          checked={selectedIds.includes(row.original.id)}
          onChange={(e) => {
            if (e.target.checked) setSelectedIds(prev => [...prev, row.original.id]);
            else setSelectedIds(prev => prev.filter(id => id !== row.original.id));
          }}
        />
      ),
      meta: { width: '3%' },
    },
    {
      id: 'serial',
      header: '#',
      meta: { width: '3%' },
      cell: ({ row, table }) => {
        const p = table.getState().pagination;
        return <span className="text-xs text-gray-500 dark:text-gray-400">{(p?.pageIndex || 0) * (p?.pageSize || 15) + row.index + 1}</span>;
      },
    },
    {
      accessorKey: 'order_number',
      header: 'Order #',
      meta: { width: '11%' },
      cell: ({ row }) => (
        <button
          onClick={() => handleView(row.original)}
          className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer text-left"
        >
          {row.original.order_number}
        </button>
      ),
    },
    {
      accessorKey: 'customer_name',
      header: 'Customer',
      meta: { width: '14%' },
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-xs text-gray-900 dark:text-gray-100">{row.original.customer_name}</span>
          <span className="text-[10px] text-gray-500 truncate max-w-[150px]">{row.original.customer_email}</span>
        </div>
      ),
    },
    {
      id: 'items',
      header: 'Items',
      meta: { width: '4%' },
      cell: ({ row }) => <span className="text-xs text-gray-600 dark:text-gray-400">{row.original.items_count}</span>,
    },
    {
      accessorKey: 'total',
      header: 'Total',
      meta: { width: '8%' },
      cell: ({ row }) => (
        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
          ৳{row.original.total.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      meta: { width: '10%' },
      cell: ({ row }) => {
        const o = STATUS_OPTIONS.find(s => s.value === row.original.status);
        return <span className={`px-1.5 py-0.5 text-xs font-medium rounded whitespace-nowrap ${o?.color || ''}`}>{o?.label || row.original.status}</span>;
      },
    },
    {
      accessorKey: 'payment_status',
      header: 'Payment',
      meta: { width: '8%' },
      cell: ({ row }) => {
        const o = PAYMENT_OPTIONS.find(s => s.value === row.original.payment_status);
        return <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${o?.color || ''}`}>{o?.label || row.original.payment_status}</span>;
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      meta: { width: '8%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400" title={row.original.created_at ? formatDate(row.original.created_at) : ''}>
          {row.original.created_at ? formatRelativeTime(row.original.created_at) : 'N/A'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      meta: { width: '5%' },
      cell: ({ row }) => (
        <button
          onClick={() => handleView(row.original)}
          className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded cursor-pointer"
          title="View details"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ], [handleView, selectedIds]);

  return (
    <div className="space-y-2">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          All Orders
        </h1>
        <div className="flex items-center gap-1.5">
          <label className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
            />
            Auto-refresh
          </label>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-sm cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <div className="relative group">
            <button className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-sm cursor-pointer">
              <Download className="w-3 h-3" /> Export
            </button>
            <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-sm shadow-lg z-20 py-1 hidden group-hover:block">
              <button className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">Export CSV</button>
              <button className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">Export PDF</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <OrderStatCards kpis={kpis} loading={kpiLoading} />

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <OrderFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => { setFilters(defaultFilters); }}
      />

      {/* ── Bulk Actions ─────────────────────────────────────────────── */}
      <OrderBulkActions
        selectedIds={selectedIds}
        orders={[]}
        onClear={() => setSelectedIds([])}
        onComplete={handleBulkComplete}
      />

      {/* ── Order Table ──────────────────────────────────────────────── */}
      <DataTable
        key={refreshKey}
        columns={columns}
        fetchData={(params: any) => ecommerceOrderService.list({
          ...params,
          search: params.search || filterParams.search || undefined,
          filterParams,
        })}
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search order #, customer..."
        filterParams={filterParams}
      />

      {/* ── Auto-refresh indicator ───────────────────────────────────── */}
      {autoRefresh && lastUpdated && (
        <div className="text-[10px] text-gray-400 dark:text-gray-500 text-right flex items-center justify-end gap-1">
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          Auto-refreshing... Last updated: {formatRelativeTime(lastUpdated.toISOString())} ago
        </div>
      )}

      {/* ── Order Detail Panel ───────────────────────────────────────── */}
      {showDetail && selectedOrderId && (
        <OrderDetailPanel
          orderId={selectedOrderId}
          onClose={handleCloseDetail}
          onStatusUpdate={() => {
            setRefreshKey(prev => prev + 1);
            loadKPIs();
          }}
        />
      )}
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  } catch {
    return '';
  }
}
