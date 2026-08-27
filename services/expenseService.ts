import apiClient from '@/lib/api/axios';
import type { ExpenseFormData } from '@/types/accounting.types';

const expenseService = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get('/expenses', { params }),

  show: (id: number) => apiClient.get(`/expenses/${id}`),

  store: (data: ExpenseFormData) => apiClient.post('/expenses/store', data),

  update: (id: number, data: Partial<ExpenseFormData>) =>
    apiClient.put(`/expenses/${id}`, data),

  approve: (id: number) => apiClient.post(`/expenses/${id}/approve`),

  pay: (id: number, data?: { payment_method?: string }) =>
    apiClient.post(`/expenses/${id}/pay`, data ?? {}),

  destroy: (id: number) => apiClient.delete(`/expenses/${id}`),
};

export default expenseService;
