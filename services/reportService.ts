import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';
import type { ReceivablesReport } from '@/types/accounting.types';
import type {
  PayablesReport,
  FailedJournalReport,
  StockValuationReport,
  ReorderReport,
  StockMovementReport,
  BatchExpiryReport,
  StockStatusReport,
  SalesByProductReport,
  SalesByCustomerReport,
  SalesTrendReport,
  PosDailySalesReport,
  PosSessionSummaryReport,
  PoSummaryReport,
  CustomerAgingReport,
  SupplierAgingReport,
  WarehouseStockReport,
  AuditLogReport,
  ExportFormat,
  GenericReportResponse,
} from '@/types/report.types';

class ReportService {
  private base = '/api/v1/reports';

  // ── Accounting (existing endpoints) ───────────────────────────────────────

  async receivables(params: { as_of_date: string; tenant_id?: string }): Promise<ReceivablesReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<ReceivablesReport>>(`${this.base}/receivables`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  async payables(params: { as_of_date: string; tenant_id?: string }): Promise<PayablesReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<PayablesReport>>(`${this.base}/payables`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  async failedJournal(params?: {
    status?: 'unresolved' | 'resolved' | 'all';
    reference_type?: string;
    page?: number;
    per_page?: number;
    tenant_id?: string;
  }): Promise<FailedJournalReport> {
    const { tenant_id, ...rest } = params ?? {};
    const response = await apiClient.get<ApiResponse<FailedJournalReport>>(
      '/api/v1/admin/failed-journal-entries',
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  // ── Inventory Reports ─────────────────────────────────────────────────────

  async stockValuation(params: {
    warehouse_id?: number | null;
    as_of_date?: string;
    costing_method?: 'fifo' | 'lifo' | 'weighted_avg' | 'standard';
    category_id?: number | null;
    brand_id?: number | null;
    tenant_id?: string;
  }): Promise<StockValuationReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<StockValuationReport>>(
      `${this.base}/inventory/stock-valuation`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async reorderReport(params: {
    warehouse_id?: number | null;
    category_id?: number | null;
    severity?: 'critical' | 'low' | 'all';
    tenant_id?: string;
  }): Promise<ReorderReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<ReorderReport>>(`${this.base}/inventory/reorder`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  async lowStockReport(params: {
    warehouse_id?: number | null;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/inventory/low-stock`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async stockMovementReport(params: {
    warehouse_id?: number | null;
    product_id?: number | null;
    variation_id?: number | null;
    movement_type?: string;
    start_date: string;
    end_date: string;
    reference_type?: string;
    tenant_id?: string;
  }): Promise<StockMovementReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<StockMovementReport>>(
      `${this.base}/inventory/stock-movement`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async stockAdjustmentReport(params: {
    warehouse_id?: number | null;
    adjustment_type?: string;
    start_date: string;
    end_date: string;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/inventory/stock-adjustment`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async batchExpiryReport(params: {
    warehouse_id?: number | null;
    urgency?: 'expired' | '7days' | '30days' | '60days' | 'all';
    product_id?: number | null;
    tenant_id?: string;
  }): Promise<BatchExpiryReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<BatchExpiryReport>>(
      `${this.base}/inventory/batch-expiry`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async deadStock(params: {
    warehouse_id?: number | null;
    days_threshold?: number;
    category_id?: number | null;
    min_value?: number;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/inventory/dead-stock`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async stockAging(params: {
    warehouse_id?: number | null;
    category_id?: number | null;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/inventory/stock-aging`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async abcAnalysis(params: {
    start_date: string;
    end_date: string;
    metric?: 'revenue' | 'quantity' | 'profit';
    category_id?: number | null;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/inventory/abc-analysis`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async shrinkageReport(params: {
    warehouse_id?: number | null;
    start_date: string;
    end_date: string;
    category_id?: number | null;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/inventory/shrinkage`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async turnoverReport(params: {
    start_date: string;
    end_date: string;
    warehouse_id?: number | null;
    category_id?: number | null;
    group_by?: 'product' | 'category' | 'brand';
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/inventory/turnover`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  // ── Sales Reports ─────────────────────────────────────────────────────────

  async salesByProduct(params: {
    start_date: string;
    end_date: string;
    warehouse_id?: number | null;
    category_id?: number | null;
    brand_id?: number | null;
    source?: 'pos' | 'so' | 'all';
    sort_by?: 'revenue' | 'quantity' | 'profit';
    tenant_id?: string;
  }): Promise<SalesByProductReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<SalesByProductReport>>(
      `${this.base}/sales/by-product`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async salesByCustomer(params: {
    start_date: string;
    end_date: string;
    customer_type?: string;
    source?: 'pos' | 'so' | 'all';
    tenant_id?: string;
  }): Promise<SalesByCustomerReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<SalesByCustomerReport>>(
      `${this.base}/sales/by-customer`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async salesByCategory(params: {
    start_date: string;
    end_date: string;
    warehouse_id?: number | null;
    source?: 'pos' | 'so' | 'all';
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/sales/by-category`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async salespersonPerformance(params: {
    start_date: string;
    end_date: string;
    user_id?: number | null;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/sales/salesperson-performance`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async profitMargin(params: {
    start_date: string;
    end_date: string;
    group_by?: 'product' | 'category' | 'brand' | 'customer';
    min_margin?: number;
    max_margin?: number;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/sales/profit-margin`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async returnAnalysis(params: {
    start_date: string;
    end_date: string;
    reason?: string;
    source?: 'sales_return' | 'pos_refund' | 'all';
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/sales/return-analysis`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async salesTrend(params: {
    start_date: string;
    end_date: string;
    period?: 'daily' | 'weekly' | 'monthly';
    warehouse_id?: number | null;
    tenant_id?: string;
  }): Promise<SalesTrendReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<SalesTrendReport>>(
      `${this.base}/sales/trend`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  // ── Purchase Reports ──────────────────────────────────────────────────────

  async poSummary(params: {
    start_date: string;
    end_date: string;
    supplier_id?: number | null;
    warehouse_id?: number | null;
    status?: string;
    payment_status?: string;
    tenant_id?: string;
  }): Promise<PoSummaryReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<PoSummaryReport>>(`${this.base}/purchase/po-summary`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  async supplierPerformance(params: {
    start_date: string;
    end_date: string;
    supplier_id?: number | null;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/purchase/supplier-performance`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async purchaseBySupplier(params: {
    start_date: string;
    end_date: string;
    category_id?: number | null;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/purchase/by-supplier`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async grnRegister(params: {
    start_date: string;
    end_date: string;
    supplier_id?: number | null;
    warehouse_id?: number | null;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/purchase/grn-register`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async purchaseReturn(params: {
    start_date: string;
    end_date: string;
    supplier_id?: number | null;
    status?: string;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/purchase/purchase-return`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  // ── POS Reports ───────────────────────────────────────────────────────────

  async posDailySales(params: {
    date: string;
    register_id?: number | null;
    session_id?: number | null;
    cashier_id?: number | null;
    tenant_id?: string;
  }): Promise<PosDailySalesReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<PosDailySalesReport>>(`${this.base}/pos/daily-sales`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  async posSessionSummary(params: {
    session_id?: number | null;
    date?: string;
    tenant_id?: string;
  }): Promise<PosSessionSummaryReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<PosSessionSummaryReport>>(
      `${this.base}/pos/session-summary`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async cashierPerformance(params: {
    start_date: string;
    end_date: string;
    cashier_id?: number | null;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/pos/cashier-performance`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async hourlySales(params: {
    date?: string;
    start_date?: string;
    end_date?: string;
    register_id?: number | null;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(`${this.base}/pos/hourly-sales`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  async paymentBreakdown(params: {
    start_date: string;
    end_date: string;
    register_id?: number | null;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/pos/payment-breakdown`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async posRefundSummary(params: {
    start_date: string;
    end_date: string;
    reason?: string;
    refund_method?: string;
    status?: string;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/pos/refund-summary`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  // ── Customer Reports ──────────────────────────────────────────────────────

  async customerAging(params: {
    as_of_date: string;
    customer_type?: string;
    tenant_id?: string;
  }): Promise<CustomerAgingReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<CustomerAgingReport>>(`${this.base}/customer/aging`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  async customerProfitability(params: {
    start_date: string;
    end_date: string;
    customer_type?: string;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/customer/profitability`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  // ── Supplier Reports ──────────────────────────────────────────────────────

  async supplierAging(params: {
    as_of_date: string;
    tenant_id?: string;
  }): Promise<SupplierAgingReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<SupplierAgingReport>>(`${this.base}/supplier/aging`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  async supplierStatement(params: {
    supplier_id: number;
    start_date: string;
    end_date: string;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/supplier/statement`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async supplierScorecard(params: {
    start_date: string;
    end_date: string;
    supplier_id?: number | null;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/supplier/scorecard`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  // ── Product Reports ───────────────────────────────────────────────────────

  async productProfitability(params: {
    category_id?: number | null;
    brand_id?: number | null;
    min_margin?: number;
    max_margin?: number;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/product/profitability`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async priceList(params: {
    category_id?: number | null;
    brand_id?: number | null;
    price_level?: 'selling' | 'mrp' | 'dp';
    active_only?: boolean;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(`${this.base}/product/price-list`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  async stockStatus(params: {
    warehouse_id?: number | null;
    category_id?: number | null;
    stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'all';
    tenant_id?: string;
  }): Promise<StockStatusReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<StockStatusReport>>(`${this.base}/product/stock-status`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  // ── Warehouse Reports ─────────────────────────────────────────────────────

  async warehouseStockSummary(params: {
    warehouse_id?: number | null;
    category_id?: number | null;
    tenant_id?: string;
  }): Promise<WarehouseStockReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<WarehouseStockReport>>(
      `${this.base}/warehouse/stock-summary`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async binUtilization(params: {
    warehouse_id?: number | null;
    bin_type?: string;
    utilization_level?: string;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(
      `${this.base}/warehouse/bin-utilization`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async stockTransfer(params: {
    start_date: string;
    end_date: string;
    from_warehouse_id?: number | null;
    to_warehouse_id?: number | null;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(`${this.base}/warehouse/transfer`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  // ── Tax Reports ───────────────────────────────────────────────────────────

  async taxReturn(params: {
    start_date: string;
    end_date: string;
    tax_type?: 'vat' | 'sd' | 'combined';
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(`${this.base}/tax/tax-return`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  async taxSummary(params: {
    start_date: string;
    end_date: string;
    tax_type?: string;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(`${this.base}/tax/summary`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  // ── System Reports ────────────────────────────────────────────────────────

  async auditLog(params: {
    start_date: string;
    end_date: string;
    user_id?: number | null;
    model_type?: string;
    action?: string;
    tenant_id?: string;
  }): Promise<AuditLogReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<AuditLogReport>>(`${this.base}/system/audit-log`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  async activityLog(params: {
    start_date: string;
    end_date: string;
    user_id?: number | null;
    subject_type?: string;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(`${this.base}/system/activity-log`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  async alertHistory(params: {
    start_date: string;
    end_date: string;
    alert_type?: string;
    priority?: string;
    status?: string;
    tenant_id?: string;
  }): Promise<GenericReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GenericReportResponse>>(`${this.base}/system/alert-history`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  // ── Server-Side Export ────────────────────────────────────────────────────

  async exportReport(
    category: string,
    name: string,
    format: ExportFormat,
    params: Record<string, any>,
  ): Promise<Blob> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get(`${this.base}/${category}/${name}/export`, {
      params: { format, ...rest, ...(tenant_id ? { tenant_id } : {}) },
      responseType: 'blob',
    });
    return response.data;
  }
}

export default new ReportService();
