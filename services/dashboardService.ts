import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface TenantSummary {
  today_sales: number;
  today_pos_count: number;
  today_so_count: number;
  cash_in_registers: number;
  low_stock_count: number;
  out_of_stock_count: number;
  expiring_batches: number;
  inventory_value: number;
  pending_po: number;
  pending_so: number;
  pending_refunds: number;
  unpaid_invoices: number;
  monthly_revenue: number;
  monthly_purchases: number;
}

export interface SuperSummary {
  total_tenants: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  expiring_soon: number;
  total_revenue_this_month: number;
  active_users_today: number;
  pos_transactions_today: number;
  new_tenants_this_month: number;
}

export interface SalesTrendItem {
  date: string;
  pos_total: number;
  so_total: number;
}

export interface TopProduct {
  product_name: string;
  variation_name: string;
  units_sold: number;
  revenue: number;
}

export interface PaymentMethod {
  payment_method: string;
  total_amount: number;
  transaction_count: number;
}

export interface StockMovementDay {
  date: string;
  purchase: number;
  sales: number;
  return: number;
  adjustment: number;
}

export interface PurchaseVsSalesItem {
  month: string;
  purchase_cost: number;
  sales_revenue: number;
  gross_profit: number;
}

export interface CategoryInventory {
  category_id: number;
  category_name: string;
  product_count: number;
  total_quantity: number;
  total_value: number;
}

export interface WarehouseStockItem {
  warehouse_id: number;
  warehouse_name: string;
  categories: { name: string; quantity: number; value: number }[];
}

export interface CustomerType {
  type: string;
  count: number;
}

export interface PosSessionToday {
  session_id: number;
  register: string;
  cashier: string;
  start_time: string;
  sale_count: number;
  total_sales: number;
  cash_difference: number;
  status: string;
}

export interface TenantGrowthItem {
  month: string;
  new_tenants: number;
  cumulative_total: number;
}

export interface PlanDistItem {
  subscription_plan: string;
  count: number;
}

export interface RevenueByType {
  business_type: string | { id: number; name: string } | null;
  pos_revenue: number;
  so_revenue: number;
  total: number;
}

export interface ExpiryTimelineItem {
  week_start: string;
  expiring_count: number;
  tenants: { id: number; name: string; plan: string; expires_at: string }[];
}

export interface ActiveUsersItem {
  date: string;
  tenant_admin_count: number;
  tenant_user_count: number;
}

export interface TopTenant {
  tenant_id: number;
  name: string;
  business_type: string | { id: number; name: string } | null;
  value: number;
}

export interface RecentRegistration {
  id: number;
  business_name: string;
  business_type: string | { id: number; name: string } | null;
  subscription_plan: string;
  contact_person: string;
  email: string;
  created_at: string;
}

export interface ExpiringSubscription {
  id: number;
  business_name: string;
  plan: string;
  expires_at: string;
  days_remaining: number;
  contact_email: string;
}

export interface Alert {
  id: number;
  alert_type: string;
  title: string;
  message: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  created_at: string;
}

export interface ActivityItem {
  user_name: string;
  action: string;
  subject_type: string;
  reference: string;
  created_at: string;
}

export interface LowStockItem {
  product_name: string;
  variation_name: string;
  warehouse_name: string;
  quantity: number;
  reorder_point: number;
}

// ─── Service ───────────────────────────────────────────────────────────────────

class DashboardService {
  private base = '/api/v1/dashboard';

  // Tenant endpoints
  async getSummary(tenantId?: number) {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const res = await apiClient.get<ApiResponse<TenantSummary>>(`${this.base}/summary`, { params });
    return res.data.data;
  }

  async getSalesTrend(period = '30d', tenantId?: number) {
    const params: Record<string, any> = { period };
    if (tenantId) params.tenant_id = tenantId;
    const res = await apiClient.get<ApiResponse<SalesTrendItem[]>>(`${this.base}/sales-trend`, { params });
    return res.data.data;
  }

  async getTopProducts(period = '30d', metric = 'units', limit = 10, tenantId?: number) {
    const params: Record<string, any> = { period, metric, limit };
    if (tenantId) params.tenant_id = tenantId;
    const res = await apiClient.get<ApiResponse<TopProduct[]>>(`${this.base}/top-products`, { params });
    return res.data.data;
  }

  async getPaymentMethods(period = '30d', tenantId?: number) {
    const params: Record<string, any> = { period };
    if (tenantId) params.tenant_id = tenantId;
    const res = await apiClient.get<ApiResponse<PaymentMethod[]>>(`${this.base}/payment-methods`, { params });
    return res.data.data;
  }

  async getStockMovements(days = 7, tenantId?: number) {
    const params: Record<string, any> = { days };
    if (tenantId) params.tenant_id = tenantId;
    const res = await apiClient.get<ApiResponse<StockMovementDay[]>>(`${this.base}/stock-movements`, { params });
    return res.data.data;
  }

  async getPurchaseVsSales(months = 12, tenantId?: number) {
    const params: Record<string, any> = { months };
    if (tenantId) params.tenant_id = tenantId;
    const res = await apiClient.get<ApiResponse<PurchaseVsSalesItem[]>>(`${this.base}/purchase-vs-sales`, { params });
    return res.data.data;
  }

  async getInventoryByCategory(tenantId?: number) {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const res = await apiClient.get<ApiResponse<CategoryInventory[]>>(`${this.base}/inventory-by-category`, { params });
    return res.data.data;
  }

  async getWarehouseStock(tenantId?: number) {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const res = await apiClient.get<ApiResponse<WarehouseStockItem[]>>(`${this.base}/warehouse-stock`, { params });
    return res.data.data;
  }

  async getCustomerDistribution(tenantId?: number) {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const res = await apiClient.get<ApiResponse<CustomerType[]>>(`${this.base}/customer-distribution`, { params });
    return res.data.data;
  }

  async getPosSessionsToday(tenantId?: number) {
    const params = tenantId ? { tenant_id: tenantId } : {};
    const res = await apiClient.get<ApiResponse<PosSessionToday[]>>(`${this.base}/pos-sessions-today`, { params });
    return res.data.data;
  }

  async getLowStockItems(limit = 20, tenantId?: number) {
    const params: Record<string, any> = { limit };
    if (tenantId) params.tenant_id = tenantId;
    const res = await apiClient.get<ApiResponse<LowStockItem[]>>(`${this.base}/low-stock-items`, { params });
    return res.data.data;
  }

  // Alerts & Activity (Tenant)
  async getAlerts(limit = 10) {
    const res = await apiClient.get<ApiResponse<Alert[]>>(`${this.base}/alerts`, { params: { limit } });
    return res.data.data;
  }

  async getActivityFeed(limit = 10) {
    const res = await apiClient.get<ApiResponse<ActivityItem[]>>(`${this.base}/activity-feed`, { params: { limit } });
    return res.data.data;
  }

  // Super Admin endpoints
  async getSuperSummary() {
    const res = await apiClient.get<ApiResponse<SuperSummary>>(`${this.base}/super/summary`);
    return res.data.data;
  }

  async getTenantGrowth(months = 12) {
    const res = await apiClient.get<ApiResponse<TenantGrowthItem[]>>(`${this.base}/super/tenant-growth`, { params: { months } });
    return res.data.data;
  }

  async getPlanDistribution() {
    const res = await apiClient.get<ApiResponse<PlanDistItem[]>>(`${this.base}/super/plan-distribution`);
    return res.data.data;
  }

  async getRevenueByBusinessType(period = 'month') {
    const res = await apiClient.get<ApiResponse<RevenueByType[]>>(`${this.base}/super/revenue-by-business-type`, { params: { period } });
    return res.data.data;
  }

  async getExpiryTimeline(weeks = 8) {
    const res = await apiClient.get<ApiResponse<ExpiryTimelineItem[]>>(`${this.base}/super/expiry-timeline`, { params: { weeks } });
    return res.data.data;
  }

  async getActiveUsers(days = 30) {
    const res = await apiClient.get<ApiResponse<ActiveUsersItem[]>>(`${this.base}/super/active-users`, { params: { days } });
    return res.data.data;
  }

  async getTopTenants(metric = 'revenue', limit = 10) {
    const res = await apiClient.get<ApiResponse<TopTenant[]>>(`${this.base}/super/top-tenants`, { params: { metric, limit } });
    return res.data.data;
  }

  async getRecentRegistrations(limit = 10) {
    const res = await apiClient.get<ApiResponse<RecentRegistration[]>>(`${this.base}/super/recent-registrations`, { params: { limit } });
    return res.data.data;
  }

  async getExpiringSoon(days = 30) {
    const res = await apiClient.get<ApiResponse<ExpiringSubscription[]>>(`${this.base}/super/expiring-soon`, { params: { days } });
    return res.data.data;
  }
}

export default new DashboardService();
