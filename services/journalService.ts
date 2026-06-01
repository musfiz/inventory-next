import apiClient from '@/lib/api/axios';
import type { JournalEntryFormData } from '@/types/accounting.types';

const journalService = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get('/journal-entries', { params }),

  show: (id: number) => apiClient.get(`/journal-entries/${id}`),

  store: (data: JournalEntryFormData) => apiClient.post('/journal-entries', data),

  post: (id: number) => apiClient.post(`/journal-entries/${id}/post`),

  reverse: (id: number, reason: string) =>
    apiClient.post(`/journal-entries/${id}/reverse`, { reason }),
};

export default journalService;
