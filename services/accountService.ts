import apiClient from '@/lib/api/axios';
import type { Account, AccountFormData } from '@/types/accounting.types';

const accountService = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get('/accounts', { params }),

  dropdown: (type?: string) =>
    apiClient.get('/accounts/dropdown', { params: type ? { type } : undefined }),

  show: (id: number) => apiClient.get(`/accounts/${id}`),

  store: (data: AccountFormData) => apiClient.post('/accounts', data),

  update: (id: number, data: Partial<AccountFormData>) =>
    apiClient.put(`/accounts/${id}`, data),

  destroy: (id: number) => apiClient.delete(`/accounts/${id}`),

  ledger: (id: number, params: { start_date: string; end_date: string; per_page?: number }) =>
    apiClient.get(`/accounts/${id}/ledger`, { params }),

  seedDefaults: () => apiClient.post('/accounts/seed-defaults'),

  // Reports
  trialBalance: (params: { start_date: string; end_date: string }) =>
    apiClient.get('/reports/trial-balance', { params }),

  profitLoss: (params: { start_date: string; end_date: string }) =>
    apiClient.get('/reports/profit-loss', { params }),

  cashFlow: (params: { start_date: string; end_date: string }) =>
    apiClient.get('/reports/cash-flow', { params }),
};

export default accountService;
