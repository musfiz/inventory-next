import type { EcommerceOrder, OrderDetail, OrderItem, OrderPayment, OrderStatusHistory, OrderTimeline, OrderKPIs, StatusConfig, BulkActionResult, BulkActionType } from '@/types/ecommerce';
import apiClient from '@/lib/api/axios';

const API_BASE = '/api/v1/ecommerce/orders';

// ── Richer Mock Data ─────────────────────────────────────────────────────

function daysAgo(days: number, h = 0, m = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - h, d.getMinutes() - m, 0, 0);
  return d.toISOString();
}

const mockItems: Record<string, OrderItem[]> = {
  '1': [
    { id: 'i1', product_id: 'p1', product_name: 'Wireless Bluetooth Headphones', product_sku: 'WH-1000', quantity: 1, unit_price: 2500, subtotal: 2500, total: 2500 },
    { id: 'i2', product_id: 'p3', product_name: 'USB-C Charging Cable 2m', product_sku: 'CBL-2M', quantity: 2, unit_price: 1000, subtotal: 2000, total: 2000 },
    { id: 'i3', product_id: 'p4', product_name: 'Laptop Stand Adjustable', product_sku: 'LS-ADJ', quantity: 1, unit_price: 1000, subtotal: 1000, total: 1000 },
  ],
  '2': [
    { id: 'i4', product_id: 'p2', product_name: 'Smart Watch Pro', product_sku: 'SW-PRO', quantity: 1, unit_price: 2500, subtotal: 2500, discount: 250, total: 2250 },
  ],
  '3': [
    { id: 'i5', product_id: 'p7', product_name: '27" 4K Monitor', product_sku: 'MN-4K27', quantity: 1, unit_price: 3200, subtotal: 3200, total: 3200 },
  ],
  '4': [
    { id: 'i6', product_id: 'p6', product_name: 'Wireless Mouse Ergonomic', product_sku: 'MS-ERG', quantity: 2, unit_price: 1200, subtotal: 2400, total: 2400 },
    { id: 'i7', product_id: 'p5', product_name: 'Mechanical Keyboard RGB', product_sku: 'KB-RGB', quantity: 1, unit_price: 4500, subtotal: 4500, total: 4500 },
    { id: 'i8', product_id: 'p9', product_name: 'Desk Lamp LED Touch', product_sku: 'DL-LED', quantity: 2, unit_price: 1000, subtotal: 2000, total: 2000 },
  ],
  '5': [
    { id: 'i9', product_id: 'p10', product_name: 'Portable SSD 1TB', product_sku: 'SSD-1TB', quantity: 1, unit_price: 1200, subtotal: 1200, total: 1200 },
  ],
  '6': [
    { id: 'i10', product_id: 'p1', product_name: 'Wireless Bluetooth Headphones', product_sku: 'WH-1000', quantity: 1, unit_price: 2500, subtotal: 2500, total: 2500 },
    { id: 'i11', product_id: 'p8', product_name: 'Webcam 1080p HD', product_sku: 'WC-HD', quantity: 1, unit_price: 3500, subtotal: 3500, discount: 350, total: 3150 },
  ],
  '7': [
    { id: 'i12', product_id: 'p4', product_name: 'Laptop Stand Adjustable', product_sku: 'LS-ADJ', quantity: 2, unit_price: 1000, subtotal: 2000, total: 2000 },
    { id: 'i13', product_id: 'p6', product_name: 'Wireless Mouse Ergonomic', product_sku: 'MS-ERG', quantity: 1, unit_price: 1200, subtotal: 1200, total: 1200 },
    { id: 'i14', product_id: 'p9', product_name: 'Desk Lamp LED Touch', product_sku: 'DL-LED', quantity: 1, unit_price: 1000, subtotal: 1000, total: 1000 },
  ],
};

const mockOrders: (EcommerceOrder & { items: OrderItem[] })[] = [
  {
    id: '1', order_number: 'ORD-2025-001',
    customer_name: 'Rahul Sharma', customer_email: 'rahul@example.com', customer_phone: '+880 1711-111111',
    items_count: 3, subtotal: 4500, shipping: 150, tax: 225, discount: 0, total: 4875,
    status: 'delivered', payment_status: 'paid', payment_method: 'bkash',
    shipping_method: 'Express Delivery',
    shipping_address: 'House 10, Road 3, Banani, Dhaka 1213',
    billing_address: 'House 10, Road 3, Banani, Dhaka 1213',
    tracking_number: 'TRK-001-2025', courier: 'Pathao',
    created_at: daysAgo(55, 10, 30), items: mockItems['1'],
  },
  {
    id: '2', order_number: 'ORD-2025-002',
    customer_name: 'Priya Patel', customer_email: 'priya@example.com', customer_phone: '+880 1711-222222',
    items_count: 1, subtotal: 2500, shipping: 0, tax: 125, discount: 250, total: 2375,
    status: 'shipped', payment_status: 'paid', payment_method: 'nagad',
    shipping_method: 'Standard Delivery',
    shipping_address: 'Flat 5A, 42 Gulshan Avenue, Gulshan, Dhaka 1212',
    billing_address: 'Flat 5A, 42 Gulshan Avenue, Gulshan, Dhaka 1212',
    tracking_number: 'TRK-002-2025', courier: 'Steadfast',
    created_at: daysAgo(45, 14, 0), items: mockItems['2'],
  },
  {
    id: '3', order_number: 'ORD-2025-003',
    customer_name: 'Amit Singh', customer_email: 'amit@example.com', customer_phone: '+880 1711-333333',
    items_count: 1, subtotal: 3200, shipping: 100, tax: 160, discount: 0, total: 3460,
    status: 'confirmed', payment_status: 'paid', payment_method: 'credit_card',
    shipping_method: 'Standard Delivery',
    shipping_address: '123 Bashundhara R/A, Block D, Dhaka 1229',
    billing_address: '123 Bashundhara R/A, Block D, Dhaka 1229',
    tracking_number: null, courier: null,
    created_at: daysAgo(37, 9, 15), items: mockItems['3'],
  },
  {
    id: '4', order_number: 'ORD-2025-004',
    customer_name: 'Sneha Gupta', customer_email: 'sneha@example.com', customer_phone: '+880 1711-444444',
    items_count: 5, subtotal: 8900, shipping: 0, tax: 445, discount: 890, total: 8455,
    status: 'placed', payment_status: 'pending', payment_method: 'cash_on_delivery',
    shipping_method: 'Express Delivery',
    shipping_address: '56 Mirpur Road, Dhanmondi, Dhaka 1205',
    billing_address: '56 Mirpur Road, Dhanmondi, Dhaka 1205',
    tracking_number: null, courier: null,
    created_at: daysAgo(33, 16, 45), items: mockItems['4'],
  },
  {
    id: '5', order_number: 'ORD-2025-005',
    customer_name: 'Vikram Joshi', customer_email: 'vikram@example.com', customer_phone: '+880 1711-555555',
    items_count: 1, subtotal: 1200, shipping: 100, tax: 60, discount: 0, total: 1360,
    status: 'packed', payment_status: 'paid', payment_method: 'bkash',
    shipping_method: 'Standard Delivery',
    shipping_address: '78 Uttara, Sector 10, Dhaka 1230',
    billing_address: '78 Uttara, Sector 10, Dhaka 1230',
    tracking_number: null, courier: null,
    created_at: daysAgo(32, 11, 30), items: mockItems['5'],
  },
  {
    id: '6', order_number: 'ORD-2025-006',
    customer_name: 'Ananya Das', customer_email: 'ananya@example.com', customer_phone: '+880 1711-666666',
    items_count: 2, subtotal: 6000, shipping: 0, tax: 300, discount: 600, total: 5700,
    status: 'cancelled', payment_status: 'refunded', payment_method: 'nagad',
    shipping_method: 'Standard Delivery',
    shipping_address: '34 Mohakhali, DOHS, Dhaka 1206',
    billing_address: '34 Mohakhali, DOHS, Dhaka 1206',
    tracking_number: null, courier: null,
    created_at: daysAgo(40, 8, 0), items: mockItems['6'],
  },
  {
    id: '7', order_number: 'ORD-2025-007',
    customer_name: 'Rohit Verma', customer_email: 'rohit@example.com', customer_phone: '+880 1711-777777',
    items_count: 4, subtotal: 4200, shipping: 200, tax: 210, discount: 0, total: 4610,
    status: 'placed', payment_status: 'pending', payment_method: 'cash_on_delivery',
    shipping_method: 'Next Day Delivery',
    shipping_address: '15 Shyamoli, Dhaka 1207',
    billing_address: '15 Shyamoli, Dhaka 1207',
    tracking_number: null, courier: null,
    created_at: daysAgo(31, 13, 0), items: mockItems['7'],
  },
];

// Generate more mock orders for pagination testing
const firstNames = ['Arif', 'Fatima', 'Hasan', 'Jahanara', 'Kamal', 'Laila', 'Mahbub', 'Nadia', 'Omar', 'Rashid'];
const lastNames = ['Hossain', 'Khatun', 'Mia', 'Parvin', 'Siddique', 'Uddin', 'Chowdhury', 'Rahman', 'Ahmed', 'Islam'];
const statuses: EcommerceOrder['status'][] = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'];
const paymentMethods = ['bkash', 'nagad', 'credit_card', 'cash_on_delivery'];
const paymentStatuses: Record<string, EcommerceOrder['payment_status']> = {
  placed: 'pending', confirmed: 'paid', packed: 'paid', shipped: 'paid',
  delivered: 'paid', cancelled: 'refunded', returned: 'refunded',
};

for (let i = 8; i <= 25; i++) {
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const itemCount = Math.floor(Math.random() * 4) + 1;
  const subtotal = Math.floor(Math.random() * 8000) + 500;
  const shipping = Math.random() > 0.7 ? 0 : 150;
  const tax = Math.round(subtotal * 0.05);
  const discount = Math.random() > 0.6 ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal + shipping + tax - discount;
  const pm = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
  const days = Math.floor(Math.random() * 60) + 1;
  const hours = Math.floor(Math.random() * 23);

  mockOrders.push({
    id: String(i),
    order_number: `ORD-2025-${String(i).padStart(3, '0')}`,
    customer_name: `${firstName} ${lastName}`,
    customer_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    customer_phone: `+880 17${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
    items_count: itemCount,
    subtotal, shipping, tax, discount, total,
    status, payment_status: paymentStatuses[status],
    payment_method: pm,
    shipping_method: ['Standard Delivery', 'Express Delivery', 'Next Day Delivery'][Math.floor(Math.random() * 3)],
    shipping_address: `${Math.floor(Math.random() * 200) + 1} Road ${Math.floor(Math.random() * 20) + 1}, Dhaka ${Math.floor(Math.random() * 2000) + 1200}`,
    billing_address: `${Math.floor(Math.random() * 200) + 1} Road ${Math.floor(Math.random() * 20) + 1}, Dhaka ${Math.floor(Math.random() * 2000) + 1200}`,
    tracking_number: status === 'shipped' || status === 'delivered' ? `TRK-${i}-2025` : null,
    courier: status === 'shipped' || status === 'delivered' ? ['Pathao', 'Steadfast', 'Sundarban', 'eCourier'][Math.floor(Math.random() * 4)] : null,
    created_at: daysAgo(days, hours),
    items: [],
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function computeTimeline(order: typeof mockOrders[0]): OrderTimeline[] {
  const allStatuses: { status: EcommerceOrder['status']; label: string }[] = [
    { status: 'placed', label: 'Order Placed' },
    { status: 'confirmed', label: 'Order Confirmed' },
    { status: 'packed', label: 'Packed' },
    { status: 'shipped', label: 'Shipped' },
    { status: 'delivered', label: 'Delivered' },
  ];
  const currentIdx = allStatuses.findIndex(s => s.status === order.status);

  return allStatuses.map((s, i) => {
    const isPast = i < currentIdx;
    const isCurrent = i === currentIdx;
    const isCancelledRoute = order.status === 'cancelled' || order.status === 'returned';
    return {
      status: s.status,
      label: s.label,
      timestamp: isPast
        ? daysAgo(Number(order.created_at ? Math.floor((Date.now() - new Date(order.created_at).getTime()) / 86400000) : 30) - (currentIdx - i) * 1)
        : isCurrent && !isCancelledRoute
          ? order.created_at
          : null,
      is_completed: isPast,
      is_current: isCurrent && !isCancelledRoute,
      note: isCurrent && isCancelledRoute ? `Order was ${order.status}` : undefined,
    };
  });
}

function computeHistory(order: typeof mockOrders[0]): OrderStatusHistory[] {
  const history: OrderStatusHistory[] = [];
  const allStatuses: EcommerceOrder['status'][] = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'];
  const idx = allStatuses.indexOf(order.status);
  for (let i = 0; i <= idx; i++) {
    history.push({
      status: allStatuses[i],
      timestamp: daysAgo(30 - (idx - i) * 2, i),
      updated_by: 'System',
    });
  }
  if (order.status === 'cancelled') {
    history.push({ status: 'cancelled', timestamp: daysAgo(28), note: 'Customer requested cancellation', updated_by: 'Admin' });
  }
  if (order.status === 'returned') {
    history.push({ status: 'returned', timestamp: daysAgo(25), note: 'Return initiated by customer', updated_by: 'Admin' });
  }
  return history;
}

function computePayments(order: typeof mockOrders[0]): OrderPayment[] {
  const statusMap: Record<string, 'pending' | 'successful' | 'failed' | 'refunded'> = {
    placed: 'pending', confirmed: 'successful', packed: 'successful', shipped: 'successful',
    delivered: 'successful', cancelled: 'refunded', returned: 'refunded',
  };
  return [{
    id: `pay-${order.id}`,
    method: order.payment_method,
    transaction_id: order.payment_status === 'paid' ? `TXN-${order.id}-2025` : undefined,
    amount: order.total,
    status: statusMap[order.status] || 'pending',
    paid_at: order.payment_status === 'paid' ? daysAgo(25) : undefined,
  }];
}

const STATUS_COLORS: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  confirmed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  packed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  shipped: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  returned: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

const STATUS_LABELS: Record<string, string> = {
  placed: 'Placed', confirmed: 'Confirmed', packed: 'Packed',
  shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned',
};

const STATUS_ICONS: Record<string, string> = {
  placed: '🆕', confirmed: '✓', packed: '📦', shipped: '🚚', delivered: '✅', cancelled: '✕', returned: '↩',
};

// ── Service Class ──────────────────────────────────────────────────────────

class EcommerceOrderService {
  private data: (EcommerceOrder & { items: OrderItem[] })[] = [...mockOrders];

  // ── List ───────────────────────────────────────────────────────────────

  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    filterParams?: Record<string, string | number | undefined | null>;
  }): Promise<{ data: EcommerceOrder[]; total: number; page: number; per_page: number }> {
    try {
      const response = await apiClient.get(API_BASE, { params });
      const result = response.data;
      if (result.data) {
        const data = result.data.map((o: any) => ({
          ...o,
          id: String(o.id),
          customer_id: o.customer_id ? String(o.customer_id) : undefined,
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
      console.warn('EcommerceOrder API unavailable, using mock data:', error);
      return this.fallbackList(params);
    }
  }

  // ── Get By ID (full detail) ────────────────────────────────────────────

  async getById(id: string): Promise<OrderDetail | undefined> {
    try {
      const response = await apiClient.get(`${API_BASE}/${id}`);
      const order = response.data?.data?.order;
      if (!order) throw new Error('Order not found');
      return {
        ...order,
        id: String(order.id),
        items: (order.items || []).map((i: any) => ({ ...i, id: String(i.id) })),
        payments: order.payments || computePayments(order),
        status_history: order.status_history || [],
        timeline: order.status_history
          ? order.status_history.map((h: any, idx: number, arr: any[]) => {
              const allStatuses = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'];
              const currentIdx = allStatuses.indexOf(order.status);
              const i = allStatuses.indexOf(h.status);
              return {
                status: h.status,
                label: h.status.charAt(0).toUpperCase() + h.status.slice(1),
                timestamp: h.timestamp,
                is_completed: i < currentIdx,
                is_current: i === currentIdx,
                note: h.note,
              };
            })
          : computeTimeline(order),
      };
    } catch (error) {
      console.warn('EcommerceOrder getById API unavailable, using mock:', error);
      return this.fallbackGetById(id);
    }
  }

  // ── Track by Order Number ────────────────────────────────────────────

  async trackByOrderNumber(orderNumber: string): Promise<OrderDetail | null> {
    try {
      const response = await apiClient.get(`${API_BASE}/track/${encodeURIComponent(orderNumber)}`);
      const order = response.data?.data?.order || response.data?.data;
      if (order) {
        return {
          ...order,
          id: String(order.id),
          items: (order.items || []).map((i: any) => ({ ...i, id: String(i.id) })),
          payments: order.payments || [],
          status_history: order.status_history || [],
          timeline: order.status_history
            ? order.status_history.map((h: any, idx: number, arr: any[]) => {
                const allStatuses = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'];
                const currentIdx = allStatuses.indexOf(order.status);
                const i = allStatuses.indexOf(h.status);
                return {
                  status: h.status,
                  label: h.status.charAt(0).toUpperCase() + h.status.slice(1),
                  timestamp: h.timestamp,
                  is_completed: i < currentIdx,
                  is_current: i === currentIdx,
                  note: h.note,
                };
              })
            : [],
        };
      }
      return null;
    } catch {
      return null; // Real API only, no mock fallback
    }
  }

  // ── Get KPIs ──────────────────────────────────────────────────────────

  async getKPIs(): Promise<OrderKPIs> {
    try {
      const response = await apiClient.get(`${API_BASE}/kpis`);
      const kpis = response.data?.data?.kpis;
      if (kpis) return kpis;
      throw new Error('Unexpected API response format');
    } catch (error) {
      console.warn('EcommerceOrder KPIs API unavailable, using mock:', error);
      return this.fallbackGetKPIs();
    }
  }

  // ── Update Status ─────────────────────────────────────────────────────

  async updateStatus(id: string, status: EcommerceOrder['status'], note?: string): Promise<void> {
    try {
      await apiClient.patch(`${API_BASE}/${id}/status`, { status, note });
    } catch (error) {
      console.warn('EcommerceOrder updateStatus API unavailable, using mock:', error);
      return this.fallbackUpdateStatus(id, status);
    }
  }

  // ── Update Payment Status ────────────────────────────────────────────

  async updatePaymentStatus(id: string, paymentStatus: EcommerceOrder['payment_status']): Promise<void> {
    try {
      await apiClient.patch(`${API_BASE}/${id}/status`, { payment_status: paymentStatus });
    } catch (error) {
      console.warn('EcommerceOrder updatePaymentStatus API unavailable, using mock:', error);
      await new Promise(r => setTimeout(r, 300));
      const order = this.data.find(o => o.id === id);
      if (order) order.payment_status = paymentStatus;
    }
  }

  // ── Update Tracking ──────────────────────────────────────────────────

  async updateTracking(id: string, trackingNumber: string, courier: string): Promise<void> {
    try {
      await apiClient.patch(`${API_BASE}/${id}/tracking`, { tracking_number: trackingNumber, courier });
    } catch (error) {
      console.warn('EcommerceOrder updateTracking API unavailable, using mock:', error);
      await new Promise(r => setTimeout(r, 300));
      const order = this.data.find(o => o.id === id);
      if (order) { order.tracking_number = trackingNumber; order.courier = courier; }
    }
  }

  // ── Get Timeline ─────────────────────────────────────────────────────

  async getTimeline(id: string): Promise<OrderTimeline[]> {
    try {
      const detail = await this.getById(id);
      return detail?.timeline || [];
    } catch {
      const order = this.data.find(o => o.id === id);
      if (!order) return [];
      return computeTimeline(order);
    }
  }

  // ── Bulk Action ──────────────────────────────────────────────────────

  async bulkAction(ids: string[], action: BulkActionType, payload?: Record<string, any>): Promise<BulkActionResult> {
    const results: BulkActionResult = { success: 0, failed: 0 };
    for (const id of ids) {
      try {
        if (action === 'update_status' && payload?.status) {
          await this.updateStatus(id, payload.status);
        }
        results.success++;
      } catch {
        results.failed++;
      }
    }
    return results;
  }

  // ── Delete Order ─────────────────────────────────────────────────────

  async deleteOrder(id: string, reason?: string): Promise<void> {
    try {
      await apiClient.delete(`${API_BASE}/${id}`);
    } catch (error) {
      console.warn('EcommerceOrder delete API unavailable, using mock:', error);
      await new Promise(r => setTimeout(r, 300));
      const order = this.data.find(o => o.id === id);
      if (order) order.status = 'cancelled';
    }
  }

  // ── Add Note ─────────────────────────────────────────────────────────

  async addNote(id: string, note: string): Promise<void> {
    try {
      await apiClient.patch(`${API_BASE}/${id}/status`, { note, status: undefined });
    } catch {
      // Mock: no-op
    }
  }

  // ── Get Status Config ────────────────────────────────────────────────

  async getStatusConfig(): Promise<StatusConfig[]> {
    try {
      const response = await apiClient.get(`${API_BASE}/status-config`);
      const config = response.data?.data?.config;
      if (config) return config;
      throw new Error('Unexpected API response format');
    } catch (error) {
      console.warn('EcommerceOrder statusConfig API unavailable, using mock:', error);
      return this.fallbackGetStatusConfig();
    }
  }

  // ── Save Status Config ───────────────────────────────────────────────

  async saveStatusConfig(config: StatusConfig[]): Promise<void> {
    try {
      await apiClient.put(`${API_BASE}/status-config`, { config });
    } catch (error) {
      console.warn('EcommerceOrder saveStatusConfig API unavailable, using mock:', error);
      // Mock: just log it
      console.log('Status config saved (mock):', config);
    }
  }

  // ── Get status colors (for external use) ─────────────────────────────

  getStatusColor(status: string): string {
    return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusLabel(status: string): string {
    return STATUS_LABELS[status] || status;
  }

  getStatusIcon(status: string): string {
    return STATUS_ICONS[status] || '•';
  }

  // ── Mock Fallback Methods ────────────────────────────────────────────

  private async fallbackList(params?: any) {
    await new Promise(r => setTimeout(r, 300));
    let filtered = [...this.data];
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        o => o.order_number.toLowerCase().includes(q) ||
             o.customer_name.toLowerCase().includes(q) ||
             o.customer_email.toLowerCase().includes(q) ||
             o.customer_phone.includes(q)
      );
    }
    if (params?.filterParams) {
      const { status, payment_status, payment_method, date_from, date_to } = params.filterParams;
      if (status) filtered = filtered.filter(o => o.status === status);
      if (payment_status) filtered = filtered.filter(o => o.payment_status === payment_status);
      if (payment_method) filtered = filtered.filter(o => o.payment_method === payment_method);
      if (date_from) {
        const from = new Date(date_from);
        filtered = filtered.filter(o => new Date(o.created_at) >= from);
      }
      if (date_to) {
        const to = new Date(date_to);
        to.setHours(23, 59, 59, 999);
        filtered = filtered.filter(o => new Date(o.created_at) <= to);
      }
    }
    const total = filtered.length;
    const page = params?.page || 1;
    const perPage = params?.per_page || 15;
    const start = (page - 1) * perPage;
    return { data: filtered.slice(start, start + perPage), total, page, per_page: perPage };
  }

  private async fallbackGetById(id: string): Promise<OrderDetail | undefined> {
    await new Promise(r => setTimeout(r, 200));
    const order = this.data.find(o => o.id === id);
    if (!order) return undefined;
    return {
      ...order,
      items: order.items || [],
      payments: computePayments(order),
      status_history: computeHistory(order),
      timeline: computeTimeline(order),
    };
  }

  private async fallbackGetKPIs(): Promise<OrderKPIs> {
    await new Promise(r => setTimeout(r, 200));
    const all = this.data;
    const total = all.length;
    const totalRevenue = all.reduce((s, o) => s + o.total, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const byStatus = all.reduce<Record<string, number>>((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});

    return {
      total_orders: total,
      total_revenue: totalRevenue,
      pending_orders: all.filter(o => o.status === 'placed').length,
      processing_orders: all.filter(o => o.status === 'confirmed' || o.status === 'packed').length,
      shipped_today: all.filter(o => o.status === 'shipped' && new Date(o.created_at) >= today).length,
      delivered_today: all.filter(o => o.status === 'delivered' && new Date(o.created_at) >= today).length,
      cancelled_orders: all.filter(o => o.status === 'cancelled').length,
      returned_orders: all.filter(o => o.status === 'returned').length,
      average_order_value: total ? Math.round(totalRevenue / total) : 0,
      orders_by_status: Object.entries(byStatus).map(([status, count]) => ({ status, count, percentage: total ? Math.round((count / total) * 100) : 0 })),
      revenue_today: all.filter(o => new Date(o.created_at) >= today).reduce((s, o) => s + o.total, 0),
      revenue_this_month: all.filter(o => new Date(o.created_at) >= thisMonth).reduce((s, o) => s + o.total, 0),
      revenue_last_month: 0,
    };
  }

  private async fallbackUpdateStatus(id: string, status: EcommerceOrder['status']): Promise<void> {
    await new Promise(r => setTimeout(r, 300));
    const order = this.data.find(o => o.id === id);
    if (order) order.status = status;
  }

  private async fallbackGetStatusConfig(): Promise<StatusConfig[]> {
    await new Promise(r => setTimeout(r, 100));
    return [
      { status: 'placed', label: 'Placed', icon: '🆕', color: 'blue', order: 1, description: 'Order has been placed by the customer', allowed_transitions: [{ from: 'placed' as const, to: 'confirmed' as const, label: 'Confirm Order' }, { from: 'placed' as const, to: 'cancelled' as const, label: 'Cancel Order', requires_note: true }], auto_notify: true },
      { status: 'confirmed', label: 'Confirmed', icon: '✓', color: 'indigo', order: 2, description: 'Order has been confirmed and payment verified', allowed_transitions: [{ from: 'confirmed' as const, to: 'packed' as const, label: 'Start Packing' }, { from: 'confirmed' as const, to: 'cancelled' as const, label: 'Cancel Order', requires_note: true }], auto_notify: true },
      { status: 'packed', label: 'Packed', icon: '📦', color: 'purple', order: 3, description: 'Items have been packed and ready for shipment', allowed_transitions: [{ from: 'packed' as const, to: 'shipped' as const, label: 'Mark Shipped', requires_tracking: true }, { from: 'packed' as const, to: 'cancelled' as const, label: 'Cancel Order', requires_note: true }], auto_notify: false },
      { status: 'shipped', label: 'Shipped', icon: '🚚', color: 'yellow', order: 4, description: 'Order has been handed to the courier', allowed_transitions: [{ from: 'shipped' as const, to: 'delivered' as const, label: 'Mark Delivered' }, { from: 'shipped' as const, to: 'returned' as const, label: 'Initiate Return', requires_note: true }], requires_tracking: true, auto_notify: true },
      { status: 'delivered', label: 'Delivered', icon: '✅', color: 'green', order: 5, description: 'Order has been delivered to the customer', allowed_transitions: [{ from: 'delivered' as const, to: 'returned' as const, label: 'Initiate Return', requires_note: true }], auto_notify: true },
      { status: 'cancelled', label: 'Cancelled', icon: '✕', color: 'red', order: 6, description: 'Order has been cancelled', allowed_transitions: [], auto_notify: true },
      { status: 'returned', label: 'Returned', icon: '↩', color: 'orange', order: 7, description: 'Order has been returned by the customer', allowed_transitions: [], auto_notify: true },
    ];
  }
}

const ecommerceOrderService = new EcommerceOrderService();
export default ecommerceOrderService;
