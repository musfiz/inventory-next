import apiClient from '@/lib/api/axios';
import type { ApiResponse, StaticPage, CreateStaticPageRequest } from '@/types/api.types';

class StaticPageService {
  async getAll(params?: { page?: number; per_page?: number; search?: string }) {
    const response = await apiClient.get<{
      data: StaticPage[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }>('/api/v1/static-pages', { params });
    return response.data;
  }

  async get(id: string): Promise<StaticPage> {
    const response = await apiClient.get<ApiResponse<{ page: StaticPage }>>(
      `/api/v1/static-pages/${id}`
    );
    return response.data.data.page;
  }

  async create(data: CreateStaticPageRequest): Promise<StaticPage> {
    const response = await apiClient.post<ApiResponse<{ page: StaticPage }>>(
      '/api/v1/static-pages',
      data
    );
    return response.data.data.page;
  }

  async update(id: string, data: Partial<CreateStaticPageRequest>): Promise<StaticPage> {
    const response = await apiClient.post<ApiResponse<{ page: StaticPage }>>(
      `/api/v1/static-pages/${id}`,
      data
    );
    return response.data.data.page;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/static-pages/${id}`);
  }

  async togglePublish(id: string): Promise<StaticPage> {
    const response = await apiClient.patch<ApiResponse<{ page: StaticPage }>>(
      `/api/v1/static-pages/${id}/toggle-publish`
    );
    return response.data.data.page;
  }
}

export default new StaticPageService();
