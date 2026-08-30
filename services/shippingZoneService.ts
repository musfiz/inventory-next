import type { ShippingZone, ShippingZoneRate } from '@/types/ecommerce';
import apiClient from '@/lib/api/axios';

const API_BASE = '/api/v1/ecommerce/shipping-zones';

// ── Mock Data ─────────────────────────────────────────────────────────

const mockZoneRates: Record<string, ShippingZoneRate[]> = {
  '1': [
    { id: 'r1', zone_id: '1', min_weight: 0, max_weight: 1, rate: 60, estimated_days: '3-5', is_free: false, created_at: '2025-01-01T00:00:00Z' },
    { id: 'r2', zone_id: '1', min_weight: 1, max_weight: 5, rate: 100, estimated_days: '3-5', is_free: false, created_at: '2025-01-01T00:00:00Z' },
    { id: 'r3', zone_id: '1', min_weight: 5, max_weight: null, rate: 150, estimated_days: '5-7', is_free: false, created_at: '2025-01-01T00:00:00Z' },
  ],
  '2': [
    { id: 'r4', zone_id: '2', min_amount: 0, max_amount: 1000, rate: 100, estimated_days: '3-5', is_free: false, created_at: '2025-01-01T00:00:00Z' },
    { id: 'r5', zone_id: '2', min_amount: 1000, max_amount: null, rate: 0, estimated_days: '3-5', is_free: true, created_at: '2025-01-01T00:00:00Z' },
  ],
};

const mockZones: (ShippingZone & { rates: ShippingZoneRate[] })[] = [
  {
    id: '1', name: 'Dhaka Metro', description: 'All areas within Dhaka metropolitan area',
    cities: ['Dhaka', 'Mirpur', 'Uttara', 'Banani', 'Gulshan', 'Mohakhali'],
    countries: ['Bangladesh'],
    base_rate: 60,
    free_shipping_threshold: 500,
    estimated_days_min: 1, estimated_days_max: 3,
    is_active: true, sort_order: 1,
    created_at: '2025-01-01T00:00:00Z',
    rates: mockZoneRates['1'],
  },
  {
    id: '2', name: 'Divisional Cities', description: 'All divisional cities outside Dhaka',
    cities: ['Chittagong', 'Khulna', 'Rajshahi', 'Sylhet', 'Barisal', 'Rangpur', 'Mymensingh'],
    countries: ['Bangladesh'],
    base_rate: 100,
    free_shipping_threshold: 1000,
    estimated_days_min: 3, estimated_days_max: 5,
    is_active: true, sort_order: 2,
    created_at: '2025-01-01T00:00:00Z',
    rates: mockZoneRates['2'],
  },
  {
    id: '3', name: 'District Towns', description: 'All district-level towns across Bangladesh',
    cities: ['Narayanganj', 'Gazipur', 'Comilla', 'Jessore', 'Bogra', 'Dinajpur', 'Pabna', 'Tangail'],
    countries: ['Bangladesh'],
    base_rate: 150,
    free_shipping_threshold: 2000,
    estimated_days_min: 5, estimated_days_max: 7,
    is_active: true, sort_order: 3,
    created_at: '2025-01-01T00:00:00Z',
    rates: [],
  },
  {
    id: '4', name: 'Remote / Rural Areas', description: 'Rural areas and hard-to-reach locations',
    cities: [],
    countries: ['Bangladesh'],
    base_rate: 200,
    free_shipping_threshold: null,
    estimated_days_min: 7, estimated_days_max: 12,
    is_active: true, sort_order: 4,
    created_at: '2025-01-01T00:00:00Z',
    rates: [],
  },
  {
    id: '5', name: 'International - SAARC', description: 'SAARC countries including India, Pakistan, Nepal, Bhutan, Sri Lanka, Maldives',
    cities: [],
    countries: ['India', 'Pakistan', 'Nepal', 'Bhutan', 'Sri Lanka', 'Maldives'],
    base_rate: 500,
    free_shipping_threshold: null,
    estimated_days_min: 7, estimated_days_max: 14,
    is_active: false, sort_order: 5,
    created_at: '2025-03-01T00:00:00Z',
    rates: [],
  },
  {
    id: '6', name: 'International - Other', description: 'All other international destinations',
    cities: [],
    countries: ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'Singapore', 'Malaysia', 'UAE'],
    base_rate: 1500,
    free_shipping_threshold: null,
    estimated_days_min: 10, estimated_days_max: 21,
    is_active: false, sort_order: 6,
    created_at: '2025-03-01T00:00:00Z',
    rates: [],
  },
];

// ── Service Class ──────────────────────────────────────────────────────

class ShippingZoneService {
  private data: (ShippingZone & { rates: ShippingZoneRate[] })[] = [...mockZones];

  // ── List ─────────────────────────────────────────────────────────────

  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    filterParams?: Record<string, string | number | undefined | null>;
  }): Promise<{ data: ShippingZone[]; total: number; page: number; per_page: number }> {
    try {
      const response = await apiClient.get(API_BASE, { params });
      const result = response.data;
      if (result.data) {
        const data = result.data.map((z: any) => ({ ...z, id: String(z.id) }));
        if (result.pagination) {
          return { data, total: result.pagination.total, page: result.pagination.page, per_page: result.pagination.pageSize };
        }
        return { data, total: data.length, page: 1, per_page: data.length };
      }
      throw new Error('Unexpected API response format');
    } catch (error) {
      if (process.env.NEXT_PUBLIC_USE_MOCK !== 'true') throw error;
      console.warn('ShippingZone API unavailable, using mock data:', error);
      return this.fallbackList(params);
    }
  }

  // ── Get By ID ────────────────────────────────────────────────────────

  async getById(id: string): Promise<(ShippingZone & { rates: ShippingZoneRate[] }) | undefined> {
    try {
      const response = await apiClient.get(`${API_BASE}/${id}`);
      const zone = response.data?.data?.zone;
      if (!zone) throw new Error('Shipping zone not found');
      return { ...zone, id: String(zone.id) };
    } catch (error) {
      console.warn('ShippingZone getById API unavailable, using mock:', error);
      await new Promise(r => setTimeout(r, 200));
      return this.data.find(z => z.id === id);
    }
  }

  // ── Store (create/update) ────────────────────────────────────────────

  async store(data: Partial<ShippingZone>): Promise<ShippingZone> {
    try {
      const response = await apiClient.post(API_BASE, data);
      return response.data?.data?.zone;
    } catch (error) {
      if (process.env.NEXT_PUBLIC_USE_MOCK !== 'true') throw error;
      console.warn('ShippingZone store API unavailable, using mock:', error);
      return this.fallbackStore(data);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`${API_BASE}/${id}`);
    } catch (error) {
      console.warn('ShippingZone delete API unavailable, using mock:', error);
      await new Promise(r => setTimeout(r, 300));
      this.data = this.data.filter(z => z.id !== id);
    }
  }

  // ── Toggle Active ────────────────────────────────────────────────────

  async toggleActive(id: string): Promise<void> {
    try {
      await apiClient.patch(`${API_BASE}/${id}/toggle-active`);
    } catch (error) {
      console.warn('ShippingZone toggleActive API unavailable, using mock:', error);
      await new Promise(r => setTimeout(r, 300));
      const zone = this.data.find(z => z.id === id);
      if (zone) zone.is_active = !zone.is_active;
    }
  }

  // ── Rates CRUD ───────────────────────────────────────────────────────

  async getRates(zoneId: string): Promise<ShippingZoneRate[]> {
    try {
      const response = await apiClient.get(`${API_BASE}/${zoneId}/rates`);
      const rates = response.data?.data?.rates;
      if (rates) return rates;
      throw new Error('Unexpected API response format');
    } catch (error) {
      console.warn('ShippingZone rates API unavailable, using mock:', error);
      await new Promise(r => setTimeout(r, 200));
      return this.data.find(z => z.id === zoneId)?.rates || [];
    }
  }

  async saveRate(zoneId: string, data: Partial<ShippingZoneRate>): Promise<ShippingZoneRate> {
    try {
      const response = await apiClient.post(`${API_BASE}/${zoneId}/rates`, data);
      return response.data?.data?.rate;
    } catch (error) {
      console.warn('ShippingZone saveRate API unavailable, using mock:', error);
      await new Promise(r => setTimeout(r, 300));
      const rate: ShippingZoneRate = {
        id: String(Date.now()),
        zone_id: zoneId,
        rate: data.rate || 0,
        estimated_days: data.estimated_days || '3-5',
        is_free: data.is_free || false,
        created_at: new Date().toISOString(),
      };
      const zone = this.data.find(z => z.id === zoneId);
      if (zone) zone.rates.push(rate);
      return rate;
    }
  }

  async deleteRate(zoneId: string, rateId: string): Promise<void> {
    try {
      await apiClient.delete(`${API_BASE}/${zoneId}/rates/${rateId}`);
    } catch (error) {
      console.warn('ShippingZone deleteRate API unavailable, using mock:', error);
      await new Promise(r => setTimeout(r, 300));
      const zone = this.data.find(z => z.id === zoneId);
      if (zone) zone.rates = zone.rates.filter(r => r.id !== rateId);
    }
  }

  // ── Mock Fallbacks ───────────────────────────────────────────────────

  private async fallbackList(params?: any) {
    await new Promise(r => setTimeout(r, 300));
    let filtered = [...this.data];
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        z => z.name.toLowerCase().includes(q) ||
             z.description.toLowerCase().includes(q) ||
             z.cities.some(c => c.toLowerCase().includes(q)) ||
             z.countries.some(c => c.toLowerCase().includes(q))
      );
    }
    if (params?.filterParams) {
      const { is_active } = params.filterParams;
      if (is_active === 'active') filtered = filtered.filter(z => z.is_active);
      else if (is_active === 'inactive') filtered = filtered.filter(z => !z.is_active);
    }
    const total = filtered.length;
    const page = params?.page || 1;
    const perPage = params?.per_page || 15;
    const start = (page - 1) * perPage;
    return { data: filtered.slice(start, start + perPage), total, page, per_page: perPage };
  }

  private async fallbackStore(data: Partial<ShippingZone>) {
    await new Promise(r => setTimeout(r, 300));
    if (data.id) {
      const idx = this.data.findIndex(z => z.id === data.id);
      if (idx !== -1) {
        this.data[idx] = { ...this.data[idx], ...data, rates: this.data[idx].rates || [] } as any;
        return this.data[idx];
      }
      throw new Error('Shipping zone not found');
    }
    const zone: ShippingZone & { rates: ShippingZoneRate[] } = {
      id: String(Date.now()),
      name: data.name || '',
      description: data.description || '',
      cities: data.cities || [],
      countries: data.countries || [],
      base_rate: data.base_rate || 0,
      free_shipping_threshold: data.free_shipping_threshold ?? null,
      estimated_days_min: data.estimated_days_min || 3,
      estimated_days_max: data.estimated_days_max || 7,
      is_active: data.is_active ?? true,
      sort_order: data.sort_order || this.data.length + 1,
      created_at: new Date().toISOString(),
      rates: [],
    };
    this.data.unshift(zone);
    return zone;
  }
}

const shippingZoneService = new ShippingZoneService();
export default shippingZoneService;
