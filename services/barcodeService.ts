import apiClient from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api.types';

export interface ProductBarcode {
  id: string;
  uuid?: string;
  product_id: string;
  variation_id?: string;
  barcode: string;
  type: 'EAN13' | 'CODE128' | 'QR';
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
  product?: {
    id: string;
    name: string;
    sku?: string;
  };
  variation?: {
    id: string;
    name: string;
    sku: string;
  };
}

/**
 * Product Barcode Service
 * Handles all product barcode-related API calls
 */
class BarcodeService {
  /**
   * Store a new barcode or update existing barcode
   * POST /api/v1/product-barcodes/store
   */
  async storeBarcode(data: {
    id?: string;
    product_id?: string;
    variation_id?: string;
    barcode: string;
    type: 'EAN13' | 'CODE128' | 'QR';
    is_primary?: boolean;
  }): Promise<ProductBarcode> {
    const response = await apiClient.post<ApiResponse<ProductBarcode>>(
      '/api/v1/product-barcodes/store',
      data
    );
    return response.data.data;
  }

  /**
   * Delete barcode
   * GET /api/v1/product-barcodes/delete/{id}
   */
  async deleteBarcode(id: string): Promise<void> {
    await apiClient.get(`/api/v1/product-barcodes/delete/${id}`);
  }

  /**
   * Fetch barcodes for a product (optionally with variation filter)
   * GET /api/v1/product-barcodes?product_id=...&per_page=100
   */
  async getBarcodes(productId: string | number): Promise<ProductBarcode[]> {
    const response = await apiClient.get<{ data: ProductBarcode[] }>(
      '/api/v1/product-barcodes',
      { params: { product_id: productId, per_page: 100 } }
    );
    return response.data.data ?? [];
  }

  /**
   * Fetch barcodes with flexible filters (for print page).
   * GET /api/v1/product-barcodes
   */
  async getAllBarcodes(filters?: Record<string, string>): Promise<{ data: ProductBarcode[] }> {
    const params: Record<string, string> = { per_page: '500', ...filters };
    const response = await apiClient.get<ApiResponse<{ data: ProductBarcode[] }>>(
      '/api/v1/product-barcodes',
      { params }
    );
    return response.data.data;
  }

  /**
   * Generate barcodes for all variations of a product
   * POST /api/v1/product-barcodes/generate-bulk
   */
  async generateBulkBarcodes(data: {
    product_id: string;
    type: 'EAN13' | 'CODE128' | 'QR';
  }): Promise<{ generated: number; message: string }> {
    const response = await apiClient.post<ApiResponse<{ generated: number; message: string }>>(
      '/api/v1/product-barcodes/generate-bulk',
      data
    );
    return response.data.data;
  }
}

export default new BarcodeService();
