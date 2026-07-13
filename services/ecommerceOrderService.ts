import type { EcommerceOrder } from '@/types/ecommerce';

const mockOrders: EcommerceOrder[] = [
  {
    id: '1',
    order_number: 'ORD-2025-001',
    customer_name: 'Rahul Sharma',
    customer_email: 'rahul@example.com',
    customer_phone: '+880 1711-111111',
    items_count: 3,
    subtotal: 4500,
    shipping: 150,
    tax: 225,
    discount: 0,
    total: 4875,
    status: 'delivered',
    payment_status: 'paid',
    payment_method: 'bkash',
    shipping_method: 'Express Delivery',
    shipping_address: 'House 10, Road 3, Banani, Dhaka 1213',
    tracking_number: 'TRK-001-2025',
    courier: 'Pathao',
    created_at: '2025-12-01T10:30:00Z',
  },
  {
    id: '2',
    order_number: 'ORD-2025-002',
    customer_name: 'Priya Patel',
    customer_email: 'priya@example.com',
    customer_phone: '+880 1711-222222',
    items_count: 1,
    subtotal: 2500,
    shipping: 0,
    tax: 125,
    discount: 250,
    total: 2375,
    status: 'shipped',
    payment_status: 'paid',
    payment_method: 'nagad',
    shipping_method: 'Standard Delivery',
    shipping_address: 'Flat 5A, 42 Gulshan Avenue, Gulshan, Dhaka 1212',
    tracking_number: 'TRK-002-2025',
    courier: 'Steadfast',
    created_at: '2025-12-10T14:00:00Z',
  },
  {
    id: '3',
    order_number: 'ORD-2025-003',
    customer_name: 'Amit Singh',
    customer_email: 'amit@example.com',
    customer_phone: '+880 1711-333333',
    items_count: 2,
    subtotal: 3200,
    shipping: 100,
    tax: 160,
    discount: 0,
    total: 3460,
    status: 'confirmed',
    payment_status: 'paid',
    payment_method: 'credit_card',
    shipping_method: 'Standard Delivery',
    shipping_address: '123 Bashundhara R/A, Block D, Dhaka 1229',
    tracking_number: null,
    courier: null,
    created_at: '2025-12-18T09:15:00Z',
  },
  {
    id: '4',
    order_number: 'ORD-2025-004',
    customer_name: 'Sneha Gupta',
    customer_email: 'sneha@example.com',
    customer_phone: '+880 1711-444444',
    items_count: 5,
    subtotal: 8900,
    shipping: 0,
    tax: 445,
    discount: 890,
    total: 8455,
    status: 'placed',
    payment_status: 'pending',
    payment_method: 'cash_on_delivery',
    shipping_method: 'Express Delivery',
    shipping_address: '56 Mirpur Road, Dhanmondi, Dhaka 1205',
    tracking_number: null,
    courier: null,
    created_at: '2025-12-22T16:45:00Z',
  },
  {
    id: '5',
    order_number: 'ORD-2025-005',
    customer_name: 'Vikram Joshi',
    customer_email: 'vikram@example.com',
    customer_phone: '+880 1711-555555',
    items_count: 1,
    subtotal: 1200,
    shipping: 100,
    tax: 60,
    discount: 0,
    total: 1360,
    status: 'packed',
    payment_status: 'paid',
    payment_method: 'bkash',
    shipping_method: 'Standard Delivery',
    shipping_address: '78 Uttara, Sector 10, Dhaka 1230',
    tracking_number: null,
    courier: null,
    created_at: '2025-12-23T11:30:00Z',
  },
  {
    id: '6',
    order_number: 'ORD-2025-006',
    customer_name: 'Ananya Das',
    customer_email: 'ananya@example.com',
    customer_phone: '+880 1711-666666',
    items_count: 2,
    subtotal: 1800,
    shipping: 0,
    tax: 90,
    discount: 180,
    total: 1710,
    status: 'cancelled',
    payment_status: 'refunded',
    payment_method: 'nagad',
    shipping_method: 'Standard Delivery',
    shipping_address: '34 Mohakhali, DOHS, Dhaka 1206',
    tracking_number: null,
    courier: null,
    created_at: '2025-12-15T08:00:00Z',
  },
  {
    id: '7',
    order_number: 'ORD-2025-007',
    customer_name: 'Rohit Verma',
    customer_email: 'rohit@example.com',
    customer_phone: '+880 1711-777777',
    items_count: 4,
    subtotal: 6500,
    shipping: 200,
    tax: 325,
    discount: 325,
    total: 6700,
    status: 'placed',
    payment_status: 'pending',
    payment_method: 'cash_on_delivery',
    shipping_method: 'Next Day Delivery',
    shipping_address: '15 Shyamoli, Dhaka 1207',
    tracking_number: null,
    courier: null,
    created_at: '2025-12-24T13:00:00Z',
  },
];

class EcommerceOrderService {
  private data: EcommerceOrder[] = [...mockOrders];

  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    filterParams?: Record<string, string | number | undefined | null>;
  }): Promise<{ data: EcommerceOrder[]; total: number; page: number; per_page: number }> {
    let filtered = [...this.data];
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        o =>
          o.order_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_email.toLowerCase().includes(q)
      );
    }
    if (params?.filterParams?.status !== undefined && params.filterParams.status !== null && params.filterParams.status !== '') {
      filtered = filtered.filter(o => o.status === params.filterParams!.status);
    }
    if (params?.filterParams?.payment_status !== undefined && params.filterParams.payment_status !== null && params.filterParams.payment_status !== '') {
      filtered = filtered.filter(o => o.payment_status === params.filterParams!.payment_status);
    }
    const total = filtered.length;
    const page = params?.page || 1;
    const perPage = params?.per_page || 15;
    const start = (page - 1) * perPage;
    const paged = filtered.slice(start, start + perPage);
    return { data: paged, total, page, per_page: perPage };
  }

  async getById(id: string): Promise<EcommerceOrder | undefined> {
    return this.data.find(o => o.id === id);
  }

  async updateStatus(id: string, status: EcommerceOrder['status']): Promise<void> {
    await new Promise(r => setTimeout(r, 300));
    const order = this.data.find(o => o.id === id);
    if (order) order.status = status;
  }

  async updatePaymentStatus(id: string, payment_status: EcommerceOrder['payment_status']): Promise<void> {
    await new Promise(r => setTimeout(r, 300));
    const order = this.data.find(o => o.id === id);
    if (order) order.payment_status = payment_status;
  }

  async updateTracking(id: string, tracking_number: string, courier: string): Promise<void> {
    await new Promise(r => setTimeout(r, 300));
    const order = this.data.find(o => o.id === id);
    if (order) {
      order.tracking_number = tracking_number;
      order.courier = courier;
    }
  }
}

const ecommerceOrderService = new EcommerceOrderService();
export default ecommerceOrderService;
