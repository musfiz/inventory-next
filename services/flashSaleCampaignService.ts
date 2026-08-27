import type { FlashSaleCampaign, CampaignStatus, ProductSearchResult, CampaignCategory } from '@/types/ecommerce';
import apiClient from '@/lib/api/axios';

// ── Mock Fallback Data (used when API is unavailable) ─────────────────────

function computeStatus(c: { start_date: string; end_date: string; is_paused: boolean }): CampaignStatus {
  if (c.is_paused) return 'paused';
  const now = new Date();
  const start = new Date(c.start_date);
  const end = new Date(c.end_date);
  if (now < start) return 'scheduled';
  if (now > end) return 'ended';
  return 'active';
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const mockCampaigns: FlashSaleCampaign[] = [
  {
    id: '1', name: 'Summer Flash Sale',
    description: 'Huge discounts on summer essentials. Limited time offer!',
    start_date: daysFromNow(-2), end_date: daysFromNow(5),
    discount_type: 'percentage', discount_value: 25,
    is_paused: false, banner_image_url: null, banner_image_path: null, is_active: true,
    created_at: daysFromNow(-10), updated_at: daysFromNow(-2),
  },
  {
    id: '2', name: 'Weekend Mega Deals',
    description: 'Exclusive weekend flash sale on top categories.',
    start_date: daysFromNow(3), end_date: daysFromNow(5),
    discount_type: 'percentage', discount_value: 40,
    is_paused: false, banner_image_url: null, banner_image_path: null, is_active: true,
    created_at: daysFromNow(-5), updated_at: daysFromNow(-1),
  },
  {
    id: '3', name: 'Clearance Sale',
    description: 'Last chance to grab items at up to 50% off.',
    start_date: daysFromNow(-10), end_date: daysFromNow(-2),
    discount_type: 'fixed', discount_value: 500,
    is_paused: false, banner_image_url: null, banner_image_path: null, is_active: false,
    created_at: daysFromNow(-20), updated_at: daysFromNow(-2),
  },
  {
    id: '4', name: 'Flash Friday Frenzy',
    description: 'Paused sale — resume when ready.',
    start_date: daysFromNow(-1), end_date: daysFromNow(6),
    discount_type: 'percentage', discount_value: 30,
    is_paused: true, banner_image_url: null, banner_image_path: null, is_active: true,
    created_at: daysFromNow(-7), updated_at: daysFromNow(-1),
  },
];
mockCampaigns.forEach(c => { (c as any).computed_status = computeStatus(c); });

const mockProducts: { id: string; name: string; sku: string; image_url: string | null; category_id?: string }[] = [
  { id: 'p1', name: 'Wireless Bluetooth Headphones', sku: 'WH-1000', image_url: null, category_id: '1' },
  { id: 'p2', name: 'Smart Watch Pro', sku: 'SW-PRO', image_url: null, category_id: '2' },
  { id: 'p3', name: 'USB-C Charging Cable 2m', sku: 'CBL-2M', image_url: null, category_id: '3' },
  { id: 'p4', name: 'Laptop Stand Adjustable', sku: 'LS-ADJ', image_url: null, category_id: '3' },
  { id: 'p5', name: 'Mechanical Keyboard RGB', sku: 'KB-RGB', image_url: null, category_id: '3' },
  { id: 'p6', name: 'Wireless Mouse Ergonomic', sku: 'MS-ERG', image_url: null, category_id: '3' },
  { id: 'p7', name: '27" 4K Monitor', sku: 'MN-4K27', image_url: null, category_id: '4' },
  { id: 'p8', name: 'Webcam 1080p HD', sku: 'WC-HD', image_url: null, category_id: '3' },
  { id: 'p9', name: 'Desk Lamp LED Touch', sku: 'DL-LED', image_url: null, category_id: '5' },
  { id: 'p10', name: 'Portable SSD 1TB', sku: 'SSD-1TB', image_url: null, category_id: '4' },
];

const mockCategories: CampaignCategory[] = [
  { id: '1', name: 'Electronics' },
  { id: '2', name: 'Wearables' },
  { id: '3', name: 'Accessories' },
  { id: '4', name: 'Storage' },
  { id: '5', name: 'Lighting' },
];

const API_BASE = '/api/v1/flash-sale-campaigns';

// ── Service Class ──────────────────────────────────────────────────────────

class FlashSaleCampaignService {
  private fallbackMode = false;

  // ── List ───────────────────────────────────────────────────────────────

  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    status?: CampaignStatus;
  }): Promise<{
    data: FlashSaleCampaign[];
    total: number;
    page: number;
    per_page: number;
  }> {
    try {
      const response = await apiClient.get(API_BASE, { params });
      const result = response.data;

      // Handle paginated response format
      const data = (result.data || []).map((c: any) => ({
        ...c,
        computed_status: computeStatus(c),
      }));

      if (result.pagination) {
        return {
          data,
          total: result.pagination.total,
          page: result.pagination.page,
          per_page: result.pagination.pageSize,
        };
      }

      return { data, total: data.length, page: 1, per_page: data.length };
    } catch (error) {
      if (process.env.NEXT_PUBLIC_USE_MOCK !== 'true') throw error;
      console.warn('FlashSaleCampaign API unavailable, using mock data:', error);
      return this.fallbackList(params);
    }
  }

  // ── Store (create or update) ──────────────────────────────────────────

  async store(
    data: Partial<FlashSaleCampaign> & {
      id?: string;
      banner?: File | null;
    }
  ): Promise<FlashSaleCampaign> {
    try {
      const formData = new FormData();

      if (data.id) {
        formData.append('id', data.id);
      }
      if (data.name) formData.append('name', data.name);
      if (data.description) formData.append('description', data.description);
      if (data.start_date) formData.append('start_date', data.start_date);
      if (data.end_date) formData.append('end_date', data.end_date);
      if (data.discount_type) formData.append('discount_type', data.discount_type);
      if (data.discount_value !== undefined) {
        formData.append('discount_value', String(data.discount_value));
      }
      formData.append('is_paused', data.is_paused ? '1' : '0');
      formData.append('is_active', data.is_active !== false ? '1' : '0');
      // Tenant is resolved server-side from the active storefront (storefront settings)

      if (data.banner) {
        formData.append('banner', data.banner);
      }

      if (data.products && data.products.length > 0) {
        data.products.forEach((p: any, index: number) => {
          formData.append(`products[${index}][product_id]`, p.product_id);
          if (p.product_name) formData.append(`products[${index}][product_name]`, p.product_name);
          if (p.product_sku) formData.append(`products[${index}][product_sku]`, p.product_sku);
        });
      }

      const endpoint = data.id ? `${API_BASE}/${data.id}` : API_BASE;
      const response = await apiClient.post(endpoint, formData);
      const campaign = response.data.data?.campaign;

      if (campaign) {
        campaign.computed_status = computeStatus(campaign);
        return campaign;
      }

      throw new Error('Unexpected API response format');
    } catch (error: any) {
      // Re-throw validation errors so the page can display them
      if (error?.response?.data?.errors) {
        throw error;
      }
      console.warn('FlashSaleCampaign store API unavailable, using mock:', error);
      return this.fallbackStore(data);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`${API_BASE}/${id}`);
    } catch (error) {
      console.warn('FlashSaleCampaign delete API unavailable, using mock:', error);
      return this.fallbackDelete(id);
    }
  }

  // ── Get by ID ─────────────────────────────────────────────────────────

  async getById(id: string): Promise<FlashSaleCampaign | undefined> {
    try {
      const response = await apiClient.get(`${API_BASE}/${id}`);
      const campaign = response.data.data?.campaign;
      if (campaign) {
        campaign.computed_status = computeStatus(campaign);
      }
      return campaign;
    } catch (error) {
      console.warn('FlashSaleCampaign getById API unavailable, using mock:', error);
      return this.fallbackGetById(id);
    }
  }

  // ── Toggle Pause ──────────────────────────────────────────────────────

  async togglePause(id: string): Promise<FlashSaleCampaign> {
    try {
      const response = await apiClient.patch(`${API_BASE}/${id}/toggle-pause`);
      const campaign = response.data.data?.campaign;
      if (campaign) {
        campaign.computed_status = computeStatus(campaign);
        return campaign;
      }
      throw new Error('Unexpected API response format');
    } catch (error) {
      console.warn('FlashSaleCampaign togglePause API unavailable, using mock:', error);
      return this.fallbackTogglePause(id);
    }
  }

  // ── Search Products ───────────────────────────────────────────────────

  async searchProducts(query: string, categoryId?: string): Promise<ProductSearchResult[]> {
    try {
      const response = await apiClient.get(`${API_BASE}/search/products`, {
        params: { q: query, category_id: categoryId },
      });
      return (response.data.data?.products || []).map((p: any) => ({
        id: String(p.id),
        name: p.name,
        sku: p.sku,
        image_url: p.image_url || undefined,
      }));
    } catch (error) {
      console.warn('FlashSaleCampaign searchProducts API unavailable, using mock:', error);
      return this.fallbackSearchProducts(query, categoryId);
    }
  }

  // ── Get Categories ────────────────────────────────────────────────────

  async getCategories(): Promise<CampaignCategory[]> {
    try {
      const response = await apiClient.get('/api/v1/dropdown/category');
      const data = response.data?.data || response.data || [];
      return data.map((c: any) => ({
        id: String(c.id),
        name: c.name,
      }));
    } catch (error) {
      console.warn('Categories API unavailable, using mock:', error);
      return this.fallbackGetCategories();
    }
  }

  // ── Mock Fallback Methods ─────────────────────────────────────────────

  private mockData: FlashSaleCampaign[] = [...mockCampaigns];

  private async fallbackList(params?: any) {
    await new Promise(r => setTimeout(r, 300));
    let filtered = [...this.mockData];
    filtered.forEach(c => { c.computed_status = computeStatus(c); });

    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
      );
    }
    if (params?.status) {
      filtered = filtered.filter(c => c.computed_status === params.status);
    }

    const total = filtered.length;
    const page = params?.page || 1;
    const perPage = params?.per_page || 15;
    const start = (page - 1) * perPage;
    return { data: filtered.slice(start, start + perPage), total, page, per_page: perPage };
  }

  private async fallbackStore(data: any): Promise<FlashSaleCampaign> {
    await new Promise(r => setTimeout(r, 300));
    if (data.id) {
      const idx = this.mockData.findIndex(c => c.id === data.id);
      if (idx !== -1) {
        const updated = {
          ...this.mockData[idx], ...data,
          banner_image_url: data.banner ? URL.createObjectURL(data.banner) : this.mockData[idx].banner_image_url,
          updated_at: new Date().toISOString(),
        };
        updated.computed_status = computeStatus(updated);
        this.mockData[idx] = updated;
        return updated;
      }
      throw new Error('Campaign not found');
    }
    const campaign: FlashSaleCampaign = {
      id: String(Date.now()), name: data.name || '', description: data.description || '',
      start_date: data.start_date || new Date().toISOString(),
      end_date: data.end_date || new Date().toISOString(),
      discount_type: data.discount_type || 'percentage', discount_value: data.discount_value || 0,
      is_paused: data.is_paused ?? false,
      banner_image_url: data.banner ? URL.createObjectURL(data.banner) : null,
      banner_image_path: null, is_active: data.is_active ?? true,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      products: data.products || [],
    };
    campaign.computed_status = computeStatus(campaign);
    this.mockData.unshift(campaign);
    return campaign;
  }

  private async fallbackDelete(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, 300));
    this.mockData = this.mockData.filter(c => c.id !== id);
  }

  private async fallbackGetById(id: string): Promise<FlashSaleCampaign | undefined> {
    await new Promise(r => setTimeout(r, 150));
    const campaign = this.mockData.find(c => c.id === id);
    if (campaign) campaign.computed_status = computeStatus(campaign);
    return campaign;
  }

  private async fallbackTogglePause(id: string): Promise<FlashSaleCampaign> {
    await new Promise(r => setTimeout(r, 200));
    const idx = this.mockData.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Campaign not found');
    this.mockData[idx] = { ...this.mockData[idx], is_paused: !this.mockData[idx].is_paused, updated_at: new Date().toISOString() };
    this.mockData[idx].computed_status = computeStatus(this.mockData[idx]);
    return this.mockData[idx];
  }

  private async fallbackSearchProducts(query: string, categoryId?: string): Promise<ProductSearchResult[]> {
    await new Promise(r => setTimeout(r, 200));
    // If there's no typed query and no category filter, nothing to show
    if (!query.trim() && !categoryId) return [];
    const q = query.toLowerCase();
    return mockProducts
      .filter(p => {
        const matchesSearch = !query.trim() || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
        const matchesCategory = !categoryId || p.category_id === categoryId;
        return matchesSearch && matchesCategory;
      })
      .slice(0, 20)
      .map(p => ({ id: p.id, name: p.name, sku: p.sku, image_url: p.image_url || undefined }));
  }

  private async fallbackGetCategories(): Promise<CampaignCategory[]> {
    await new Promise(r => setTimeout(r, 100));
    return [...mockCategories];
  }
}

const flashSaleCampaignService = new FlashSaleCampaignService();
export default flashSaleCampaignService;
