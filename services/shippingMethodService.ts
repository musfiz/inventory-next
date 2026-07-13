import type { ShippingMethod } from '@/types/ecommerce';

const mockMethods: ShippingMethod[] = [
  {
    id: '1',
    name: 'Standard Delivery',
    description: 'Delivered within 5-7 business days',
    rate: 0,
    estimated_days: '5-7 days',
    is_free: true,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Express Delivery',
    description: 'Delivered within 2-3 business days',
    rate: 150,
    estimated_days: '2-3 days',
    is_free: false,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'Next Day Delivery',
    description: 'Order before 2 PM for next day delivery',
    rate: 300,
    estimated_days: '1 day',
    is_free: false,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '4',
    name: 'Same Day Delivery',
    description: 'Available within Dhaka city only',
    rate: 200,
    estimated_days: 'Same day',
    is_free: false,
    is_active: false,
    created_at: '2025-06-01T00:00:00Z',
  },
  {
    id: '5',
    name: 'Pickup from Store',
    description: 'Pick up from our nearest store location',
    rate: 0,
    estimated_days: '1-2 hours',
    is_free: true,
    is_active: true,
    created_at: '2025-03-01T00:00:00Z',
  },
];

class ShippingMethodService {
  private data: ShippingMethod[] = [...mockMethods];

  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
  }): Promise<{ data: ShippingMethod[]; total: number; page: number; per_page: number }> {
    let filtered = [...this.data];
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        m => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
      );
    }
    const total = filtered.length;
    const page = params?.page || 1;
    const perPage = params?.per_page || 15;
    const start = (page - 1) * perPage;
    const paged = filtered.slice(start, start + perPage);
    return { data: paged, total, page, per_page: perPage };
  }

  async store(data: Partial<ShippingMethod> & { id?: string }): Promise<ShippingMethod> {
    await new Promise(r => setTimeout(r, 300));
    if (data.id) {
      const idx = this.data.findIndex(m => m.id === data.id);
      if (idx !== -1) {
        this.data[idx] = { ...this.data[idx], ...data } as ShippingMethod;
        return this.data[idx];
      }
      throw new Error('Shipping method not found');
    }
    const method: ShippingMethod = {
      id: String(Date.now()),
      name: data.name || '',
      description: data.description || '',
      rate: data.rate || 0,
      estimated_days: data.estimated_days || '',
      is_free: data.is_free ?? false,
      is_active: data.is_active ?? true,
      created_at: new Date().toISOString(),
    };
    this.data.unshift(method);
    return method;
  }

  async delete(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, 300));
    this.data = this.data.filter(m => m.id !== id);
  }

  async toggleActive(id: string): Promise<void> {
    await new Promise(r => setTimeout(r, 300));
    const method = this.data.find(m => m.id === id);
    if (method) method.is_active = !method.is_active;
  }
}

const shippingMethodService = new ShippingMethodService();
export default shippingMethodService;
