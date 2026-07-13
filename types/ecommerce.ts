export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  description: string;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  product_name: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  title: string;
  body: string;
  is_approved: boolean;
  is_verified_purchase: boolean;
  helpful_count: number;
  images: string[];
  admin_response: string | null;
  created_at: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  rate: number;
  estimated_days: string;
  is_free: boolean;
  is_active: boolean;
  created_at: string;
}

export interface EcommerceSettings {
  storefront_active: boolean;
  store_name: string;
  store_tagline: string;
  store_email: string;
  store_phone: string;
  store_address: string;
  currency_code: string;
  currency_symbol: string;
  free_shipping_threshold: number;
  default_delivery_days: number;
  tax_rate: number;
  meta_title: string;
  meta_description: string;
  created_at: string;
  updated_at: string;
}

export interface EcommerceOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items_count: number;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  status: 'placed' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: string;
  shipping_method: string;
  shipping_address: string;
  tracking_number: string | null;
  courier: string | null;
  created_at: string;
}

export interface EcommerceDashboardStats {
  total_orders: number;
  total_revenue: number;
  total_customers: number;
  total_products: number;
  pending_orders: number;
  pending_reviews: number;
  active_coupons: number;
  conversion_rate: number;
  recent_orders: EcommerceOrder[];
  revenue_overview: { label: string; value: number }[];
  order_status_counts: { status: string; count: number }[];
}
