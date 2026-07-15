import apiClient from '@/lib/api/axios';
import type { ApiResponse, BrandingResponse } from '@/types/api.types';

class BrandingService {
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

  async get(): Promise<BrandingResponse> {
    const response = await apiClient.get<ApiResponse<BrandingResponse>>('/api/v1/branding');
    return response.data.data;
  }

  async update(
    formData: FormData,
    onProgress?: (percent: number) => void
  ): Promise<BrandingResponse> {
    const response = await apiClient.post<ApiResponse<BrandingResponse>>(
      '/api/v1/branding',
      formData,
      this.buildUploadConfig(onProgress)
    );
    return response.data.data;
  }

  async remove(type: 'header_logo' | 'footer_logo' | 'favicon'): Promise<void> {
    await apiClient.delete(`/api/v1/branding/${type}`);
  }
}

export default new BrandingService();
