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

export interface StockAgingRow {
  product_name: string;
  variation_name: string | null;
  sku: string;
  warehouse_name: string;
  quantity: number;
  last_received_date: string | null;
  age_days: number;
  bucket: '0_30' | '31_60' | '61_90' | '90_plus';
  value: number;
}

export interface StockAgingReport {
  data: StockAgingRow[];
  summary: {
    total_value_0_30: number;
    total_value_31_60: number;
    total_value_61_90: number;
    total_value_90_plus: number;
    count_0_30: number;
    count_31_60: number;
    count_61_90: number;
    count_90_plus: number;
  };
}

// ── ABC Analysis ────────────────────────────────────────────────────────────

export interface AbcAnalysisRow {
  rank: number;
  product_name: string;
  variation_name: string | null;
  sku: string;
  revenue: number;
  quantity: number;
  cumulative_pct: number;
  class: 'A' | 'B' | 'C';
}

export interface AbcAnalysisReport {
  data: AbcAnalysisRow[];
  summary: {
    a_count: number;
    a_value: number;
    b_count: number;
    b_value: number;
    c_count: number;
    c_value: number;
  };
}

// ── Dead Stock ──────────────────────────────────────────────────────────────

export interface DeadStockRow {
  product_name: string;
  variation_name: string | null;
  sku: string;
  warehouse_name: string;
  quantity: number;
  unit_cost: number;
  total_value: number;
  last_sale_date: string | null;
  days_since_last_sale: number;
}

export interface DeadStockReport {
  data: DeadStockRow[];
  summary: {
    total_value: number;
    total_skus: number;
  };
}

// ── Stock Adjustment ────────────────────────────────────────────────────────

export interface StockAdjustmentRow {
  date: string;
  product_name: string;
  variation_name: string | null;
  sku: string;
  warehouse_name: string;
  adjustment_type: string;
  qty_change: number;
  value: number;
  reason: string | null;
  approved_by: string | null;
}

export interface StockAdjustmentReport {
  data: StockAdjustmentRow[];
  summary: {
    total_adjustment_value: number;
    total_damage_value: number;
    total_expiry_value: number;
  };
}

// ── Inventory Report Types ──────────────────────────────────────────────────

export interface StockValuationRow {
  product_id: number;
  product_name: string;
  variation_id: number | null;
  variation_name: string | null;
  sku: string;
  warehouse_id: number;
  warehouse_name: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  unit_cost: number;
  total_value: number;
}

export interface StockValuationReport {
  data: StockValuationRow[];
  summary: {
    total_skus: number;
    total_quantity: number;
    total_value: number;
    avg_cost: number;
  };
}

export interface ReorderRow {
  product_id: number;
  product_name: string;
  variation_id: number | null;
  variation_name: string | null;
  sku: string;
  warehouse_name: string;
  current_qty: number;
  reorder_point: number;
  suggested_reorder_qty: number;
  last_received_date: string | null;
  supplier_name: string | null;
  severity: 'critical' | 'low';
}

export interface ReorderReport {
  data: ReorderRow[];
  summary: {
    critical_count: number;
    low_count: number;
    total_suggested_value: number;
  };
}

export interface StockMovementRow {
  id: number;
  date: string;
  product_name: string;
  variation_name: string | null;
  sku: string;
  warehouse_name: string;
  movement_type: string;
  reference_type: string | null;
  reference_number: string | null;
  qty_before: number;
  qty_change: number;
  qty_after: number;
  unit_cost: number;
  reason: string | null;
  created_by: string | null;
}

export interface StockMovementReport {
  data: StockMovementRow[];
  summary: {
    total_in: number;
    total_out: number;
    net_change: number;
  };
}

export interface BatchExpiryRow {
  product_name: string;
  variation_name: string | null;
  batch_number: string;
  warehouse_name: string;
  mfg_date: string | null;
  expiry_date: string;
  days_to_expiry: number;
  current_qty: number;
  status: 'expired' | 'expiring_7' | 'expiring_30' | 'expiring_60' | 'valid';
  value_at_risk: number;
}

export interface BatchExpiryReport {
  data: BatchExpiryRow[];
  summary: {
    expired_count: number;
    expired_value: number;
    expiring_7_count: number;
    expiring_30_count: number;
    total_value_at_risk: number;
  };
}

export interface StockStatusRow {
  product_name: string;
  variation_name: string | null;
  sku: string;
  warehouse_name: string;
  on_hand: number;
  reserved: number;
  available: number;
  reorder_point: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  value: number;
}

export interface StockStatusReport {
  data: StockStatusRow[];
  summary: {
    in_stock_count: number;
    low_stock_count: number;
    out_of_stock_count: number;
    total_value: number;
  };
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
    total_profit: number;
  };
}

// ── Profit Margin ───────────────────────────────────────────────────────────

export interface ProfitMarginRow {
  group_name: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  margin_pct: number;
  units_sold: number;
  prev_revenue?: number;
  prev_margin_pct?: number;
}

export interface ProfitMarginReport {
  data: ProfitMarginRow[];
  summary: {
    total_gross_profit: number;
    avg_margin: number;
    items_below_target: number;
  };
}

// ── Return Analysis ─────────────────────────────────────────────────────────

export interface ReturnAnalysisRow {
  product_name: string;
  variation_name: string | null;
  units_sold: number;
  units_returned: number;
  return_rate_pct: number;
  refund_amount: number;
  top_reason: string | null;
}

export interface ReturnAnalysisReport {
  data: ReturnAnalysisRow[];
  summary: {
    total_returns: number;
    avg_return_rate: number;
    total_refund_amount: number;
  };
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
    total_outstanding: number;
    customer_count: number;
    avg_revenue_per_customer: number;
  };
}

export interface SalesTrendRow {
  date: string;
  pos_revenue: number;
  so_revenue: number;
  total_revenue: number;
  order_count: number;
  avg_order_value: number;
}

export interface SalesTrendReport {
  data: SalesTrendRow[];
  summary: {
    total_revenue: number;
    avg_daily_revenue: number;
    peak_day: { date: string; revenue: number };
    growth_pct: number;
  };
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

export interface PosRefundSummaryRow {
  refund_number: string;
  date: string;
  original_order: string;
  customer_name: string | null;
  reason: string;
  refund_method: string;
  amount: number;
  status: string;
  approved_by: string | null;
}

export interface PosRefundSummaryReport {
  data: PosRefundSummaryRow[];
  summary: {
    total_refunds: number;
    refund_rate: number;
    by_reason: Record<string, number>;
  };
}

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

export interface SupplierPerformanceRow {
  supplier_name: string;
  total_pos: number;
  on_time_delivery_pct: number;
  avg_lead_time_days: number;
  total_purchase_value: number;
  return_rate_pct: number;
  quality_score: number | null;
}

export interface SupplierPerformanceReport {
  data: SupplierPerformanceRow[];
  summary: {
    avg_on_time_rate: number;
    avg_lead_time: number;
    best_supplier: string;
  };
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

export interface GrnRegisterRow {
  grn_date: string;
  po_number: string;
  supplier_name: string;
  warehouse_name: string;
  product_name: string;
  variation_name: string | null;
  qty_received: number;
  unit_cost: number;
  total_cost: number;
  received_by: string | null;
}

export interface GrnRegisterReport {
  data: GrnRegisterRow[];
  summary: {
    total_receipts: number;
    total_value: number;
  };
}

// ── Purchase Report Types ───────────────────────────────────────────────────

export interface PoSummaryRow {
  po_number: string;
  supplier_name: string;
  warehouse_name: string;
  order_date: string;
  expected_delivery: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  paid: number;
  due: number;
  payment_status: string;
}

export interface PoSummaryReport {
  data: PoSummaryRow[];
  summary: {
    total_po_value: number;
    total_paid: number;
    total_due: number;
    count_by_status: Record<string, number>;
  };
}

// ── Customer Profitability ──────────────────────────────────────────────────

export interface CustomerProfitabilityRow {
  customer_name: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  margin_pct: number;
  order_count: number;
  returns: number;
  net_profit: number;
}

export interface CustomerProfitabilityReport {
  data: CustomerProfitabilityRow[];
  summary: {
    top_customer: string;
    avg_margin: number;
    total_profit: number;
  };
}

// ── Customer Report Types ───────────────────────────────────────────────────

export interface CustomerAgingRow {
  customer_name: string;
  phone: string | null;
  total_outstanding: number;
  current: number;
  d_31_60: number;
  d_61_90: number;
  d_90_plus: number;
  credit_limit: number;
  available_credit: number;
}

export interface CustomerAgingReport {
  as_of_date: string;
  data: CustomerAgingRow[];
  summary: {
    total_outstanding: number;
    overdue_customer_count: number;
  };
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

export interface ProductProfitabilityRow {
  product_name: string;
  variation_name: string | null;
  sku: string;
  cost_price: number;
  selling_price: number;
  mrp: number;
  margin: number;
  margin_pct: number;
  units_sold: number;
  total_profit: number;
}

export interface ProductProfitabilityReport {
  data: ProductProfitabilityRow[];
  summary: {
    avg_margin: number;
    products_below_cost: number;
    highest_margin_product: string;
  };
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
