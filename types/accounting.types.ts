// Accounting Module Types

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'contra';
export type AccountSubtype =
  | 'cash' | 'bank' | 'mobile_banking' | 'inventory'
  | 'accounts_receivable' | 'accounts_payable'
  | 'fixed_asset' | 'current_liability' | 'long_term_liability'
  | 'sales_revenue' | 'purchase_expense' | 'operating_expense'
  | 'tax_liability' | 'tax_receivable' | 'cost_of_goods_sold'
  | 'discount' | 'return' | 'equity' | 'retained_earnings' | 'other';

export type JournalEntryStatus = 'draft' | 'posted' | 'reversed';
export type JournalReferenceType =
  | 'purchase' | 'sale' | 'pos' | 'payment' | 'expense'
  | 'return' | 'adjustment' | 'transfer' | 'opening' | 'manual';

export type ExpenseStatus = 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
export type PaymentStatus = 'paid' | 'pending' | 'partial';
export type PaymentMethod = 'cash' | 'card' | 'bkash' | 'nagad' | 'rocket' | 'bank_transfer' | 'check' | 'credit' | 'other';

// ── Chart of Accounts ───────────────────────────────────────────────────────

export interface Account {
  id: number;
  tenant_id: number;
  code: string;
  name: string;
  account_type: AccountType;
  account_subtype: AccountSubtype;
  parent_id: number | null;
  parent?: { id: number; code: string; name: string } | null;
  currency: string;
  balance: number;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountFormData {
  code: string;
  name: string;
  account_type: AccountType;
  account_subtype: AccountSubtype;
  parent_id?: number | null;
  description?: string;
  currency?: string;
}

// ── Journal Entries ─────────────────────────────────────────────────────────

export interface JournalEntryLine {
  id?: number;
  journal_entry_id?: number;
  account_id: number;
  account?: { id: number; code: string; name: string };
  description: string | null;
  debit: number;
  credit: number;
  cost_center?: string | null;
}

export interface JournalEntry {
  id: number;
  tenant_id: number;
  entry_number: string;
  entry_date: string;
  description: string | null;
  reference_type: JournalReferenceType | null;
  reference_id: number | null;
  reference_number: string | null;
  fiscal_period_id: number | null;
  status: JournalEntryStatus;
  is_auto: boolean;
  total_debit: number;
  total_credit: number;
  notes: string | null;
  created_by: number | null;
  posted_by: number | null;
  posted_at: string | null;
  reversed_by_entry_id: number | null;
  lines?: JournalEntryLine[];
  creator?: { id: number; name: string } | null;
  poster?: { id: number; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryFormData {
  entry_date: string;
  description: string;
  notes?: string;
  lines: {
    account_id: number;
    debit: number;
    credit: number;
    description?: string;
  }[];
}

// ── Expenses ───────────────────────────────────────────────────────────────

export interface Expense {
  id: number;
  tenant_id: number;
  uuid: string;
  expense_number: string;
  expense_date: string;
  category: string;
  description: string | null;
  amount: number;
  tax_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  paid_amount: number;
  vendor_name: string | null;
  vendor_phone: string | null;
  reference_number: string | null;
  receipt_url: string | null;
  status: ExpenseStatus;
  created_by: number | null;
  approved_by: number | null;
  creator?: { id: number; name: string } | null;
  approver?: { id: number; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseFormData {
  expense_date: string;
  category: string;
  description?: string;
  amount: number;
  tax_amount?: number;
  payment_method: PaymentMethod;
  payment_status?: PaymentStatus;
  vendor_name?: string;
  vendor_phone?: string;
  reference_number?: string;
}

// ── Reports ───────────────────────────────────────────────────────────────

export interface TrialBalanceRow {
  account_id: number;
  code: string;
  name: string;
  account_type: AccountType;
  total_debit: number;
  total_credit: number;
  balance: number;
}

export interface TrialBalanceReport {
  data: TrialBalanceRow[];
  start_date: string;
  end_date: string;
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
}

// ── Balance Sheet ──────────────────────────────────────────────────────────

export interface BalanceSheetLine {
  code: string;
  name: string;
  balance: number;
}

export interface BalanceSheetSection {
  current: number;
  fixed: number;
  total: number;
  lines: BalanceSheetLine[];
}

export interface BalanceSheetLiabilitiesSection {
  current: number;
  long_term: number;
  total: number;
  lines: BalanceSheetLine[];
}

export interface BalanceSheetEquitySection {
  total: number;
  lines: BalanceSheetLine[];
}

export interface BalanceSheetReport {
  as_of_date: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetLiabilitiesSection;
  equity: BalanceSheetEquitySection;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  total_le: number;          // liabilities + equity
  balanced: boolean;         // |assets - (liabilities + equity)| < 0.01
}

// ── Receivables (AR Aging) ──────────────────────────────────────────────────

export interface ReceivablesAgingBucket {
  current: number;   // 0-30 days
  d_31_60: number;
  d_61_90: number;
  d_90_plus: number;
  total: number;
}

export interface ReceivablesCustomer {
  customer_id: number;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  invoice_count: number;
  oldest_invoice_date?: string | null;
  aging: ReceivablesAgingBucket;
}

export interface ReceivablesReport {
  as_of_date: string;
  total_outstanding: number;
  total_current: number;
  total_31_60: number;
  total_61_90: number;
  total_90_plus: number;
  customer_count: number;
  customers: ReceivablesCustomer[];
}

export interface ProfitLossSection {
  code: string;
  name: string;
  amount: number;
}

export interface ProfitLossReport {
  start_date: string;
  end_date: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
  sections: {
    revenue: ProfitLossSection[];
    cogs: ProfitLossSection[];
    expenses: ProfitLossSection[];
    contra: ProfitLossSection[];
  };
}

export interface CashFlowAccount {
  code: string;
  name: string;
  inflows: number;
  outflows: number;
  net: number;
}

export interface CashFlowReport {
  start_date: string;
  end_date: string;
  inflows: number;
  outflows: number;
  net: number;
  by_account: CashFlowAccount[];
}

export interface LedgerLine {
  id: number;
  journal_entry_id: number;
  account_id: number;
  description: string | null;
  debit: number;
  credit: number;
  running_balance: number;
  journal_entry: {
    id: number;
    entry_number: string;
    entry_date: string;
    description: string | null;
    reference_type: string | null;
    reference_number: string | null;
    status: JournalEntryStatus;
  };
}
