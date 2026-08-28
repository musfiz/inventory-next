'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, RefreshCw, Eye, CheckCircle, XCircle, Ban, Loader2, Search, Filter, X, Mail, Phone, ShoppingBag, DollarSign, CalendarDays } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import type { EcommerceCustomer, EcommerceCustomerKPIs } from '@/types/ecommerce';
import { notify, confirm } from '@/lib/notifications';
import { formatDate } from '@/lib/utils/date';
import ecommerceCustomerService from '@/services/ecommerceCustomerService';

// ── Constants ─────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' },
  { value: 'blacklisted', label: 'Blacklisted', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
];

const defaultFilters = {
  status: '', date_from: '', date_to: '', search: '',
};

// ── Helpers ───────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  } catch { return ''; }
}

function formatCurrency(amount: number): string {
  return `৳${amount.toLocaleString('en-IN')}`;
}

// ── Customer Detail Panel Component ───────────────────────────────────

function CustomerDetailPanel({
  customer,
  onClose,
  onStatusUpdate,
}: {
  customer: EcommerceCustomer;
  onClose: () => void;
  onStatusUpdate: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    const label = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
    const result = await confirm({
      title: `${label} Customer`,
      html: `Are you sure you want to ${newStatus === 'active' ? 'activate' : newStatus === 'inactive' ? 'deactivate' : 'blacklist'} <strong>${customer.name}</strong>?`,
      confirmButtonText: newStatus === 'active' ? 'Activate' : newStatus === 'inactive' ? 'Deactivate' : 'Blacklist',
      icon: 'question',
    });
    if (!result.isConfirmed) return;
    setLoading(true);
    try {
      await ecommerceCustomerService.updateStatus(customer.id, newStatus);
      notify.success(`Customer ${newStatus === 'active' ? 'activated' : newStatus === 'inactive' ? 'deactivated' : 'blacklisted'} successfully`);
      onStatusUpdate();
    } catch { notify.error('Failed to update status'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
              {customer.name}
            </h2>
            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
              STATUS_OPTIONS.find(s => s.value === customer.status)?.color || ''
            }`}>
              {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Contact Info */}
          <div className="bg-gray-50 dark:bg-gray-900/30 rounded-md p-3 space-y-2">
            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contact Information</p>
            {customer.email && (
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <a href={`mailto:${customer.email}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">{customer.email}</a>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span>{customer.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
              <span>Registered {customer.created_at ? formatDate(customer.created_at) : 'N/A'}</span>
            </div>
            {customer.source && (
              <div className="flex items-center gap-2 text-sm">
                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                  customer.source === 'storefront'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {customer.source === 'storefront' ? 'Storefront Registration' : 'Inventory Entry'}
                </span>
              </div>
            )}
          </div>

          {/* Ecommerce Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-md p-2.5">
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <ShoppingBag className="w-3 h-3" /> Orders
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{customer.orders_count}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-md p-2.5">
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Total Spent
              </p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(customer.total_spent)}</p>
            </div>
          </div>

          {/* Last Order */}
          {customer.last_order_date && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-2.5">
              <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Last Order</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatDate(customer.last_order_date)}</p>
              <p className="text-xs text-gray-500">{formatRelativeTime(customer.last_order_date)} ago</p>
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex items-center gap-2 flex-wrap">
            {customer.status !== 'active' && (
              <button
                onClick={() => handleStatusChange('active')}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-sm cursor-pointer"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Activate
              </button>
            )}
            {customer.status !== 'inactive' && (
              <button
                onClick={() => handleStatusChange('inactive')}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 rounded-sm cursor-pointer"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Deactivate
              </button>
            )}
            {customer.status !== 'blacklisted' && (
              <button
                onClick={() => handleStatusChange('blacklisted')}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 rounded-sm cursor-pointer"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                Blacklist
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── KPI Stat Cards Component ──────────────────────────────────────────

function CustomerStatCards({ kpis, loading }: { kpis: EcommerceCustomerKPIs | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-2.5 animate-pulse">
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }
  if (!kpis) return null;

  const cards = [
    { label: 'Total Customers', value: kpis.total_customers, color: 'text-gray-900 dark:text-gray-100' },
    { label: 'Active', value: kpis.active_customers, color: 'text-green-600 dark:text-green-400' },
    { label: 'Inactive', value: kpis.inactive_customers, color: 'text-gray-600 dark:text-gray-400' },
    { label: 'Blacklisted', value: kpis.blacklisted_customers, color: 'text-red-600 dark:text-red-400' },
    { label: 'New this Month', value: kpis.new_this_month, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Total Orders', value: kpis.total_orders, color: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Total Revenue', value: formatCurrency(kpis.total_revenue), color: 'text-purple-600 dark:text-purple-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
      {cards.map((card, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-2.5">
          <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{card.label}</p>
          <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Filter Bar Component ──────────────────────────────────────────────

function CustomerFilters({
  filters,
  onChange,
  onReset,
}: {
  filters: typeof defaultFilters;
  onChange: (f: typeof defaultFilters) => void;
  onReset: () => void;
}) {
  const hasFilters = filters.status || filters.date_from || filters.date_to;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-gray-400" />
        <select
          value={filters.status}
          onChange={e => onChange({ ...filters, status: e.target.value })}
          className="text-xs border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input
          type="date"
          value={filters.date_from}
          onChange={e => onChange({ ...filters, date_from: e.target.value })}
          className="text-xs border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="From"
        />
        <input
          type="date"
          value={filters.date_to}
          onChange={e => onChange({ ...filters, date_to: e.target.value })}
          className="text-xs border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="To"
        />
        {hasFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm cursor-pointer"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────

export default function EcommerceCustomersPage() {
  const [filters, setFilters] = useState(defaultFilters);
  const [kpis, setKpis] = useState<EcommerceCustomerKPIs | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<EcommerceCustomer | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // ── Build filterParams for DataTable ─────────────────────────────────

  const filterParams = useMemo(() => {
    const p: Record<string, string | number | undefined | null> = {};
    if (filters.status) p.status = filters.status;
    if (filters.date_from) p.date_from = filters.date_from;
    if (filters.date_to) p.date_to = filters.date_to;
    if (filters.search) p.search = filters.search;
    return p;
  }, [filters]);

  // ── Load KPIs ────────────────────────────────────────────────────────

  const loadKPIs = useCallback(async () => {
    try {
      const data = await ecommerceCustomerService.getKPIs();
      setKpis(data);
    } catch { /* silently fail */ }
    finally { setKpiLoading(false); }
  }, []);

  useEffect(() => { loadKPIs(); }, [loadKPIs, refreshKey]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleView = useCallback(async (customer: EcommerceCustomer) => {
    try {
      const detail = await ecommerceCustomerService.getById(customer.id);
      setSelectedCustomer(detail || customer);
    } catch {
      setSelectedCustomer(customer);
    }
    setShowDetail(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setShowDetail(false);
    setSelectedCustomer(null);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    loadKPIs();
    notify.success('Customers refreshed');
  }, [loadKPIs]);

  const handleStatusUpdate = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    loadKPIs();
    setShowDetail(false);
    setSelectedCustomer(null);
  }, [loadKPIs]);

  // ── Table Columns ────────────────────────────────────────────────────

  const columns: ColumnDef<EcommerceCustomer>[] = useMemo(() => [
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
      accessorKey: 'name',
      header: 'Name',
      meta: { width: '16%' },
      cell: ({ row }) => (
        <button
          onClick={() => handleView(row.original)}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer text-left"
        >
          {row.original.name}
        </button>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      meta: { width: '16%' },
      cell: ({ row }) => (
        row.original.email
          ? <a href={`mailto:${row.original.email}`} className="text-xs text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 truncate block max-w-[180px]">{row.original.email}</a>
          : <span className="text-xs text-gray-400">—</span>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      meta: { width: '12%' },
      cell: ({ row }) => (
        row.original.phone
          ? <span className="text-xs text-gray-600 dark:text-gray-400">{row.original.phone}</span>
          : <span className="text-xs text-gray-400">—</span>
      ),
    },
    {
      accessorKey: 'orders_count',
      header: 'Orders',
      meta: { width: '5%' },
      cell: ({ row }) => (
        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{row.original.orders_count}</span>
      ),
    },
    {
      accessorKey: 'total_spent',
      header: 'Total Spent',
      meta: { width: '10%' },
      cell: ({ row }) => (
        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
          {formatCurrency(row.original.total_spent)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      meta: { width: '8%' },
      cell: ({ row }) => {
        const o = STATUS_OPTIONS.find(s => s.value === row.original.status);
        return <span className={`px-1.5 py-0.5 text-xs font-medium rounded whitespace-nowrap ${o?.color || ''}`}>{o?.label || row.original.status}</span>;
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Registered',
      meta: { width: '7%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400" title={row.original.created_at ? formatDate(row.original.created_at) : ''}>
          {row.original.created_at ? formatRelativeTime(row.original.created_at) : 'N/A'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      meta: { width: '4%' },
      cell: ({ row }) => (
        <button
          onClick={() => handleView(row.original)}
          className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded cursor-pointer"
          title="View details"
         aria-label="View details">
          <Eye className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ], [handleView]);

  return (
    <div className="space-y-2">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Customer List
        </h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-sm cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <CustomerStatCards kpis={kpis} loading={kpiLoading} />

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <CustomerFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(defaultFilters)}
      />

      {/* ── Customer Table ──────────────────────────────────────────── */}
      <DataTable
        key={refreshKey}
        columns={columns}
        fetchData={(params: any) => ecommerceCustomerService.list({
          ...params,
          search: params.search || filterParams.search || undefined,
          filterParams,
        })}
        pageSize={15}
        enableSearch={true}
        searchPlaceholder="Search by name, email, phone..."
        filterParams={filterParams}
      />

      {/* ── Customer Detail Panel ───────────────────────────────────── */}
      {showDetail && selectedCustomer && (
        <CustomerDetailPanel
          customer={selectedCustomer}
          onClose={handleCloseDetail}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}
