import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface PosSession {
  id: string;
  uuid?: string;
  tenant_id?: string;
  register_id?: string;
  user_id?: string;
  session_number?: string;
  start_time?: string;
  end_time?: string | null;
  opening_balance?: string | number;
  closing_balance?: string | number | null;
  actual_cash?: string | number | null;
  total_sales?: string | number;
  total_refunds?: string | number;
  total_discount?: string | number;
  total_tax?: string | number;
  cash_sales?: string | number;
  card_sales?: string | number;
  bkash_sales?: string | number;
  nagad_sales?: string | number;
  rocket_sales?: string | number;
  bank_transfer_sales?: string | number;
  credit_sales?: string | number;
  cash_in?: string | number;
  cash_out?: string | number;
  sale_count?: number;
  refund_count?: number;
  item_count?: number;
  customer_count?: number;
  // F-10 FIX: backend enum is `open | closed` only. The previous
  // type allowed `paused | suspended` (UI-only values that the
  // backend never writes). Restricted to the canonical set.
  status?: 'open' | 'closed';
  opening_notes?: string | null;
  closing_notes?: string | null;
  closing_reason?: string | null;
  closed_by?: string | null;
  created_at?: string;
  register?: { id: string; name: string; code: string };
  user?: { id: string; name: string };
  closed_by_user?: { id: string; name: string };
}

class PosSessionService {
  async list(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/pos/sessions', { params });
    return response.data;
  }

  async open(data: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<PosSession>>('/api/v1/pos/sessions/open', data);
    return response.data.data;
  }

  async update(id: string, data: Record<string, any>) {
    const response = await apiClient.put<ApiResponse<PosSession>>(`/api/v1/pos/sessions/${id}`, data);
    return response.data.data;
  }

  async close(id: string, data?: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<PosSession>>(`/api/v1/pos/sessions/${id}/close`, data);
    return response.data.data;
  }

  async current(params?: Record<string, any>) {
    const response = await apiClient.get<ApiResponse<PosSession>>('/api/v1/pos/sessions/current', { params });
    return response.data.data;
  }

  async show(id: string) {
    const response = await apiClient.get<ApiResponse<PosSession>>(`/api/v1/pos/sessions/${id}`);
    return response.data.data;
  }

  async destroy(id: string) {
    // F-5 FIX: use DELETE (RESTful) instead of GET for the destructive
    // op. The backend's `GET .../delete/{id}` route is being
    // deprecated; the new canonical route is `DELETE /{id}`. Falls
    // back to the legacy GET only if the backend has not yet shipped
    // the new route.
    try {
      await apiClient.delete(`/api/v1/pos/sessions/${id}`);
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        const response = await apiClient.get(`/api/v1/pos/sessions/delete/${id}`);
        return response.data;
      }
      throw err;
    }
  }
}

export default new PosSessionService();
