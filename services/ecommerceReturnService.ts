import type { ReturnRequest, ReturnRequestItem, ReturnRequestStatus, ReturnRequestReason, ReturnKPIs } from '@/types/ecommerce';
import apiClient from '@/lib/api/axios';

const API_BASE = '/api/v1/ecommerce/returns';

// ── Mock Data Helpers ──────────────────────────────────────────────────

function daysAgo(days: number, h = 0, m = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - h, d.getMinutes() - m, 0, 0);
  return d.toISOString();
}

const mockItems: Record<string, ReturnRequestItem[]> = {
  '1': [
    { id: 'ri1', return_request_id: '1', order_item_id: 'oi1', product_name: 'Wireless Bluetooth Headphones', product_sku: 'WH-1000', quantity: 1, unit_price: 2500, total: 2500, condition: 'defective', reason: 'Sound not working' },
  ],
  '2': [
    { id: 'ri2', return_request_id: '2', order_item_id: 'oi2', product_name: 'USB-C Charging Cable 2m', product_sku: 'CBL-2M', quantity: 2, unit_price: 1000, total: 2000, condition: 'damaged', reason: 'Cable insulation torn' },
  ],
  '3': [
    { id: 'ri3', return_request_id: '3', order_item_id: 'oi3', product_name: 'Smart Watch Pro', product_sku: 'SW-PRO', quantity: 1, unit_price: 2500, total: 2500, condition: 'good', reason: 'Changed mind' },
  ],
  '4': [
    { id: 'ri4', return_request_id: '4', order_item_id: 'oi4', product_name: 'Mechanical Keyboard RGB', product_sku: 'KB-RGB', quantity: 1, unit_price: 4500, total: 4500, condition: 'defective', reason: 'Keys not registering' },
    { id: 'ri5', return_request_id: '4', order_item_id: 'oi5', product_name: 'Desk Lamp LED Touch', product_sku: 'DL-LED', quantity: 1, unit_price: 1000, total: 1000, condition: 'good', reason: 'Not as described' },
  ],
  '5': [
    { id: 'ri6', return_request_id: '5', order_item_id: 'oi6', product_name: 'Portable SSD 1TB', product_sku: 'SSD-1TB', quantity: 1, unit_price: 1200, total: 1200, condition: 'defective', reason: 'Drive not detected' },
  ],
};

const mockReturns: (ReturnRequest & { items: ReturnRequestItem[] })[] = [
  {
    id: '1', return_number: 'RET-2025-001',
    order_id: '1', order_number: 'ORD-2025-001',
    customer_name: 'Rahul Sharma', customer_email: 'rahul@example.com', customer_phone: '+880 1711-111111',
    reason: 'defective', reason_note: 'Headphones produce static noise in left ear',
    status: 'pending', items_count: 1, subtotal: 2500, refund_amount: 2500, refund_method: 'original',
    created_at: daysAgo(3, 10, 30), items: mockItems['1'],
  },
  {
    id: '2', return_number: 'RET-2025-002',
    order_id: '2', order_number: 'ORD-2025-002',
    customer_name: 'Priya Patel', customer_email: 'priya@example.com', customer_phone: '+880 1711-222222',
    reason: 'damaged_in_transit', reason_note: 'Package was crushed during delivery',
    status: 'pending', items_count: 1, subtotal: 2000, refund_amount: 2000, refund_method: 'store_credit',
    created_at: daysAgo(2, 14, 0), items: mockItems['2'],
  },
  {
    id: '3', return_number: 'RET-2025-003',
    order_id: '3', order_number: 'ORD-2025-003',
    customer_name: 'Amit Singh', customer_email: 'amit@example.com', customer_phone: '+880 1711-333333',
    reason: 'customer_changed_mind',
    status: 'approved', items_count: 1, subtotal: 2500, refund_amount: 2375, refund_method: 'original',
    approved_by: 'Admin', approved_at: daysAgo(1, 9, 0),
    created_at: daysAgo(5, 9, 15), items: mockItems['3'],
  },
  {
    id: '4', return_number: 'RET-2025-004',
    order_id: '4', order_number: 'ORD-2025-004',
    customer_name: 'Sneha Gupta', customer_email: 'sneha@example.com', customer_phone: '+880 1711-444444',
    reason: 'wrong_item', reason_note: 'Received different color than ordered',
    status: 'refunded', items_count: 2, subtotal: 5500, refund_amount: 5225, refund_method: 'original',
    approved_by: 'Admin', approved_at: daysAgo(3, 16, 45),
    created_at: daysAgo(8, 16, 45), items: mockItems['4'],
  },
  {
    id: '5', return_number: 'RET-2025-005',
    order_id: '5', order_number: 'ORD-2025-005',
    customer_name: 'Vikram Joshi', customer_email: 'vikram@example.com', customer_phone: '+880 1711-555555',
    reason: 'defective',
    status: 'rejected', items_count: 1, subtotal: 1200, refund_amount: 1200, refund_method: 'original',
    rejected_reason: 'Product tested and found working correctly',
    created_at: daysAgo(4, 11, 30), items: mockItems['5'],
  },
];

const firstNames = ['Arif', 'Fatima', 'Hasan', 'Jahanara', 'Kamal', 'Laila'];
const lastNames = ['Hossain', 'Khatun', 'Mia', 'Parvin', 'Siddique'];
const reasons: ReturnRequestReason[] = ['defective', 'wrong_item', 'not_as_described', 'damaged_in_transit', 'customer_changed_mind', 'overcharged', 'other'];
const statuses: ReturnRequestStatus[] = ['pending', 'approved', 'rejected', 'refunded', 'cancelled'];

for (let i = 6; i <= 20; i++) {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const reason = reasons[Math.floor(Math.random() * reasons.length)];
  const status = Math.random() > 0.3 ? statuses[Math.floor(Math.random() * statuses.length)] : 'pending';
  const itemCount = Math.floor(Math.random() * 3) + 1;
  const subtotal = Math.floor(Math.random() * 8000) + 500;
  const refundAmount = Math.round(subtotal * (Math.random() > 0.2 ? 1 : 0.95));
  const days = Math.floor(Math.random() * 15) + 1;

  mockReturns.push({
    id: String(i),
    return_number: `RET-2025-${String(i).padStart(3, '0')}`,
    order_id: String(Math.floor(Math.random() * 25) + 1),
    order_number: `ORD-2025-${String(i).padStart(3, '0')}`,
    customer_name: `${firstName} ${lastName}`,
    customer_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    customer_phone: `+880 17${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
    reason, status, items_count: itemCount, subtotal, refund_amount: refundAmount,
    refund_method: Math.random() > 0.5 ? 'original' : 'store_credit',
    approved_by: status === 'approved' || status === 'refunded' ? 'Admin' : undefined,
    approved_at: status === 'approved' || status === 'refunded' ? daysAgo(days - 2) : undefined,
    rejected_reason: status === 'rejected' ? 'Return request does not meet our return policy criteria.' : undefined,
    created_at: daysAgo(days, Math.floor(Math.random() * 23)),
    items: [],
  });
}

const REASON_LABELS: Record<string, string> = {
  defective: 'Defective Product',
  wrong_item: 'Wrong Item',
  not_as_described: 'Not as Described',
  damaged_in_transit: 'Damaged in Transit',
  customer_changed_mind: 'Changed Mind',
  overcharged: 'Overcharged',
  other: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  refunded: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

// ── Service Class ──────────────────────────────────────────────────────

class EcommerceReturnService {
  private data: (ReturnRequest & { items: ReturnRequestItem[] })[] = [...mockReturns];

  // ── List ─────────────────────────────────────────────────────────────

  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    filterParams?: Record<string, string | number | undefined | null>;
  }): Promise<{ data: ReturnRequest[]; total: number; page: number; per_page: number }> {
    try {
      const response = await apiClient.get(API_BASE, { params });
      const result = response.data;
      if (result.data) {
        const data = result.data.map((r: any) => ({ ...r, id: String(r.id) }));
        if (result.pagination) {
          return { data, total: result.pagination.total, page: result.pagination.page, per_page: result.pagination.pageSize };
        }
        return { data, total: data.length, page: 1, per_page: data.length };
      }
      throw new Error('Unexpected API response format');
    } catch (error) {
      console.warn('EcommerceReturn API unavailable, using mock data:', error);
      return this.fallbackList(params);
    }
  }

  // ── Get By ID ────────────────────────────────────────────────────────

  async getById(id: string): Promise<ReturnRequest | undefined> {
    try {
      const response = await apiClient.get(`${API_BASE}/${id}`);
      const ret = response.data?.data?.return;
      if (!ret) throw new Error('Return request not found');
      return { ...ret, id: String(ret.id) };
    } catch (error) {
      console.warn('EcommerceReturn getById API unavailable, using mock:', error);
      return this.fallbackGetById(id);
    }
  }

  // ── Update Status (approve/reject/refund/cancel) ─────────────────────

  async updateStatus(id: string, status: ReturnRequestStatus, note?: string): Promise<void> {
    try {
      await apiClient.patch(`${API_BASE}/${id}/status`, { status, note });
    } catch (error) {
      console.warn('EcommerceReturn updateStatus API unavailable, using mock:', error);
      return this.fallbackUpdateStatus(id, status, note);
    }
  }

  // ── Get KPIs ─────────────────────────────────────────────────────────

  async getKPIs(): Promise<ReturnKPIs> {
    try {
      const response = await apiClient.get(`${API_BASE}/kpis`);
      const kpis = response.data?.data?.kpis;
      if (kpis) return kpis;
      throw new Error('Unexpected API response format');
    } catch (error) {
      console.warn('EcommerceReturn KPIs API unavailable, using mock:', error);
      return this.fallbackGetKPIs();
    }
  }

  // ── Store (create) ───────────────────────────────────────────────────

  async store(data: Partial<ReturnRequest>): Promise<ReturnRequest> {
    try {
      const response = await apiClient.post(API_BASE, data);
      return response.data?.data?.return;
    } catch (error) {
      console.warn('EcommerceReturn store API unavailable, using mock:', error);
      await new Promise(r => setTimeout(r, 300));
      const ret: ReturnRequest = {
        id: String(Date.now()),
        return_number: `RET-2025-${String(this.data.length + 1).padStart(3, '0')}`,
        order_id: data.order_id || '',
        order_number: data.order_number || '',
        customer_name: data.customer_name || '',
        customer_email: data.customer_email || '',
        customer_phone: data.customer_phone || '',
        reason: data.reason || 'other',
        status: 'pending',
        items_count: data.items_count || 0,
        subtotal: data.subtotal || 0,
        refund_amount: data.refund_amount || 0,
        refund_method: data.refund_method || 'original',
        notes: data.notes,
        created_at: new Date().toISOString(),
      };
      this.data.unshift({ ...ret, items: [] });
      return ret;
    }
  }

  // ── Get status helpers ───────────────────────────────────────────────

  getStatusColor(status: string): string {
    return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  }

  getReasonLabel(reason: string): string {
    return REASON_LABELS[reason] || reason;
  }

  // ── Mock Fallbacks ───────────────────────────────────────────────────

  private async fallbackList(params?: any) {
    await new Promise(r => setTimeout(r, 300));
    let filtered = [...this.data];
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        r => r.return_number.toLowerCase().includes(q) ||
             r.order_number.toLowerCase().includes(q) ||
             r.customer_name.toLowerCase().includes(q) ||
             r.customer_email.toLowerCase().includes(q)
      );
    }
    if (params?.filterParams) {
      const { status, reason, date_from, date_to } = params.filterParams;
      if (status) filtered = filtered.filter(r => r.status === status);
      if (reason) filtered = filtered.filter(r => r.reason === reason);
      if (date_from) {
        const from = new Date(date_from);
        filtered = filtered.filter(r => new Date(r.created_at) >= from);
      }
      if (date_to) {
        const to = new Date(date_to);
        to.setHours(23, 59, 59, 999);
        filtered = filtered.filter(r => new Date(r.created_at) <= to);
      }
    }
    const total = filtered.length;
    const page = params?.page || 1;
    const perPage = params?.per_page || 15;
    const start = (page - 1) * perPage;
    return { data: filtered.slice(start, start + perPage), total, page, per_page: perPage };
  }

  private async fallbackGetById(id: string): Promise<ReturnRequest | undefined> {
    await new Promise(r => setTimeout(r, 200));
    const ret = this.data.find(r => r.id === id);
    if (!ret) return undefined;
    return ret;
  }

  private async fallbackUpdateStatus(id: string, status: ReturnRequestStatus, note?: string): Promise<void> {
    await new Promise(r => setTimeout(r, 300));
    const ret = this.data.find(r => r.id === id);
    if (ret) {
      ret.status = status;
      if (note) ret.admin_note = note;
      if (status === 'approved') {
        ret.approved_by = 'Admin';
        ret.approved_at = new Date().toISOString();
      }
      if (status === 'rejected') {
        ret.rejected_reason = note || 'Return request rejected';
      }
    }
  }

  private async fallbackGetKPIs(): Promise<ReturnKPIs> {
    await new Promise(r => setTimeout(r, 200));
    const all = this.data;
    const total = all.length;
    const pending = all.filter(r => r.status === 'pending').length;
    const approved = all.filter(r => r.status === 'approved').length;
    const rejected = all.filter(r => r.status === 'rejected').length;
    const refunded = all.filter(r => r.status === 'refunded').length;
    const totalRefunded = all.filter(r => r.status === 'refunded').reduce((s, r) => s + r.refund_amount, 0);
    const byReason = all.reduce<Record<string, number>>((acc, r) => { acc[r.reason] = (acc[r.reason] || 0) + 1; return acc; }, {});

    const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyReturns = all.filter(r => new Date(r.created_at) >= thisMonth);

    return {
      total_returns: total,
      pending_returns: pending,
      approved_returns: approved,
      rejected_returns: rejected,
      refunded_amount: totalRefunded,
      total_refunded: refunded,
      returns_by_reason: Object.entries(byReason).map(([reason, count]) => ({
        reason, count, percentage: total ? Math.round((count / total) * 100) : 0,
      })),
      returns_over_time: [
        { label: 'This Month', count: monthlyReturns.length, amount: monthlyReturns.reduce((s, r) => s + r.refund_amount, 0) },
        { label: 'Approved', count: approved + refunded, amount: all.filter(r => r.status === 'approved' || r.status === 'refunded').reduce((s, r) => s + r.refund_amount, 0) },
      ],
    };
  }
}

const ecommerceReturnService = new EcommerceReturnService();
export default ecommerceReturnService;
