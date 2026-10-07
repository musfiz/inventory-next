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

// ── AR Aging (Receivables, ledger-based) ─────────────────────────────────────
// GET /api/v1/reports/accounting/ar-aging — App\Reports\Accounting\ArAgingReport
//
// The receivables book as the *ledger* sees it: the total ties to the AR
// control account on the Balance Sheet. `ReceivablesReport` in
// accounting.types.ts is the older /reports/receivables shape, which pivots
// invoices only and stops at Current / 31-60 / 61-90 / 90+.

/** Kept in step with App\Reports\Accounting\ArAgingReport::BUCKETS. */
export type ArAgingBucket = 'current' | 'd_1_30' | 'd_31_60' | 'd_61_90' | 'd_90_plus';

/** A zero credit limit means "none configured", not "no credit left". */
export type ArCreditStatus = 'within_limit' | 'over_limit' | 'no_limit';

export interface ArAgingRow {
  customer_id: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  customer_type: string | null;
  status: string | null;
  payment_terms: string | null;
  /** Net AR on the ledger for this customer. Buckets + unallocated add up to it. */
  total_outstanding: number;
  /** Ledger balance pivoted across aging buckets — the AR statement shape. */
  current: number;
  d_1_30: number;
  d_31_60: number;
  d_61_90: number;
  d_90_plus: number;
  total_overdue: number;
  overdue_pct: number;
  oldest_days_overdue: number;
  invoice_count: number;
  /** Comma-separated invoice numbers this balance was aged against. */
  invoice_numbers: string;
  /** Ledger money with no open invoice to age it against — in no bucket. */
  unallocated_value: number;
  credit_limit: number;
  /** Null when no credit limit is configured. */
  available_credit: number | null;
  credit_status: ArCreditStatus;
}

export interface ArAgingBucketSummary {
  key: ArAgingBucket;
  label: string;
  amount: number;
  customers: number;
  share_pct: number;
}

export interface ArAgingReport {
  data: ArAgingRow[];
  summary: {
    as_of_date: string;
    customer_count: number;
    invoice_count: number;
    total_outstanding: number;
    total_current: number;
    total_overdue: number;
    overdue_pct: number;
    overdue_customer_count: number;
    over_limit_customer_count: number;
    oldest_days_overdue: number;
    unallocated_value: number;
    /** Net balance of the AR control accounts, whole tenant — ties to the Balance Sheet. */
    control_account_balance: number;
    /** AR belonging to no live customer: opening balances, manual journals. */
    unattributed_value: number;
    control_accounts: string;
    /** Always healthiest-first, empty buckets included. */
    by_bucket: ArAgingBucketSummary[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── AP Aging (Payables, ledger-based) ───────────────────────────────────────
// GET /api/v1/reports/accounting/ap-aging — App\Reports\Accounting\ApAgingReport
//
// The mirror of the AR aging report above: the payables book as the *ledger*
// sees it, so its total ties to the AP control account on the Balance Sheet.
// `PayablesReport` below is the older /reports/payables shape — buckets nested
// per supplier, no 1-30 band, and the residual parked in 90+.

/** Kept in step with App\Reports\Accounting\ApAgingReport::BUCKETS. */
export type ApAgingBucket = 'current' | 'd_1_30' | 'd_31_60' | 'd_61_90' | 'd_90_plus';

/** A zero credit limit means "none configured", not "no credit left". */
export type ApCreditStatus = 'within_limit' | 'over_limit' | 'no_limit';

export interface ApAgingRow {
  supplier_id: string;
  supplier_name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  supplier_status: string | null;
  payment_terms: string | null;
  /** Net AP on the ledger for this supplier. Buckets + unallocated add up to it. */
  total_outstanding: number;
  /** Ledger balance pivoted across aging buckets — the AP statement shape. */
  current: number;
  d_1_30: number;
  d_31_60: number;
  d_61_90: number;
  d_90_plus: number;
  total_overdue: number;
  overdue_pct: number;
  oldest_days_overdue: number;
  po_count: number;
  /** Comma-separated PO numbers this balance was aged against. */
  po_numbers: string;
  /** Ledger money with no open order to age it against — in no bucket. */
  unallocated_value: number;
  credit_limit: number;
  /** Null when no credit limit is configured. */
  available_credit: number | null;
  credit_status: ApCreditStatus;
}

export interface ApAgingBucketSummary {
  key: ApAgingBucket;
  label: string;
  amount: number;
  suppliers: number;
  share_pct: number;
}

export interface ApAgingReport {
  data: ApAgingRow[];
  summary: {
    as_of_date: string;
    supplier_count: number;
    po_count: number;
    total_outstanding: number;
    total_current: number;
    total_overdue: number;
    overdue_pct: number;
    overdue_supplier_count: number;
    over_limit_supplier_count: number;
    oldest_days_overdue: number;
    unallocated_value: number;
    /** Net balance of the AP control accounts, whole tenant — ties to the Balance Sheet. */
    control_account_balance: number;
    /** AP belonging to no live supplier: opening balances, manual journals. */
    unattributed_value: number;
    control_accounts: string;
    /** Always healthiest-first, empty buckets included. */
    by_bucket: ApAgingBucketSummary[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── Failed Journal Queue ─────────────────────────────────────────────────────
// GET /api/v1/reports/accounting/failed-journal — RPT-ACC-003
//
// Every auto-journal attempt that never became a posted journal entry.
// `AccountingService::createJournalEntry` is non-fatal by design — a sale must
// not roll back because the double-entry side failed — so this queue is the only
// place the ledger's gap becomes visible. `failed_value` is the amount the
// ledger is out by because of that row.
//
// `FailedJournalReport` below is the older `/admin/failed-journal-entries`
// shape, which the admin list still serves.

/** Kept in step with App\Reports\Accounting\FailedJournalReport::BUCKETS. */
export type FailedJournalQueueBucket = 'today' | 'd_1_7' | 'd_8_30' | 'd_31_90' | 'd_90_plus';

/** Derived, not stored: a row is resolved once `resolved_at` is set. */
export type FailedJournalQueueStatus = 'unresolved' | 'resolved';

/** Filter values for the status select; `all` means no status filter. */
export type FailedJournalQueueStatusFilter = 'unresolved' | 'resolved' | 'all';

export interface FailedJournalQueueRow {
  id: string;
  tenant_id: string;
  /** When the posting attempt failed. */
  occurred_at: string;
  status: FailedJournalQueueStatus;
  /**
   * Unresolved: as_of − occurred_at (still open).
   * Resolved: resolved_at − occurred_at (how long it took to clear).
   * Never negative.
   */
  age_days: number;
  age_bucket: FailedJournalQueueBucket;
  reference_type: string | null;
  reference_number: string | null;
  reference_id: string | null;
  /** Straight from the attempted header — what the journal was going to say. */
  description: string | null;
  line_count: number;
  /** Total debit of the lines that never posted: the ledger's gap, per row. */
  failed_value: number;
  /** debit − credit. Non-zero means the posting routine built a bad entry. */
  imbalance: number;
  /** PHP exception class, namespace stripped. */
  error_class: string;
  error_message: string | null;
  /** Open-queue failures sharing this row's (reference_type, reference_id). */
  recurring_count: number;
  resolved_at: string | null;
  resolver_name: string | null;
  creator_name: string | null;
  resolution_note: string | null;
}

// ── Trial Balance (ledger-based) — RPT-ACC-004 ──────────────────────────────
// GET /api/v1/reports/accounting/trial-balance — App\Reports\Accounting\TrialBalanceReport
//
// The ledger's own balance check. Three figures per account, not one:
// `opening_balance` (everything dated before `start_date`), the period's
// `period_debit` / `period_credit` movement, and `balance` (opening + movement),
// which is the account's real balance as at `end_date`.
//
// `TrialBalanceRow` in accounting.types.ts is the older `/reports/trial-balance`
// shape: period movement only, `posted` status only, so a reversed entry reads as
// a real balance and a carried-forward balance is invisible.
// GET /api/v1/reports/accounting/trial-balance — App\Reports\Accounting\TrialBalanceReport
//
// The ledger's own balance check. Three figures per account, not one:
// `opening_balance` (everything dated before `start_date`), the period's
// `period_debit` / `period_credit` movement, and `balance` (opening + movement),
// which is the account's real balance as at `end_date`.
//
// `TrialBalanceRow` in accounting.types.ts is the older `/reports/trial-balance`
// shape: period movement only, `posted` status only, so a reversed entry reads as
// a real balance and a carried-forward balance is invisible.

/**
 * Which column a signed balance belongs in. `flat` is its own value so a zero
 * balance is not read as a debit.
 */
export type TrialBalanceSide = 'debit' | 'credit' | 'flat';

export interface TrialBalanceLedgerRow {
  account_id: string;
  code: string;
  name: string;
  account_type: string;
  account_subtype: string;
  parent_id: string | null;
  is_active: boolean;
  /** Debit-positive. Everything dated before `start_date`. */
  opening_balance: number;
  period_debit: number;
  period_credit: number;
  /** Debit-positive. `opening_balance + period_debit − period_credit`. */
  balance: number;
  balance_side: TrialBalanceSide;
  /** True when the balance sits opposite the side its account type should hold. */
  is_abnormal: boolean;
  /** `accounts.balance`, the cache `AccountingService::postEntry` maintains. */
  cached_balance: number;
  /** The same account's balance derived from its journal lines. */
  ledger_balance: number;
  /** `cached_balance − ledger_balance`. Non-zero means the cache has drifted. */
  drift: number;
  entry_count: number;
  last_entry_date: string | null;
}

export interface TrialBalanceTypeSummary {
  key: string;
  label: string;
  count: number;
  debit: number;
  credit: number;
  balance: number;
}

export interface TrialBalanceReportResponse {
  data: TrialBalanceLedgerRow[];
  summary: {
    start_date: string;
    end_date: string;
    account_count: number;
    active_account_count: number;
    /** Closing balances on the debit side. */
    total_debit: number;
    /** Closing balances on the credit side. */
    total_credit: number;
    /** `total_debit − total_credit`. */
    variance: number;
    /** The headline: every taka of closing balance has a match on the other side. */
    is_balanced: boolean;
    period_debit: number;
    period_credit: number;
    period_variance: number;
    is_period_balanced: boolean;
    abnormal_account_count: number;
    /** Over every account the tenant owns, not just the rows on screen. */
    drift_account_count: number;
    total_drift: number;
    by_account_type: TrialBalanceTypeSummary[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

export interface FailedJournalQueueBucketSummary {
  key: FailedJournalQueueBucket;
  label: string;
  count: number;
  value: number;
  share_pct: number;
}

export interface FailedJournalQueueGroup {
  key: string;
  label: string;
  count: number;
  value: number;
  share_pct: number;
}

export interface FailedJournalQueueReport {
  data: FailedJournalQueueRow[];
  summary: {
    as_of_date: string;
    total_count: number;
    unresolved_count: number;
    resolved_count: number;
    /** Value not posted across the open queue — "what is still wrong right now". */
    unresolved_value: number;
    total_value: number;
    oldest_unresolved_days: number;
    /** Sum of the lines that never posted — the `Lines` column has a total to foot against. */
    total_lines: number;
    /** Entries whose own debit/credit did not add up: a bug, not a transient fault. */
    unbalanced_count: number;
    recurring_count: number;
    /** Failures with no tenant_id — the attempted header never named one. */
    unattributed_count: number;
    /** Queue-age ladder over the open queue only; empty buckets included. */
    by_bucket: FailedJournalQueueBucketSummary[];
    /** Busiest first: which posting routine is failing. */
    by_reference_type: FailedJournalQueueGroup[];
    /** Busiest first: why it is failing. */
    by_error_class: FailedJournalQueueGroup[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── Payables (legacy shape) ─────────────────────────────────────────────────
// Still served by GET /api/v1/reports/payables for older clients.

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

// ── Failed Journal Queue (legacy admin shape) ────────────────────────────────
// GET /api/v1/admin/failed-journal-entries. The reporting page uses
// FailedJournalQueueReport above; this stays for the admin list and retry/resolve.

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
    /** Refunded order lines in the period. */
    total_refunds: number;
    /** Distinct invoices those refunds came off. */
    total_orders: number;
    /** Every unit rung in the period — the denominator for `refund_rate_pct`. */
    total_units_sold: number;
    /**
     * Units sold on refunded lines only. This is what the table's "Qty Sold"
     * column adds up to, and is NOT the period's sales volume.
     */
    units_on_refunded_lines: number;
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
  /** Time-of-day on a placeholder date — what a till tape shows. */
  hour_start: string | null;
  order_count: number;
  units_sold: number;
  revenue: number;
  cost: number;
  gross_profit: number;
  avg_order_value: number;
  units_per_order: number;
  /** This hour's slice of the period's revenue. */
  share_pct: number;
}

/** Breakdown row shape the shared PDF summary partial understands. */
export interface HourlySalesBreakdown {
  label: string;
  value: number;
  share_pct?: number | null;
}

export interface HourlySalesReport {
  data: HourlySalesRow[];
  summary: {
    start_date: string;
    end_date: string;
    /** Completed/confirmed sales only — cancelled, draft and quote rows excluded. */
    total_revenue: number;
    total_cost: number;
    gross_profit: number;
    order_count: number;
    total_units: number;
    avg_order_value: number;
    /** Hours of the 24 that saw at least one completed sale. */
    trading_hours: number;
    /** total_revenue ÷ trading_hours — average per *trading* hour. */
    avg_hourly_revenue: number;
    busiest_hour: HourlySalesBreakdown[] | null;
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}



// ── Cashier Performance ─────────────────────────────────────────────────────
// Per-cashier takings from completed/confirmed POS sales only. The previous
// row shape described columns the endpoint never returned (register_name,
// refund_count, cash_variance, items_per_sale).

export interface CashierPerformanceRow {
  /** Stable join key used to build `rank`; not a displayed column. */
  cashier_key: string;
  cashier_id: string | null;
  /** 'Unassigned' when pos_orders.created_by is null. */
  cashier_name: string;
  register_count: number;
  session_count: number;
  order_count: number;
  units_sold: number;
  avg_order_value: number;
  /** Gross takings, tax included — the till number. */
  total_sales: number;
  /** Line revenue ex-tax, net of returns — the margin basis. */
  net_revenue: number;
  /** Carried so the discount rate is readable against its own base. */
  sub_total: number;
  /** Order-level + line-level discount. */
  total_discount: number;
  total_tax: number;
  total_returned: number;
  gross_profit: number;
  gross_margin_pct: number | null;
  discount_rate_pct: number | null;
  unpaid_order_count: number;
  /** Leaderboard position by gross sales, independent of the sort column. */
  rank: number | null;
  /** Share of the period's gross sales. */
  sales_share_pct: number | null;
}

/** Breakdown row shape the shared PDF summary partial understands. */
export interface CashierPerformanceBreakdown {
  label: string;
  value: number;
  share_pct?: number | null;
}

export interface CashierPerformanceReport {
  data: CashierPerformanceRow[];
  summary: {
    start_date: string;
    end_date: string;
    cashier_count: number;
    order_count: number;
    total_sales: number;
    net_revenue: number;
    total_discount: number;
    total_tax: number;
    total_returned: number;
    total_units: number;
    gross_profit: number;
    gross_margin_pct: number | null;
    discount_rate_pct: number | null;
    avg_order_value: number;
    avg_units_per_order: number;
    avg_sales_per_cashier: number;
    avg_orders_per_cashier: number;
    unpaid_order_count: number;
    top_cashier: CashierPerformanceBreakdown[] | null;
    highest_units_cashier: CashierPerformanceBreakdown[] | null;
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── Payment Breakdown ───────────────────────────────────────────────────────

// ── POS Payment Breakdown ────────────────────────────────────────────────────
// Per-method movement of money at the counter. All nine `payments`
// .payment_method values are returned, zero-filled, so an unused method is a
// visible zero row rather than a missing one. The previous row shape described
// columns the endpoint never returned (total_amount, processing_fees,
// pct_of_total).

export interface PaymentBreakdownRow {
  payment_method: string;
  /** Every attempt at this method, settled or not. */
  transaction_count: number;
  /** How many of those attempts settled — `avg_transaction`'s denominator. */
  received_count: number;
  /** Money in: settled sales + refund settlements that collected money back. */
  received: number;
  /** Money out: refund settlements flagged refunded. */
  refunded: number;
  net_amount: number;
  /** Money the register believes it took but which is not settled. */
  pending: number;
  /** Attempts that failed or were cancelled — took no money. */
  failed_count: number;
  /** received ÷ received_count, so failures do not dilute it. */
  avg_transaction: number;
  /** Largest *settled* transaction — never a failed or pending attempt. */
  largest_transaction: number;
  /** Share of the period's received money. */
  share_pct: number;
}

/** Breakdown row shape the shared PDF summary partial understands. */
export interface PaymentBreakdownBreakdown {
  label: string;
  value: number;
  share_pct?: number | null;
}

export interface PaymentBreakdownReport {
  data: PaymentBreakdownRow[];
  summary: {
    start_date: string;
    end_date: string;
    /** All nine methods, zero-filled — so this is 9 even with no activity. */
    method_count: number;
    /** Methods that actually took money. */
    active_method_count: number;
    transaction_count: number;
    received_count: number;
    total_received: number;
    total_refunded: number;
    net_amount: number;
    total_pending: number;
    avg_transaction: number;
    /** Cash is the figure a drawer can be checked against. */
    cash_received: number;
    cash_share_pct: number | null;
    digital_received: number;
    digital_share_pct: number | null;
    top_method: PaymentBreakdownBreakdown[] | null;
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── POS Refund Summary ──────────────────────────────────────────────────────
// The POS refund summary is defined alongside the return analysis types
// above (PosRefundRow / PosRefundSummaryReport). The old PosRefundSummaryRow
// type described columns the endpoint never returned.

// ── Tax Return ──────────────────────────────────────────────────────────────

/** Kept in step with App\Reports\Tax\TaxReturnReport::TAX_TYPES. */
export type TaxReturnTaxType =
  | 'vat'
  | 'supplementary_duty'
  | 'income_tax'
  | 'withholding'
  | 'other';

/**
 * Which half of the return an account belongs to. Output is what the business
 * owes the authority; input is the tax it can reclaim.
 */
export type TaxReturnSide = 'output' | 'input';

/**
 * One tax account's movement over the filing period.
 *
 * Field names come from `TaxReturnReport::mapRow()` (RPT-TAX-001) — these are its
 * actual keys. The report was rebuilt on the ReportDefinition pipeline and the
 * old `tax_type`/`taxable_amount` shape it replaced was never what the endpoint
 * returned.
 *
 * Every money figure is **credit-positive**: a credit creates tax owed, a debit
 * relieves it. So a debit on Input VAT Receivable is *negative* `net_liability` —
 * input tax reduces the amount due, it does not add to it.
 */
export interface TaxReturnRow {
  account_id: string;
  code: string;
  name: string;
  tax_type: TaxReturnTaxType;
  side: TaxReturnSide;
  is_active: boolean;
  /** Credit-positive. Everything dated before `start_date`. */
  opening_balance: number;
  period_debit: number;
  period_credit: number;
  /** Gross credits in the period, on an output account. Always 0 on an input one. */
  tax_collected: number;
  /** Debits refunded on an output account; credits recovered on an input one. */
  tax_refunded: number;
  /** Gross debits in the period, on an input account. Always 0 on an output one. */
  tax_paid: number;
  /** `period_credit − period_debit`. This row's contribution to the period's tax. */
  net_liability: number;
  /** `opening_balance + net_liability`. Positive is still owed at `end_date`. */
  closing_balance: number;
  entry_count: number;
  last_entry_date: string | null;
}

export interface TaxReturnTypeSummary {
  key: TaxReturnTaxType;
  label: string;
  account_count: number;
  collected: number;
  paid: number;
  refunded: number;
  net_liability: number;
  /** Mirrors `net_liability`, for the PDF summary renderer. */
  amount: number;
}

export interface TaxReturnReportResponse {
  data: TaxReturnRow[];
  summary: {
    start_date: string;
    end_date: string;
    tax_account_count: number;
    total_tax_collected: number;
    total_tax_paid: number;
    total_tax_refunded: number;
    /** The headline: collected less reclaimable input tax, over the period. */
    net_tax_due: number;
    /** Positive means remit; negative means the authority owes a refund back. */
    direction: 'payable' | 'recoverable' | 'nil';
    /** Opening/closing balances on output (liability) tax accounts. */
    opening_payable: number;
    closing_payable: number;
    /** Opening/closing balances on input (receivable) tax accounts, as positive. */
    opening_recoverable: number;
    closing_recoverable: number;
    /** `closing_payable − closing_recoverable`: the figure carried into next period. */
    net_position: number;
    has_activity: boolean;
    /** Every tax type, including those with nothing filed against them. */
    by_tax_type: TaxReturnTypeSummary[];
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── POS Report Types ────────────────────────────────────────────────────────

/**
 * One rung sale. The field names come from `PosDailySalesReport::mapRow()`
 * (RPT-POS-003) — the report was rebuilt on the ReportDefinition pipeline and
 * these are its actual keys, not the legacy `posSummary` shape.
 */
export interface PosDailySalesRow {
  pos_order_id: string;
  session_id: string;
  register_id: string;
  invoice_number: string;
  /** Full timestamp the sale was rung. */
  order_ts: string | null;
  order_date: string | null;
  /** Time-of-day only (HH:MM:SS) — what a till tape shows. */
  order_time: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  cashier_name: string | null;
  register_name: string | null;
  session_number: string | null;
  line_count: number;
  units_sold: number;
  sub_total: number;
  /** `pos_orders.discount_amount` — order-level only. */
  order_discount: number;
  /** Sum of `pos_order_items.discount_amount` — line-level. */
  line_discount: number;
  /** order + line discount: what was actually given away. */
  total_discount: number;
  tax_amount: number;
  /** Gross takings, tax included. */
  grand_total: number;
  paid_amount: number;
  /** grand_total − returned_amount − paid_amount, floored at zero. */
  amount_due: number;
  returned_amount: number;
  /** Line revenue ex-tax, net of returns — the margin basis. */
  line_revenue: number;
  line_cost: number;
  gross_profit: number;
  payment_method: string | null;
  payment_status: string | null;
}

export interface PosDailySalesReport {
  data: PosDailySalesRow[];
  summary: {
    start_date: string;
    end_date: string;
    order_count: number;
    /** Gross takings — the till number, tax included. */
    total_sales: number;
    total_subtotal: number;
    total_discount: number;
    total_tax: number;
    total_units: number;
    avg_order_value: number;
    avg_units_per_order: number;
    total_paid: number;
    total_due: number;
    total_returned: number;
    /** total_sales − total_returned. */
    net_sales: number;
    /** Ex-tax revenue the margin percentage is measured against. */
    line_revenue: number;
    gross_profit: number;
    gross_margin_pct: number | null;
    discount_rate_pct: number | null;
    tax_rate_pct: number | null;
    unpaid_order_count: number;
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

/**
 * One cashier shift. Field names come from
 * `PosSessionSummaryReport::mapRow()` (RPT-POS-004).
 */
export interface PosSessionSummaryRow {
  id: string;
  session_number: string;
  cashier_name: string;
  register_name: string | null;
  /** Reached through the register — `pos_sessions` has no warehouse_id. */
  warehouse_name: string | null;
  status: 'open' | 'closed' | 'paused' | 'suspended' | string;
  start_time: string | null;
  end_time: string | null;
  duration_hours: number;
  /** How much of the shift fell inside the requested window. */
  overlap_hours: number;
  order_count: number;
  units_sold: number;
  total_sales: number;
  total_refunds: number;
  total_discount: number;
  total_tax: number;
  avg_order_value: number;
  cash_sales: number;
  card_sales: number;
  /** bKash + Nagad + Rocket combined. */
  mobile_sales: number;
  credit_sales: number;
  opening_balance: number;
  cash_in: number;
  cash_out: number;
  /** opening_balance + cash_sales + cash_in − cash_out. */
  expected_cash: number;
  /** Counted at close; null while the session is still open. */
  actual_cash: number | null;
  /** actual_cash − expected_cash; null until counted. */
  cash_variance: number | null;
  variance_status: 'Not counted' | 'Over' | 'Short' | 'Balanced' | string;
  /**
   * The register's own tallies, next to the recomputed figures above, so a
   * drifted session counter is visible rather than silently believed.
   */
  registered_order_count: number;
  registered_sales: number;
}

export interface PosSessionSummaryReport {
  data: PosSessionSummaryRow[];
  summary: {
    start_date: string;
    end_date: string;
    session_count: number;
    open_session_count: number;
    closed_session_count: number;
    order_count: number;
    total_sales: number;
    total_refunds: number;
    total_discount: number;
    total_tax: number;
    total_units: number;
    avg_order_value: number;
    avg_session_sales: number;
    net_sales: number;
    total_cash_sales: number;
    total_card_sales: number;
    total_mobile_sales: number;
    total_credit_sales: number;
    /** Sessions that have a counted drawer — the reconciliation basis. */
    counted_session_count: number;
    expected_cash_total: number;
    actual_cash_total: number;
    cash_variance_total: number;
    /** Every session shown, open shifts included. */
    expected_cash_all_sessions: number;
    over_sessions: number;
    short_sessions: number;
    balanced_sessions: number;
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
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
  supplier_id: string;
  supplier_name: string | null;
  supplier_code: string | null;
  email: string | null;
  phone: string | null;
  po_count: number;
  /** Order lines across all of the supplier's POs. */
  line_count: number;
  /** Distinct products supplied — counted per supplier, not per order. */
  product_count: number;
  quantity_ordered: number;
  quantity_received: number;
  /** Floors at zero; an over-delivery shows as no pending units. */
  pending_quantity: number;
  receiving_rate_pct: number;
  /** grand_total, falling back to the legacy total_amount. */
  total_value: number;
  total_paid: number;
  total_due: number;
  /** Share of the filtered total, so the column adds to 100%. */
  share_of_spend_pct: number;
  avg_order_value: number;
  first_order_date: string | null;
  last_order_date: string | null;
}

export interface PurchaseBySupplierReport {
  data: PurchaseBySupplierRow[];
  summary: {
    start_date: string;
    end_date: string;
    total_suppliers: number;
    total_pos: number;
    total_lines: number;
    /** Supplier-product relationships: distinct products summed per supplier. */
    total_products: number;
    total_quantity_ordered: number;
    total_quantity_received: number;
    receiving_rate_pct: number;
    total_value: number;
    total_paid: number;
    total_due: number;
    avg_order_value: number;
    unpaid_suppliers: number;
    top_supplier: string | null;
    top_supplier_value: number | null;
    top_supplier_orders: number | null;
    top_supplier_share_pct: number | null;
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
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

/** Matches the supplier_payments.payment_method enum. */
export type SupplierPaymentMethod =
  | 'cash'
  | 'card'
  | 'bkash'
  | 'nagad'
  | 'rocket'
  | 'bank_transfer'
  | 'check'
  | 'credit'
  | 'other';

export interface SupplierPaymentAllocation {
  supplier_payment_id: string;
  payment_number: string;
  purchase_order_id: string;
  po_number: string;
  applied_amount: number;
}

export interface SupplierPaymentResult {
  supplier_id: string;
  supplier_name: string;
  paid_amount: number;
  payment_method: SupplierPaymentMethod;
  payment_date: string;
  allocations: SupplierPaymentAllocation[];
  /** What is still owed after this payment. */
  outstanding_payable: number;
}

/** Kept in step with App\Reports\Purchase\SupplierStatementReport::TYPES. */
export type SupplierStatementType = 'purchase' | 'payment' | 'return';

export interface SupplierStatementRow {
  date: string;
  document_number: string;
  /** Display label, e.g. "Purchase Return". */
  type: string;
  /** Machine key behind the label, for filtering and styling. */
  type_key: SupplierStatementType;
  description: string;
  /** Purchases increase what we owe. */
  debit: number;
  /** Payments and returns reduce it. */
  credit: number;
  /** Running balance across the whole account, not the filtered view. */
  balance: number;
}

export interface SupplierStatementReport {
  data: SupplierStatementRow[];
  summary: {
    supplier_id: string | null;
    supplier_name: string | null;
    start_date: string;
    end_date: string;
    opening_balance: number;
    total_purchased: number;
    total_paid: number;
    total_returned: number;
    /** Everything on the credit side: payments plus returns. */
    total_credited: number;
    document_count: number;
    /** The account position the statement ends on. */
    closing_balance: number;
    /** What supplier/aging reports as total_payable on the same date. */
    outstanding_payable: number;
    /** Negative closing balance — we have been overpaid. */
    over_credited: number;
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── Supplier Scorecard ──────────────────────────────────────────────────────

/** Kept in step with App\Reports\Purchase\SupplierScorecardReport::GRADES. */
export type SupplierGrade = 'excellent' | 'good' | 'fair' | 'poor';

export interface SupplierScorecardRow {
  supplier_id: string;
  supplier_name: string;
  supplier_code: string | null;
  supplier_status: string | null;
  po_count: number;
  total_purchase_value: number;
  return_count: number;
  return_value: number;
  delivered_pos: number;
  late_pos: number;
  /** Deliveries with a receipt timestamp — what on-time and lead time rest on. */
  measured_pos: number;
  /** Lines priced against a real benchmark, and the spend they covered. */
  price_lines_compared: number;
  price_spend_covered: number;
  on_time_delivery_pct: number | null;
  avg_lead_time_days: number | null;
  return_rate_pct: number | null;
  /** 100 = exactly the peer benchmark, above 100 = dearer. */
  price_index_pct: number | null;
  /** Points each dimension contributed, 0-100. Null = not measurable. */
  on_time_points: number | null;
  lead_time_points: number | null;
  returns_points: number | null;
  price_points: number | null;
  /** How many of the four dimensions actually backed the score. */
  components_scored: number;
  /** Null when there is no delivery evidence — not zero. */
  score: number | null;
  grade: SupplierGrade | null;
  score_band: string | null;
  /** Structured flags for badges; `flags` is the joined string for exports. */
  flag_list: string[];
  flags: string;
}

export interface SupplierGradeCount {
  grade: SupplierGrade;
  label: string;
  value: number;
}

export interface SupplierScorecardReport {
  data: SupplierScorecardRow[];
  summary: {
    start_date: string;
    end_date: string;
    total_suppliers: number;
    scored_suppliers: number;
    /** Suppliers with no receipt movement — absent from the grade counts. */
    unscored_suppliers: number;
    by_grade: SupplierGradeCount[];
    needs_attention: number;
    avg_score: number | null;
    best_supplier: string | null;
    best_supplier_score: number | null;
    worst_supplier: string | null;
    worst_supplier_score: number | null;
    total_pos: number;
    total_purchase_value: number;
    total_return_value: number;
    total_return_count: number;
    return_rate_pct: number | null;
    delivered_pos: number;
    measured_pos: number;
    late_pos: number;
    /** Share of deliveries behind the on-time and lead-time figures. */
    delivery_coverage_pct: number | null;
    /** Share of spend behind the price index. */
    price_coverage_pct: number | null;
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
}

// ── Supplier Report Types ───────────────────────────────────────────────────

/** Kept in step with App\Reports\Purchase\SupplierAgingReport::BUCKETS. */
export type SupplierAgingBucket = 'current' | 'd_1_30' | 'd_31_60' | 'd_61_90' | 'd_90_plus';

/** A zero credit limit means "none configured", not "no credit left". */
export type SupplierCreditStatus = 'within_limit' | 'over_limit' | 'no_limit';

export interface SupplierAgingRow {
  supplier_id: string;
  supplier_name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  supplier_status: string | null;
  payment_terms: string | null;
  total_payable: number;
  /** Balance pivoted across aging buckets — the AP statement shape. */
  current: number;
  d_1_30: number;
  d_31_60: number;
  d_61_90: number;
  d_90_plus: number;
  total_overdue: number;
  overdue_pct: number;
  oldest_days_overdue: number;
  po_count: number;
  /** Comma-separated PO numbers behind this balance. */
  po_numbers: string;
  credit_limit: number;
  /** Null when no credit limit is configured. */
  available_credit: number | null;
  credit_status: SupplierCreditStatus;
}

export interface SupplierAgingBucketSummary {
  key: SupplierAgingBucket;
  label: string;
  amount: number;
  suppliers: number;
  share_pct: number;
}

export interface SupplierAgingReport {
  data: SupplierAgingRow[];
  summary: {
    as_of_date: string;
    total_suppliers: number;
    po_count: number;
    total_payable: number;
    total_current: number;
    total_overdue: number;
    overdue_pct: number;
    overdue_supplier_count: number;
    over_limit_suppliers: number;
    oldest_days_overdue: number;
    /** Always healthiest-first, empty buckets included. */
    by_bucket: SupplierAgingBucketSummary[];
    /** POs issued but not received — an intent, not yet a liability. */
    open_commitment_value: number;
    /** Returns raised against no single PO, so kept out of the buckets. */
    unlinked_return_value: number;
  };
  columns?: ReportColumnMeta[];
  filters_applied?: string[];
  generated_at?: string;
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
