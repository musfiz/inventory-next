import apiClient from '@/lib/api/axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type {
  Account,
  AccountFormData,
  CashFlowReport,
  LedgerLine,
  ProfitLossReport,
} from '@/types/accounting.types';

interface AccountLedgerResponse {
  account: Account;
  opening_balance: number;
  lines: { data: LedgerLine[] };
}

interface TrialBalanceResponse {
  data: unknown[];
  start_date: string;
  end_date: string;
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

  async trialBalance(params: { start_date: string; end_date: string }): Promise<TrialBalanceResponse> {
    const response = await apiClient.get<ApiResponse<TrialBalanceResponse>>('/api/v1/reports/trial-balance', {
      params,
    });
    return response.data.data;
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
}

export default new AccountService();
