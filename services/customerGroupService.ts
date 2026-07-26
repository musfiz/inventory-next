import type { CustomerGroup, EcommerceCustomer } from '@/types/ecommerce';
import apiClient from '@/lib/api/axios';

// ── Mock Data ──────────────────────────────────────────────────────────────

const mockGroups: CustomerGroup[] = [
  { id: 1,  name: 'VIP Customers',         description: 'Premium customers with highest spending & loyalty.',          discount_type: 'percentage', discount_value: 15, min_order_amount: null,    is_active: true,  sort_order: 1, customers_count: 3, created_at: '2026-01-15T10:00:00Z' },
  { id: 2,  name: 'Wholesale',             description: 'Bulk buyers who purchase in large quantities.',                discount_type: 'percentage', discount_value: 20, min_order_amount: 50000,   is_active: true,  sort_order: 2, customers_count: 2, created_at: '2026-02-01T10:00:00Z' },
  { id: 3,  name: 'Retail',                description: 'Standard retail customers with base pricing.',                discount_type: 'percentage', discount_value: 5,  min_order_amount: null,    is_active: true,  sort_order: 3, customers_count: 5, created_at: '2026-02-15T10:00:00Z' },
  { id: 4,  name: 'Dealer',                description: 'Authorized dealers with special trade pricing.',              discount_type: 'percentage', discount_value: 12, min_order_amount: 25000,   is_active: true,  sort_order: 4, customers_count: 1, created_at: '2026-03-01T10:00:00Z' },
  { id: 5,  name: 'Corporate',             description: 'Corporate clients with negotiated fixed discounts.',          discount_type: 'fixed',      discount_value: 1000, min_order_amount: 100000,  is_active: true,  sort_order: 5, customers_count: 2, created_at: '2026-03-10T10:00:00Z' },
  { id: 6,  name: 'Staff',                 description: 'Internal staff discount group.',                              discount_type: 'percentage', discount_value: 25, min_order_amount: null,    is_active: true,  sort_order: 6, customers_count: 0, created_at: '2026-04-01T10:00:00Z' },
  { id: 7,  name: 'Newsletter Subscribers', description: 'Customers who subscribe to marketing emails & newsletters.', discount_type: 'percentage', discount_value: 8,  min_order_amount: null,    is_active: true,  sort_order: 7, customers_count: 4, created_at: '2026-04-15T10:00:00Z' },
  { id: 8,  name: 'New Customers',          description: 'First-time buyers — welcome discount group.',                discount_type: 'percentage', discount_value: 0,  min_order_amount: null,    is_active: false, sort_order: 8, customers_count: 0, created_at: '2026-05-01T10:00:00Z' },
];

// Pre-defined assignments (customer_id -> group membership)
const mockAssignments: Record<number, number[]> = {
  1: [1, 3, 7],  // VIP, Retail, Newsletter
  2: [1, 7],      // VIP, Newsletter
  5: [1, 2],      // VIP, Wholesale
  7: [2, 3],      // Wholesale, Retail
  8: [3, 7],      // Retail, Newsletter
  10: [1, 3],     // VIP, Retail
  11: [5],         // Corporate
  13: [4],         // Dealer
  14: [5, 7],      // Corporate, Newsletter
  16: [3],         // Retail
  18: [1, 3, 7],   // VIP, Retail, Newsletter
  19: [3],         // Retail
  20: [7],         // Newsletter
};

// All 20 mock ecommerce customers for assignment
const mockAllCustomers: EcommerceCustomer[] = [
  { id: '1',  name: 'Md. Rahim Uddin',        email: 'rahim@example.com',        phone: '+880 1711-111111', status: 'active',      source: 'storefront', orders_count: 12, total_spent: 48500,  last_order_date: '2026-07-23T10:00:00Z', created_at: '2026-01-26T10:00:00Z' },
  { id: '2',  name: 'Fatima Begum',            email: 'fatima@example.com',       phone: '+880 1711-222222', status: 'active',      source: 'storefront', orders_count: 8,  total_spent: 32200,  last_order_date: '2026-07-20T10:00:00Z', created_at: '2026-02-10T10:00:00Z' },
  { id: '3',  name: 'Rafiq Hasan',             email: 'rafiq@example.com',        phone: '+880 1711-333333', status: 'active',      source: 'inventory',  orders_count: 5,  total_spent: 18700,  last_order_date: '2026-07-17T10:00:00Z', created_at: '2026-02-25T10:00:00Z' },
  { id: '4',  name: 'Jahanara Parvin',         email: 'jahanara@example.com',    phone: '+880 1711-444444', status: 'inactive',    source: 'inventory',  orders_count: 3,  total_spent: 9500,   last_order_date: '2026-05-26T10:00:00Z', created_at: '2026-01-06T10:00:00Z' },
  { id: '5',  name: 'Kamal Hossain',           email: 'kamal@example.com',        phone: '+880 1711-555555', status: 'active',      source: 'storefront', orders_count: 15, total_spent: 72300,  last_order_date: '2026-07-24T10:00:00Z', created_at: '2025-12-27T10:00:00Z' },
  { id: '6',  name: 'Laila Akhter',            email: 'laila@example.com',        phone: '+880 1711-666666', status: 'blacklisted', source: 'storefront', orders_count: 1,  total_spent: 2500,   last_order_date: '2026-03-27T10:00:00Z', created_at: '2026-04-26T10:00:00Z' },
  { id: '7',  name: 'Mahbub Alam',             email: 'mahbub@example.com',       phone: '+880 1711-777777', status: 'active',      source: 'inventory',  orders_count: 7,  total_spent: 28900,  last_order_date: '2026-07-22T10:00:00Z', created_at: '2026-03-17T10:00:00Z' },
  { id: '8',  name: 'Nadia Sultana',           email: 'nadia@example.com',        phone: '+880 1711-888888', status: 'active',      source: 'storefront', orders_count: 10, total_spent: 45600,  last_order_date: '2026-07-21T10:00:00Z', created_at: '2026-01-31T10:00:00Z' },
  { id: '9',  name: 'Omar Faruk',              email: 'omar@example.com',         phone: '+880 1711-999999', status: 'inactive',    source: 'inventory',  orders_count: 2,  total_spent: 6800,   last_order_date: '2026-04-26T10:00:00Z', created_at: '2025-09-28T10:00:00Z' },
  { id: '10', name: 'Rashida Khatun',          email: 'rashida@example.com',      phone: '+880 1711-101010', status: 'active',      source: 'storefront', orders_count: 20, total_spent: 98500,  last_order_date: '2026-07-25T10:00:00Z', created_at: '2025-11-27T10:00:00Z' },
  { id: '11', name: 'Shahidul Islam',          email: 'shahidul@example.com',     phone: '+880 1711-111011', status: 'active',      source: 'storefront', orders_count: 6,  total_spent: 21400,  last_order_date: '2026-07-18T10:00:00Z', created_at: '2026-04-06T10:00:00Z' },
  { id: '12', name: 'Tahmina Yesmin',          email: 'tahmina@example.com',      phone: '+880 1711-121212', status: 'active',      source: 'inventory',  orders_count: 4,  total_spent: 14200,  last_order_date: '2026-07-15T10:00:00Z', created_at: '2026-05-06T10:00:00Z' },
  { id: '13', name: 'Abul Kalam Azad',         email: 'abul@example.com',         phone: '+880 1711-131313', status: 'inactive',    source: 'inventory',  orders_count: 1,  total_spent: 3500,   last_order_date: '2026-02-25T10:00:00Z', created_at: '2025-08-09T10:00:00Z' },
  { id: '14', name: 'Bilkis Jahan',            email: 'bilkis@example.com',       phone: '+880 1711-141414', status: 'active',      source: 'storefront', orders_count: 9,  total_spent: 38700,  last_order_date: '2026-07-19T10:00:00Z', created_at: '2026-01-11T10:00:00Z' },
  { id: '15', name: 'Chand Mia',               email: 'chand@example.com',        phone: '+880 1711-151515', status: 'blacklisted', source: 'storefront', orders_count: 2,  total_spent: 8900,   last_order_date: '2026-05-06T10:00:00Z', created_at: '2026-05-26T10:00:00Z' },
  { id: '16', name: 'Delwar Hossain',          email: 'delwar@example.com',       phone: '+880 1711-161616', status: 'active',      source: 'inventory',  orders_count: 11, total_spent: 51200,  last_order_date: '2026-07-23T10:00:00Z', created_at: '2026-02-15T10:00:00Z' },
  { id: '17', name: 'Enamul Haque',            email: 'enamul@example.com',       phone: '+880 1711-171717', status: 'inactive',    source: 'storefront', orders_count: 0,  total_spent: 0,      last_order_date: null,         created_at: '2026-06-10T10:00:00Z' },
  { id: '18', name: 'Farzana Rahman',          email: 'farzana@example.com',      phone: '+880 1711-181818', status: 'active',      source: 'storefront', orders_count: 14, total_spent: 63400,  last_order_date: '2026-07-24T10:00:00Z', created_at: '2026-01-16T10:00:00Z' },
  { id: '19', name: 'Golam Mostafa',           email: 'golam@example.com',        phone: '+880 1711-191919', status: 'active',      source: 'inventory',  orders_count: 3,  total_spent: 11200,  last_order_date: '2026-07-13T10:00:00Z', created_at: '2026-06-25T10:00:00Z' },
  { id: '20', name: 'Hasina Begum',            email: 'hasina@example.com',       phone: '+880 1711-202020', status: 'active',      source: 'storefront', orders_count: 18, total_spent: 87600,  last_order_date: '2026-07-25T10:00:00Z', created_at: '2025-12-17T10:00:00Z' },
];

const API_BASE = '/api/v1/ecommerce/customer-groups';

// ── Service Class ──────────────────────────────────────────────────────────

class CustomerGroupService {
  private mockData: CustomerGroup[] = [...mockGroups];
  private mockAssignmentsData: Record<number, number[]> = JSON.parse(JSON.stringify(mockAssignments));

  // ── List ───────────────────────────────────────────────────────────────

  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    is_active?: string;
  }): Promise<{
    data: CustomerGroup[];
    total: number;
    page: number;
    per_page: number;
  }> {
    try {
      const response = await apiClient.get(API_BASE, { params });
      const result = response.data;
      const data = (result.data || []).map((g: any) => ({
        ...g,
        id: Number(g.id),
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
      console.warn('CustomerGroup API unavailable, using mock data:', error);
      return this.fallbackList(params);
    }
  }

  // ── Get By ID ──────────────────────────────────────────────────────────

  async getById(id: number): Promise<CustomerGroup | undefined> {
    try {
      const response = await apiClient.get(`${API_BASE}/${id}`);
      const group = response.data?.data?.group;
      if (group) return { ...group, id: Number(group.id) };
      throw new Error('Unexpected API response format');
    } catch (error) {
      console.warn('CustomerGroup getById API unavailable, using mock:', error);
      return this.fallbackGetById(id);
    }
  }

  // ── Store (create or update) ──────────────────────────────────────────

  async store(data: {
    id?: number;
    name: string;
    description?: string;
    discount_type?: 'percentage' | 'fixed';
    discount_value?: number;
    min_order_amount?: number | null;
    is_active?: boolean;
    sort_order?: number;
  }): Promise<CustomerGroup> {
    try {
      const formData = new FormData();
      if (data.id) formData.append('id', String(data.id));
      if (data.name) formData.append('name', data.name);
      if (data.description !== undefined) formData.append('description', data.description);
      if (data.discount_type) formData.append('discount_type', data.discount_type);
      if (data.discount_value !== undefined) formData.append('discount_value', String(data.discount_value));
      if (data.min_order_amount !== undefined && data.min_order_amount !== null) {
        formData.append('min_order_amount', String(data.min_order_amount));
      }
      formData.append('is_active', data.is_active !== false ? '1' : '0');
      if (data.sort_order !== undefined) formData.append('sort_order', String(data.sort_order));

      const endpoint = data.id ? `${API_BASE}/${data.id}` : API_BASE;
      const response = await apiClient.post(endpoint, formData);
      const group = response.data?.data?.group;
      if (group) return { ...group, id: Number(group.id) };
      throw new Error('Unexpected API response format');
    } catch (error: any) {
      if (error?.response?.data?.errors) throw error;
      console.warn('CustomerGroup store API unavailable, using mock:', error);
      return this.fallbackStore(data);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────

  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`${API_BASE}/${id}`);
    } catch (error) {
      console.warn('CustomerGroup delete API unavailable, using mock:', error);
      return this.fallbackDelete(id);
    }
  }

  // ── Toggle Active ──────────────────────────────────────────────────────

  async toggleActive(id: number): Promise<CustomerGroup> {
    try {
      const response = await apiClient.patch(`${API_BASE}/${id}/toggle-active`);
      const group = response.data?.data?.group;
      if (group) return { ...group, id: Number(group.id) };
      throw new Error('Unexpected API response format');
    } catch (error) {
      console.warn('CustomerGroup toggleActive API unavailable, using mock:', error);
      return this.fallbackToggleActive(id);
    }
  }

  // ── Get Customers in Group ────────────────────────────────────────────

  async getCustomers(groupId: number): Promise<EcommerceCustomer[]> {
    try {
      const response = await apiClient.get(`${API_BASE}/${groupId}/customers`);
      const result = response.data;
      const data = (result.data || []).map((c: any) => ({
        ...c, id: String(c.id),
        orders_count: Number(c.orders_count || 0),
        total_spent: Number(c.total_spent || 0),
      }));
      return data;
    } catch (error) {
      console.warn('CustomerGroup getCustomers API unavailable, using mock:', error);
      return this.fallbackGetCustomers(groupId);
    }
  }

  // ── Get Available Customers ──────────────────────────────────────────

  async getAvailableCustomers(groupId: number): Promise<EcommerceCustomer[]> {
    try {
      const response = await apiClient.get(`${API_BASE}/${groupId}/available`);
      const result = response.data;
      return (result.data || []).map((c: any) => ({
        ...c, id: String(c.id),
        orders_count: Number(c.orders_count || 0),
        total_spent: Number(c.total_spent || 0),
      }));
    } catch (error) {
      console.warn('CustomerGroup getAvailableCustomers API unavailable, using mock:', error);
      return this.fallbackGetAvailableCustomers(groupId);
    }
  }

  // ── Assign Customers ──────────────────────────────────────────────────

  async assignCustomers(groupId: number, customerIds: number[]): Promise<{ assigned: number; skipped: number }> {
    try {
      const response = await apiClient.post(`${API_BASE}/${groupId}/customers/assign`, { customer_ids: customerIds });
      return response.data?.data || { assigned: 0, skipped: 0 };
    } catch (error) {
      console.warn('CustomerGroup assignCustomers API unavailable, using mock:', error);
      return this.fallbackAssignCustomers(groupId, customerIds);
    }
  }

  // ── Remove Customer from Group ─────────────────────────────────────────

  async removeCustomer(groupId: number, customerId: number): Promise<void> {
    try {
      await apiClient.delete(`${API_BASE}/${groupId}/customers/${customerId}`);
    } catch (error) {
      console.warn('CustomerGroup removeCustomer API unavailable, using mock:', error);
      return this.fallbackRemoveCustomer(groupId, customerId);
    }
  }

  // ── Mock Fallback Methods ─────────────────────────────────────────────

  private async fallbackList(params?: any) {
    await new Promise(r => setTimeout(r, 300));
    let filtered = [...this.mockData];

    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(g =>
        g.name.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q))
      );
    }
    if (params?.is_active === 'active') {
      filtered = filtered.filter(g => g.is_active);
    } else if (params?.is_active === 'inactive') {
      filtered = filtered.filter(g => !g.is_active);
    }

    // Recompute customers_count from assignments
    filtered = filtered.map(g => ({
      ...g,
      customers_count: Object.values(this.mockAssignmentsData).filter(ids => ids.includes(g.id)).length,
    }));

    const total = filtered.length;
    const page = params?.page || 1;
    const perPage = params?.per_page || 15;
    const start = (page - 1) * perPage;
    return { data: filtered.slice(start, start + perPage), total, page, per_page: perPage };
  }

  private async fallbackGetById(id: number): Promise<CustomerGroup | undefined> {
    await new Promise(r => setTimeout(r, 200));
    const group = this.mockData.find(g => g.id === id);
    if (group) {
      return {
        ...group,
        customers_count: Object.values(this.mockAssignmentsData).filter(ids => ids.includes(id)).length,
      };
    }
    return undefined;
  }

  private async fallbackStore(data: any): Promise<CustomerGroup> {
    await new Promise(r => setTimeout(r, 300));
    if (data.id) {
      const idx = this.mockData.findIndex(g => g.id === data.id);
      if (idx !== -1) {
        this.mockData[idx] = {
          ...this.mockData[idx],
          ...data,
          discount_value: data.discount_value !== undefined ? Number(data.discount_value) : this.mockData[idx].discount_value,
          is_active: data.is_active !== undefined ? data.is_active : this.mockData[idx].is_active,
          updated_at: new Date().toISOString(),
        };
        return this.mockData[idx];
      }
      throw new Error('Group not found');
    }
    const newGroup: CustomerGroup = {
      id: Date.now(),
      name: data.name || '',
      description: data.description || '',
      discount_type: data.discount_type || 'percentage',
      discount_value: data.discount_value !== undefined ? Number(data.discount_value) : 0,
      min_order_amount: data.min_order_amount || null,
      is_active: data.is_active !== false,
      sort_order: data.sort_order || 0,
      customers_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.mockData.unshift(newGroup);
    return newGroup;
  }

  private async fallbackDelete(id: number): Promise<void> {
    await new Promise(r => setTimeout(r, 300));
    this.mockData = this.mockData.filter(g => g.id !== id);
    delete this.mockAssignmentsData[id];
    // Remove from all customer assignments
    for (const cId of Object.keys(this.mockAssignmentsData)) {
      this.mockAssignmentsData[Number(cId)] = this.mockAssignmentsData[Number(cId)].filter(gId => gId !== id);
    }
  }

  private async fallbackToggleActive(id: number): Promise<CustomerGroup> {
    await new Promise(r => setTimeout(r, 200));
    const idx = this.mockData.findIndex(g => g.id === id);
    if (idx === -1) throw new Error('Group not found');
    this.mockData[idx] = {
      ...this.mockData[idx],
      is_active: !this.mockData[idx].is_active,
      updated_at: new Date().toISOString(),
    };
    return this.mockData[idx];
  }

  private async fallbackGetCustomers(groupId: number): Promise<EcommerceCustomer[]> {
    await new Promise(r => setTimeout(r, 200));
    const assignedIds = Object.entries(this.mockAssignmentsData)
      .filter(([_, groupIds]) => groupIds.includes(groupId))
      .map(([customerId]) => Number(customerId));
    return mockAllCustomers.filter(c => assignedIds.includes(Number(c.id)));
  }

  private async fallbackGetAvailableCustomers(groupId: number): Promise<EcommerceCustomer[]> {
    await new Promise(r => setTimeout(r, 200));
    const assignedIds = Object.entries(this.mockAssignmentsData)
      .filter(([_, groupIds]) => groupIds.includes(groupId))
      .map(([customerId]) => Number(customerId));
    return mockAllCustomers.filter(c => !assignedIds.includes(Number(c.id)));
  }

  private async fallbackAssignCustomers(groupId: number, customerIds: number[]): Promise<{ assigned: number; skipped: number }> {
    await new Promise(r => setTimeout(r, 300));
    let assigned = 0;
    let skipped = 0;
    for (const cId of customerIds) {
      if (!this.mockAssignmentsData[cId]) {
        this.mockAssignmentsData[cId] = [];
      }
      if (this.mockAssignmentsData[cId].includes(groupId)) {
        skipped++;
      } else {
        this.mockAssignmentsData[cId].push(groupId);
        assigned++;
      }
    }
    return { assigned, skipped };
  }

  private async fallbackRemoveCustomer(groupId: number, customerId: number): Promise<void> {
    await new Promise(r => setTimeout(r, 200));
    if (this.mockAssignmentsData[customerId]) {
      this.mockAssignmentsData[customerId] = this.mockAssignmentsData[customerId].filter(gId => gId !== groupId);
    }
  }
}

const customerGroupService = new CustomerGroupService();
export default customerGroupService;
