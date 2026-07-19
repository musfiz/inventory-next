import apiClient from '@/lib/api/axios';
import type { CategoryContent } from '@/types/api.types';

class CategoryContentService {
  async getContent(id: number): Promise<CategoryContent> {
    const response = await apiClient.get<{
      success: boolean;
      data: CategoryContent;
    }>(`/api/v1/ecommerce/products/category-content/${id}`);
    return response.data.data;
  }

  async updateContent(id: number, formData: FormData): Promise<CategoryContent> {
    const response = await apiClient.post<{
      success: boolean;
      data: CategoryContent;
    }>(`/api/v1/ecommerce/products/category-content/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  }
}

export default new CategoryContentService();
