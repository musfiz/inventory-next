import type {
  WishlistInsightStats,
  WishlistTopProduct,
  WishlistTrendPoint,
  WishlistCustomerActivity,
  WishlistItem,
} from '@/types/ecommerce';
import apiClient from '@/lib/api/axios';

const API_BASE = '/api/v1/ecommerce/wishlists';

// ── Mock Data ─────────────────────────────────────────────────────────

function daysAgo(d: number): string {
  const date = new Date();
  date.setDate(date.getDate() - d);
  return date.toISOString();
}

const mockStats: WishlistInsightStats = {
  total_wishlisted_products: 156,
  total_wishlist_items: 842,
  total_customers_with_wishlists: 189,
  avg_items_per_customer: 4.46,
  conversion_rate: 23.5,
};

const mockTopProducts: WishlistTopProduct[] = Array.from({ length: 25 }, (_, i) => ({
  product_id: String(i + 1),
  product_name: [
    'Wireless Bluetooth Headphones', 'Organic Green Tea Set', 'Smart Fitness Watch',
    'Leather Messenger Bag', 'Stainless Steel Water Bottle', 'Portable Phone Charger',
    'Yoga Mat Premium', 'Wooden Recipe Box', 'UV Protection Sunglasses', 'Cashmere Winter Scarf',
    'Gourmet Coffee Beans', 'Bamboo Cutting Board', 'Essential Oil Diffuser', 'Running Shoes Pro',
    'Desk Organizer Set', 'Scented Candle Collection', 'Laptop Sleeve Case',
    'Reusable Shopping Bags', 'Ceramic Mug Set', 'Weighted Blanket',
    'Plant Pot Indoor', 'Wireless Earbuds', 'Natural Lip Balm Set', 'Cotton Tote Bag',
    'Stainless Steel Straws',
  ][i],
  product_image: null,
  sku: `SKU-${String(i + 1).padStart(4, '0')}`,
  price: Math.round((Math.random() * 80 + 10) * 100) / 100,
  wishlist_count: Math.floor(Math.random() * 120 + 5),
  added_to_cart_count: Math.floor(Math.random() * 60),
  purchased_count: Math.floor(Math.random() * 30),
}));

const mockTrends: WishlistTrendPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: daysAgo(29 - i).split('T')[0],
  count: Math.floor(Math.random() * 40 + 5),
}));

const mockCustomerNames = [
  'Rahim Uddin', 'Fatima Begum', 'Kamal Hossain', 'Nadia Sultana',
  'Shahidul Islam', 'Farzana Rahman', 'Mahbub Alam', 'Rashida Khatun',
  'Omar Faruk', 'Jahanara Parvin', 'Tahmina Yesmin', 'Abul Kalam',
];

const mockCustomerActivities: WishlistCustomerActivity[] = Array.from({ length: 45 }, (_, i) => ({
  customer_id: String(i + 1),
  customer_name: mockCustomerNames[i % mockCustomerNames.length],
  customer_email: `${mockCustomerNames[i % mockCustomerNames.length].toLowerCase().replace(/\s+/g, '.')}${i}@example.com`,
  items_count: Math.floor(Math.random() * 15 + 1),
  last_added_at: daysAgo(Math.floor(Math.random() * 30)),
}));

const mockCustomerWishlistItems: WishlistItem[] = Array.from({ length: 20 }, (_, i) => ({
  id: String(i + 1),
  product_id: String(i + 1),
  product_name: mockTopProducts[i % mockTopProducts.length].product_name,
  product_image: null,
  sku: `SKU-${String(i + 1).padStart(4, '0')}`,
  price: Math.round((Math.random() * 80 + 10) * 100) / 100,
  stock_status: (['in_stock', 'out_of_stock', 'backorder'] as const)[Math.floor(Math.random() * 3)],
  added_at: daysAgo(Math.floor(Math.random() * 30)),
}));

// ── Service Class ─────────────────────────────────────────────────────

class WishlistInsightsService {
  async getInsights(params?: {
    period?: string;
  }): Promise<WishlistInsightStats> {
    try {
      const response = await apiClient.get(`${API_BASE}/insights`, { params });
      const stats = response.data?.data?.stats;
      if (stats) return stats;
      throw new Error('Unexpected API response format');
    } catch (error) {
      if (process.env.NEXT_PUBLIC_USE_MOCK !== 'true') throw error;
      console.warn('Wishlist insights API unavailable, using mock data:', error);
      return mockStats;
    }
  }

  async getTopProducts(params?: {
    period?: string;
    per_page?: number;
    page?: number;
    search?: string;
  }): Promise<{ data: WishlistTopProduct[]; total: number }> {
    try {
      const response = await apiClient.get(`${API_BASE}/top-products`, { params });
      const result = response.data?.data;
      if (result?.data) {
        return { data: result.data, total: result.total ?? result.data.length };
      }
      throw new Error('Unexpected API response format');
    } catch (error) {
      if (process.env.NEXT_PUBLIC_USE_MOCK !== 'true') throw error;
      console.warn('Wishlist top-products API unavailable, using mock data:', error);
      await new Promise(r => setTimeout(r, 200));
      let filtered = [...mockTopProducts];
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(p => p.product_name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
      }
      return { data: filtered, total: filtered.length };
    }
  }

  async getTrends(params?: {
    period?: string;
  }): Promise<WishlistTrendPoint[]> {
    try {
      const response = await apiClient.get(`${API_BASE}/trends`, { params });
      const trends = response.data?.data?.trends;
      if (trends) return trends;
      throw new Error('Unexpected API response format');
    } catch (error) {
      if (process.env.NEXT_PUBLIC_USE_MOCK !== 'true') throw error;
      console.warn('Wishlist trends API unavailable, using mock data:', error);
      return mockTrends;
    }
  }

  async getCustomerActivity(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ data: WishlistCustomerActivity[]; total: number; page: number; per_page: number }> {
    try {
      const response = await apiClient.get(`${API_BASE}/customers`, { params });
      const result = response.data;
      if (result.data) {
        return {
          data: result.data,
          total: result.pagination?.total ?? result.data.length,
          page: result.pagination?.page ?? 1,
          per_page: result.pagination?.pageSize ?? result.data.length,
        };
      }
      throw new Error('Unexpected API response format');
    } catch (error) {
      if (process.env.NEXT_PUBLIC_USE_MOCK !== 'true') throw error;
      console.warn('Wishlist customer activity API unavailable, using mock data:', error);
      await new Promise(r => setTimeout(r, 300));
      let filtered = [...mockCustomerActivities];
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          c => c.customer_name.toLowerCase().includes(q) || c.customer_email.toLowerCase().includes(q)
        );
      }
      const total = filtered.length;
      const page = params?.page || 1;
      const perPage = params?.per_page || 15;
      const start = (page - 1) * perPage;
      return { data: filtered.slice(start, start + perPage), total, page, per_page: perPage };
    }
  }

  async getCustomerWishlist(customerId: string): Promise<{
    customer_id: string;
    customer_name: string;
    total_items: number;
    items: WishlistItem[];
  }> {
    try {
      const response = await apiClient.get(`${API_BASE}/customers/${customerId}`);
      const result = response.data?.data;
      if (result) {
        return result;
      }
      throw new Error('Unexpected API response format');
    } catch (error) {
      if (process.env.NEXT_PUBLIC_USE_MOCK !== 'true') throw error;
      console.warn('Wishlist customer detail API unavailable, using mock data:', error);
      await new Promise(r => setTimeout(r, 200));
      const customer = mockCustomerActivities.find(c => c.customer_id === customerId);
      return {
        customer_id: customerId,
        customer_name: customer?.customer_name || 'Unknown Customer',
        total_items: mockCustomerWishlistItems.length,
        items: mockCustomerWishlistItems,
      };
    }
  }
}

const wishlistInsightsService = new WishlistInsightsService();
export default wishlistInsightsService;
