'use client';

import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface BusinessTypeItem {
  id: string | number;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BusinessTypeListResponse {
  data: BusinessTypeItem[];
}

class BusinessTypeService {
  async getAll(params?: { search?: string; is_active?: boolean }): Promise<BusinessTypeItem[]> {
    const response = await apiClient.get<ApiResponse<BusinessTypeItem[]>>('/api/v1/business-types', { params });
    return response.data.data;
  }

  async getById(id: string | number): Promise<BusinessTypeItem> {
    const response = await apiClient.get<ApiResponse<BusinessTypeItem>>(`/api/v1/business-types/${id}`);
    return response.data.data;
  }

  async create(data: { name: string; description?: string; is_active?: boolean }): Promise<BusinessTypeItem> {
    const response = await apiClient.post<ApiResponse<BusinessTypeItem>>('/api/v1/business-types', data);
    return response.data.data;
  }

  async update(id: string | number, data: { name?: string; description?: string; is_active?: boolean }): Promise<BusinessTypeItem> {
    const response = await apiClient.put<ApiResponse<BusinessTypeItem>>(`/api/v1/business-types/${id}`, data);
    return response.data.data;
  }

  async delete(id: string | number): Promise<void> {
    await apiClient.delete(`/api/v1/business-types/${id}`);
  }

  async getForDropdown(params?: { search?: string }): Promise<{ id: string | number; name: string; slug: string }[]> {
    const response = await apiClient.get<ApiResponse<{ id: string | number; name: string; slug: string }[]>>('/api/v1/business-types/dropdown', { params });
    return response.data.data;
  }
}

export const businessTypeService = new BusinessTypeService();
export default businessTypeService;
