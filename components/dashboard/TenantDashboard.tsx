'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Receipt, Package, Banknote,
  AlertTriangle, XCircle, Calendar, DollarSign,
  Truck, ClipboardList, RotateCcw, FileText,
  TrendingUp, TrendingDown, ArrowUpRight
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import KpiCard from './KpiCard';
import ChartCard from './ChartCard';
import dashboardService, {
  TenantSummary, SalesTrendItem, TopProduct,
  PaymentMethod, StockMovementDay, PurchaseVsSalesItem,
  CategoryInventory, WarehouseStockItem, CustomerType,
  PosSessionToday, LowStockItem
} from '@/services/dashboardService';
import { useAuthStore } from '@/stores/auth-store';

const PERIOD_OPTIONS = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '3M', value: '3m' },
  { label: '12M', value: '12m' },
];

const PAYMENT_COLORS: Record<string, string> = {
  cash: '#10B981',
  card: '#3B82F6',
  bkash: '#E91E63',
  nagad: '#FF6B35',
  rocket: '#7E57C2',
  bank_transfer: '#546E7A',
  credit: '#78909C',
};

const CATEGORY_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#14B8A6'];

export default function TenantDashboard() {
  const user = useAuthStore(state => state.user);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TenantSummary | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovementDay[]>([]);
  const [purchaseVsSales, setPurchaseVsSales] = useState<PurchaseVsSalesItem[]>([]);
  const [inventoryByCategory, setInventoryByCategory] = useState<CategoryInventory[]>([]);
  const [warehouseStock, setWarehouseStock] = useState<WarehouseStockItem[]>([]);
  const [customerDist, setCustomerDist] = useState<CustomerType[]>([]);
  const [posSessions, setPosSessions] = useState<PosSessionToday[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);

  const [salesPeriod, setSalesPeriod] = useState('30d');
  const [productPeriod, setProductPeriod] = useState('30d');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, trend, prods, payments, movements, pvs, invCat, wStock, cDist, sessions, lowItems] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getSalesTrend(salesPeriod),
        dashboardService.getTopProducts(productPeriod),
        dashboardService.getPaymentMethods(),
        dashboardService.getStockMovements(),
        dashboardService.getPurchaseVsSales(),
        dashboardService.getInventoryByCategory(),
        dashboardService.getWarehouseStock(),
        dashboardService.getCustomerDistribution(),
        dashboardService.getPosSessionsToday(),
        dashboardService.getLowStockItems(),
      ]);
      setSummary(sum);
      setSalesTrend(trend);
      setTopProducts(prods);
      setPaymentMethods(payments);
      setStockMovements(movements);
      setPurchaseVsSales(pvs);
      setInventoryByCategory(invCat);
      setWarehouseStock(wStock);
      setCustomerDist(cDist);
      setPosSessions(sessions);
      setLowStock(lowItems);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, [salesPeriod, productPeriod]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reload just sales trend when period changes
  useEffect(() => {
    if (!loading) {
      dashboardService.getSalesTrend(salesPeriod).then(setSalesTrend).catch(console.error);
    }
  }, [salesPeriod]);

  useEffect(() => {
    if (!loading) {
      dashboardService.getTopProducts(productPeriod).then(setTopProducts).catch(console.error);
    }
  }, [productPeriod]);

  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) return `৳${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `৳${(val / 1_000).toFixed(1)}K`;
    return `৳${val.toFixed(0)}`;
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {getGreeting()}, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      {/* KPI Row 1 — Today's Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Today's Sales"
          value={formatCurrency(summary?.today_sales ?? 0)}
          subValue={`POS: ${summary?.today_pos_count ?? 0} | SO: ${summary?.today_so_count ?? 0}`}
          subValueType="neutral"
          icon={ShoppingCart}
          iconColor="text-green-600 dark:text-green-400"
          bgColor="bg-green-50 dark:bg-green-900/30"
          loading={loading}
        />
        <KpiCard
          title="POS Transactions"
          value={summary?.today_pos_count ?? 0}
          subValue="Today"
          subValueType="neutral"
          icon={Receipt}
          iconColor="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-50 dark:bg-blue-900/30"
          loading={loading}
        />
        <KpiCard
          title="Sales Orders"
          value={summary?.today_so_count ?? 0}
          subValue="Today"
          subValueType="neutral"
          icon={Package}
          iconColor="text-indigo-600 dark:text-indigo-400"
          bgColor="bg-indigo-50 dark:bg-indigo-900/30"
          loading={loading}
        />
        <KpiCard
          title="Cash in Registers"
          value={formatCurrency(summary?.cash_in_registers ?? 0)}
          subValue="Open sessions"
          subValueType="neutral"
          icon={Banknote}
          iconColor="text-emerald-600 dark:text-emerald-400"
          bgColor="bg-emerald-50 dark:bg-emerald-900/30"
          loading={loading}
        />
      </div>

      {/* KPI Row 2 — Inventory Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Low Stock Items"
          value={summary?.low_stock_count ?? 0}
          subValue="Below reorder point"
          subValueType="warning"
          icon={AlertTriangle}
          iconColor="text-orange-600 dark:text-orange-400"
          bgColor="bg-orange-50 dark:bg-orange-900/30"
          loading={loading}
          badge={summary && summary.low_stock_count > 0 ? { text: '⚠', color: 'orange' } : undefined}
        />
        <KpiCard
          title="Out of Stock"
          value={summary?.out_of_stock_count ?? 0}
          subValue="Need immediate restock"
          subValueType="negative"
          icon={XCircle}
          iconColor="text-red-600 dark:text-red-400"
          bgColor="bg-red-50 dark:bg-red-900/30"
          loading={loading}
          badge={summary && summary.out_of_stock_count > 0 ? { text: '!', color: 'red' } : undefined}
        />
        <KpiCard
          title="Expiring Batches"
          value={summary?.expiring_batches ?? 0}
          subValue="Within 30 days"
          subValueType="warning"
          icon={Calendar}
          iconColor="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-50 dark:bg-amber-900/30"
          loading={loading}
        />
        <KpiCard
          title="Inventory Value"
          value={formatCurrency(summary?.inventory_value ?? 0)}
          subValue="Total cost value"
          subValueType="neutral"
          icon={DollarSign}
          iconColor="text-purple-600 dark:text-purple-400"
          bgColor="bg-purple-50 dark:bg-purple-900/30"
          loading={loading}
        />
      </div>

      {/* KPI Row 3 — Orders Pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Pending Purchase Orders"
          value={summary?.pending_po ?? 0}
          icon={Truck}
          iconColor="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-50 dark:bg-blue-900/30"
          loading={loading}
        />
        <KpiCard
          title="Pending Sales Orders"
          value={summary?.pending_so ?? 0}
          icon={ClipboardList}
          iconColor="text-indigo-600 dark:text-indigo-400"
          bgColor="bg-indigo-50 dark:bg-indigo-900/30"
          loading={loading}
        />
        <KpiCard
          title="Pending Refunds"
          value={summary?.pending_refunds ?? 0}
          icon={RotateCcw}
          iconColor="text-orange-600 dark:text-orange-400"
          bgColor="bg-orange-50 dark:bg-orange-900/30"
          loading={loading}
        />
        <KpiCard
          title="Unpaid Invoices"
          value={summary?.unpaid_invoices ?? 0}
          icon={FileText}
          iconColor="text-red-600 dark:text-red-400"
          bgColor="bg-red-50 dark:bg-red-900/30"
          loading={loading}
        />
      </div>

      {/* Monthly Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard
          title="Monthly Revenue"
          value={formatCurrency(summary?.monthly_revenue ?? 0)}
          subValue="This month"
          subValueType="positive"
          icon={TrendingUp}
          iconColor="text-green-600 dark:text-green-400"
          bgColor="bg-green-50 dark:bg-green-900/30"
          loading={loading}
        />
        <KpiCard
          title="Monthly Purchases"
          value={formatCurrency(summary?.monthly_purchases ?? 0)}
          subValue="This month"
          subValueType="neutral"
          icon={TrendingDown}
          iconColor="text-rose-600 dark:text-rose-400"
          bgColor="bg-rose-50 dark:bg-rose-900/30"
          loading={loading}
        />
      </div>

      {/* Sales Trend Chart */}
      <ChartCard
        title="Sales Trend"
        subtitle="Revenue over time"
        periodOptions={PERIOD_OPTIONS}
        selectedPeriod={salesPeriod}
        onPeriodChange={setSalesPeriod}
        loading={loading}
        height="h-72"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={salesTrend}>
            <defs>
              <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="soGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={v => formatCurrency(v)} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} formatter={(v: any) => formatCurrency(Number(v))} />
            <Area type="monotone" dataKey="pos_total" stroke="#3B82F6" fill="url(#posGrad)" strokeWidth={2} name="POS Sales" />
            <Area type="monotone" dataKey="so_total" stroke="#6366F1" fill="url(#soGrad)" strokeWidth={2} name="Sales Orders" />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <ChartCard
          title="Top Selling Products"
          subtitle="By units sold"
          periodOptions={PERIOD_OPTIONS}
          selectedPeriod={productPeriod}
          onPeriodChange={setProductPeriod}
          loading={loading}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis
                dataKey="product_name"
                type="category"
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                width={120}
                tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + '...' : v}
              />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} />
              <Bar dataKey="units_sold" name="Units Sold" radius={[0, 4, 4, 0]}>
                {topProducts.map((_, idx) => (
                  <Cell key={idx} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Payment Methods */}
        <ChartCard title="Payment Method Split" subtitle="Last 30 days" loading={loading}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={paymentMethods}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                dataKey="total_amount"
                nameKey="payment_method"
                label={({ payload, percent }: any) => `${payload?.payment_method} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {paymentMethods.map((entry, idx) => (
                  <Cell key={idx} fill={PAYMENT_COLORS[entry.payment_method] || CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} formatter={(v: any) => formatCurrency(Number(v))} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Stock Movement Activity */}
      <ChartCard title="Stock Movement Activity" subtitle="Last 7 days" loading={loading}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stockMovements}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} />
            <Bar dataKey="purchase" fill="#10B981" name="Purchases" radius={[2, 2, 0, 0]} />
            <Bar dataKey="sales" fill="#3B82F6" name="Sales" radius={[2, 2, 0, 0]} />
            <Bar dataKey="return" fill="#F59E0B" name="Returns" radius={[2, 2, 0, 0]} />
            <Bar dataKey="adjustment" fill="#6B7280" name="Adjustments" radius={[2, 2, 0, 0]} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purchase vs Sales */}
        <ChartCard title="Purchase vs Sales" subtitle="Last 12 months" loading={loading}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={purchaseVsSales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={v => formatCurrency(v)} />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} formatter={(v: any) => formatCurrency(Number(v))} />
              <Line type="monotone" dataKey="sales_revenue" stroke="#10B981" strokeWidth={2} dot={false} name="Sales Revenue" />
              <Line type="monotone" dataKey="purchase_cost" stroke="#EF4444" strokeWidth={2} dot={false} name="Purchase Cost" />
              <Line type="monotone" dataKey="gross_profit" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Gross Profit" />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Inventory by Category */}
        <ChartCard title="Inventory by Category" subtitle="Stock value distribution" loading={loading}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={inventoryByCategory.slice(0, 8)}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="total_value"
                nameKey="category_name"
                label={({ payload, percent }: any) => `${payload?.category_name?.slice(0, 12)} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {inventoryByCategory.slice(0, 8).map((_, idx) => (
                  <Cell key={idx} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} formatter={(v: any) => formatCurrency(Number(v))} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Warehouse Stock */}
      {warehouseStock.length > 0 && (
        <ChartCard title="Warehouse Stock Levels" subtitle="Units by warehouse & category" loading={loading} height="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={warehouseStock.map(w => {
                const row: Record<string, any> = { name: w.warehouse_name };
                w.categories.forEach(c => { row[c.name] = c.quantity; });
                return row;
              })}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} />
              {warehouseStock[0]?.categories.map((cat, idx) => (
                <Bar key={cat.name} dataKey={cat.name} stackId="a" fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
              ))}
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Bottom Row: POS Sessions + Low Stock + Customer Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* POS Sessions Today */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-5 pt-4 pb-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">POS Sessions Today</h3>
          </div>
          <div className="px-5 pb-4 overflow-x-auto">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />)}
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Register</th>
                    <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Cashier</th>
                    <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Sales</th>
                    <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Total</th>
                    <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Cash Diff</th>
                    <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {posSessions.map(s => (
                    <tr key={s.session_id} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-2 text-gray-900 dark:text-gray-100">{s.register ?? '-'}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{s.cashier ?? '-'}</td>
                      <td className="py-2 text-gray-900 dark:text-gray-100">{s.sale_count ?? 0}</td>
                      <td className="py-2 text-gray-900 dark:text-gray-100">{formatCurrency(s.total_sales ?? 0)}</td>
                      <td className={`py-2 font-medium ${
                        (s.cash_difference ?? 0) > 0 ? 'text-green-600 dark:text-green-400' :
                        (s.cash_difference ?? 0) < 0 ? 'text-red-600 dark:text-red-400' :
                        'text-gray-500'
                      }`}>
                        {(s.cash_difference ?? 0) > 0 ? '+' : ''}{formatCurrency(s.cash_difference ?? 0)}
                      </td>
                      <td className="py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          s.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>{s.status}</span>
                      </td>
                    </tr>
                  ))}
                  {posSessions.length === 0 && (
                    <tr><td colSpan={6} className="py-4 text-center text-gray-500">No sessions today</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Customer Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-5 pt-4 pb-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Customer Types</h3>
          </div>
          <div className="px-5 pb-4 h-52">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={customerDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="count"
                    nameKey="type"
                  >
                    {customerDist.map((_, idx) => (
                      <Cell key={idx} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alert List */}
      {lowStock.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-5 pt-4 pb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Low Stock Alerts</h3>
            <span className="ml-auto px-2 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
              {lowStock.length} items
            </span>
          </div>
          <div className="px-5 pb-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Product</th>
                  <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Variation</th>
                  <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Warehouse</th>
                  <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Current Qty</th>
                  <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Reorder Point</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.slice(0, 10).map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-2 text-gray-900 dark:text-gray-100 font-medium">{item.product_name}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-400">{item.variation_name ?? 'Default'}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-400">{item.warehouse_name ?? '-'}</td>
                    <td className="py-2">
                      <span className={`font-bold ${Number(item.quantity) <= 0 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500 dark:text-gray-400">{item.reorder_point}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
