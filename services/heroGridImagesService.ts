import apiClient from '@/lib/api/axios';
import type { ApiResponse, HeroGridImage, CreateHeroGridImageRequest } from '@/types/api.types';

/**
 * Admin CRUD for the fixed 4-slot homepage hero promo grid
 * (Ecommerce -> Homepage -> Hero Grid).
 *
 * Mirrors heroSliderService: multipart POST to create, and multipart POST with
 * `_method=POST` to update so Laravel can still validate an uploaded file.
 */
class HeroGridImagesService {
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

  /** Returns the grid's images ordered by their fixed slot (1-4). */
  async getAll(): Promise<HeroGridImage[]> {
    const response = await apiClient.get<ApiResponse<{ data: HeroGridImage[] }>>('/api/v1/hero-grid-images');
    return response.data.data?.data ?? [];
  }

  async get(id: string): Promise<HeroGridImage> {
    const response = await apiClient.get<ApiResponse<{ image: HeroGridImage }>>(`/api/v1/hero-grid-images/${id}`);
    return response.data.data.image;
  }

  /**
   * Create the image for a grid slot. The backend replaces any image already in
   * that slot, so this doubles as "save slot N".
   */
  async create(
    data: CreateHeroGridImageRequest & { image: File },
    onProgress?: (p: number) => void,
  ): Promise<HeroGridImage> {
    const formData = new FormData();
    formData.append('image', data.image);
    formData.append('position', String(data.position));
    if (data.title) formData.append('title', data.title);
    if (data.link_url) formData.append('link_url', data.link_url);
    if (data.alt_text) formData.append('alt_text', data.alt_text);
    if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');

    const response = await apiClient.post<ApiResponse<{ image: HeroGridImage }>>(
      '/api/v1/hero-grid-images',
      formData,
      this.buildUploadConfig(onProgress),
    );
    return response.data.data.image;
  }

  async update(
    id: string,
    data: Partial<CreateHeroGridImageRequest & { image?: File }>,
    onProgress?: (p: number) => void,
  ): Promise<HeroGridImage> {
    const formData = new FormData();
    formData.append('_method', 'POST');
    if (data.image) formData.append('image', data.image);
    if (data.title !== undefined) formData.append('title', data.title);
    if (data.link_url !== undefined) formData.append('link_url', data.link_url);
    if (data.alt_text !== undefined) formData.append('alt_text', data.alt_text);
    if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');

    const response = await apiClient.post<ApiResponse<{ image: HeroGridImage }>>(
      `/api/v1/hero-grid-images/${id}`,
      formData,
      this.buildUploadConfig(onProgress),
    );
    return response.data.data.image;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/hero-grid-images/${id}`);
  }

  async toggleActive(id: string): Promise<HeroGridImage> {
    const response = await apiClient.patch<ApiResponse<{ image: HeroGridImage }>>(
      `/api/v1/hero-grid-images/${id}/toggle-active`,
    );
    return response.data.data.image;
  }
}

export default new HeroGridImagesService();
