'use client';

import useSWR from 'swr';
import dashboardService from '@/services/dashboardService';

// ─── Tenant ──────────────────────────────────────────────────────────────────

/** Tenant summary — short dedupe, revalidates quickly. */
export function useTenantSummary() {
  return useSWR('dashboard/summary', () => dashboardService.getSummary(), {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
}

export function useSalesTrend(period: string) {
  return useSWR(['dashboard/sales-trend', period] as const, () => dashboardService.getSalesTrend(period), {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
    keepPreviousData: true,
  });
}

export function useTopProducts(period: string) {
  return useSWR(['dashboard/top-products', period] as const, () => dashboardService.getTopProducts(period), {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
    keepPreviousData: true,
  });
}

export function usePaymentMethods() {
  return useSWR('dashboard/payment-methods', () => dashboardService.getPaymentMethods(), {
    revalidateOnFocus: false,
    dedupingInterval: 2 * 60_000,
  });
}

export function useStockMovements() {
  return useSWR('dashboard/stock-movements', () => dashboardService.getStockMovements(), {
    revalidateOnFocus: false,
    dedupingInterval: 2 * 60_000,
  });
}

export function usePurchaseVsSales() {
  return useSWR('dashboard/purchase-vs-sales', () => dashboardService.getPurchaseVsSales(), {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60_000,
  });
}

export function useInventoryByCategory() {
  return useSWR('dashboard/inventory-by-category', () => dashboardService.getInventoryByCategory(), {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60_000,
  });
}

export function useWarehouseStock() {
  return useSWR('dashboard/warehouse-stock', () => dashboardService.getWarehouseStock(), {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60_000,
  });
}

export function useCustomerDistribution() {
  return useSWR('dashboard/customer-distribution', () => dashboardService.getCustomerDistribution(), {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60_000,
  });
}

export function usePosSessionsToday() {
  return useSWR('dashboard/pos-sessions-today', () => dashboardService.getPosSessionsToday(), {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
}

export function useLowStockItems() {
  return useSWR('dashboard/low-stock-items', () => dashboardService.getLowStockItems(), {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
}

export function useAlerts() {
  return useSWR('dashboard/alerts', () => dashboardService.getAlerts(), {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
}

export function useActivityFeed() {
  return useSWR('dashboard/activity-feed', () => dashboardService.getActivityFeed(), {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
}

// ─── Super admin ─────────────────────────────────────────────────────────────

export function useSuperSummary() {
  return useSWR('dashboard/super/summary', () => dashboardService.getSuperSummary(), {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
}

export function useTenantGrowth() {
  return useSWR('dashboard/super/tenant-growth', () => dashboardService.getTenantGrowth(), {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60_000,
  });
}

export function usePlanDistribution() {
  return useSWR('dashboard/super/plan-distribution', () => dashboardService.getPlanDistribution(), {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60_000,
  });
}

export function useRevenueByBusinessType() {
  return useSWR('dashboard/super/revenue-by-business-type', () => dashboardService.getRevenueByBusinessType(), {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60_000,
  });
}

export function useExpiryTimeline() {
  return useSWR('dashboard/super/expiry-timeline', () => dashboardService.getExpiryTimeline(), {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60_000,
  });
}

export function useActiveUsers() {
  return useSWR('dashboard/super/active-users', () => dashboardService.getActiveUsers(), {
    revalidateOnFocus: false,
    dedupingInterval: 2 * 60_000,
  });
}

export function useTopTenants() {
  return useSWR('dashboard/super/top-tenants', () => dashboardService.getTopTenants(), {
    revalidateOnFocus: false,
    dedupingInterval: 2 * 60_000,
  });
}

export function useRecentRegistrations() {
  return useSWR('dashboard/super/recent-registrations', () => dashboardService.getRecentRegistrations(), {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
}

export function useExpiringSoon() {
  return useSWR('dashboard/super/expiring-soon', () => dashboardService.getExpiringSoon(), {
    revalidateOnFocus: false,
    dedupingInterval: 2 * 60_000,
  });
}
