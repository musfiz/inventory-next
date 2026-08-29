import apiClient from '@/lib/api/axios';
import type { Address } from '@/types/storefront';

export interface CheckoutItemInput {
  variation_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface CheckoutAddressInput {
  name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  zip_code: string;
  country: string;
  label?: string;
}

export interface PlaceOrderPayload {
  email: string;
  phone: string;
  address: CheckoutAddressInput;
  shipping_method_id: string;
  payment_method: string;
  coupon_code?: string;
  items: CheckoutItemInput[];
  customer_id?: string;
}

export interface PlaceOrderResult {
  id: string | number;
  uuid?: string;
  invoice_number?: string;
  order_number?: string;
  payment_url?: string;
  total?: number;
  status?: string;
}

export interface QuoteResult {
  subtotal: number;
  shipping_cost: number;
  tax: number;
  discount: number;
  total: number;
  currency?: string;
}

export interface StorefrontOrder {
  id?: string | number;
  uuid?: string;
  invoice_number?: string;
  order_number?: string;
  total?: number;
  status?: string;
  created_at?: string;
  items?: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    line_total?: number;
  }>;
}

/**
 * Storefront checkout + order service. Endpoints below are part of the planned
 * backend (see GAP_ANALYSIS_CHECKLIST §5.1). They 404 until the API is built,
 * but the frontend is fully wired and will work once the backend lands.
 */
class CheckoutService {
  /** POST /api/v1/storefront/cart/validate — verify stock, recompute totals. */
  async validateCart(items: CheckoutItemInput[]) {
    const res = await apiClient.post('/api/v1/storefront/cart/validate', { items });
    return res.data;
  }

  /** POST /api/v1/storefront/checkout/quote — totals with shipping + tax. */
  async getQuote(
    payload: Partial<PlaceOrderPayload> & { items: CheckoutItemInput[] },
  ): Promise<QuoteResult> {
    const res = await apiClient.post<{ success: boolean; data: QuoteResult }>(
      '/api/v1/storefront/checkout/quote',
      payload,
    );
    return res.data.data;
  }

  /** POST /api/v1/storefront/checkout/place — create order, deduct stock. */
  async placeOrder(payload: PlaceOrderPayload): Promise<PlaceOrderResult> {
    const res = await apiClient.post<{ success: boolean; data: PlaceOrderResult }>(
      '/api/v1/storefront/checkout/place',
      payload,
    );
    return res.data.data;
  }

  /** GET /api/v1/storefront/account/addresses — saved addresses for selection. */
  async getAddresses(): Promise<Address[]> {
    const res = await apiClient.get<{ success: boolean; data: Address[] }>(
      '/api/v1/storefront/account/addresses',
    );
    return res.data.data || [];
  }

  /** GET /api/v1/storefront/account/orders — customer order history. */
  async listOrders(): Promise<any[]> {
    const res = await apiClient.get<{ success: boolean; data: any[] }>(
      '/api/v1/storefront/account/orders',
    );
    return res.data.data || [];
  }

  /** GET /api/v1/storefront/account/orders/{uuid} — order detail. */
  async getOrderDetail(uuid: string): Promise<any> {
    const res = await apiClient.get<{ success: boolean; data: any }>(
      `/api/v1/storefront/account/orders/${uuid}`,
    );
    return res.data.data;
  }

  /** POST /api/v1/storefront/account/addresses — create address. */
  async saveAddress(addr: Omit<Address, 'id'>): Promise<Address> {
    const res = await apiClient.post<{ success: boolean; data: Address }>(
      '/api/v1/storefront/account/addresses',
      addr,
    );
    return res.data.data;
  }

  /** PUT /api/v1/storefront/account/addresses/{id} — update address. */
  async updateAddress(id: string, addr: Omit<Address, 'id'>): Promise<Address> {
    const res = await apiClient.put<{ success: boolean; data: Address }>(
      `/api/v1/storefront/account/addresses/${id}`,
      addr,
    );
    return res.data.data;
  }

  /** DELETE /api/v1/storefront/account/addresses/{id} — delete address. */
  async deleteAddress(id: string): Promise<void> {
    await apiClient.delete<{ success: boolean }>(
      `/api/v1/storefront/account/addresses/${id}`,
    );
  }

  /** GET /api/v1/storefront/orders/{uuid} — order detail for success page. */
  async getOrder(uuid: string): Promise<StorefrontOrder> {
    const res = await apiClient.get<{ success: boolean; data: StorefrontOrder }>(
      `/api/v1/storefront/orders/${uuid}`,
    );
    return res.data.data;
  }
}

export default new CheckoutService();
