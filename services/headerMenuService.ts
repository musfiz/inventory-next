import apiClient from '@/lib/api/axios';
import type { ApiResponse, HeaderMenuConfig } from '@/types/api.types';

class HeaderMenuService {
  async get(): Promise<HeaderMenuConfig> {
    const response = await apiClient.get<ApiResponse<HeaderMenuConfig>>('/api/v1/header-menu');
    return response.data.data;
  }

  async update(data: Partial<HeaderMenuConfig>): Promise<HeaderMenuConfig> {
    const response = await apiClient.put<ApiResponse<HeaderMenuConfig>>('/api/v1/header-menu', data);
    return response.data.data;
  }
}

export default new HeaderMenuService();
