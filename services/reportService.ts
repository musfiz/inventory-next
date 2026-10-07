// Report builds aggregate across the whole dataset, so a slow one is normal
// rather than exceptional. `longRunningApiClient` keeps their timeouts from
// being read as connectivity evidence — see lib/api/axios.ts.
import { longRunningApiClient as apiClient } from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';
import type { ReceivablesReport } from '@/types/accounting.types';
import type {
  PayablesReport,
  FailedJournalQueueReport,
  FailedJournalQueueBucket,
  FailedJournalQueueStatusFilter,
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
  CashierPerformanceReport,
  PaymentBreakdownReport,
  PoSummaryReport,
  SupplierPerformanceReport,
  PurchaseBySupplierReport,
  PurchaseOrderStatus,
  PurchasePaymentStatus,
  CustomerAgingReport,
  ArAgingReport,
  ArAgingBucket,
  ApAgingReport,
  ApAgingBucket,
  TrialBalanceReportResponse,
  TrialBalanceSide,
  TaxReturnReportResponse,
  TaxReturnTaxType,
  TaxReturnSide,
  SupplierAgingReport,
  SupplierAgingBucket,
  SupplierStatementReport,
  SupplierStatementType,
  SupplierScorecardReport,
  SupplierGrade,
  SupplierPaymentMethod,
  SupplierPaymentResult,
  WarehouseStockReport,
  AuditLogReport,
  ExportFormat,
  GenericReportResponse,
} from '@/types/report.types';

class ReportService {
  private base = '/api/v1/reports';

  // ── Accounting Reports ───────────────────────────────────────────────────

  /**
   * AR Aging — the ledger receivables book, aged per customer.
   *
   * Distinct from `receivables()` (the older /reports/receivables endpoint):
   * this one reads the AR control account off the posted ledger, so its total
   * reconciles with the Balance Sheet, and it supports the full filter set,
   * sorting and the server-side PDF/Excel/CSV export.
   */
  async arAging(params: {
    /** Date the aging is measured against; defaults to today. */
    as_of_date?: string;
    customer_id?: string | null;
    /** Drill into one aging bucket; omit for all of them. */
    bucket?: ArAgingBucket;
    customer_type?: 'own' | 'retail' | 'wholesale' | 'corporate' | 'dealer';
    status?: 'active' | 'inactive' | 'blacklisted';
    /** 1/0 — hide customers whose balance is entirely not-yet-due. */
    only_overdue?: boolean | 0 | 1;
    search?: string;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<ArAgingReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<ArAgingReport>>(
      `${this.base}/accounting/ar-aging`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  /**
   * AP Aging — the ledger payables book, aged per supplier.
   *
   * Distinct from `payables()` (the older /reports/payables endpoint): this one
   * reads the AP control account off the posted ledger, so its total reconciles
   * with the Balance Sheet, and it supports the full filter set, sorting and the
   * server-side PDF/Excel/CSV export.
   */
  async apAging(params: {
    /** Date the aging is measured against; defaults to today. */
    as_of_date?: string;
    supplier_id?: string | null;
    /** Drill into one aging bucket; omit for all of them. */
    bucket?: ApAgingBucket;
    supplier_status?: 'active' | 'inactive' | 'blacklisted';
    /** 1/0 — hide suppliers whose balance is entirely not-yet-due. */
    only_overdue?: boolean | 0 | 1;
    search?: string;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<ApAgingReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<ApAgingReport>>(
      `${this.base}/accounting/ap-aging`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  // ── Accounting (legacy endpoints) ─────────────────────────────────────────

  async receivables(params: { as_of_date: string; tenant_id?: string }): Promise<ReceivablesReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<ReceivablesReport>>(`${this.base}/receivables`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  /** @deprecated Prefer {@link apAging}; kept for the legacy /reports/payables shape. */
  async payables(params: { as_of_date: string; tenant_id?: string }): Promise<PayablesReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<PayablesReport>>(`${this.base}/payables`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  /**
   * Failed Journal Queue — the auto-journal failures behind the ledger's gap.
   *
   * Replaces the admin list this page used to call: that endpoint returns a raw
   * paginated model with none of the aggregates (how much value never posted,
   * how long each failure has been open) that make the queue actionable, and it
   * cannot be filtered, sorted or exported. Retrying and resolving a failure
   * stay on `/admin/failed-journal-entries/{id}/retry|resolve` — a report reads,
   * it does not mutate the ledger.
   */
  async failedJournal(params: {
    /** Date queue ages are measured against; defaults to today. */
    as_of_date?: string;
    start_date?: string | null;
    end_date?: string | null;
    /** Defaults to `all` — a cleared queue and a queue never written look the same otherwise. */
    status?: FailedJournalQueueStatusFilter;
    /** Drill into one queue-age bucket. */
    age_bucket?: FailedJournalQueueBucket;
    reference_type?: string;
    search?: string;
    /** 1/0 — only failures sharing a reference with another open one. */
    only_recurring?: boolean | 0 | 1;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<FailedJournalQueueReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<FailedJournalQueueReport>>(
      `${this.base}/accounting/failed-journal`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  /**
   * Trial Balance — the ledger's own proof that it balances.
   *
   * Distinct from `accountService.trialBalance()` (the older
   * `/reports/trial-balance` endpoint): this one counts `posted` **and**
   * `reversed` journal entries, carries an opening balance so a brought-forward
   * balance is visible, flags off-side balances, and reconciles the cached
   * `accounts.balance` against the ledger.
   */
  async trialBalance(params: {
    /** Defaults to the start of the current month. */
    start_date?: string;
    /** Defaults to today. */
    end_date?: string;
    account_id?: string | null;
    account_type?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'contra';
    account_subtype?: string;
    search?: string;
    /** 1/0 — hide accounts with no movement and no balance. */
    only_with_activity?: boolean | 0 | 1;
    /** 1/0 — only balances sitting opposite their account type's normal side. */
    only_abnormal?: boolean | 0 | 1;
    /** 1/0 — only accounts whose cached balance disagrees with their ledger. */
    only_drift?: boolean | 0 | 1;
    include_inactive?: boolean | 0 | 1;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<TrialBalanceReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<TrialBalanceReportResponse>>(
      `${this.base}/accounting/trial-balance`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  /**
   * @deprecated Prefer {@link failedJournal}. Kept only for the admin list's raw
   * paginated model; the retry/resolve endpoints are unchanged and remain here.
   */
  async failedJournalAdminList(params?: {
    unresolved?: boolean | 0 | 1;
    per_page?: number;
    tenant_id?: string;
  }): Promise<any> {
    const { tenant_id, ...rest } = params ?? {};
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/admin/failed-journal-entries', {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
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
    status?: PurchaseOrderStatus;
    supplier_id?: string | null;
    warehouse_id?: string | null;
    /** 1/0 — only suppliers with an outstanding balance. */
    unpaid_only?: boolean | 0 | 1;
    search?: string;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<PurchaseBySupplierReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<PurchaseBySupplierReport>>(
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
    /** Single day — the register's natural filter. */
    date?: string;
    /** Wins over `date` when both are sent. */
    start_date?: string;
    end_date?: string;
    register_id?: string | null;
    session_id?: string | null;
    payment_method?: string | null;
    payment_status?: string | null;
    search?: string;
    tenant_id?: string;
  }): Promise<PosDailySalesReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<PosDailySalesReport>>(`${this.base}/pos/daily-sales`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  async posSessionSummary(params: {
    start_date?: string;
    end_date?: string;
    status?: string | null;
    /** Reached through the register — pos_sessions has no warehouse_id. */
    warehouse_id?: string | null;
    register_id?: string | null;
    cashier_id?: string | null;
    variance_only?: boolean | number;
    search?: string;
    sort?: string;
    dir?: 'asc' | 'desc';
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
    /** Defaults to the first of the current month server-side. */
    start_date?: string;
    /** Defaults to today server-side. */
    end_date?: string;
    cashier_id?: string | null;
    register_id?: string | null;
    /** Reached through the register — pos_orders has no warehouse_id. */
    warehouse_id?: string | null;
    payment_method?: string | null;
    payment_status?: string | null;
    /** Cashier name, matched server-side with LIKE. */
    search?: string;
    /** Defaults to total_sales. Whitelisted server-side. */
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<CashierPerformanceReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<CashierPerformanceReport>>(
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
    /** Defaults to the first of the current month server-side. */
    start_date?: string;
    /** Defaults to today server-side. */
    end_date?: string;
    payment_method?: string | null;
    /** payments.status — pending, completed, failed, cancelled, refunded. */
    status?: string | null;
    /** Only the two reference types that touch a POS order. */
    reference_type?: 'pos' | 'refund' | null;
    register_id?: string | null;
    session_id?: string | null;
    cashier_id?: string | null;
    /** Payment method, matched server-side with LIKE. */
    search?: string;
    /** Defaults to net_amount. Whitelisted server-side. */
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<PaymentBreakdownReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<PaymentBreakdownReport>>(
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
    /** products.type — simple, variable, composite, digital or service. */
    product_type?: string | null;
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
    /** Date the aging is measured against; defaults to today. */
    as_of_date?: string;
    supplier_id?: string | null;
    /** Drill into one aging bucket; omit for all of them. */
    bucket?: SupplierAgingBucket;
    supplier_status?: 'active' | 'inactive' | 'blacklisted';
    /** 1/0 — hide suppliers whose balance is entirely not-yet-due. */
    only_overdue?: boolean | 0 | 1;
    search?: string;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<SupplierAgingReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<SupplierAgingReport>>(`${this.base}/supplier/aging`, {
      params: { ...rest, ...(tenant_id ? { tenant_id } : {}) },
    });
    return response.data.data;
  }

  async supplierStatement(params: {
    /** Required — a statement is one supplier's account. UUID, not a number. */
    supplier_id: string;
    start_date?: string;
    end_date?: string;
    /** Show only one kind of document; omit for all of them. */
    type?: SupplierStatementType;
    search?: string;
    tenant_id?: string;
  }): Promise<SupplierStatementReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<SupplierStatementReport>>(
      `${this.base}/supplier/statement`,
      { params: { ...rest, ...(tenant_id ? { tenant_id } : {}) } },
    );
    return response.data.data;
  }

  /**
   * Settles part or all of a payable: writes a dated supplier_payments voucher
   * per allocation and moves the order's paid_amount.
   */
  async recordSupplierPayment(
    supplierId: string,
    data: {
      amount: number;
      payment_method: SupplierPaymentMethod;
      payment_date?: string;
      notes?: string;
    },
  ): Promise<SupplierPaymentResult> {
    const response = await apiClient.post<ApiResponse<SupplierPaymentResult>>(
      `/api/v1/suppliers/${supplierId}/record-payment`,
      data,
    );
    return response.data.data;
  }

  async supplierScorecard(params: {
    start_date?: string;
    end_date?: string;
    /** UUID — every suppliers.id is a UUID, not a number. */
    supplier_id?: string;
    warehouse_id?: string;
    /** Computed grade; filtering by it happens server-side, not in SQL. */
    grade?: SupplierGrade;
    search?: string;
    tenant_id?: string;
  }): Promise<SupplierScorecardReport> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<SupplierScorecardReport>>(
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

  /**
   * Tax Return (RPT-TAX-001) — the tax position for a filing period.
   *
   * Rebuilt on the server's ReportDefinition pipeline: it reads the tenant's
   * posted tax accounts (2110/2111/2112 output, 1140 input) off the ledger, so
   * the figure reconciles with the Balance Sheet. The endpoint this replaced
   * served `tax_type`/`taxable_amount` rows that it never actually returned, and
   * summed tax off sales and purchase *documents* — counting unposted documents,
   * ignoring POS sales and returns.
   */
  async taxReturn(params: {
    /** Defaults to the start of the current month. */
    start_date?: string;
    /** Defaults to today. */
    end_date?: string;
    tax_type?: TaxReturnTaxType;
    /** Output is what the business owes; input is what it can reclaim. */
    side?: TaxReturnSide;
    search?: string;
    /** 1/0 — hide tax accounts with no movement and no balance. */
    only_with_activity?: boolean | 0 | 1;
    sort?: string;
    dir?: 'asc' | 'desc';
    tenant_id?: string;
  }): Promise<TaxReturnReportResponse> {
    const { tenant_id, ...rest } = params;
    const response = await apiClient.get<ApiResponse<TaxReturnReportResponse>>(`${this.base}/tax/tax-return`, {
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
