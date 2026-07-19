import apiClient from '@/lib/api/axios';

export interface DisplaySettings {
  default_view: 'grid' | 'list';
  grid_columns: number;
  items_per_page: number;
  default_sort: 'newest' | 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'popularity';
  show_out_of_stock: boolean;
  show_low_stock_badge: boolean;
  out_of_stock_policy: 'hide' | 'show' | 'show_with_badge';
}

class DisplaySettingsService {
  async get(): Promise<DisplaySettings> {
    const response = await apiClient.get('/api/v1/ecommerce/products/display-settings');
    return response.data.data;
  }

  async update(data: Partial<DisplaySettings>): Promise<DisplaySettings> {
    const response = await apiClient.put('/api/v1/ecommerce/products/display-settings', data);
    return response.data.data;
  }
}

export default new DisplaySettingsService();
