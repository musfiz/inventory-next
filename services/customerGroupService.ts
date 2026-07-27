import type { CustomerGroup, EcommerceCustomer } from '@/types/ecommerce';
import apiClient from '@/lib/api/axios';

const API_BASE = '/api/v1/ecommerce/customer-groups';

// ── Service Class ──────────────────────────────────────────────────────────

class CustomerGroupService {
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
      console.warn('CustomerGroup list API unavailable:', error);
      return { data: [], total: 0, page: params?.page || 1, per_page: params?.per_page || 15 };
    }
  }

  // ── Get By ID ──────────────────────────────────────────────────────────

  async getById(id: number): Promise<CustomerGroup | undefined> {
    try {
      const response = await apiClient.get(`${API_BASE}/${id}`);
      const group = response.data?.data?.group;
      if (group) return { ...group, id: Number(group.id) };
      return undefined;
    } catch (error) {
      console.warn('CustomerGroup getById API unavailable:', error);
      return undefined;
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
    tenant_id?: string;
  }): Promise<CustomerGroup> {
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
    if (data.tenant_id) formData.append('tenant_id', data.tenant_id);

    const endpoint = data.id ? `${API_BASE}/${data.id}` : API_BASE;
    const response = await apiClient.post(endpoint, formData);
    const group = response.data?.data?.group;
    if (group) return { ...group, id: Number(group.id) };
    throw new Error('Unexpected API response format');
  }

  // ── Delete ─────────────────────────────────────────────────────────────

  async delete(id: number): Promise<void> {
    await apiClient.delete(`${API_BASE}/${id}`);
  }

  // ── Toggle Active ──────────────────────────────────────────────────────

  async toggleActive(id: number): Promise<CustomerGroup> {
    const response = await apiClient.patch(`${API_BASE}/${id}/toggle-active`);
    const group = response.data?.data?.group;
    if (group) return { ...group, id: Number(group.id) };
    throw new Error('Unexpected API response format');
  }

  // ── Get Customers in Group ────────────────────────────────────────────

  async getCustomers(groupId: number): Promise<EcommerceCustomer[]> {
    try {
      const response = await apiClient.get(`${API_BASE}/${groupId}/customers`);
      const result = response.data;
      return (result.data || []).map((c: any) => ({
        ...c, id: String(c.id),
        orders_count: Number(c.orders_count || 0),
        total_spent: Number(c.total_spent || 0),
      }));
    } catch (error) {
      console.warn('CustomerGroup getCustomers API unavailable:', error);
      return [];
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
      console.warn('CustomerGroup getAvailableCustomers API unavailable:', error);
      return [];
    }
  }

  // ── Assign Customers ──────────────────────────────────────────────────

  async assignCustomers(groupId: number, customerIds: number[]): Promise<{ assigned: number; skipped: number }> {
    const response = await apiClient.post(`${API_BASE}/${groupId}/customers/assign`, { customer_ids: customerIds });
    return response.data?.data || { assigned: 0, skipped: 0 };
  }

  // ── Remove Customer from Group ─────────────────────────────────────────

  async removeCustomer(groupId: number, customerId: number): Promise<void> {
    await apiClient.delete(`${API_BASE}/${groupId}/customers/${customerId}`);
  }
}

const customerGroupService = new CustomerGroupService();
export default customerGroupService;
