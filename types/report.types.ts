// Report Module Types
// Shared type definitions for the consolidated report system.

// ── Common Param Types ──────────────────────────────────────────────────────

export interface DateRangeParams {
  start_date: string;
  end_date: string;
}

export interface AsOfDateParams {
  as_of_date: string;
}

export interface WarehouseFilterParams {
  warehouse_id?: number | null;
}

export interface CategoryFilterParams {
  category_id?: number | null;
}

export interface BrandFilterParams {
  brand_id?: number | null;
}

export interface ReportParams
  extends DateRangeParams,
    WarehouseFilterParams,
    CategoryFilterParams,
    BrandFilterParams {
  [key: string]: string | number | boolean | null | undefined;
}

// ── Common Response Types ───────────────────────────────────────────────────

export interface ReportSummaryCard {
  label: string;
  value: number | string;
  subValue?: string;
  color?: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'amber' | 'gray';
  icon?: string;
}

export interface ReportMeta {
  generated_at?: string;
  [key: string]: any;
}

export interface GenericReportResponse<T = Record<string, any>> {
  data: T[];
  summary?: Record<string, number | string>;
  meta?: ReportMeta;
  [key: string]: any;
}

// ── AP Aging (Payables) ─────────────────────────────────────────────────────
// Mirrors ReceivablesReport structure from accounting.types.ts

export interface PayablesAgingBucket {
  current: number;
  d_31_60: number;
  d_61_90: number;
  d_90_plus: number;
  total: number;
}

export interface PayablesSupplier {
  supplier_id: number;
  supplier_name: string;
  supplier_phone?: string | null;
  supplier_email?: string | null;
  po_count: number;
  oldest_po_date?: string | null;
  aging: PayablesAgingBucket;
}

export interface PayablesReport {
  as_of_date: string;
  total_outstanding: number;
  total_current: number;
  total_31_60: number;
  total_61_90: number;
  total_90_plus: number;
  supplier_count: number;
  suppliers: PayablesSupplier[];
}

// ── Failed Journal Queue ────────────────────────────────────────────────────

export interface FailedJournalEntry {
  id: number;
  tenant_id: number;
  reference_type: string | null;
  reference_id: number | null;
  payload: Record<string, any> | null;
  error_message: string | null;
  status: 'unresolved' | 'resolved';
  attempts: number;
  resolved_at: string | null;
  resolved_by: number | null;
  resolver?: { id: number; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface FailedJournalReport {
  data: FailedJournalEntry[];
  total: number;
  unresolved_count: number;
  resolved_count: number;
  error_breakdown?: { error_type: string; count: number }[];
}

// ── Stock Aging ─────────────────────────────────────────────────────────────

/** Age buckets, matching the `stock_aging.age_category` enum on the backend. */
export type StockAgingBucket = '0-30' | '31-60' | '61-90' | '91-180' | '181-365' | '365+' | 'unknown';

/** Whether a line is selling. Computed server-side against the slow-moving threshold. */
export type StockVelocity = 'fast_moving' | 'slow_moving' | 'never_sold';

export interface StockAgingRow {
  product_name: string;
  variation_name: string | null;
  sku: string;
  barcode: string | null;
  category_name: string | null;
  brand_name: string | null;
  warehouse_name: string | null;
  unit_name: string | null;
  on_hand: number;
  reserved: number;
  available: number;
  unit_cost: number;
  stock_value: number;
  last_received_at: string | null;
  /** null when the line has no receipt history at all — see bucket 'unknown'. */
  age_days: number | null;
  bucket: StockAgingBucket;
  bucket_label: string;
  last_sold_at: string | null;
  days_since_sold: number | null;
  velocity: string;
  velocity_key: StockVelocity;
}

export interface StockAgingBucketSummary {
  key: StockAgingBucket;
  label: string;
  lines: number;
  quantity: number;
  value: number;
  share_pct: number;
}

export interface StockAgingReport {
  data: StockAgingRow[];
  summary: {
    as_of_date: string;
    /** True when as_of_date is in the past, so stock is replayed from the ledger. */
    is_historical: boolean;
    total_lines: number;
    total_skus: number;
    warehouse_count: number;
    category_count: number;
    total_quantity: number;
    total_reserved: number;
    total_stock_value: number;
    avg_value_per_line: number;
    /** null when no line has a receipt date to measure. */
    avg_age_days: number | null;
    oldest_age_days: number | null;
    /** Lines that could not be aged — a data-quality signal, not a gap. */
    unknown_age_lines: number;
    /** Days without a sale after which a line counts as slow-moving. */
    slow_moving_days: number;
    slow_moving_lines: number;
    slow_moving_value: number;
    slow_moving_share_pct: number;
    /** Always every bucket, in order, including the empty ones. */
    by_bucket: StockAgingBucketSummary[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── ABC Analysis ────────────────────────────────────────────────────────────

/** Metric that drives the ABC ranking. */
export type AbcMetric = 'revenue' | 'quantity' | 'profit';

export type AbcClass = 'A' | 'B' | 'C';

export interface AbcAnalysisRow {
  rank: number;
  product_name: string;
  variation_name: string | null;
  sku: string;
  barcode: string | null;
  category_name: string | null;
  brand_name: string | null;
  units_sold: number;
  revenue: number;
  profit: number;
  cumulative_pct: number;
  class: AbcClass;
  class_label: string;
}

export interface AbcClassSummary {
  key: AbcClass;
  label: string;
  lines: number;
  value: number;
  share_pct: number;
}

export interface AbcAnalysisReport {
  data: AbcAnalysisRow[];
  summary: {
    start_date: string;
    end_date: string;
    metric: AbcMetric;
    total_lines: number;
    total_units: number;
    total_revenue: number;
    total_profit: number;
    /** Sum of the currently selected metric over all rows (== A+B+C value). */
    metric_total: number;
    /** Always A, B, C in order — empty classes included so the cards are stable. */
    by_class: AbcClassSummary[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── Dead Stock ──────────────────────────────────────────────────────────────

export interface DeadStockRow {
  product_name: string;
  variation_name: string | null;
  sku: string;
  barcode: string | null;
  category_name: string | null;
  brand_name: string | null;
  warehouse_name: string;
  quantity: number;
  unit_cost: number;
  total_value: number;
  last_sale_date: string | null;
  /** Null when the line has never sold and creation date can't substitute. */
  days_since_last_sale: number | null;
}

export interface DeadStockReport {
  data: DeadStockRow[];
  summary: {
    total_lines: number;
    total_skus: number;
    total_units: number;
    total_value: number;
    oldest_idle_days: number | null;
    days_threshold: number;
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── Stock Adjustment ────────────────────────────────────────────────────────

/** Kept in step with App\Reports\Inventory\StockAdjustmentReport::TYPES. */
export type StockAdjustmentType = 'adjustment' | 'damage' | 'expiry';

export type StockAdjustmentDirection = 'increase' | 'decrease';

export interface StockAdjustmentRow {
  date: string;
  product_name: string;
  variation_name: string | null;
  sku: string;
  barcode: string | null;
  category_name: string | null;
  brand_name: string | null;
  warehouse_name: string;
  adjustment_type: StockAdjustmentType;
  type_label: string;
  direction: StockAdjustmentDirection;
  qty_change: number;
  unit_cost: number;
  /** Gross exposure: |qty_change| × unit cost. */
  value: number;
  reason: string | null;
  approved_by: string | null;
}

export interface StockAdjustmentTypeSummary {
  key: StockAdjustmentType;
  label: string;
  count: number;
  value: number;
  share_pct: number;
}

export interface StockAdjustmentReport {
  data: StockAdjustmentRow[];
  summary: {
    start_date: string;
    end_date: string;
    total_lines: number;
    /** Signed: corrections up minus write-offs down. */
    net_qty_change: number;
    total_value: number;
    /** Value of decreases only — the shrinkage figure. */
    written_off_value: number;
    by_type: StockAdjustmentTypeSummary[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── Inventory Report Types ──────────────────────────────────────────────────

export type CostingMethod = 'weighted_avg' | 'fifo' | 'lifo' | 'standard';

export interface StockValuationRow {
  product_name: string;
  variation_name: string | null;
  sku: string;
  barcode: string | null;
  category_name: string | null;
  brand_name: string | null;
  warehouse_name: string | null;
  unit_name: string | null;
  on_hand: number;
  reserved: number;
  available: number;
  /** Cost the row was actually priced with, per the selected costing method. */
  unit_cost: number;
  weighted_avg_cost: number;
  last_cost: number;
  standard_cost: number;
  selling_price: number;
  stock_value: number;
  retail_value: number;
  margin: number;
  margin_pct: number | null;
  /** 'Costed' | 'No cost' | 'No stock' — why the row is (not) priced. */
  cost_basis: string;
  last_received_at: string | null;
}

/** One row of a "where does the money sit" breakdown. */
export interface ValuationBreakdownRow {
  name: string;
  quantity: number;
  value: number;
  share_pct: number;
}

export interface StockValuationReport {
  data: StockValuationRow[];
  summary: {
    as_of_date: string;
    /** True when as_of_date is in the past, so quantities are replayed from the ledger. */
    is_historical: boolean;
    costing_method: CostingMethod;
    total_lines: number;
    total_skus: number;
    warehouse_count: number;
    category_count: number;
    total_quantity: number;
    total_reserved: number;
    total_reserved_value: number;
    total_stock_value: number;
    total_retail_value: number;
    potential_margin: number;
    margin_pct: number | null;
    avg_unit_cost: number;
    avg_value_per_line: number;
    /** Lines holding stock that has no cost on record — a data-quality flag. */
    uncosted_lines: number;
    concentration_rows: number;
    /** Share of total value held by the top `concentration_rows` lines. */
    concentration_share_pct: number;
    by_category: ValuationBreakdownRow[];
    by_warehouse: ValuationBreakdownRow[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

/** Kept in step with App\Reports\Inventory\ReorderReport::SEVERITIES. */
export type ReorderSeverity = 'critical' | 'low';

export interface ReorderRow {
  product_name: string;
  variation_name: string | null;
  sku: string;
  barcode: string | null;
  category_name: string | null;
  brand_name: string | null;
  warehouse_name: string;
  current_qty: number;
  /** Stock on hand minus stock reserved on unshipped orders. */
  available_qty: number;
  reorder_point: number;
  target_qty: number;
  suggested_qty: number;
  unit_cost: number;
  suggested_value: number;
  last_received_date: string | null;
  supplier_name: string | null;
  severity: ReorderSeverity;
}

export interface ReorderSeveritySummary {
  key: ReorderSeverity;
  label: string;
  lines: number;
  suggested_value: number;
  share_pct: number;
}

export interface ReorderReport {
  data: ReorderRow[];
  summary: {
    total_lines: number;
    total_suggested_qty: number;
    total_suggested_value: number;
    by_severity: ReorderSeveritySummary[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

/** Kept in step with App\Reports\Inventory\LowStockReport::STATUSES. */
export type LowStockStatus = 'out_of_stock' | 'critical' | 'low';

export interface LowStockRow {
  product_name: string;
  variation_name: string | null;
  sku: string;
  barcode: string | null;
  category_name: string | null;
  brand_name: string | null;
  warehouse_name: string;
  current_qty: number;
  reserved_qty: number;
  available_qty: number;
  min_quantity: number;
  shortfall_qty: number;
  /** Available ÷ minimum, as a percentage. */
  fill_pct: number;
  unit_cost: number;
  shortfall_value: number;
  status: LowStockStatus;
}

export interface LowStockStatusSummary {
  key: LowStockStatus;
  label: string;
  lines: number;
  shortfall_value: number;
  share_pct: number;
}

export interface LowStockReport {
  data: LowStockRow[];
  summary: {
    total_lines: number;
    total_low_stock: number;
    total_shortfall_qty: number;
    total_shortfall_value: number;
    by_status: LowStockStatusSummary[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

/**
 * Kept in step with App\Reports\Inventory\StockMovementReport::TYPES — the
 * stock_movements enum, not an open string.
 */
export type StockMovementType =
  | 'purchase'
  | 'return'
  | 'production'
  | 'transfer_in'
  | 'sales'
  | 'transfer_out'
  | 'consumption'
  | 'damage'
  | 'expiry'
  | 'adjustment';

/** Read from the sign of qty_change — an adjustment can go either way. */
export type StockMovementDirection = 'in' | 'out';

export interface StockMovementRow {
  /** Movement UUID — this table's primary key is a char(36), not an integer. */
  id: string;
  date: string;
  product_name: string;
  variation_name: string | null;
  sku: string;
  barcode: string | null;
  category_name: string | null;
  brand_name: string | null;
  warehouse_name: string;
  movement_type: StockMovementType;
  type_label: string;
  direction: StockMovementDirection;
  qty_before: number;
  /** Signed: positive adds stock, negative removes it. */
  qty_change: number;
  qty_after: number;
  unit_cost: number;
  /** Gross value: |qty_change| × unit cost. */
  total_cost: number;
  /** "type#number", the reference the movement was posted against. */
  reference: string | null;
  reference_type: string | null;
  reference_number: string | null;
  reason: string | null;
  created_by: string | null;
}

export interface StockMovementTypeSummary {
  key: StockMovementType;
  label: string;
  count: number;
  qty_in: number;
  qty_out: number;
  net_qty: number;
  value: number;
}

/**
 * One contract for the whole ledger family: the movement ledger, the GRN
 * register (scoped to receipts) and warehouse transfers (scoped to
 * transfers). They are the same report with a different type scope.
 */
export interface StockLedgerReport {
  data: StockMovementRow[];
  summary: {
    start_date: string;
    end_date: string;
    total_lines: number;
    /** Magnitudes, not signed: stock added / stock removed in the period. */
    total_in: number;
    total_out: number;
    /** Signed: total_in − total_out. */
    net_change: number;
    total_value: number;
    by_type: StockMovementTypeSummary[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

export type StockMovementReport = StockLedgerReport;
export type GrnRegisterReport = StockLedgerReport;
export type WarehouseTransferReport = StockLedgerReport;

/** Kept in step with App\Reports\Inventory\BatchExpiryReport::BUCKETS. */
export type BatchExpiryBucket = 'expired' | '0-7' | '8-30' | '31-60' | '61-90' | '90_plus' | 'no_expiry';

/** Kept in step with App\Reports\Inventory\BatchExpiryReport::BATCH_STATUSES. */
export type BatchStatus = 'active' | 'expired' | 'exhausted' | 'quarantined';

export interface BatchExpiryRow {
  product_name: string;
  variation_name: string | null;
  sku: string;
  barcode: string | null;
  category_name: string | null;
  brand_name: string | null;
  batch_number: string;
  warehouse_name: string;
  mfg_date: string | null;
  /** Null when the batch carries no expiry date at all. */
  expiry_date: string | null;
  /** DATEDIFF(expiry_date, as_of_date) — negative once expired. */
  days_to_expiry: number | null;
  age_days: number | null;
  current_qty: number;
  /** On hand less reserved — reserved stock is already committed. */
  available_qty: number;
  unit_cost: number;
  value_at_risk: number;
  /** The operational flag the ledger maintains, independent of expiry. */
  batch_status: BatchStatus;
  expiry_bucket: BatchExpiryBucket;
  bucket_label: string;
}

export interface BatchExpiryBucketSummary {
  key: BatchExpiryBucket;
  label: string;
  batches: number;
  units: number;
  value: number;
  share_pct: number;
}

export interface BatchExpiryReport {
  data: BatchExpiryRow[];
  summary: {
    as_of_date: string;
    total_batches: number;
    total_units: number;
    total_value_at_risk: number;
    /** Value of date-expired batches only — the operational flag is separate. */
    expired_value: number;
    soonest_expiry_days: number | null;
    /** Always in urgency order, empty buckets included. */
    by_bucket: BatchExpiryBucketSummary[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

export type StockStatusValue = 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';

export interface StockStatusRow {
  product_name: string;
  variation_name: string | null;
  sku: string;
  barcode: string | null;
  category_name: string | null;
  brand_name: string | null;
  warehouse_name: string | null;
  unit_name: string | null;
  on_hand: number;
  reserved: number;
  available: number;
  reorder_point: number;
  max_quantity: number | null;
  avg_cost: number;
  stock_value: number;
  retail_value: number;
  status: StockStatusValue;
  status_label: string;
  last_received_at: string | null;
  last_sold_at: string | null;
}

export interface StockStatusReport {
  data: StockStatusRow[];
  summary: {
    total_skus: number;
    in_stock_count: number;
    low_stock_count: number;
    out_of_stock_count: number;
    overstock_count: number;
    total_quantity: number;
    total_stock_value: number;
    total_retail_value: number;
    potential_margin: number;
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

export interface ReportColumnMeta {
  key: string;
  label: string;
  type: string;
  align: string;
  totals: boolean;
}

// ── Sales by Category ───────────────────────────────────────────────────────

export interface SalesByCategoryRow {
  category_name: string;
  product_count: number;
  units_sold: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  margin_pct: number;
  revenue_share_pct: number;
}

export interface SalesByCategoryReport {
  data: SalesByCategoryRow[];
  summary: {
    total_revenue: number;
    total_cogs: number;
    total_profit: number;
    avg_margin: number;
    category_count: number;
  };
  generated_at?: string;
}

// ── Profit Margin ───────────────────────────────────────────────────────────

/** Kept in step with App\Reports\Sales\SalesProfitMarginReport::GROUPS. */
export type ProfitMarginGroupBy = 'product' | 'category' | 'brand';

/** Margin bands, worst first, as defined by the report's BANDS constant. */
export type MarginBand = 'loss' | 'marginal' | 'thin' | 'healthy' | 'strong';

export interface ProfitMarginRow {
  group_name: string;
  /** Secondary label: variation + SKU, or blank when grouped higher up. */
  detail: string | null;
  units_sold: number;
  revenue: number;
  cost: number;
  gross_profit: number;
  margin_pct: number;
  avg_selling_price: number;
  avg_unit_cost: number;
  /** Previous period of equal length — null when there was no sales then. */
  prev_revenue: number | null;
  prev_margin_pct: number | null;
  revenue_change_pct: number | null;
  /** Margin movement in percentage points. */
  margin_change_pts: number | null;
  margin_band: MarginBand;
  band_label: string;
}

export interface MarginBandSummary {
  key: MarginBand;
  label: string;
  groups: number;
  revenue: number;
  gross_profit: number;
  share_pct: number;
}

export interface ProfitMarginReport {
  data: ProfitMarginRow[];
  summary: {
    start_date: string;
    end_date: string;
    group_by: ProfitMarginGroupBy;
    total_groups: number;
    total_units: number;
    total_revenue: number;
    total_cost: number;
    total_gross_profit: number;
    /** Blended: total gross profit ÷ total revenue. */
    margin_pct: number;
    prev_revenue: number;
    revenue_change_pct: number | null;
    loss_groups: number;
    loss_value: number;
    /** Always worst-first, empty bands included. */
    by_band: MarginBandSummary[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── Return Analysis ─────────────────────────────────────────────────────────

/** Kept in step with App\Reports\Sales\ReturnAnalysisReport::SOURCES. */
export type ReturnSource = 'sales_return' | 'pos_refund';

export type ReturnRisk = 'high' | 'normal';

export interface ReturnAnalysisRow {
  product_name: string;
  variation_name: string | null;
  sku: string;
  barcode: string | null;
  category_name: string | null;
  brand_name: string | null;
  /** Gross units invoiced in the period — the denominator for the rate. */
  units_sold: number;
  units_returned: number;
  sales_return_units: number;
  pos_refund_units: number;
  return_rate_pct: number;
  credit_value: number;
  revenue: number;
  net_revenue: number;
  /** Reason covering the most returned units; null when none was recorded. */
  top_reason: string | null;
  risk: ReturnRisk;
}

export interface ReturnReasonSummary {
  reason: string;
  units: number;
  credit: number;
  share_pct: number;
}

export interface ReturnAnalysisReport {
  data: ReturnAnalysisRow[];
  summary: {
    start_date: string;
    end_date: string;
    source: ReturnSource | 'all';
    total_products: number;
    total_units_sold: number;
    total_units_returned: number;
    /** Blended across units, not the mean of the row percentages. */
    return_rate_pct: number;
    total_credit: number;
    total_revenue: number;
    total_net_revenue: number;
    high_return_threshold: number;
    high_return_products: number;
    high_return_credit: number;
    /** Busiest reasons first, capped at ten. */
    by_reason: ReturnReasonSummary[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

export interface PosRefundRow {
  id: string;
  date: string | null;
  /** The original POS invoice the refund came off. */
  invoice_number: string;
  product_name: string;
  variation_name: string | null;
  sku: string;
  barcode: string | null;
  register_name: string | null;
  customer_name: string | null;
  quantity: number;
  quantity_returned: number;
  refund_rate_pct: number;
  unit_price: number;
  refund_value: number;
  /**
   * Always "Not recorded" in practice — the POS ledger has no refund-reason
   * column on either the order or the line.
   */
  reason: string | null;
}

export interface PosRefundSummaryReport {
  data: PosRefundRow[];
  summary: {
    start_date: string;
    end_date: string;
    total_refunds: number;
    total_orders: number;
    total_units_sold: number;
    total_units_refunded: number;
    total_refund_value: number;
    refund_rate_pct: number;
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── Sales Report Types ──────────────────────────────────────────────────────

export interface SalesByProductRow {
  product_name: string;
  variation_name: string | null;
  sku: string;
  category_name: string | null;
  units_sold: number;
  gross_revenue: number;
  discount: number;
  net_revenue: number;
  cogs: number;
  gross_profit: number;
  margin_pct: number;
}

export interface SalesByProductReport {
  data: SalesByProductRow[];
  summary: {
    total_revenue: number;
    total_cogs: number;
    total_gross_profit: number;
    avg_margin: number;
  };
  generated_at?: string;
}

export interface SalesByCustomerRow {
  customer_name: string;
  customer_type: string | null;
  phone: string | null;
  order_count: number;
  total_revenue: number;
  total_paid: number;
  outstanding: number;
  avg_order_value: number;
  last_purchase: string | null;
}

export interface SalesByCustomerReport {
  data: SalesByCustomerRow[];
  summary: {
    total_revenue: number;
    total_paid: number;
    total_outstanding: number;
    customer_count: number;
    avg_revenue_per_customer: number;
  };
  generated_at?: string;
}

/** Kept in step with App\Reports\Sales\SalesTrendReport::PERIODS. */
export type TrendPeriod = 'day' | 'week' | 'month' | 'quarter';

export interface SalesTrendRow {
  /** Labelled per granularity: 2026-09-15, 2026-W38, 2026-09, 2026-Q3. */
  period: string;
  period_start: string | null;
  /** The two channels are reported separately — the split is the point. */
  pos_revenue: number;
  so_revenue: number;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  margin_pct: number;
  units_sold: number;
  order_count: number;
  avg_order_value: number;
}

export interface TrendPeriodExtremes {
  period: string;
  revenue: number;
}

export interface SalesTrendReport {
  data: SalesTrendRow[];
  summary: {
    start_date: string;
    end_date: string;
    group_by: TrendPeriod;
    total_periods: number;
    active_periods: number;
    total_revenue: number;
    total_cost: number;
    gross_profit: number;
    margin_pct: number;
    total_units: number;
    order_count: number;
    avg_order_value: number;
    avg_period_revenue: number;
    pos_revenue: number;
    so_revenue: number;
    best_period: TrendPeriodExtremes | null;
    /** Lowest period that actually traded — a zero day is not the worst day. */
    worst_period: TrendPeriodExtremes | null;
    prev_period_start: string;
    prev_period_end: string;
    prev_revenue: number;
    growth_pct: number | null;
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

export interface HourlySalesRow {
  hour: number;
  hour_label: string;
  hour_start: string | null;
  order_count: number;
  units_sold: number;
  revenue: number;
  cost: number;
  gross_profit: number;
  avg_order_value: number;
  units_per_order: number;
  /** This hour's slice of the day's revenue. */
  share_pct: number;
}

export interface HourlySalesReport {
  data: HourlySalesRow[];
  summary: {
    start_date: string;
    end_date: string;
    total_revenue: number;
    total_cost: number;
    gross_profit: number;
    order_count: number;
    total_units: number;
    avg_order_value: number;
    trading_hours: number;
    avg_hourly_revenue: number;
    busiest_hour: { hour: string; revenue: number; orders: number } | null;
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}



// ── Cashier Performance ─────────────────────────────────────────────────────

export interface CashierPerformanceRow {
  cashier_name: string;
  register_name: string;
  sessions: number;
  sale_count: number;
  total_sales: number;
  refund_count: number;
  refund_amount: number;
  avg_sale: number;
  cash_variance: number;
  items_per_sale: number;
}

export interface CashierPerformanceReport {
  data: CashierPerformanceRow[];
  summary: {
    top_performer: string;
    total_sales: number;
    avg_variance: number;
  };
}

// ── Payment Breakdown ───────────────────────────────────────────────────────

export interface PaymentBreakdownRow {
  payment_method: string;
  transaction_count: number;
  total_amount: number;
  processing_fees: number;
  net_amount: number;
  pct_of_total: number;
}

export interface PaymentBreakdownReport {
  data: PaymentBreakdownRow[];
  summary: {
    total_collected: number;
    cash_pct: number;
    digital_pct: number;
  };
}

// ── POS Refund Summary ──────────────────────────────────────────────────────
// The POS refund summary is defined alongside the return analysis types
// above (PosRefundRow / PosRefundSummaryReport). The old PosRefundSummaryRow
// type described columns the endpoint never returned.

// ── Tax Return ──────────────────────────────────────────────────────────────

export interface TaxReturnRow {
  tax_type: string;
  taxable_amount: number;
  tax_collected: number;
  tax_paid: number;
  net_liability: number;
}

export interface TaxReturnReport {
  data: TaxReturnRow[];
  summary: {
    total_tax_collected: number;
    total_tax_paid: number;
    net_tax_due: number;
  };
}

// ── POS Report Types ────────────────────────────────────────────────────────

export interface PosDailySalesRow {
  order_number: string;
  time: string;
  customer_name: string | null;
  item_count: number;
  subtotal: number;
  discount: number;
  tax: number;
  grand_total: number;
  payment_method: string;
  payment_status: string;
  cashier_name: string;
}

export interface PosDailySalesReport {
  data: PosDailySalesRow[];
  summary: {
    total_sales: number;
    total_discount: number;
    total_tax: number;
    order_count: number;
    by_payment_method: { method: string; count: number; amount: number }[];
  };
}

export interface PosSessionSummaryReport {
  session: {
    id: number;
    register_name: string;
    cashier_name: string;
    start_time: string;
    end_time: string | null;
  };
  opening_balance: number;
  cash_sales: number;
  card_sales: number;
  bkash_sales: number;
  nagad_sales: number;
  rocket_sales: number;
  bank_transfer_sales: number;
  credit_sales: number;
  total_sales: number;
  refunds: number;
  cash_in: number;
  cash_out: number;
  expected_cash: number;
  actual_cash: number;
  variance: number;
}

// ── Supplier Performance ────────────────────────────────────────────────────

/**
 * Rating bucket from the documented composite score:
 * on time 0.40 + lead time 0.35 + returns 0.25, renormalised over the
 * components that exist.
 */
export type SupplierTier = 'excellent' | 'good' | 'fair' | 'poor';

export interface SupplierPerformanceRow {
  supplier_id: string;
  supplier_name: string;
  supplier_code: string | null;
  email: string | null;
  phone: string | null;
  supplier_status: 'active' | 'inactive' | 'blacklisted' | null;
  po_count: number;
  /** Cancelled POs are excluded from the row set entirely. */
  total_purchase_value: number;
  total_paid: number;
  total_due: number;
  delivered_pos: number;
  open_pos: number;
  late_pos: number;
  /** How many POs the on-time and lead-time figures actually rest on. */
  measured_pos: number;
  /** null when no receipt movements exist — unmeasured, not zero. */
  on_time_delivery_pct: number | null;
  /** null when no receipt movements exist — unmeasured, not zero. */
  avg_lead_time_days: number | null;
  /** Draft and cancelled returns are not counted against the supplier. */
  return_count: number;
  return_value: number;
  return_rate_pct: number | null;
  last_purchase_date: string | null;
  /** null unless there is delivery evidence to score. */
  performance_score: number | null;
  performance_tier: SupplierTier | null;
}

export interface SupplierPerformanceReport {
  data: SupplierPerformanceRow[];
  summary: {
    start_date: string;
    end_date: string;
    total_suppliers: number;
    total_pos: number;
    total_purchase_value: number;
    total_paid: number;
    total_due: number;
    delivered_pos: number;
    open_pos: number;
    late_pos: number;
    measured_pos: number;
    /** Blended across measured deliveries, never the mean of the rows. */
    avg_on_time_rate: number | null;
    avg_lead_time_days: number | null;
    total_return_count: number;
    total_return_value: number;
    return_rate_pct: number | null;
    /** Share of deliveries we can actually measure. */
    delivery_coverage_pct: number | null;
    best_supplier: string | null;
    best_supplier_score: number | null;
    worst_supplier: string | null;
    worst_supplier_score: number | null;
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── Purchase by Supplier ────────────────────────────────────────────────────

export interface PurchaseBySupplierRow {
  supplier_name: string;
  po_count: number;
  total_items: number;
  total_quantity: number;
  total_value: number;
  total_paid: number;
  total_due: number;
}

export interface PurchaseBySupplierReport {
  data: PurchaseBySupplierRow[];
  summary: {
    total_spend: number;
    top_supplier: string;
  };
}

// ── GRN Register ────────────────────────────────────────────────────────────
// The GRN register is the stock ledger scoped to receipts, so it shares the
// StockLedgerReport contract — see GrnRegisterReport above. The old
// GrnRegisterRow type described columns the endpoint never returned.

// ── Purchase Report Types ───────────────────────────────────────────────────

/** Kept in step with App\Reports\Purchase\PurchaseOrderSummaryReport::STATUSES. */
export type PurchaseOrderStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'ordered'
  | 'partial'
  | 'received'
  | 'completed'
  | 'cancelled';

/** Kept in step with the report's PAYMENT_STATUSES. */
export type PurchasePaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

/** null when the PO carries no expected delivery date. */
export type DeliveryStatus = 'late' | 'on_track' | 'closed' | null;

export interface PoSummaryRow {
  po_number: string;
  supplier_order_no: string | null;
  supplier_name: string | null;
  warehouse_name: string | null;
  order_date: string | null;
  expected_delivery_date: string | null;
  /** Positive when delivery is behind the expected date. */
  days_late: number | null;
  delivery_status: DeliveryStatus;
  status: PurchaseOrderStatus;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  shipping_charge: number;
  /** grand_total, falling back to the legacy total_amount. */
  total: number;
  paid_amount: number;
  due: number;
  item_count: number;
  quantity_ordered: number;
  quantity_received: number;
  /** Floors at zero — an over-delivery shows as no pending units. */
  pending_qty: number;
  /** Uncapped, so an over-receipt (>100%) stays visible as a data problem. */
  receiving_rate_pct: number;
  payment_status: PurchasePaymentStatus;
  /** Statuses that represent a real commitment: approved/ordered/partial/received/completed. */
  is_committed: boolean;
}

export interface PurchaseOrderStatusSummary {
  key: PurchaseOrderStatus;
  label: string;
  count: number;
  value: number;
}

export interface PoSummaryReport {
  data: PoSummaryRow[];
  summary: {
    start_date: string;
    end_date: string;
    total_pos: number;
    total_value: number;
    total_paid: number;
    total_due: number;
    /** Total of committed statuses only — draft/pending/cancelled excluded. */
    committed_value: number;
    awaiting_delivery: number;
    late_pos: number;
    total_ordered_qty: number;
    total_received_qty: number;
    receiving_rate_pct: number;
    top_supplier: { name: string; orders: number; value: number } | null;
    /** Every status present, so the cards stay stable. */
    count_by_status: PurchaseOrderStatusSummary[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── Customer Profitability ──────────────────────────────────────────────────

/** Kept in step with App\Reports\Sales\CustomerProfitabilityReport::BANDS. */
export type CustomerMarginBand = 'loss' | 'thin' | 'healthy' | 'strong';

export interface CustomerProfitabilityRow {
  customer_id: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  customer_type: string | null;
  status: string | null;
  order_count: number;
  /** Units actually kept, after returns. */
  units: number;
  avg_order_value: number;
  /** Invoiced, before discount and returns. */
  gross_revenue: number;
  discounts: number;
  /** Credit issued against returns in the period. */
  returns_value: number;
  /** gross_revenue − discounts − returns_value. */
  revenue: number;
  cogs: number;
  /** revenue − cogs. Returns are deducted once, as cash. */
  gross_profit: number;
  margin_pct: number;
  return_rate_pct: number;
  first_order_date: string | null;
  last_order_date: string | null;
  days_since_last_order: number | null;
  outstanding_balance: number;
  credit_limit: number;
  /** Null when no credit limit is configured. */
  available_credit: number | null;
  margin_band: CustomerMarginBand;
  band_label: string;
}

export interface CustomerMarginBandSummary {
  key: CustomerMarginBand;
  label: string;
  customers: number;
  revenue: number;
  profit: number;
}

export interface CustomerProfitabilityExtremes {
  name: string;
  profit: number;
  revenue?: number;
}

export interface CustomerProfitabilityReport {
  data: CustomerProfitabilityRow[];
  summary: {
    start_date: string;
    end_date: string;
    total_customers: number;
    order_count: number;
    total_units: number;
    gross_revenue: number;
    discounts: number;
    returns_value: number;
    revenue: number;
    total_cogs: number;
    total_profit: number;
    /** Blended: total profit ÷ net revenue. */
    margin_pct: number;
    avg_revenue_per_customer: number;
    total_outstanding: number;
    loss_customers: number;
    loss_value: number;
    top_customer: CustomerProfitabilityExtremes | null;
    worst_customer: CustomerProfitabilityExtremes | null;
    /** Worst band first, empty bands included. */
    by_band: CustomerMarginBandSummary[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── Customer Report Types ───────────────────────────────────────────────────

/** Kept in step with App\Reports\Sales\CustomerAgingReport::BUCKETS. */
export type CustomerAgingBucket = 'current' | 'd_1_30' | 'd_31_60' | 'd_61_90' | 'd_90_plus';

/** A zero credit limit means "none configured", not "no credit left". */
export type CreditStatus = 'within_limit' | 'over_limit' | 'no_limit';

export interface CustomerAgingRow {
  customer_id: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  customer_type: string | null;
  status: string | null;
  total_outstanding: number;
  /** Balance pivoted across aging buckets — the AR statement shape. */
  current: number;
  d_1_30: number;
  d_31_60: number;
  d_61_90: number;
  d_90_plus: number;
  total_overdue: number;
  overdue_pct: number;
  oldest_days_overdue: number;
  invoice_count: number;
  /** Comma-separated invoice numbers behind this balance. */
  invoice_numbers: string;
  credit_limit: number;
  /** Null when no credit limit is configured. */
  available_credit: number | null;
  credit_status: CreditStatus;
}

export interface CustomerAgingBucketSummary {
  key: CustomerAgingBucket;
  label: string;
  amount: number;
  customers: number;
  share_pct: number;
}

export interface CustomerAgingReport {
  data: CustomerAgingRow[];
  summary: {
    as_of_date: string;
    total_customers: number;
    invoice_count: number;
    total_outstanding: number;
    total_current: number;
    total_overdue: number;
    overdue_pct: number;
    overdue_customer_count: number;
    over_limit_customers: number;
    oldest_days_overdue: number;
    /** Always healthiest-first, empty buckets included. */
    by_bucket: CustomerAgingBucketSummary[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── Supplier Statement ──────────────────────────────────────────────────────

export interface SupplierStatementRow {
  date: string;
  document_number: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface SupplierStatementReport {
  data: SupplierStatementRow[];
  summary: {
    opening_balance: number;
    closing_balance: number;
    total_purchased: number;
    total_paid: number;
  };
}

// ── Supplier Scorecard ──────────────────────────────────────────────────────

export interface SupplierScorecardRow {
  supplier_name: string;
  total_spend: number;
  po_count: number;
  on_time_pct: number;
  return_rate_pct: number;
  price_competitiveness: number | null;
  lead_time_days: number;
  overall_score: number;
}

export interface SupplierScorecardReport {
  data: SupplierScorecardRow[];
  summary: {
    best_supplier: string;
    worst_supplier: string;
    avg_score: number;
  };
}

// ── Supplier Report Types ───────────────────────────────────────────────────

export interface SupplierAgingRow {
  supplier_name: string;
  phone: string | null;
  total_payable: number;
  current: number;
  d_31_60: number;
  d_61_90: number;
  d_90_plus: number;
}

export interface SupplierAgingReport {
  as_of_date: string;
  data: SupplierAgingRow[];
  summary: {
    total_payable: number;
    overdue_supplier_count: number;
  };
}

// ── Product Profitability ───────────────────────────────────────────────────

export type ProfitabilityResult = 'profit' | 'breakeven' | 'loss';

export interface ProductProfitabilityRow {
  product_name: string;
  variation_name: string | null;
  sku: string;
  barcode: string | null;
  category_name: string | null;
  brand_name: string | null;
  units_sold: number;
  revenue: number;
  /** Realised cost, from the snapshot on the order lines. */
  cost: number;
  profit: number;
  /** Profit as a percentage of revenue. */
  margin_pct: number;
  /** Realised revenue per unit, after discounts and returns. */
  avg_selling_price: number;
  avg_unit_cost: number;
  stock_on_hand: number;
  stock_value: number;
  profitability: ProfitabilityResult;
}

export interface ProfitabilityCategorySummary {
  category: string;
  products: number;
  units: number;
  revenue: number;
  profit: number;
  margin_pct: number;
  share_pct: number;
}

export interface ProductProfitabilityReport {
  data: ProductProfitabilityRow[];
  summary: {
    start_date: string;
    end_date: string;
    total_products: number;
    total_units: number;
    total_revenue: number;
    total_cost: number;
    total_profit: number;
    /** Blended: total profit ÷ total revenue, not the mean of the row percentages. */
    margin_pct: number;
    total_stock_value: number;
    loss_makers: number;
    loss_value: number;
    by_category: ProfitabilityCategorySummary[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── Warehouse Report Types ──────────────────────────────────────────────────

export interface WarehouseStockRow {
  warehouse_name: string;
  product_count: number;
  total_quantity: number;
  total_value: number;
  low_stock_items: number;
  out_of_stock_items: number;
}

export interface WarehouseStockReport {
  data: WarehouseStockRow[];
  summary: {
    grand_total_value: number;
    grand_total_quantity: number;
  };
}

// ── System Report Types ─────────────────────────────────────────────────────

export interface AuditLogRow {
  id: number;
  timestamp: string;
  user_name: string | null;
  model: string;
  action: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
}

export interface AuditLogReport {
  data: AuditLogRow[];
  summary: {
    total_entries: number;
    by_action: Record<string, number>;
  };
}

// ── Export Types ────────────────────────────────────────────────────────────

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ExportParams {
  format: ExportFormat;
  [key: string]: string | number | boolean | null | undefined;
}
