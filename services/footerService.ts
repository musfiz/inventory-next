import apiClient from '@/lib/api/axios';
import type { ApiResponse, FooterConfig } from '@/types/api.types';

class FooterService {
  async get(): Promise<FooterConfig> {
    const response = await apiClient.get<ApiResponse<FooterConfig>>('/api/v1/storefront/footer');
    return response.data.data;
  }

  async update(data: Partial<FooterConfig>): Promise<FooterConfig> {
    const response = await apiClient.put<ApiResponse<FooterConfig>>('/api/v1/footer', data);
    return response.data.data;
  }
}

export default new FooterService();
