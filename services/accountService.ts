import apiClient from '@/lib/api/axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type {
  Account,
  AccountFormData,
  BalanceSheetReport,
  CashFlowReport,
  LedgerLine,
  ProfitLossReport,
  ReceivablesReport,
  TrialBalanceRow,
  TrialBalanceReport,
} from '@/types/accounting.types';

interface AccountLedgerResponse {
  account: Account;
  opening_balance: number;
  lines: { data: LedgerLine[] };
}

class AccountService {
  async list(params?: Record<string, unknown>): Promise<PaginatedResponse<Account>> {
    const response = await apiClient.get<PaginatedResponse<Account>>('/api/v1/accounts', { params });
    return response.data;
  }

  async dropdown(type?: string): Promise<Account[]> {
    const response = await apiClient.get<ApiResponse<Account[]>>('/api/v1/accounts/dropdown', {
      params: type ? { type } : undefined,
    });
    return response.data.data;
  }

  async show(id: number): Promise<Account> {
    const response = await apiClient.get<ApiResponse<Account>>(`/api/v1/accounts/${id}`);
    return response.data.data;
  }

  async store(data: AccountFormData): Promise<Account> {
    const response = await apiClient.post<ApiResponse<Account>>('/api/v1/accounts', data);
    return response.data.data;
  }

  async update(id: number, data: Partial<AccountFormData>): Promise<Account> {
    const response = await apiClient.put<ApiResponse<Account>>(`/api/v1/accounts/${id}`, data);
    return response.data.data;
  }

  async destroy(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/accounts/${id}`);
  }

  async ledger(
    id: number,
    params: { start_date: string; end_date: string; per_page?: number }
  ): Promise<AccountLedgerResponse> {
    const response = await apiClient.get<ApiResponse<AccountLedgerResponse>>(
      `/api/v1/accounts/${id}/ledger`,
      { params }
    );
    return response.data.data;
  }

  async seedDefaults(): Promise<void> {
    await apiClient.post('/api/v1/accounts/seed-defaults');
  }

  async trialBalance(params: { start_date: string; end_date: string }): Promise<TrialBalanceReport> {
    const rows = await this.trialBalanceRows(params);
    const totalDebit = rows.reduce((s, r) => s + (r.total_debit ?? 0), 0);
    const totalCredit = rows.reduce((s, r) => s + (r.total_credit ?? 0), 0);
    return {
      data: rows,
      start_date: params.start_date,
      end_date: params.end_date,
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: Math.abs(totalDebit - totalCredit) < 0.01,
    };
  }

  /** Raw rows from the backend (no aggregation). Used internally; prefer trialBalance(). */
  async trialBalanceRows(params: { start_date: string; end_date: string }): Promise<TrialBalanceRow[]> {
    const response = await apiClient.get<ApiResponse<{ data: TrialBalanceRow[]; start_date: string; end_date: string }>>(
      '/api/v1/reports/trial-balance',
      { params },
    );
    return response.data.data?.data ?? [];
  }

  async profitLoss(params: { start_date: string; end_date: string }): Promise<ProfitLossReport> {
    const response = await apiClient.get<ApiResponse<ProfitLossReport>>('/api/v1/reports/profit-loss', {
      params,
    });
    return response.data.data;
  }

  async cashFlow(params: { start_date: string; end_date: string }): Promise<CashFlowReport> {
    const response = await apiClient.get<ApiResponse<CashFlowReport>>('/api/v1/reports/cash-flow', {
      params,
    });
    return response.data.data;
  }

  /**
   * Balance Sheet as of a given date.
   *
   * Backend endpoint: `GET /api/v1/reports/balance-sheet?as_of_date=YYYY-MM-DD`
   * Returns aggregated Assets / Liabilities / Equity from posted journal entries
   * with `entry_date <= as_of_date`.
   *
   * Returns 404 / 500 today — the endpoint is on the gap-analysis roadmap
   * (gap 5.1). The page handles that gracefully.
   */
  async balanceSheet(params: { as_of_date: string }): Promise<BalanceSheetReport> {
    const response = await apiClient.get<ApiResponse<BalanceSheetReport>>('/api/v1/reports/balance-sheet', {
      params,
    });
    return response.data.data;
  }
}

export default new AccountService();
