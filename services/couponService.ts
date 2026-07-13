import type { Coupon } from '@/types/ecommerce';

const mockCoupons: Coupon[] = [
  {
    id: '1',
    code: 'WELCOME10',
    type: 'percentage',
    value: 10,
    min_order_amount: 500,
    max_discount_amount: 500,
    usage_limit: 100,
    used_count: 45,
    description: '10% off for new customers',
    is_active: true,
    valid_from: '2025-01-01T00:00:00Z',
    valid_until: '2026-12-31T23:59:59Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '2',
    code: 'FREESHIP',
    type: 'fixed',
    value: 100,
    min_order_amount: 1000,
    max_discount_amount: null,
    usage_limit: 50,
    used_count: 12,
    description: 'Free shipping on orders above ৳1000',
    is_active: true,
    valid_from: '2025-06-01T00:00:00Z',
    valid_until: '2026-06-01T23:59:59Z',
    created_at: '2025-06-01T00:00:00Z',
  },
  {
    id: '3',
    code: 'SUMMER25',
    type: 'percentage',
    value: 25,
    min_order_amount: 2000,
    max_discount_amount: 1000,
    usage_limit: 200,
    used_count: 78,
    description: 'Summer sale - 25% off',
    is_active: true,
    valid_from: '2025-07-01T00:00:00Z',
    valid_until: '2026-08-31T23:59:59Z',
    created_at: '2025-07-01T00:00:00Z',
  },
  {
    id: '4',
    code: 'FLAT500',
    type: 'fixed',
    value: 500,
    min_order_amount: 3000,
    max_discount_amount: null,
    usage_limit: null,
    used_count: 150,
    description: 'Flat ৳500 off on orders above ৳3000',
    is_active: false,
    valid_from: '2025-03-01T00:00:00Z',
    valid_until: '2026-05-01T23:59:59Z',
    created_at: '2025-03-01T00:00:00Z',
  },
  {
    id: '5',
    code: 'MEGA50',
    type: 'percentage',
    value: 50,
    min_order_amount: 5000,
    max_discount_amount: 2500,
    usage_limit: 10,
    used_count: 10,
    description: 'Mega 50% off - limited time offer',
    is_active: true,
    valid_from: '2025-12-01T00:00:00Z',
    valid_until: '2026-01-31T23:59:59Z',
    created_at: '2025-12-01T00:00:00Z',
  },
];

class CouponService {
  private data: Coupon[] = [...mockCoupons];

  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ data: Coupon[]; total: number; page: number; per_page: number }> {
    let filtered = [...this.data];
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        c => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
      );
    }
    const total = filtered.length;
    const page = params?.page || 1;
    const perPage = params?.per_page || 15;
    const start = (page - 1) * perPage;
    const paged = filtered.slice(start, start + perPage);
    return { data: paged, total, page, per_page: perPage };
  }

  async store(data: Partial<Coupon> & { id?: string }): Promise<Coupon> {
    await new Promise(r => setTimeout(r, 300));
    if (data.id) {
      const idx = this.data.findIndex(c => c.id === data.id);
      if (idx !== -1) {
        this.data[idx] = { ...this.data[idx], ...data } as Coupon;
        return this.data[idx];
      }
      throw new Error('Coupon not found');
    }
    const coupon: Coupon = {
      id: String(Date.now()),
      code: data.code || '',
      type: data.type || 'percentage',
      value: data.value || 0,
      min_order_amount: data.min_order_amount || null,
      max_discount_amount: data.max_discount_amount || null,
      usage_limit: data.usage_limit || null,
      used_count: 0,
      description: data.description || '',
      is_active: data.is_active ?? true,
      valid_from: data.valid_from || new Date().toISOString(),
      valid_until: data.valid_until || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    this.data.unshift(coupon);
    return coupon;
  }

  async delete(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, 300));
    this.data = this.data.filter(c => c.id !== id);
  }

  async getById(id: string): Promise<Coupon | undefined> {
    return this.data.find(c => c.id === id);
  }
}

const couponService = new CouponService();
export default couponService;
