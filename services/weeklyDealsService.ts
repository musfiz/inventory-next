import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';
import type { SelectedVariation, WeeklyDeal } from '@/types/ecommerce';

const API_BASE = '/api/v1/weekly-deals';

export interface WeeklyDealListResult {
  data: WeeklyDeal[];
  total: number;
  page: number;
  per_page: number;
}

export interface WeeklyDealFormPayload {
  id?: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  sort_order?: number;
  variations: SelectedVariation[];
}

/**
 * Admin CRUD for the homepage Weekly Deals
 * (Ecommerce -> Homepage -> Weekly Deals).
 *
 * Deals carry no file uploads, so the payload is sent as JSON. The variation
 * order the admin picked is preserved and becomes the storefront carousel
 * order.
 */
class WeeklyDealsService {
  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
  }): Promise<WeeklyDealListResult> {
    const response = await apiClient.get(`${API_BASE}`, { params });
    // The API wraps the page in `data` and the counts in either `meta` or
    // `pagination` depending on the responder.
    const body = response.data as {
      data?: WeeklyDeal[];
      meta?: { total?: number; current_page?: number; per_page?: number };
      pagination?: { total?: number; page?: number; pageSize?: number };
    };

    return {
      data: body?.data ?? [],
      total: body?.meta?.total ?? body?.pagination?.total ?? 0,
      page: body?.meta?.current_page ?? body?.pagination?.page ?? 1,
      per_page: body?.meta?.per_page ?? body?.pagination?.pageSize ?? 15,
    };
  }

  async getById(id: string): Promise<WeeklyDeal> {
    const response = await apiClient.get<ApiResponse<{ deal: WeeklyDeal }>>(`${API_BASE}/${id}`);
    return response.data.data.deal;
  }

  /** Create when `id` is absent, otherwise update. */
  async store(payload: WeeklyDealFormPayload): Promise<WeeklyDeal> {
    const body = {
      title: payload.title,
      description: payload.description || null,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      is_active: payload.is_active,
      sort_order: payload.sort_order ?? 0,
      products: payload.variations.map((v, index) => ({
        product_variation_id: v.product_variation_id,
        sort_order: index,
      })),
    };

    const response = payload.id
      ? await apiClient.post<ApiResponse<{ deal: WeeklyDeal }>>(`${API_BASE}/${payload.id}`, body)
      : await apiClient.post<ApiResponse<{ deal: WeeklyDeal }>>(API_BASE, body);

    return response.data.data.deal;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${API_BASE}/${id}`);
  }

  async toggleActive(id: string): Promise<WeeklyDeal> {
    const response = await apiClient.patch<ApiResponse<{ deal: WeeklyDeal }>>(
      `${API_BASE}/${id}/toggle-active`,
    );
    return response.data.data.deal;
  }
}

export default new WeeklyDealsService();
