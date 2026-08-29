import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';
import type { Coupon } from '@/types/ecommerce';

class CouponService {
  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ data: Coupon[]; total: number; page: number; per_page: number }> {
    const query: Record<string, string | number | undefined> = {
      page: params?.page || 1,
      per_page: params?.per_page || 15,
    };
    if (params?.search) query.search = params.search;

    const response = await apiClient.get<{
      success: boolean;
      data: Coupon[];
      meta: { current_page: number; per_page: number; total: number; last_page: number };
    }>('/api/v1/coupons', { params: query });

    return {
      data: response.data.data ?? [],
      total: response.data.meta?.total ?? 0,
      page: response.data.meta?.current_page ?? 1,
      per_page: response.data.meta?.per_page ?? 15,
    };
  }

  async store(data: Partial<Coupon> & { id?: string }): Promise<Coupon> {
    const payload = {
      code: data.code,
      type: data.type,
      value: data.value,
      min_order_amount: data.min_order_amount ?? null,
      max_discount_amount: data.max_discount_amount ?? null,
      usage_limit: data.usage_limit ?? null,
      description: data.description ?? '',
      is_active: data.is_active ?? true,
      valid_from: data.valid_from || null,
      valid_until: data.valid_until || null,
    };

    if (data.id) {
      const response = await apiClient.put<ApiResponse<Coupon>>(
        `/api/v1/coupons/${data.id}`,
        payload
      );
      return response.data.data;
    }

    const response = await apiClient.post<ApiResponse<Coupon>>(
      '/api/v1/coupons',
      payload
    );
    return response.data.data;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<unknown>>(`/api/v1/coupons/${id}`);
  }

  async getById(id: string): Promise<Coupon | undefined> {
    const response = await apiClient.get<ApiResponse<Coupon>>(`/api/v1/coupons/${id}`);
    return response.data.data;
  }
}

const couponService = new CouponService();
export default couponService;
