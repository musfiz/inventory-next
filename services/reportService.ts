import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';
import type { ReceivablesReport } from '@/types/accounting.types';
import type {
  PayablesReport,
  FailedJournalReport,
  StockValuationReport,
  CostingMethod,
  ReorderReport,
  ReorderSeverity,
  LowStockReport,
  LowStockStatus,
  StockMovementReport,
  StockMovementType,
  StockMovementDirection,
  GrnRegisterReport,
  WarehouseTransferReport,
  BatchExpiryReport,
  BatchExpiryBucket,
  BatchStatus,
  StockStatusReport,
  StockStatusValue,
  ProductProfitabilityReport,
  ProfitMarginReport,
  ProfitMarginGroupBy,
  MarginBand,
  ReturnAnalysisReport,
  ReturnSource,
  PosRefundSummaryReport,
  TrendPeriod,
  HourlySalesReport,
  CustomerProfitabilityReport,
  CustomerMarginBand,
  StockAgingReport,
  StockAgingBucket,
  AbcAnalysisReport,
  AbcMetric,
  AbcClass,
  DeadStockReport,
  StockAdjustmentReport,
  StockAdjustmentType,
  SalesByProductReport,
  SalesByCustomerReport,
  SalesByCategoryReport,
  SalesTrendReport,
  PosDailySalesReport,
  PosSessionSummaryReport,
  PoSummaryReport,
  SupplierPerformanceReport,
  PurchaseOrderStatus,
  PurchasePaymentStatus,
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
    warehouse_id?: string | null;
    category_id?: string | null;
    brand_id?: string | null;
    product_id?: string | null;
    product_type?: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
    as_of_date?: string;
    costing_method?: CostingMethod;
    /** Hide lines below this stock value — the usual way to cut the long tail. */
    min_value?: number | null;
    search?: string;
    /** 1/0 — Laravel's `boolean` rule rejects the strings "true"/"false". */
    include_inactive?: boolean | 0 | 1;
    include_zero_stock?: boolean | 0 | 1;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<StockValuationReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<StockValuationReport>>(`${this.base}/inventory/stock-valuation`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  async reorderReport(params: {
    /** Drill into one severity; omit for all of them. */
    severity?: ReorderSeverity;
    warehouse_id?: string | null;
    category_id?: string | null;
    brand_id?: string | null;
    product_type?: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
    search?: string;
    /** 1/0 — Laravel's `boolean` rule rejects the strings "true"/"false". */
    include_inactive?: boolean | 0 | 1;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<ReorderReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<ReorderReport>>(`${this.base}/inventory/reorder`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  async lowStockReport(params: {
    /** Drill into one status; omit for all of them. */
    status?: LowStockStatus;
    warehouse_id?: string | null;
    category_id?: string | null;
    brand_id?: string | null;
    product_type?: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
    search?: string;
    /** 1/0 — Laravel's `boolean` rule rejects the strings "true"/"false". */
    include_inactive?: boolean | 0 | 1;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<LowStockReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<LowStockReport>>(
      `${this.base}/inventory/low-stock`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async stockMovementReport(params: {
    start_date: string;
    end_date: string;
    /** One ledger type; omit for all of them. */
    movement_type?: StockMovementType;
    /** Classified from the sign of qty_change, not from the type name. */
    direction?: StockMovementDirection;
    warehouse_id?: string | null;
    category_id?: string | null;
    brand_id?: string | null;
    product_type?: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
    search?: string;
    /** 1/0 — Laravel's `boolean` rule rejects the strings "true"/"false". */
    include_inactive?: boolean | 0 | 1;
    sort?: string;
    dir?: 'asc' | 'desc';
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
    start_date: string;
    end_date: string;
    adjustment_type?: StockAdjustmentType;
    warehouse_id?: string | null;
    category_id?: string | null;
    brand_id?: string | null;
    product_type?: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
    search?: string;
    /** 1/0 — Laravel's `boolean` rule rejects the strings "true"/"false". */
    include_inactive?: boolean | 0 | 1;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<StockAdjustmentReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<StockAdjustmentReport>>(
      `${this.base}/inventory/stock-adjustment`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async batchExpiryReport(params: {
    /** Date expiry is measured against; defaults to today. */
    as_of_date?: string;
    /** Drill into one expiry bucket; omit for all of them. */
    bucket?: BatchExpiryBucket;
    /** Drill into one operational status; omit for all of them. */
    batch_status?: BatchStatus;
    warehouse_id?: string | null;
    category_id?: string | null;
    brand_id?: string | null;
    product_type?: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
    search?: string;
    /** 1/0 — Laravel's `boolean` rule rejects the strings "true"/"false". */
    include_inactive?: boolean | 0 | 1;
    sort?: string;
    dir?: 'asc' | 'desc';
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
    /** Days without a sale before a line counts as dead; defaults to 90. */
    days_threshold?: number;
    /** Hide lines whose idle value is below this; defaults to 0. */
    min_value?: number;
    warehouse_id?: string | null;
    category_id?: string | null;
    brand_id?: string | null;
    product_type?: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
    search?: string;
    /** 1/0 — Laravel's `boolean` rule rejects the strings "true"/"false". */
    include_inactive?: boolean | 0 | 1;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<DeadStockReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<DeadStockReport>>(
      `${this.base}/inventory/dead-stock`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async stockAging(params: {
    warehouse_id?: string | null;
    category_id?: string | null;
    brand_id?: string | null;
    product_id?: string | null;
    product_type?: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
    as_of_date?: string;
    /** Drill into one age bucket; omit for all of them. */
    bucket?: StockAgingBucket;
    /** Days without a sale after which a line counts as slow-moving. */
    slow_moving_days?: number;
    search?: string;
    /** 1/0 — Laravel's `boolean` rule rejects the strings "true"/"false". */
    include_inactive?: boolean | 0 | 1;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<StockAgingReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<StockAgingReport>>(`${this.base}/inventory/stock-aging`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  async abcAnalysis(params: {
    start_date: string;
    end_date: string;
    metric?: AbcMetric;
    /** Drill into one class; omit for all of them. */
    class?: AbcClass;
    category_id?: string | null;
    brand_id?: string | null;
    product_id?: string | null;
    product_type?: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
    search?: string;
    /** 1/0 — Laravel's `boolean` rule rejects the strings "true"/"false". */
    include_inactive?: boolean | 0 | 1;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<AbcAnalysisReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<AbcAnalysisReport>>(
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
    // `category_id` / `brand_id` are validated as `uuid` by SalesByProductRequest,
    // so they carry the dropdown's string ID rather than a numeric one.
    category_id?: string | null;
    brand_id?: string | null;
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
    sort_by?: 'revenue' | 'orders' | 'outstanding' | 'last_purchase';
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
    category_id?: string | null;
    brand_id?: string | null;
    source?: 'pos' | 'so' | 'all';
    sort_by?: 'revenue' | 'quantity' | 'profit' | 'products';
    tenant_id?: string;
  }): Promise<SalesByCategoryReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<SalesByCategoryReport>>(
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
    /** product | category | brand — customer margin is its own report. */
    group_by?: ProfitMarginGroupBy;
    /** Drill into one margin band; omit for all of them. */
    band?: MarginBand;
    min_margin?: number;
    max_margin?: number;
    category_id?: string | null;
    brand_id?: string | null;
    product_type?: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
    search?: string;
    /** 1/0 — Laravel's `boolean` rule rejects the strings "true"/"false". */
    include_inactive?: boolean | 0 | 1;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<ProfitMarginReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<ProfitMarginReport>>(
      `${this.base}/sales/profit-margin`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async returnAnalysis(params: {
    start_date: string;
    end_date: string;
    /** sales_return | pos_refund — omit for both combined. */
    source?: ReturnSource;
    refund_method?: string;
    status?: string;
    reason?: string;
    customer_id?: string | null;
    warehouse_id?: string | null;
    category_id?: string | null;
    brand_id?: string | null;
    product_type?: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
    /** Percent, 0-100 — flags products above a return rate you care about. */
    min_return_rate?: number;
    search?: string;
    /** 1/0 — Laravel's `boolean` rule rejects the strings "true"/"false". */
    include_inactive?: boolean | 0 | 1;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<ReturnAnalysisReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<ReturnAnalysisReport>>(
      `${this.base}/sales/return-analysis`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  async salesTrend(params: {
    start_date: string;
    end_date: string;
    /** day | week | month | quarter — the period bucket size. */
    group_by?: TrendPeriod;
    search?: string;
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
    status?: PurchaseOrderStatus;
    payment_status?: PurchasePaymentStatus;
    supplier_id?: string | null;
    warehouse_id?: string | null;
    /** 1/0 — only POs past their expected delivery date. */
    late_only?: boolean | 0 | 1;
    search?: string;
    sort?: string;
    dir?: 'asc' | 'desc';
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
    /** purchase_orders.status; 'cancelled' is rejected — never counted. */
    status?: string;
    supplier_id?: string | null;
    warehouse_id?: string | null;
    /** 1/0 — only suppliers with at least one late delivery. */
    late_only?: boolean | 0 | 1;
    search?: string;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<SupplierPerformanceReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<SupplierPerformanceReport>>(
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
    warehouse_id?: string | null;
    movement_type?: StockMovementType;
    category_id?: string | null;
    search?: string;
    include_inactive?: boolean | 0 | 1;
    tenant_id?: string;
  }): Promise<GrnRegisterReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<GrnRegisterReport>>(
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
    start_date: string;
    end_date: string;
    register_id?: string | null;
    search?: string;
    tenant_id?: string;
  }): Promise<HourlySalesReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<HourlySalesReport>>(`${this.base}/pos/hourly-sales`, {
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
    category_id?: string | null;
    brand_id?: string | null;
    search?: string;
    /** 1/0 — Laravel's `boolean` rule rejects the strings "true"/"false". */
    include_inactive?: boolean | 0 | 1;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<PosRefundSummaryReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<PosRefundSummaryReport>>(
      `${this.base}/pos/refund-summary`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  // ── Customer Reports ──────────────────────────────────────────────────────

  async customerAging(params: {
    /** Date the aging is measured against; defaults to today. */
    as_of_date?: string;
    customer_id?: string | null;
    customer_type?: 'own' | 'retail' | 'wholesale' | 'corporate' | 'dealer';
    status?: 'active' | 'inactive';
    /** 1/0 — hide customers whose balance is entirely not-yet-due. */
    only_overdue?: boolean | 0 | 1;
    search?: string;
    sort?: string;
    dir?: 'asc' | 'desc';
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
    /** Drill into one margin band; omit for all of them. */
    band?: CustomerMarginBand;
    /** Percentages, so ±100; the API rejects anything outside that. */
    min_margin?: number;
    customer_id?: string | null;
    customer_type?: 'own' | 'retail' | 'wholesale' | 'corporate' | 'dealer';
    status?: 'active' | 'inactive';
    /** 1/0 — brings back customers who bought nothing in the period. */
    include_zero_revenue?: boolean | 0 | 1;
    search?: string;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<CustomerProfitabilityReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<CustomerProfitabilityReport>>(
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
    start_date?: string;
    end_date?: string;
    /** Percentages, so ±100; the API rejects anything outside that. */
    min_margin?: number;
    max_margin?: number;
    category_id?: string | null;
    brand_id?: string | null;
    product_type?: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
    /** 1/0 — brings back catalogue items that never sold. */
    include_unsold?: boolean | 0 | 1;
    search?: string;
    /** 1/0 — Laravel's `boolean` rule rejects the strings "true"/"false". */
    include_inactive?: boolean | 0 | 1;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<ProductProfitabilityReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<ProductProfitabilityReport>>(
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
    warehouse_id?: string | null;
    category_id?: string | null;
    brand_id?: string | null;
    product_id?: string | null;
    product_type?: 'simple' | 'variable' | 'composite' | 'digital' | 'service';
    status?: StockStatusValue[];
    stock_status?: StockStatusValue | 'all';
    search?: string;
    /** 1/0 — Laravel's `boolean` rule rejects the strings "true"/"false". */
    include_inactive?: boolean | 0 | 1;
    sort?: string;
    dir?: 'asc' | 'desc';
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
    warehouse_id?: string | null;
    movement_type?: StockMovementType;
    direction?: StockMovementDirection;
    category_id?: string | null;
    search?: string;
    include_inactive?: boolean | 0 | 1;
    tenant_id?: string;
  }): Promise<WarehouseTransferReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<WarehouseTransferReport>>(`${this.base}/warehouse/transfer`, {
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
