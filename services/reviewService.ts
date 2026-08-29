import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';
import type { Review } from '@/types/ecommerce';

class ReviewService {
  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    filterParams?: Record<string, string | number | undefined | null>;
  }): Promise<{ data: Review[]; total: number; page: number; per_page: number }> {
    const filterParams = params?.filterParams ?? {};
    const query: Record<string, string | number | undefined> = {
      page: params?.page || 1,
      per_page: params?.per_page || 15,
    };
    if (params?.search) query.search = params.search;
    if (filterParams.is_approved !== undefined && filterParams.is_approved !== null && filterParams.is_approved !== '') {
      query.is_approved = String(filterParams.is_approved);
    }
    if (filterParams.rating !== undefined && filterParams.rating !== null && filterParams.rating !== '') {
      query.rating = String(filterParams.rating);
    }

    const response = await apiClient.get<{
      success: boolean;
      data: Review[];
      meta: { current_page: number; last_page: number; per_page: number; total: number };
    }>('/api/v1/product-reviews', { params: query });

    return {
      data: response.data.data ?? [],
      total: response.data.meta?.total ?? 0,
      page: response.data.meta?.current_page ?? 1,
      per_page: response.data.meta?.per_page ?? 15,
    };
  }

  async approve(id: string): Promise<void> {
    await apiClient.post<ApiResponse<unknown>>(`/api/v1/product-reviews/${id}/approve`);
  }

  async reject(id: string): Promise<void> {
    await apiClient.post<ApiResponse<unknown>>(`/api/v1/product-reviews/${id}/reject`);
  }

  async respond(id: string, response: string): Promise<void> {
    await apiClient.post<ApiResponse<unknown>>(`/api/v1/product-reviews/${id}/respond`, {
      admin_response: response,
    });
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<unknown>>(`/api/v1/product-reviews/${id}`);
  }
}

const reviewService = new ReviewService();
export default reviewService;
