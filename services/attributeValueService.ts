import apiClient from '@/lib/api/axios';
import type { AttributeValue, ApiResponse } from '@/types';

/**
 * Attribute Value Service
 * Handles all attribute value-related API calls
 */
class AttributeValueService {
  /**
   * Store a new attribute value or update existing attribute value
   * POST /api/v1/attribute-value/store
   */
  async storeAttributeValue(data: {
    id?: string;
    attribute_id: string;
    value: string;
    display_value?: string;
    hex_code?: string;
    sort_order?: number;
  }): Promise<AttributeValue> {
    const response = await apiClient.post<ApiResponse<AttributeValue>>(
      '/api/v1/attribute-value/store',
      data
    );

    return response.data.data;
  }

  /**
   * Delete an attribute value
   * GET /api/v1/attribute-value/{id}
   */
  async deleteAttributeValue(id: string): Promise<void> {
    await apiClient.get(`/api/v1/attribute-value/${id}`);
  }

  /**
   * Get attribute value by ID
   * GET /api/v1/attribute-value/{id}
   */
  async getAttributeValue(id: string): Promise<AttributeValue> {
    const response = await apiClient.get<ApiResponse<AttributeValue>>(`/api/v1/attribute-value/${id}`);
    return response.data.data;
  }

  /**
   * Get all attribute values for a specific attribute
   * GET /api/v1/attribute-value
   */
  async getAttributeValues(attributeId: string): Promise<AttributeValue[]> {
    const response = await apiClient.get<ApiResponse<AttributeValue[]>>('/api/v1/attribute-value', {
      params: { attribute_id: attributeId },
    });
    return response.data.data;
  }
}

// Create singleton instance
const attributeValueService = new AttributeValueService();
export default attributeValueService;