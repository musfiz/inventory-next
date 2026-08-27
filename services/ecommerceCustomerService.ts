import type { EcommerceCustomer, EcommerceCustomerKPIs } from '@/types/ecommerce';
import apiClient from '@/lib/api/axios';

const API_BASE = '/api/v1/ecommerce/customers';

// ── Helper ──────────────────────────────────────────────────────────────────

function daysAgo(days: number, h = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - h, 0, 0, 0);
  return d.toISOString();
}

// ── Mock Data ───────────────────────────────────────────────────────────────

const mockCustomers: EcommerceCustomer[] = [
  { id: '1',  name: 'Md. Rahim Uddin',        email: 'rahim@example.com',        phone: '+880 1711-111111', status: 'active',      source: 'storefront', orders_count: 12, total_spent: 48500,  last_order_date: daysAgo(2),   created_at: daysAgo(180) },
  { id: '2',  name: 'Fatima Begum',            email: 'fatima@example.com',       phone: '+880 1711-222222', status: 'active',      source: 'storefront', orders_count: 8,  total_spent: 32200,  last_order_date: daysAgo(5),   created_at: daysAgo(165) },
  { id: '3',  name: 'Rafiq Hasan',             email: 'rafiq@example.com',        phone: '+880 1711-333333', status: 'active',      source: 'inventory',  orders_count: 5,  total_spent: 18700,  last_order_date: daysAgo(8),   created_at: daysAgo(150) },
  { id: '4',  name: 'Jahanara Parvin',         email: 'jahanara@example.com',    phone: '+880 1711-444444', status: 'inactive',    source: 'inventory',  orders_count: 3,  total_spent: 9500,   last_order_date: daysAgo(60),  created_at: daysAgo(200) },
  { id: '5',  name: 'Kamal Hossain',           email: 'kamal@example.com',        phone: '+880 1711-555555', status: 'active',      source: 'storefront', orders_count: 15, total_spent: 72300,  last_order_date: daysAgo(1),   created_at: daysAgo(210) },
  { id: '6',  name: 'Laila Akhter',            email: 'laila@example.com',        phone: '+880 1711-666666', status: 'blacklisted', source: 'storefront', orders_count: 1,  total_spent: 2500,   last_order_date: daysAgo(120), created_at: daysAgo(90)  },
  { id: '7',  name: 'Mahbub Alam',             email: 'mahbub@example.com',       phone: '+880 1711-777777', status: 'active',      source: 'inventory',  orders_count: 7,  total_spent: 28900,  last_order_date: daysAgo(3),   created_at: daysAgo(130) },
  { id: '8',  name: 'Nadia Sultana',           email: 'nadia@example.com',        phone: '+880 1711-888888', status: 'active',      source: 'storefront', orders_count: 10, total_spent: 45600,  last_order_date: daysAgo(4),   created_at: daysAgo(175) },
  { id: '9',  name: 'Omar Faruk',              email: 'omar@example.com',         phone: '+880 1711-999999', status: 'inactive',    source: 'inventory',  orders_count: 2,  total_spent: 6800,   last_order_date: daysAgo(90),  created_at: daysAgo(300) },
  { id: '10', name: 'Rashida Khatun',          email: 'rashida@example.com',      phone: '+880 1711-101010', status: 'active',      source: 'storefront', orders_count: 20, total_spent: 98500,  last_order_date: daysAgo(0),   created_at: daysAgo(240) },
  { id: '11', name: 'Shahidul Islam',          email: 'shahidul@example.com',     phone: '+880 1711-111011', status: 'active',      source: 'storefront', orders_count: 6,  total_spent: 21400,  last_order_date: daysAgo(7),   created_at: daysAgo(110) },
  { id: '12', name: 'Tahmina Yesmin',          email: 'tahmina@example.com',      phone: '+880 1711-121212', status: 'active',      source: 'inventory',  orders_count: 4,  total_spent: 14200,  last_order_date: daysAgo(10),  created_at: daysAgo(80)  },
  { id: '13', name: 'Abul Kalam Azad',         email: 'abul@example.com',         phone: '+880 1711-131313', status: 'inactive',    source: 'inventory',  orders_count: 1,  total_spent: 3500,   last_order_date: daysAgo(150), created_at: daysAgo(350) },
  { id: '14', name: 'Bilkis Jahan',            email: 'bilkis@example.com',       phone: '+880 1711-141414', status: 'active',      source: 'storefront', orders_count: 9,  total_spent: 38700,  last_order_date: daysAgo(6),   created_at: daysAgo(195) },
  { id: '15', name: 'Chand Mia',               email: 'chand@example.com',        phone: '+880 1711-151515', status: 'blacklisted', source: 'storefront', orders_count: 2,  total_spent: 8900,   last_order_date: daysAgo(80),  created_at: daysAgo(60)  },
  { id: '16', name: 'Delwar Hossain',          email: 'delwar@example.com',       phone: '+880 1711-161616', status: 'active',      source: 'inventory',  orders_count: 11, total_spent: 51200,  last_order_date: daysAgo(2),   created_at: daysAgo(160) },
  { id: '17', name: 'Enamul Haque',            email: 'enamul@example.com',       phone: '+880 1711-171717', status: 'inactive',    source: 'storefront', orders_count: 0,  total_spent: 0,      last_order_date: null,         created_at: daysAgo(45)  },
  { id: '18', name: 'Farzana Rahman',          email: 'farzana@example.com',      phone: '+880 1711-181818', status: 'active',      source: 'storefront', orders_count: 14, total_spent: 63400,  last_order_date: daysAgo(1),   created_at: daysAgo(190) },
  { id: '19', name: 'Golam Mostafa',           email: 'golam@example.com',        phone: '+880 1711-191919', status: 'active',      source: 'inventory',  orders_count: 3,  total_spent: 11200,  last_order_date: daysAgo(12),  created_at: daysAgo(30)  },
  { id: '20', name: 'Hasina Begum',            email: 'hasina@example.com',       phone: '+880 1711-202020', status: 'active',      source: 'storefront', orders_count: 18, total_spent: 87600,  last_order_date: daysAgo(0),   created_at: daysAgo(220) },
];

// ── Status Helpers ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  blacklisted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  blacklisted: 'Blacklisted',
};

// ── Service Class ───────────────────────────────────────────────────────────

class EcommerceCustomerService {
  private data: EcommerceCustomer[] = [...mockCustomers];

  // ── List ───────────────────────────────────────────────────────────────

  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    filterParams?: Record<string, string | number | undefined | null>;
  }): Promise<{ data: EcommerceCustomer[]; total: number; page: number; per_page: number }> {
    try {
      const response = await apiClient.get(API_BASE, { params });
      const result = response.data;
      if (result.data) {
        const data = result.data.map((c: any) => ({
          ...c,
          id: String(c.id),
          orders_count: Number(c.orders_count || 0),
          total_spent: Number(c.total_spent || 0),
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
      }
      throw new Error('Unexpected API response format');
    } catch (error) {
      if (process.env.NEXT_PUBLIC_USE_MOCK !== 'true') throw error;
      console.warn('EcommerceCustomer API unavailable, using mock data:', error);
      return this.fallbackList(params);
    }
  }

  // ── Get By ID ──────────────────────────────────────────────────────────

  async getById(id: string): Promise<EcommerceCustomer | undefined> {
    try {
      const response = await apiClient.get(`${API_BASE}/${id}`);
      const customer = response.data?.data?.customer;
      if (!customer) throw new Error('Customer not found');
      return {
        ...customer,
        id: String(customer.id),
        orders_count: Number(customer.orders_count || 0),
        total_spent: Number(customer.total_spent || 0),
      };
    } catch (error) {
      console.warn('EcommerceCustomer getById API unavailable, using mock:', error);
      return this.fallbackGetById(id);
    }
  }

  // ── Update Status ──────────────────────────────────────────────────────

  async updateStatus(id: string, status: string): Promise<void> {
    try {
      await apiClient.patch(`${API_BASE}/${id}/toggle-status`, { status });
    } catch (error) {
      console.warn('EcommerceCustomer updateStatus API unavailable, using mock:', error);
      return this.fallbackUpdateStatus(id, status);
    }
  }

  // ── Get KPIs ───────────────────────────────────────────────────────────

  async getKPIs(): Promise<EcommerceCustomerKPIs> {
    try {
      const response = await apiClient.get(`${API_BASE}/kpis`);
      const kpis = response.data?.data?.kpis;
      if (kpis) return kpis;
      throw new Error('Unexpected API response format');
    } catch (error) {
      console.warn('EcommerceCustomer KPIs API unavailable, using mock:', error);
      return this.fallbackGetKPIs();
    }
  }

  // ── Status Helpers ─────────────────────────────────────────────────────

  getStatusColor(status: string): string {
    return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusLabel(status: string): string {
    return STATUS_LABELS[status] || status;
  }

  // ── Mock Fallback Methods ──────────────────────────────────────────────

  private async fallbackList(params?: any) {
    await new Promise(r => setTimeout(r, 300));
    let filtered = [...this.data];
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        c => c.name.toLowerCase().includes(q) ||
             (c.email && c.email.toLowerCase().includes(q)) ||
             (c.phone && c.phone.includes(q))
      );
    }
    if (params?.filterParams) {
      const { status, date_from, date_to } = params.filterParams;
      if (status) filtered = filtered.filter(c => c.status === status);
      if (date_from) {
        const from = new Date(date_from);
        filtered = filtered.filter(c => new Date(c.created_at) >= from);
      }
      if (date_to) {
        const to = new Date(date_to);
        to.setHours(23, 59, 59, 999);
        filtered = filtered.filter(c => new Date(c.created_at) <= to);
      }
    }
    const total = filtered.length;
    const page = params?.page || 1;
    const perPage = params?.per_page || 15;
    const start = (page - 1) * perPage;
    return { data: filtered.slice(start, start + perPage), total, page, per_page: perPage };
  }

  private async fallbackGetById(id: string): Promise<EcommerceCustomer | undefined> {
    await new Promise(r => setTimeout(r, 200));
    return this.data.find(c => c.id === id);
  }

  private async fallbackUpdateStatus(id: string, status: string): Promise<void> {
    await new Promise(r => setTimeout(r, 300));
    const customer = this.data.find(c => c.id === id);
    if (customer) customer.status = status as EcommerceCustomer['status'];
  }

  private async fallbackGetKPIs(): Promise<EcommerceCustomerKPIs> {
    await new Promise(r => setTimeout(r, 200));
    const all = this.data;
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total_customers: all.length,
      active_customers: all.filter(c => c.status === 'active').length,
      inactive_customers: all.filter(c => c.status === 'inactive').length,
      blacklisted_customers: all.filter(c => c.status === 'blacklisted').length,
      new_this_month: all.filter(c => new Date(c.created_at) >= thisMonth).length,
      total_orders: all.reduce((s, c) => s + c.orders_count, 0),
      total_revenue: all.reduce((s, c) => s + c.total_spent, 0),
    };
  }
}

const ecommerceCustomerService = new EcommerceCustomerService();
export default ecommerceCustomerService;
