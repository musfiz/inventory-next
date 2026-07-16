import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';
import type { StorefrontOfferSlide } from '@/types/storefront';

export interface CreateOfferSlideRequest {
  title: string;
  subtitle?: string;
  link: string;
  accent?: string;
  is_active?: boolean;
  sort_order?: number;
}

class OfferSlideService {
  private buildUploadConfig(onProgress?: (percent: number) => void) {
    return {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event: { loaded: number; total?: number }) => {
        if (!onProgress) return;
        const total = event.total ?? 0;
        if (total <= 0) return;
        const percent = Math.min(100, Math.max(0, Math.round((event.loaded / total) * 100)));
        onProgress(percent);
      },
    };
  }

  async getAll(): Promise<StorefrontOfferSlide[]> {
    const response = await apiClient.get<ApiResponse<StorefrontOfferSlide[]>>(
      '/api/v1/offer-slides'
    );
    return response.data.data ?? [];
  }

  async create(
    data: CreateOfferSlideRequest & { image: File },
    onProgress?: (percent: number) => void
  ): Promise<StorefrontOfferSlide> {
    const formData = new FormData();
    formData.append('image', data.image);
    formData.append('title', data.title);
    formData.append('link', data.link);
    if (data.subtitle) formData.append('subtitle', data.subtitle);
    if (data.accent) formData.append('accent', data.accent);
    if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');
    if (data.sort_order !== undefined) formData.append('sort_order', String(data.sort_order));

    const response = await apiClient.post<ApiResponse<StorefrontOfferSlide>>(
      '/api/v1/offer-slides',
      formData,
      this.buildUploadConfig(onProgress)
    );
    return response.data.data;
  }

  async update(
    id: string,
    data: Partial<CreateOfferSlideRequest & { image?: File }>,
    onProgress?: (percent: number) => void
  ): Promise<StorefrontOfferSlide> {
    const formData = new FormData();
    formData.append('_method', 'POST');
    if (data.image) formData.append('image', data.image);
    if (data.title !== undefined) formData.append('title', data.title);
    if (data.subtitle !== undefined) formData.append('subtitle', data.subtitle);
    if (data.link !== undefined) formData.append('link', data.link);
    if (data.accent !== undefined) formData.append('accent', data.accent);
    if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');
    if (data.sort_order !== undefined) formData.append('sort_order', String(data.sort_order));

    const response = await apiClient.post<ApiResponse<StorefrontOfferSlide>>(
      `/api/v1/offer-slides/${id}`,
      formData,
      this.buildUploadConfig(onProgress)
    );
    return response.data.data;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/offer-slides/${id}`);
  }

  async toggleActive(id: string): Promise<StorefrontOfferSlide> {
    const response = await apiClient.patch<ApiResponse<StorefrontOfferSlide>>(
      `/api/v1/offer-slides/${id}/toggle-active`
    );
    return response.data.data;
  }

  async reorder(items: { id: string; sort_order: number }[]): Promise<void> {
    await apiClient.post('/api/v1/offer-slides/reorder', { items });
  }
}

export default new OfferSlideService();
