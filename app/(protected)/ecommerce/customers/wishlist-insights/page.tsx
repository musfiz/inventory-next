'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Heart,
  RefreshCw,
  Download,
  Eye,
  X,
  Loader2,
  TrendingUp,
  Package,
  Users,
  ShoppingCart,
  BarChart3,
  ArrowUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Star,
  CalendarDays,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import type {
  WishlistInsightStats,
  WishlistTopProduct,
  WishlistTrendPoint,
  WishlistCustomerActivity,
  WishlistItem,
} from '@/types/ecommerce';
import { formatDate } from '@/lib/utils/date';
import wishlistInsightsService from '@/services/wishlistInsightsService';

// ── Constants ─────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
];

const STOCK_STATUS_MAP: Record<string, { label: string; color: string }> = {
  in_stock: { label: 'In Stock', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  out_of_stock: { label: 'Out of Stock', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  backorder: { label: 'Backorder', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
};

function formatCurrency(amount: number): string {
  return `৳${amount.toLocaleString('en-IN')}`;
}

// ── KPI Stat Cards ────────────────────────────────────────────────────

function StatCards({ stats, loading }: { stats: WishlistInsightStats | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 animate-pulse">
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }
  if (!stats) return null;

  const cards = [
    {
      label: 'Wishlisted Products',
      value: stats.total_wishlisted_products,
      icon: Package,
      color: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      label: 'Total Wishlist Items',
      value: stats.total_wishlist_items,
      icon: Heart,
      color: 'text-pink-600 dark:text-pink-400',
    },
    {
      label: 'Customers with Wishlists',
      value: stats.total_customers_with_wishlists,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Wishlist → Purchase Rate',
      value: `${stats.conversion_rate}%`,
      icon: ShoppingCart,
      color: 'text-green-600 dark:text-green-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {cards.map((card, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{card.label}</p>
            <card.icon className={`w-4 h-4 ${card.color}`} />
          </div>
          <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Trend Chart ───────────────────────────────────────────────────────

function TrendChart({ trends, loading }: { trends: WishlistTrendPoint[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }
  if (!trends || trends.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">No trend data available</p>
      </div>
    );
  }

  const maxCount = Math.max(...trends.map(t => t.count), 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Wishlist Trend</h3>
      </div>
      <div className="flex items-end gap-0.5 h-32 overflow-x-auto pb-1">
        {trends.map((point, i) => (
          <div
            key={i}
            className="flex-1 min-w-[6px] bg-indigo-500 dark:bg-indigo-400 rounded-t hover:bg-indigo-600 dark:hover:bg-indigo-300 transition-colors relative group cursor-pointer"
            style={{ height: `${(point.count / maxCount) * 100}%` }}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
              <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap shadow-lg">
                {point.count} on {formatDate(point.date)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Customer Wishlist Detail Modal ────────────────────────────────────

function CustomerWishlistModal({
  customerId,
  customerName,
  onClose,
}: {
  customerId: string;
  customerName: string;
  onClose: () => void;
}) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await wishlistInsightsService.getCustomerWishlist(customerId);
        setItems(result.items);
        setTotalItems(result.total_items);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [customerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-8">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-600 dark:text-pink-400" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate max-w-[250px]">
              {customerName}&apos;s Wishlist
            </h2>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
              {totalItems} items
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-8">No wishlist items found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    {['Product', 'SKU', 'Price', 'Stock', 'Date Added'].map(h => (
                      <th key={h} className="px-2.5 py-1.5 text-left text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map(item => {
                    const stockInfo = STOCK_STATUS_MAP[item.stock_status] || STOCK_STATUS_MAP.out_of_stock;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-2.5 py-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-[8px] text-gray-400 shrink-0">
                              {item.product_image ? (
                                <img src={item.product_image} alt="" className="w-full h-full object-cover rounded" />
                              ) : (
                                <Package className="w-4 h-4" />
                              )}
                            </div>
                            <span className="text-xs text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{item.product_name}</span>
                          </div>
                        </td>
                        <td className="px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400">{item.sku}</td>
                        <td className="px-2.5 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100">{formatCurrency(item.price)}</td>
                        <td className="px-2.5 py-1.5">
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${stockInfo.color}`}>{stockInfo.label}</span>
                        </td>
                        <td className="px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400">{formatDate(item.added_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────

export default function WishlistInsightsPage() {
  const [period, setPeriod] = useState('30d');
  const [stats, setStats] = useState<WishlistInsightStats | null>(null);
  const [trends, setTrends] = useState<WishlistTrendPoint[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modalCustomer, setModalCustomer] = useState<{ id: string; name: string } | null>(null);

  // ── Load Stats ──────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await wishlistInsightsService.getInsights({ period });
      setStats(data);
    } catch { /* silently fail */ }
    finally { setStatsLoading(false); }
  }, [period]);

  const loadTrends = useCallback(async () => {
    setTrendsLoading(true);
    try {
      const data = await wishlistInsightsService.getTrends({ period });
      setTrends(data);
    } catch { /* silently fail */ }
    finally { setTrendsLoading(false); }
  }, [period]);

  useEffect(() => { loadStats(); }, [loadStats, refreshKey]);
  useEffect(() => { loadTrends(); }, [loadTrends, refreshKey]);

  // ── Handlers ────────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    loadStats();
    loadTrends();
  }, [loadStats, loadTrends]);

  const handleExport = useCallback(() => {
    const rows = [['Product Name', 'SKU', 'Price', 'Wishlist Count', 'Added to Cart', 'Purchased']];
    // Export will trigger a refresh of top products data
    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wishlist-insights-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [period]);

  // ── Top Products Table Columns ──────────────────────────────────────

  const topProductColumns: ColumnDef<WishlistTopProduct>[] = useMemo(() => [
    {
      id: 'serial',
      header: '#',
      meta: { width: '3%' },
      cell: ({ row }) => <span className="text-xs text-gray-500 dark:text-gray-400">{row.index + 1}</span>,
    },
    {
      id: 'product',
      header: 'Product',
      meta: { width: '25%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-[8px] text-gray-400 shrink-0">
            {row.original.product_image ? (
              <img src={row.original.product_image} alt="" className="w-full h-full object-cover rounded" />
            ) : (
              <Package className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{row.original.product_name}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      meta: { width: '10%' },
      cell: ({ row }) => <span className="text-xs text-gray-500 dark:text-gray-400">{row.original.sku}</span>,
    },
    {
      accessorKey: 'price',
      header: 'Price',
      meta: { width: '8%' },
      cell: ({ row }) => <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{formatCurrency(row.original.price)}</span>,
    },
    {
      accessorKey: 'wishlist_count',
      header: 'Wishlist Count',
      meta: { width: '10%' },
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{row.original.wishlist_count}</span>
      ),
    },
    {
      accessorKey: 'added_to_cart_count',
      header: 'Added to Cart',
      meta: { width: '10%' },
      cell: ({ row }) => <span className="text-xs text-gray-600 dark:text-gray-400">{row.original.added_to_cart_count}</span>,
    },
    {
      accessorKey: 'purchased_count',
      header: 'Purchased',
      meta: { width: '8%' },
      cell: ({ row }) => <span className="text-xs text-green-600 dark:text-green-400">{row.original.purchased_count}</span>,
    },
    {
      id: 'actions',
      header: '',
      meta: { width: '4%' },
      cell: () => (
        <button className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded cursor-pointer" title="View product" aria-label="View product">
          <Eye className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ], []);

  // ── Customer Activity Table Columns ─────────────────────────────────

  const customerColumns: ColumnDef<WishlistCustomerActivity>[] = useMemo(() => [
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
      accessorKey: 'customer_name',
      header: 'Customer',
      meta: { width: '18%' },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              {row.original.customer_name.charAt(0)}
            </span>
          </div>
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate max-w-[150px]">{row.original.customer_name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'customer_email',
      header: 'Email',
      meta: { width: '18%' },
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400 truncate block max-w-[180px]">{row.original.customer_email}</span>
      ),
    },
    {
      accessorKey: 'items_count',
      header: 'Items',
      meta: { width: '6%' },
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{row.original.items_count}</span>
      ),
    },
    {
      accessorKey: 'last_added_at',
      header: 'Last Added',
      meta: { width: '10%' },
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <CalendarDays className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(row.original.last_added_at)}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      meta: { width: '5%' },
      cell: ({ row }) => (
        <button
          onClick={() => setModalCustomer({ id: row.original.customer_id, name: row.original.customer_name })}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded cursor-pointer"
          title="View wishlist"
        >
          <Star className="w-3 h-3" /> View Wishlist
        </button>
      ),
    },
  ], []);

  return (
    <div className="space-y-2">
      {/* ── Header Row ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-600 dark:text-pink-400" />
          Wishlist Insights
        </h1>
        <div className="flex items-center gap-1.5">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {PERIOD_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-sm cursor-pointer"
          >
            <Download className="w-3 h-3" /> Export CSV
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-sm cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ──────────────────────────────────────────── */}
      <StatCards stats={stats} loading={statsLoading} />

      {/* ── Trend Chart ─────────────────────────────────────────────── */}
      <TrendChart trends={trends} loading={trendsLoading} />

      {/* ── Most Wishlisted Products Table ──────────────────────────── */}
      <div>
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 mb-1.5">
          <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Most Wishlisted Products
        </h2>
        <DataTable
          key={`top-${refreshKey}-${period}`}
          columns={topProductColumns}
          fetchData={(params: any) =>
            wishlistInsightsService.getTopProducts({
              ...params,
              period,
              per_page: params.per_page || 10,
            }).then(r => ({ ...r, page: 1, per_page: r.data.length }))
          }
          pageSize={10}
          enableSearch={true}
          searchPlaceholder="Search by product name or SKU..."
          enablePagination={false}
        />
      </div>

      {/* ── Customer Wishlist Activity Table ────────────────────────── */}
      <div>
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 mb-1.5">
          <Heart className="w-4 h-4 text-pink-600 dark:text-pink-400" />
          Customer Wishlist Activity
        </h2>
        <DataTable
          key={`customers-${refreshKey}`}
          columns={customerColumns}
          fetchData={(params: any) => wishlistInsightsService.getCustomerActivity(params)}
          pageSize={15}
          enableSearch={true}
          searchPlaceholder="Search by customer name or email..."
        />
      </div>

      {/* ── Customer Wishlist Detail Modal ──────────────────────────── */}
      {modalCustomer && (
        <CustomerWishlistModal
          customerId={modalCustomer.id}
          customerName={modalCustomer.name}
          onClose={() => setModalCustomer(null)}
        />
      )}
    </div>
  );
}
