import apiClient from '@/lib/api/axios';
import type {
  ApiResponse,
  HeroSliderImage,
  CreateHeroSliderRequest,
} from '@/types/api.types';

class HeroSliderService {
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

  async getAll(params?: {
    page?: number;
    per_page?: number;
  }) {
    const response = await apiClient.get<{
      data: HeroSliderImage[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }>('/api/v1/hero-slider', { params });
    return response.data;
  }

  async get(id: string): Promise<HeroSliderImage> {
    const response = await apiClient.get<ApiResponse<{ image: HeroSliderImage }>>(
      `/api/v1/hero-slider/${id}`
    );
    return response.data.data.image;
  }

  async create(
    data: CreateHeroSliderRequest & { image: File },
    onProgress?: (percent: number) => void
  ): Promise<HeroSliderImage> {
    const formData = new FormData();
    formData.append('image', data.image);
    if (data.title) formData.append('title', data.title);
    if (data.subtitle) formData.append('subtitle', data.subtitle);
    if (data.cta_text) formData.append('cta_text', data.cta_text);
    if (data.cta_link) formData.append('cta_link', data.cta_link);
    if (data.alt_text) formData.append('alt_text', data.alt_text);
    if (data.sort_order !== undefined) formData.append('sort_order', String(data.sort_order));
    if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');
    if (data.starts_at) formData.append('starts_at', data.starts_at);
    if (data.ends_at) formData.append('ends_at', data.ends_at);

    const response = await apiClient.post<ApiResponse<{ image: HeroSliderImage }>>(
      '/api/v1/hero-slider',
      formData,
      this.buildUploadConfig(onProgress)
    );
    return response.data.data.image;
  }

  async update(
    id: string,
    data: Partial<CreateHeroSliderRequest & { image?: File }>,
    onProgress?: (percent: number) => void
  ): Promise<HeroSliderImage> {
    const formData = new FormData();
    formData.append('_method', 'POST');
    if (data.image) formData.append('image', data.image);
    if (data.title !== undefined) formData.append('title', data.title);
    if (data.subtitle !== undefined) formData.append('subtitle', data.subtitle);
    if (data.cta_text !== undefined) formData.append('cta_text', data.cta_text);
    if (data.cta_link !== undefined) formData.append('cta_link', data.cta_link);
    if (data.alt_text !== undefined) formData.append('alt_text', data.alt_text);
    if (data.sort_order !== undefined) formData.append('sort_order', String(data.sort_order));
    if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');
    if (data.starts_at !== undefined) formData.append('starts_at', data.starts_at);
    if (data.ends_at !== undefined) formData.append('ends_at', data.ends_at);

    const response = await apiClient.post<ApiResponse<{ image: HeroSliderImage }>>(
      `/api/v1/hero-slider/${id}`,
      formData,
      this.buildUploadConfig(onProgress)
    );
    return response.data.data.image;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/hero-slider/${id}`);
  }

  async toggleActive(id: string): Promise<HeroSliderImage> {
    const response = await apiClient.patch<ApiResponse<{ image: HeroSliderImage }>>(
      `/api/v1/hero-slider/${id}/toggle-active`
    );
    return response.data.data.image;
  }

  async reorder(items: { id: string; sort_order: number }[]): Promise<void> {
    await apiClient.post('/api/v1/hero-slider/reorder', { items });
  }
}

export default new HeroSliderService();