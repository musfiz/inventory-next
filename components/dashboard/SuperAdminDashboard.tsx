'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2, CreditCard, AlertTriangle, DollarSign,
  Users, Receipt, UserPlus, TrendingUp, Crown,
  Zap, Shield
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import KpiCard from './KpiCard';
import ChartCard from './ChartCard';
import dashboardService, {
  SuperSummary, TenantGrowthItem, PlanDistItem,
  RevenueByType, ExpiryTimelineItem, ActiveUsersItem,
  TopTenant, RecentRegistration, ExpiringSubscription
} from '@/services/dashboardService';

const PLAN_COLORS: Record<string, string> = {
  free: '#6B7280',
  basic: '#3B82F6',
  professional: '#6366F1',
  enterprise: '#8B5CF6',
};

const BUSINESS_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SuperSummary | null>(null);
  const [tenantGrowth, setTenantGrowth] = useState<TenantGrowthItem[]>([]);
  const [planDist, setPlanDist] = useState<PlanDistItem[]>([]);
  const [revenueByType, setRevenueByType] = useState<RevenueByType[]>([]);
  const [expiryTimeline, setExpiryTimeline] = useState<ExpiryTimelineItem[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUsersItem[]>([]);
  const [topTenants, setTopTenants] = useState<TopTenant[]>([]);
  const [recentRegs, setRecentRegs] = useState<RecentRegistration[]>([]);
  const [expiringSubs, setExpiringSubs] = useState<ExpiringSubscription[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, growth, plan, rev, expiry, users, top, recent, expSubs] = await Promise.all([
        dashboardService.getSuperSummary(),
        dashboardService.getTenantGrowth(),
        dashboardService.getPlanDistribution(),
        dashboardService.getRevenueByBusinessType(),
        dashboardService.getExpiryTimeline(),
        dashboardService.getActiveUsers(),
        dashboardService.getTopTenants(),
        dashboardService.getRecentRegistrations(),
        dashboardService.getExpiringSoon(),
      ]);
      setSummary(sum);
      setTenantGrowth(growth);
      setPlanDist(plan);
      setRevenueByType(rev);
      setExpiryTimeline(expiry);
      setActiveUsers(users);
      setTopTenants(top);
      setRecentRegs(recent);
      setExpiringSubs(expSubs);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) return `৳${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `৳${(val / 1_000).toFixed(1)}K`;
    return `৳${val.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Platform Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Super Admin Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium">
            <Shield className="w-3.5 h-3.5" /> Super Admin
          </span>
        </div>
      </div>

      {/* KPI Row 1 — Platform Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Tenants"
          value={summary?.total_tenants ?? 0}
          subValue={`+${summary?.new_tenants_this_month ?? 0} this month`}
          subValueType="positive"
          icon={Building2}
          iconColor="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-50 dark:bg-blue-900/30"
          loading={loading}
        />
        <KpiCard
          title="Platform Revenue"
          value={formatCurrency(summary?.total_revenue_this_month ?? 0)}
          subValue="This month"
          subValueType="neutral"
          icon={DollarSign}
          iconColor="text-green-600 dark:text-green-400"
          bgColor="bg-green-50 dark:bg-green-900/30"
          loading={loading}
        />
        <KpiCard
          title="Expiring Soon"
          value={summary?.expiring_soon ?? 0}
          subValue="Within 30 days"
          subValueType="warning"
          icon={AlertTriangle}
          iconColor="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-50 dark:bg-amber-900/30"
          loading={loading}
          badge={summary && summary.expiring_soon > 0 ? { text: '⚠', color: 'orange' } : undefined}
        />
        <KpiCard
          title="Active Users Today"
          value={summary?.active_users_today ?? 0}
          subValue={`${summary?.pos_transactions_today ?? 0} POS txn`}
          subValueType="neutral"
          icon={Users}
          iconColor="text-indigo-600 dark:text-indigo-400"
          bgColor="bg-indigo-50 dark:bg-indigo-900/30"
          loading={loading}
        />
      </div>

      {/* KPI Row 2 — Subscriptions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Active Subscriptions"
          value={summary?.active_subscriptions ?? 0}
          icon={CreditCard}
          iconColor="text-emerald-600 dark:text-emerald-400"
          bgColor="bg-emerald-50 dark:bg-emerald-900/30"
          loading={loading}
        />
        <KpiCard
          title="Trial Subscriptions"
          value={summary?.trial_subscriptions ?? 0}
          icon={Zap}
          iconColor="text-yellow-600 dark:text-yellow-400"
          bgColor="bg-yellow-50 dark:bg-yellow-900/30"
          loading={loading}
        />
        <KpiCard
          title="POS Transactions Today"
          value={summary?.pos_transactions_today ?? 0}
          icon={Receipt}
          iconColor="text-violet-600 dark:text-violet-400"
          bgColor="bg-violet-50 dark:bg-violet-900/30"
          loading={loading}
        />
        <KpiCard
          title="New Tenants This Month"
          value={summary?.new_tenants_this_month ?? 0}
          icon={UserPlus}
          iconColor="text-cyan-600 dark:text-cyan-400"
          bgColor="bg-cyan-50 dark:bg-cyan-900/30"
          loading={loading}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenant Growth */}
        <ChartCard title="Tenant Growth" subtitle="Last 12 months" loading={loading}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tenantGrowth}>
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} />
              <Area type="monotone" dataKey="cumulative_total" stroke="#3B82F6" fill="url(#growthGrad)" strokeWidth={2} name="Total Tenants" />
              <Bar dataKey="new_tenants" fill="#6366F1" opacity={0.7} name="New" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Plan Distribution */}
        <ChartCard title="Subscription Plan Distribution" loading={loading}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={planDist}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                dataKey="count"
                nameKey="subscription_plan"
                label={({ payload, percent }: any) => `${payload?.subscription_plan} (${payload?.count})`}
                labelLine={false}
              >
                {planDist.map((entry, idx) => (
                  <Cell key={idx} fill={PLAN_COLORS[entry.subscription_plan] || '#6B7280'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Revenue by Business Type */}
      <ChartCard title="Revenue by Business Type" subtitle="This month" loading={loading} height="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={revenueByType} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={v => formatCurrency(v)} />
            <YAxis 
              dataKey="business_type" 
              type="category" 
              tick={{ fontSize: 11, fill: '#9CA3AF' }} 
              width={100}
              tickFormatter={(value: any) => typeof value === 'object' ? value?.name || 'Unknown' : value}
            />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} formatter={(v: any) => formatCurrency(Number(v))} />
            <Bar dataKey="pos_revenue" stackId="a" fill="#3B82F6" name="POS Revenue" radius={[0, 0, 0, 0]} />
            <Bar dataKey="so_revenue" stackId="a" fill="#6366F1" name="SO Revenue" radius={[0, 4, 4, 0]} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiry Timeline */}
        <ChartCard title="Subscription Expiry Timeline" subtitle="Next 8 weeks" loading={loading}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={expiryTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="week_start" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} />
              <Bar dataKey="expiring_count" fill="#F59E0B" name="Expiring" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Daily Active Users */}
        <ChartCard title="Daily Active Users" subtitle="Last 30 days" loading={loading}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activeUsers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} />
              <Line type="monotone" dataKey="tenant_admin_count" stroke="#6366F1" strokeWidth={2} dot={false} name="Admins" />
              <Line type="monotone" dataKey="tenant_user_count" stroke="#10B981" strokeWidth={2} dot={false} name="Users" />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Top 10 Tenants */}
      <ChartCard title="Top 10 Tenants by Revenue" subtitle="This month" loading={loading} height="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topTenants} layout="vertical" margin={{ left: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={v => formatCurrency(v)} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#9CA3AF' }} width={140} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F9FAFB' }} formatter={(v: any) => formatCurrency(Number(v))} />
            <Bar dataKey="value" name="Revenue" radius={[0, 4, 4, 0]}>
              {topTenants.map((_, idx) => (
                <Cell key={idx} fill={BUSINESS_COLORS[idx % BUSINESS_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-5 pt-4 pb-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Registrations</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Last 10 new tenants</p>
          </div>
          <div className="px-5 pb-4 overflow-x-auto">
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />)}
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Business</th>
                    <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Type</th>
                    <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Plan</th>
                    <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRegs.map(reg => {
                    const businessTypeName = typeof reg.business_type === 'object' ? reg.business_type?.name : reg.business_type;
                    return (
                      <tr key={reg.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="py-2 text-gray-900 dark:text-gray-100 font-medium">{reg.business_name}</td>
                        <td className="py-2 text-gray-600 dark:text-gray-400 capitalize">{businessTypeName || '—'}</td>
                        <td className="py-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            reg.subscription_plan === 'enterprise' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                            reg.subscription_plan === 'professional' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' :
                            reg.subscription_plan === 'basic' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {reg.subscription_plan}
                          </span>
                        </td>
                        <td className="py-2 text-gray-500 dark:text-gray-400">{new Date(reg.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                  {recentRegs.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-center text-gray-500">No recent registrations</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Expiring Subscriptions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="px-5 pt-4 pb-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Expiring Subscriptions</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Next 30 days</p>
          </div>
          <div className="px-5 pb-4 overflow-x-auto">
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />)}
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Tenant</th>
                    <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Plan</th>
                    <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Days Left</th>
                    <th className="py-2 text-left text-gray-500 dark:text-gray-400 font-medium">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringSubs.map(sub => (
                    <tr key={sub.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-2 text-gray-900 dark:text-gray-100 font-medium">{sub.business_name}</td>
                      <td className="py-2 capitalize text-gray-600 dark:text-gray-400">{sub.plan}</td>
                      <td className="py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                          sub.days_remaining <= 7 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                          sub.days_remaining <= 15 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                        }`}>
                          {sub.days_remaining}d
                        </span>
                      </td>
                      <td className="py-2 text-gray-500 dark:text-gray-400">{sub.expires_at}</td>
                    </tr>
                  ))}
                  {expiringSubs.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-center text-gray-500">No expiring subscriptions</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
